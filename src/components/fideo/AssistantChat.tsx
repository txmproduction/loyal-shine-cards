import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { askAssistant, type AssistantAction } from "@/lib/assistant.functions";
import {
  cardGoal,
  customerName,
  entryValue,
  isAmountMode,
  useAddPoint,
  useCustomers,
  useEmployeeSelf,
  useLoyaltyCard,
  useMerchant,
  usePoints,
  useRemovePoint,
  useRewards,
} from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Je suis l'assistant Fidéo. Dites-moi par exemple « enlève 2 points à Patrick » ou posez-moi une question sur l'application.",
    },
  ]);
  const [action, setAction] = useState<AssistantAction | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: merchant } = useMerchant();
  const { data: employee } = useEmployeeSelf();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: customers } = useCustomers(merchant?.id);
  const ids = useMemo(() => (customers ?? []).map((c) => c.id), [customers]);
  const { data: points } = usePoints(ids);
  const { data: rewards } = useRewards(ids);
  const addPoint = useAddPoint();
  const removePoint = useRemovePoint();
  const ask = useServerFn(askAssistant);

  const amountMode = isAmountMode(card);
  const goal = cardGoal(card);

  const balanceOf = (id: string) => {
    const earned = (points ?? [])
      .filter((p) => p.customer_id === id)
      .reduce((a, p) => a + entryValue(card, p), 0);
    const used = (rewards ?? []).filter((r) => r.customer_id === id).length * goal;
    return Math.max(0, earned - used);
  };

  const scrollDown = () =>
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setAction(null);
    setPending(true);
    scrollDown();
    try {
      const res = await ask({
        data: {
          messages: next,
          mode: amountMode ? "montant" : "passages",
          goal,
          reward: card?.valeur_recompense ?? "Récompense",
          commerce: merchant?.nom_commerce ?? "Votre commerce",
          customers: (customers ?? []).map((c) => ({
            id: c.id,
            nom: customerName(c),
            telephone: c.telephone,
            solde: balanceOf(c.id),
          })),
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setAction(res.action.type === "none" ? null : res.action);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Une erreur est survenue." },
      ]);
    } finally {
      setPending(false);
      scrollDown();
    }
  };

  const confirm = async () => {
    if (!action?.customer_id) return;
    const qty = Math.abs(Number(action.quantity ?? 1)) || 1;
    const payload = {
      customer_id: action.customer_id,
      employee_id: employee?.id ?? null,
      establishment_id: null,
      points: amountMode ? 1 : Math.round(qty),
      montant: amountMode ? qty : 0,
    };
    try {
      if (action.type === "add") await addPoint.mutateAsync(payload);
      else await removePoint.mutateAsync(payload);
      const label = amountMode ? `${qty.toFixed(2)} €` : `${Math.round(qty)} point(s)`;
      const done = `${action.type === "add" ? "Ajout" : "Retrait"} de ${label} effectué pour ${action.label ?? "le client"}.`;
      toast.success(done);
      setMessages((m) => [...m, { role: "assistant", content: `✅ ${done}` }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opération impossible");
    } finally {
      setAction(null);
      scrollDown();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistant Fidéo"
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-semibold shadow-soft transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="hidden sm:inline">Assistant</span>
      </button>

      {open && (
        <div className="animate-rise fixed bottom-20 left-3 right-3 z-50 flex h-[70vh] max-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:right-auto sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" /> Assistant Fidéo
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "bg-brand ml-auto max-w-[85%] rounded-2xl px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[90%] rounded-2xl bg-secondary px-3 py-2 text-sm"
                }
              >
                {m.content}
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> L'assistant réfléchit…
              </div>
            )}
            {action && (
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {action.type === "add" ? "Ajouter" : "Retirer"}{" "}
                  {amountMode
                    ? `${Math.abs(Number(action.quantity ?? 0)).toFixed(2)} €`
                    : `${Math.abs(Math.round(Number(action.quantity ?? 1)))} point(s)`}{" "}
                  · {action.label ?? "client"}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={confirm} disabled={addPoint.isPending || removePoint.isPending}>
                    <Check className="mr-1 h-4 w-4" /> Confirmer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAction(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Écrivez votre demande…"
            />
            <Button size="icon" onClick={() => void send()} disabled={pending} aria-label="Envoyer">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
