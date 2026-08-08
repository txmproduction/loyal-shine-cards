import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees, useEstablishments, useMerchant } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { QrImage } from "@/components/fideo/QrImage";
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
        content: "Gérez votre équipe et les codes PIN utilisés pour ajouter des points.",
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
  const { data: establishments } = useEstablishments(merchant?.id);
  const qc = useQueryClient();
  const [nom, setNom] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("employe");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["employees"] });

  const add = async () => {
    if (!merchant || !nom.trim() || pin.length < 4) {
      toast.error("Nom requis et PIN d'au moins 4 chiffres");
      return;
    }
    const { error } = await supabase
      .from("employees")
      .insert({ merchant_id: merchant.id, nom: nom.trim(), pin_code: pin, role });
    if (error) {
      toast.error("Ajout impossible");
      return;
    }
    setNom("");
    setPin("");
    toast.success("Employé ajouté");
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Employé supprimé");
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Employés</h1>
        <p className="text-sm text-muted-foreground">
          Chaque employé valide ses points avec son code PIN.
        </p>
      </header>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">Ajouter un employé</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nom</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Sarah Lemoine" />
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
        <Button className="mt-4" onClick={add}>
          Ajouter
        </Button>
      </section>

      <section className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {(employees ?? []).map((e) => (
            <li key={e.id} className="flex items-center gap-4 px-5 py-4">
              <span className="bg-brand flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                {e.nom.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {e.role === "manager" ? "Manager" : "Employé"} · PIN ••••
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(employees ?? []).length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun employé.</li>
          )}
        </ul>
      </section>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">Établissements</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Imprimez le QR code fixe et posez-le sur le comptoir : chaque nouveau client s'inscrit seul
          en 10 secondes.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {(establishments ?? []).map((e) => {
            const url = `${origin}/rejoindre/${e.public_code}`;
            return (
              <li key={e.id} className="rounded-xl bg-secondary p-4 text-sm">
                <p className="font-semibold">{e.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {e.adresse ?? "Adresse non renseignée"}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="rounded-xl bg-white p-2">
                    <QrImage value={url} size={128} alt={`QR code ${e.nom}`} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <p className="break-all text-[11px] text-muted-foreground">{url}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void import("qrcode").then(async (m) => {
                          const data = await m.toDataURL(url, { width: 1024, margin: 2 });
                          const a = document.createElement("a");
                          a.href = data;
                          a.download = `qr-${e.nom.replace(/\s+/g, "-").toLowerCase()}.png`;
                          a.click();
                        });
                      }}
                    >
                      <Download className="mr-1 h-4 w-4" /> Télécharger
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
          {(establishments ?? []).length === 0 && (
            <li className="text-xs text-muted-foreground">Aucun établissement.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
