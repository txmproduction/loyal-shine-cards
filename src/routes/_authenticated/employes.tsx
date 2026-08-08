import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, KeyRound, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createEmployeeAccount,
  deleteEmployeeAccount,
  enableEmployeeAccess,
  resetEmployeePin,
} from "@/lib/employees.functions";
import { employeeLoginEmail } from "@/lib/employee-login";
import { useEmployees, useMerchant } from "@/lib/fideo";
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

export const Route = createFileRoute("/_authenticated/employes")({
  head: () => ({
    meta: [
      { title: "Employés — Fidéo" },
      {
        name: "description",
        content:
          "Créez un accès personnel pour chaque employé : il se connecte avec son email et son code PIN.",
      },
      { property: "og:title", content: "Employés — Fidéo" },
      { property: "og:description", content: "Votre équipe et ses accès par code PIN." },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { data: merchant } = useMerchant();
  const { data: employees } = useEmployees(merchant?.id);
  const qc = useQueryClient();
  const createAccount = useServerFn(createEmployeeAccount);
  const deleteAccount = useServerFn(deleteEmployeeAccount);
  const resetPin = useServerFn(resetEmployeePin);
  const enableAccess = useServerFn(enableEmployeeAccess);

  const [nom, setNom] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("employe");
  const [busy, setBusy] = useState(false);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["employees"] });

  const previewEmail = merchant && nom.trim() ? employeeLoginEmail(merchant.nom_commerce, nom) : "";

  const add = async () => {
    setBusy(true);
    try {
      const res = await createAccount({ data: { nom: nom.trim(), pin, role } });
      setNom("");
      setPin("");
      toast.success("Accès employé créé", {
        description: `Identifiant : ${res.email} — code PIN communiqué à l'employé.`,
      });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAccount({ data: { id } });
      toast.success("Employé et son accès supprimés");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
    }
  };

  const changePin = async (id: string) => {
    const next = window.prompt("Nouveau code PIN (4 à 6 chiffres)");
    if (!next) return;
    try {
      await resetPin({ data: { id, pin: next.trim() } });
      toast.success("Code PIN mis à jour");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible");
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Identifiant copié");
  };

  const activate = async (id: string) => {
    try {
      const res = await enableAccess({ data: { id } });
      toast.success("Accès créé", { description: `Identifiant : ${res.email} — PIN ${res.pin}` });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Employés</h1>
        <p className="text-sm text-muted-foreground">
          Chaque employé reçoit son propre accès : il se connecte avec son identifiant et son code
          PIN, et ne voit que les clients qu'il a scannés.
        </p>
      </header>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">Créer un accès employé</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Prénom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Sarah" />
          </div>
          <div className="space-y-2">
            <Label>Code PIN</Label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="2345"
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employe">Employé</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {previewEmail && (
          <p className="mt-3 text-xs text-muted-foreground">
            Identifiant de connexion généré :{" "}
            <span className="font-semibold text-foreground">{previewEmail}</span>
          </p>
        )}
        <Button className="mt-4" onClick={add} disabled={busy || !nom.trim() || pin.length < 4}>
          {busy ? "Création…" : "Créer l'accès"}
        </Button>
      </section>

      <section className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {(employees ?? []).map((e) => {
            const login = merchant ? employeeLoginEmail(merchant.nom_commerce, e.nom) : "";
            return (
              <li key={e.id} className="flex items-center gap-4 px-5 py-4">
                <span className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                  {e.nom.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.role === "manager" ? "Manager" : "Employé"} ·{" "}
                    {e.user_id ? login : "pas d'accès de connexion"} · PIN {e.pin_code}
                  </p>
                </div>
                {e.user_id && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => copy(login)} aria-label="Copier">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => changePin(e.id)}
                      aria-label="Changer le PIN"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {!e.user_id && (
                  <Button variant="outline" size="sm" onClick={() => activate(e.id)}>
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    Créer l'accès
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Supprimer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
          {(employees ?? []).length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun employé.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
