import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssistantAction = {
  type: "add" | "remove" | "none";
  customer_id: string | null;
  quantity: number | null;
  label: string | null;
};

export type AssistantReply = {
  reply: string;
  action: AssistantAction;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type AssistantInput = {
  messages: ChatMessage[];
  mode: "passages" | "montant";
  goal: number;
  reward: string;
  commerce: string;
  customers: { id: string; nom: string; telephone: string | null; solde: number }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "action"],
  properties: {
    reply: { type: "string" },
    action: {
      type: "object",
      additionalProperties: false,
      required: ["type", "customer_id", "quantity", "label"],
      properties: {
        type: { type: "string", enum: ["add", "remove", "none"] },
        customer_id: { type: ["string", "null"] },
        quantity: { type: ["number", "null"] },
        label: { type: ["string", "null"] },
      },
    },
  },
} as const;

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AssistantInput) => input)
  .handler(async ({ data }): Promise<AssistantReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistant indisponible : clé IA manquante.");

    const clients = data.customers
      .slice(0, 300)
      .map((c) => `- ${c.nom} | tel ${c.telephone ?? "—"} | solde ${c.solde} | id ${c.id}`)
      .join("\n");

    const system = [
      `Tu es l'assistant de Fidéo, application de carte de fidélité du commerce "${data.commerce}".`,
      `Tu réponds toujours en français, très simplement, en 1 à 3 phrases (le commerçant n'est pas à l'aise avec l'informatique).`,
      data.mode === "montant"
        ? `Le programme fonctionne au MONTANT dépensé : objectif ${data.goal} € pour obtenir "${data.reward}". quantity = un montant en euros.`
        : `Le programme fonctionne aux PASSAGES : objectif ${data.goal} passages pour obtenir "${data.reward}". quantity = un nombre de points entier.`,
      `Quand l'utilisateur demande d'ajouter ou de retirer des points/montant à un client, identifie le client dans la liste ci-dessous et renvoie action.type = "add" ou "remove", action.customer_id = son id, action.quantity = la quantité (positive), action.label = "Prénom Nom (téléphone)".`,
      `Ne fais jamais l'opération toi-même : formule une demande de confirmation dans "reply", par exemple : "Vous vous apprêtez à retirer 2 points à Patrick Dupont (06 12 34 56 78). Confirmez-vous ?".`,
      `Si le client est introuvable ou ambigu, action.type = "none" et demande une précision.`,
      `Pour toute autre question (fonctionnement de Fidéo, wallet, récompenses, employés, QR codes), réponds simplement avec action.type = "none".`,
      `Liste des clients :\n${clients || "(aucun client)"}`,
    ].join("\n");

    const input = [
      { role: "system", content: [{ type: "input_text", text: system }] },
      ...data.messages.slice(-12).map((m) => ({
        role: m.role,
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input,
        stream: true,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "fideo_assistant",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("[assistant] gateway error", res.status, body);
      if (res.status === 429) throw new Error("Trop de demandes, réessayez dans un instant.");
      if (res.status === 402 || res.status === 403)
        throw new Error("L'assistant IA est momentanément indisponible.");
      throw new Error("L'assistant n'a pas pu répondre.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          }
        } catch {
          /* fragment non JSON : ignoré */
        }
      }
    }

    try {
      const parsed = JSON.parse(text) as AssistantReply;
      return {
        reply: parsed.reply || "Je n'ai pas compris, pouvez-vous reformuler ?",
        action: parsed.action ?? { type: "none", customer_id: null, quantity: null, label: null },
      };
    } catch {
      return {
        reply: text.trim() || "Je n'ai pas compris, pouvez-vous reformuler ?",
        action: { type: "none", customer_id: null, quantity: null, label: null },
      };
    }
  });
