import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Gift, Search, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import {
  useAddPoint,
  useCustomers,
  useEmployees,
  useEstablishments,
  useLoyaltyCard,
  useMerchant,
  usePoints,
  useRedeemReward,
  useRewards,
  cardGoal,
  customerName,
  entryValue,
  isAmountMode,
} from "@/lib/fideo";

export const Route = createFileRoute("/_authenticated/points")({
  head: () => ({
    meta: [
      { title: "Ajouter un point — Fidéo" },
      {
        name: "description",
        content: "Sélectionnez un employé par code PIN, trouvez le client et ajoutez un passage.",
      },
      { property: "og:title", content: "Ajouter un point — Fidéo" },
      { property: "og:description", content: "Un passage, un point, en trois secondes." },
    ],
  }),
  component: AddPointPage,
});

function AddPointPage() {
  const { data: merchant } = useMerchant();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: employees } = useEmployees(merchant?.id);
  const { data: establishments } = useEstablishments(merchant?.id);
  const { data: customers } = useCustomers(merchant?.id);
  const ids = useMemo(() => (customers ?? []).map((c) => c.id), [customers]);
  const { data: points } = usePoints(ids);
  const { data: rewards } = useRewards(ids);
  const addPoint = useAddPoint();
  const redeem = useRedeemReward();

  const [employeeId, setEmployeeId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [montant, setMontant] = useState("");

  const amountMode = isAmountMode(card);
  const goal = cardGoal(card);
  const fmt = (n: number) => (amountMode ? `${n.toFixed(2)} €` : `${n}`);

  const balance = (customerId: string) => {
    const earned = (points ?? [])
      .filter((p) => p.customer_id === customerId)
      .reduce((a, p) => a + entryValue(card, p), 0);
    const used = (rewards ?? []).filter((r) => r.customer_id === customerId).length * goal;
    return Math.max(0, earned - used);
  };

  const results = (customers ?? []).filter((c) =>
    `${c.prenom ?? ""} ${c.nom ?? ""} ${c.email ?? ""} ${c.telephone ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const unlock = () => {
    const emp = (employees ?? []).find((e) => e.id === employeeId);
    if (emp && emp.pin_code === pin) {
      setUnlocked(true);
      toast.success(`Bonjour ${emp.nom}`);
    } else {
      toast.error("Code PIN incorrect");
    }
  };

  const createCustomer = async () => {
    if (!merchant) {
      toast.error("Commerce introuvable");
      return;
    }
    if (!newName.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    const { data, error } = await supabase
      .from("customers")
      .insert({
        merchant_id: merchant.id,
        nom: newName.trim(),
        prenom: newFirstName.trim() || null,
        telephone: newPhone.trim() || null,
        establishment_id: establishmentId || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Création impossible", { description: error?.message });
      return;
    }
    setSelected(data.id);
    setNewName("");
    setNewFirstName("");
    setNewPhone("");
    setSearch(newName.trim());
    toast.success("Client ajouté");
    void qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const add = async (customerId: string) => {
    const value = amountMode ? Number(montant.replace(",", ".")) : 1;
    if (amountMode && (!Number.isFinite(value) || value <= 0)) {
      toast.error("Saisissez le montant dépensé");
      return;
    }
    await addPoint.mutateAsync({
      customer_id: customerId,
      employee_id: employeeId || null,
      establishment_id: establishmentId || null,
      points: 1,
      montant: amountMode ? value : 0,
    });
    setMontant("");
    toast.success(amountMode ? `+${value.toFixed(2)} €` : "+1 point", {
      description: "Passage enregistré.",
    });
  };

  const selectedCustomer = (customers ?? []).find((c) => c.id === selected) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Ajouter un point</h1>
        <p className="text-sm text-muted-foreground">1 point = 1 passage</p>
      </header>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">1. Employé</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select
              value={employeeId}
              onValueChange={(v) => {
                setEmployeeId(v);
                setUnlocked(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Code PIN</Label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="••••"
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label>Établissement</Label>
            <Select value={establishmentId} onValueChange={setEstablishmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {(establishments ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={unlock} disabled={!employeeId || !pin}>
            Valider le PIN
          </Button>
          {unlocked && (
            <span className="inline-flex animate-fade items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Check className="h-3 w-3" /> Session ouverte
            </span>
          )}
        </div>
      </section>

      <section
        className={`animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft transition-opacity ${unlocked ? "" : "pointer-events-none opacity-50"}`}
      >
        <h2 className="text-base font-bold">2. Client</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un nom, un email, un téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ul className="mt-4 max-h-72 divide-y divide-border overflow-auto rounded-xl border border-border">
          {results.slice(0, 30).map((c) => {
            const b = balance(c.id);
            return (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${selected === c.id ? "bg-accent" : "hover:bg-secondary"}`}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(c.id)}>
                  <p className="truncate text-sm font-semibold">{c.nom ?? "Client"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.telephone ?? c.email ?? "—"} · {b}/{goal} points
                  </p>
                </button>
                {b >= goal ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      redeem
                        .mutateAsync({
                          customer_id: c.id,
                          valeur: card?.valeur_recompense ?? "Récompense",
                        })
                        .then(() => toast.success("Récompense utilisée"))
                    }
                  >
                    <Gift className="mr-1 h-4 w-4" /> Récompense
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => add(c.id)} disabled={addPoint.isPending}>
                    +1 point
                  </Button>
                )}
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun client trouvé</li>
          )}
        </ul>

        <div className="mt-5 rounded-xl border border-dashed border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" /> Nouveau client
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input placeholder="Nom" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Téléphone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Button variant="outline" onClick={createCustomer} disabled={!newName.trim()}>
              Créer et sélectionner
            </Button>
          </div>
        </div>
      </section>

      {selectedCustomer && (
        <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> {selectedCustomer.nom}
          </h2>
          <div className="mt-4">
            <LoyaltyCardPreview
              nomCommerce={merchant?.nom_commerce ?? ""}
              valeurRecompense={card?.valeur_recompense ?? "Récompense"}
              nbPoints={goal}
              points={balance(selectedCustomer.id)}
              couleur={merchant?.couleur_marque}
            />
          </div>
        </section>
      )}
    </div>
  );
}
