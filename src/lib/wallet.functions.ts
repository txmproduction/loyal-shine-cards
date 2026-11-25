import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const validateCustomerId = (input: { customer_id: string }) => {
  const id = String(input?.customer_id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Client invalide");
  return { customer_id: id };
};

/** Génère (ou met à jour) la carte Google Wallet d'un client et renvoie l'URL "Save to Google Wallet". */
export const generateWalletCard = createServerFn({ method: "POST" })
  .inputValidator(validateCustomerId)
  .handler(async ({ data }) => {
    const { buildSaveUrl } = await import("@/lib/google-wallet.server");
    const { buildWalletCardInput, suffix } = await import("@/lib/wallet-data.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { input, customerId } = await buildWalletCardInput(data.customer_id);
    const origin = new URL(getRequest().url).origin;
    const url = await buildSaveUrl(input, origin);

    await supabaseAdmin
      .from("customers")
      .update({ google_wallet_pass_id: `fideo_${suffix(customerId)}` })
      .eq("id", customerId);

    return { url };
  });

/** Met à jour l'objet Google Wallet existant d'un client (solde à jour). No-op si aucune carte. */
export const refreshWalletCard = createServerFn({ method: "POST" })
  .inputValidator(validateCustomerId)
  .handler(async ({ data }) => {
    const { buildWalletCardInput } = await import("@/lib/wallet-data.server");
    const { updateWalletObject } = await import("@/lib/google-wallet.server");
    const { pushApplePassUpdate } = await import("@/lib/apns.server");

    const { input, hasGooglePass } = await buildWalletCardInput(data.customer_id);

    if (hasGooglePass) {
      await updateWalletObject(input).catch((e) =>
        console.error("[Wallet] Google update failed", e),
      );
    }

    // Apple Wallet : notifie les appareils enregistrés (marqueur = points_history / rewards_redeemed).
    const pushed = await pushApplePassUpdate(data.customer_id).catch(() => 0);

    return { updated: hasGooglePass, applePushed: pushed };
  });

/** Renvoie, pour une liste de clients, ceux qui ont un pass Apple et/ou Google actif. */
export const getWalletStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customer_ids: string[] }) => ({
    customer_ids: (input?.customer_ids ?? [])
      .map((id) => String(id).trim())
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      .slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    if (data.customer_ids.length === 0) return { apple: [], google: [] };

    // RLS : ne garde que les clients visibles par l'appelant.
    const { data: allowed } = await context.supabase
      .from("customers")
      .select("id, google_wallet_pass_id")
      .in("id", data.customer_ids);
    const ids = (allowed ?? []).map((c) => c.id);
    if (ids.length === 0) return { apple: [], google: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: regs } = await supabaseAdmin
      .from("apple_pass_registrations")
      .select("serial_number")
      .in("serial_number", ids);

    return {
      apple: Array.from(new Set((regs ?? []).map((r) => r.serial_number))),
      google: (allowed ?? []).filter((c) => c.google_wallet_pass_id).map((c) => c.id),
    };
  });

/** Page publique /c/:token — données d'affichage de la carte d'un client (lien secret). */
export const getSharedCard = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (!/^[0-9a-f]{32}$/i.test(token)) throw new Error("Lien invalide");
    return { token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("customers")
      .select("id, prenom, nom, merchant_id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!c) return null;
    const [{ data: m }, { data: card }, { data: hist }, { count: redeemed }] = await Promise.all([
      supabaseAdmin
        .from("merchants")
        .select("nom_commerce, logo_url, photo_url, couleur_marque, access_status, trial_ends_at")
        .eq("id", c.merchant_id)
        .maybeSingle(),
      supabaseAdmin
        .from("loyalty_cards")
        .select("mode_recompense, nb_points_pour_recompense, montant_pour_recompense, valeur_recompense")
        .eq("merchant_id", c.merchant_id)
        .maybeSingle(),
      supabaseAdmin.from("points_history").select("points_ajoutes, montant").eq("customer_id", c.id),
      supabaseAdmin
        .from("rewards_redeemed")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", c.id),
    ]);
    if (!m) return null;
    const amount = card?.mode_recompense === "montant";
    const goal = amount
      ? Number(card?.montant_pour_recompense ?? 100)
      : Number(card?.nb_points_pour_recompense ?? 10);
    const earned = (hist ?? []).reduce(
      (s, r) => s + (amount ? Number(r.montant ?? 0) : Number(r.points_ajoutes ?? 0)),
      0,
    );
    const active =
      m.access_status === "active" ||
      (m.access_status === "trial" && new Date(m.trial_ends_at).getTime() > Date.now());
    return {
      customerId: c.id,
      titulaire: [c.prenom, c.nom].filter(Boolean).join(" "),
      nomCommerce: m.nom_commerce,
      logoUrl: m.logo_url,
      photoUrl: m.photo_url,
      couleur: m.couleur_marque,
      mode: amount ? ("montant" as const) : ("passages" as const),
      goal,
      points: Math.max(0, earned - (redeemed ?? 0) * goal),
      reward: card?.valeur_recompense ?? "Récompense offerte",
      active,
    };
  });
