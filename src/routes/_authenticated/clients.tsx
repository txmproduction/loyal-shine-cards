import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Apple, Search, Smartphone } from "lucide-react";
import {
  useCustomers,
  useLoyaltyCard,
  useMerchant,
  usePoints,
  useRewards,
} from "@/lib/fideo";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Fidéo" },
      {
        name: "description",
        content: "Consultez vos clients fidèles, leur solde de points et leur historique de passages.",
      },
      { property: "og:title", content: "Clients — Fidéo" },
      { property: "og:description", content: "Tous vos clients et leur historique de points." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: merchant } = useMerchant();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: customers } = useCustomers(merchant?.id);
  const ids = useMemo(() => (customers ?? []).map((c) => c.id), [customers]);
  const { data: points } = usePoints(ids);
  const { data: rewards } = useRewards(ids);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const goal = card?.nb_points_pour_recompense ?? 10;

  const rows = (customers ?? [])
    .filter((c) =>
      `${c.nom ?? ""} ${c.email ?? ""} ${c.telephone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
    )
    .map((c) => {
      const history = (points ?? []).filter((p) => p.customer_id === c.id);
      const earned = history.reduce((a, p) => a + p.points_ajoutes, 0);
      const used = (rewards ?? []).filter((r) => r.customer_id === c.id).length * goal;
      return { customer: c, history, balance: Math.max(0, earned - used), earned };
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Clients</h1>
          <p className="text-sm text-muted-foreground">{rows.length} client(s)</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {rows.map(({ customer, balance, history, earned }) => (
            <li key={customer.id}>
              <button
                onClick={() => setOpen(open === customer.id ? null : customer.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary"
              >
                <span className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                  {(customer.nom ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{customer.nom ?? "Client"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {customer.telephone ?? customer.email ?? "—"} · {earned} passages au total
                  </span>
                </span>
                <span className="w-32 shrink-0">
                  <Progress value={Math.min(100, (balance / goal) * 100)} className="h-2" />
                  <span className="mt-1 block text-right text-xs text-muted-foreground">
                    {balance}/{goal}
                  </span>
                </span>
              </button>
              {open === customer.id && (
                <div className="animate-fade border-t border-border bg-secondary/40 px-5 py-4">
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                      <Apple className="h-3 w-3" />
                      {customer.apple_wallet_pass_id ?? "Apple Wallet — non généré"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                      <Smartphone className="h-3 w-3" />
                      {customer.google_wallet_pass_id ?? "Google Wallet — non généré"}
                    </span>
                  </div>
                  <ol className="space-y-1.5">
                    {history.slice(0, 12).map((h) => (
                      <li key={h.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(h.date).toLocaleString("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span className="font-semibold">
                          {h.type === "recompense" ? "Récompense" : `+${h.points_ajoutes} point`}
                        </span>
                      </li>
                    ))}
                    {history.length === 0 && (
                      <li className="text-xs text-muted-foreground">Aucun passage enregistré.</li>
                    )}
                  </ol>
                </div>
              )}
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun client pour l'instant.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
