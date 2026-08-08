import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Apple, Gift, QrCode, ScanLine, Search, Smartphone } from "lucide-react";
import { toast } from "sonner";
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
  useRedeemReward,
  useRewards,
  type Customer,
} from "@/lib/fideo";
import { QrImage } from "@/components/fideo/QrImage";
import { QrScanner } from "@/components/fideo/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/clients")({
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search['c'] === "string" ? (search['c'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Clients — Fidéo" },
      {
        name: "description",
        content: "Scannez le QR code d'un client, ajoutez ses points et consultez son historique.",
      },
      { property: "og:title", content: "Clients — Fidéo" },
      { property: "og:description", content: "Tous vos clients et leur historique de points." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { c: scannedId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: merchant } = useMerchant();
  const { data: employee } = useEmployeeSelf();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: customers } = useCustomers(merchant?.id);
  const ids = useMemo(() => (customers ?? []).map((c) => c.id), [customers]);
  const { data: points } = usePoints(ids);
  const { data: rewards } = useRewards(ids);
  const addPoint = useAddPoint();
  const redeem = useRedeemReward();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [active, setActive] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("1");
  const [qrFor, setQrFor] = useState<Customer | null>(null);

  const amountMode = isAmountMode(card);
  const goal = cardGoal(card);

  /** Un employé ne voit que les clients qu'il a lui-même scannés. */
  const myCustomerIds = useMemo(() => {
    if (!employee) return null;
    return new Set(
      (points ?? []).filter((p) => p.employee_id === employee.id).map((p) => p.customer_id),
    );
  }, [employee, points]);

  const balanceOf = (id: string) => {
    const earned = (points ?? [])
      .filter((p) => p.customer_id === id)
      .reduce((a, p) => a + entryValue(card, p), 0);
    const used = (rewards ?? []).filter((r) => r.customer_id === id).length * goal;
    return Math.max(0, earned - used);
  };

  const openCustomer = (c: Customer) => {
    setActive(c);
    setAmount(amountMode ? "" : "1");
  };

  useEffect(() => {
    if (!scannedId || !customers) return;
    const found = customers.find((c) => c.id === scannedId);
    if (found) {
      setActive(found);
      setAmount(isAmountMode(card) ? "" : "1");
    } else {
      toast.error("QR code inconnu", { description: "Ce client n'appartient pas à votre commerce." });
    }
    void navigate({ to: "/clients", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedId, customers]);

  const onScan = (text: string) => {
    setScanOpen(false);
    const id = text.trim().split("/").pop() ?? "";
    const found = (customers ?? []).find((c) => c.id === id);
    if (!found) {
      toast.error("QR code inconnu", { description: "Ce client n'appartient pas à votre commerce." });
      return;
    }
    openCustomer(found);
  };

  const validate = async () => {
    if (!active) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(amountMode ? "Montant invalide" : "Nombre de points invalide");
      return;
    }
    await addPoint.mutateAsync({
      customer_id: active.id,
      employee_id: employee?.id ?? null,
      establishment_id: null,
      points: amountMode ? 1 : Math.round(value),
      montant: amountMode ? value : 0,
    });
    toast.success(
      amountMode ? `+${value.toFixed(2)} € enregistrés` : `+${Math.round(value)} point(s)`,
      { description: customerName(active) },
    );
    setActive(null);
  };

  const rows = (customers ?? [])
    .filter((c) => !myCustomerIds || myCustomerIds.has(c.id) || active?.id === c.id)
    .filter((c) =>
      `${c.prenom ?? ""} ${c.nom ?? ""} ${c.email ?? ""} ${c.telephone ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .map((c) => {
      const history = (points ?? []).filter((p) => p.customer_id === c.id);
      const earned = history.reduce((a, p) => a + entryValue(card, p), 0);
      const used = (rewards ?? []).filter((r) => r.customer_id === c.id).length * goal;
      return { customer: c, history, balance: Math.max(0, earned - used), earned };
    });

  const fmt = (n: number) => (amountMode ? `${n.toFixed(2)} €` : `${n}`);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold">Clients</h1>
          <p className="text-sm text-muted-foreground">{rows.length} client(s)</p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => setScanOpen(true)}>
          <ScanLine className="mr-2 h-5 w-5" /> Scanner un client
        </Button>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Recherche manuelle (nom, téléphone)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {rows.map(({ customer, balance, history, earned }) => (
            <li key={customer.id}>
              <div className="flex items-center gap-2 pr-3">
                <button
                  onClick={() => setOpen(open === customer.id ? null : customer.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary"
                >
                  <span className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                    {customerName(customer).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{customerName(customer)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.telephone ?? customer.email ?? "—"} ·{" "}
                      {amountMode ? `${fmt(earned)} cumulés` : `${earned} passages au total`}
                    </span>
                  </span>
                  <span className="hidden w-32 shrink-0 sm:block">
                    <Progress value={Math.min(100, (balance / goal) * 100)} className="h-2" />
                    <span className="mt-1 block text-right text-xs text-muted-foreground">
                      {fmt(balance)}/{fmt(goal)}
                    </span>
                  </span>
                </button>
                <Button size="icon" variant="ghost" onClick={() => setQrFor(customer)} aria-label="QR code client">
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => openCustomer(customer)}>
                  Points
                </Button>
              </div>
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
                          {h.type === "recompense"
                            ? "Récompense"
                            : amountMode
                              ? `+${Number(h.montant).toFixed(2)} €`
                              : `+${h.points_ajoutes} point`}
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

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un client</DialogTitle>
            <DialogDescription>
              Approchez le QR code de la carte de fidélité du client.
            </DialogDescription>
          </DialogHeader>
          {scanOpen && <QrScanner onResult={onScan} onError={(m) => toast.error(m)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{customerName(active)}</DialogTitle>
                <DialogDescription>
                  {active.telephone ?? active.email ?? "—"} · solde {fmt(balanceOf(active.id))} /{" "}
                  {fmt(goal)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{amountMode ? "Montant dépensé (€)" : "Nombre de points à ajouter"}</Label>
                  {amountMode ? (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="25.00"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 5].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          variant={amount === String(n) ? "default" : "outline"}
                          onClick={() => setAmount(String(n))}
                        >
                          +{n}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <Button className="w-full" onClick={validate} disabled={addPoint.isPending}>
                  Valider
                </Button>
                {balanceOf(active.id) >= goal && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      redeem
                        .mutateAsync({
                          customer_id: active.id,
                          valeur: card?.valeur_recompense ?? "Récompense",
                        })
                        .then(() => {
                          toast.success("Récompense utilisée");
                          setActive(null);
                        })
                    }
                  >
                    <Gift className="mr-2 h-4 w-4" /> Utiliser la récompense
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent>
          {qrFor && (
            <>
              <DialogHeader>
                <DialogTitle>QR code de {customerName(qrFor)}</DialogTitle>
                <DialogDescription>
                  Ce code identifie le client. Il figure sur sa carte de fidélité digitale.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center rounded-2xl bg-white p-4">
                <QrImage value={qrFor.id} size={220} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
