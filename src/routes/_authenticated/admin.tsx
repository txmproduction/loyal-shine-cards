import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ChevronDown, Mail, Phone, MapPin, Store, CalendarDays, Globe } from "lucide-react";
import { useAllMerchants, useIsAdmin, useUpdateMerchantAccess, trialDaysLeft, type AdminMerchant } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminPushToggle } from "@/components/fideo/AdminPushToggle";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Fidéo" },
      {
        name: "description",
        content: "Espace administrateur Fidéo : suivi de tous les commerçants inscrits.",
      },
      { property: "og:title", content: "Administration — Fidéo" },
      { property: "og:description", content: "Tous les commerçants inscrits sur Fidéo." },
    ],
  }),
  component: AdminPage,
});

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value && value.trim() !== "" ? value : "—"}</p>
      </div>
    </div>
  );
}

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: merchants } = useAllMerchants(!!isAdmin);
  const update = useUpdateMerchantAccess();
  const [openId, setOpenId] = useState<string | null>(null);

  const setStatus = (id: string, access_status: string) => {
    update.mutate(
      { id, access_status },
      {
        onSuccess: () => toast.success("Accès mis à jour"),
        onError: (e) => toast.error("Mise à jour impossible", { description: (e as Error).message }),
      },
    );
  };

  const extendTrial = (id: string, currentEnd: string) => {
    const base = Math.max(Date.now(), new Date(currentEnd).getTime());
    update.mutate(
      { id, access_status: "trial", trial_ends_at: new Date(base + 14 * 86400000).toISOString() },
      { onSuccess: () => toast.success("Essai prolongé de 14 jours") },
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="text-xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page est réservée aux administrateurs Fidéo.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold">
          <ShieldCheck className="h-7 w-7 text-primary" /> Administration
        </h1>
        <p className="text-sm text-muted-foreground">
          {(merchants ?? []).length} commerçant(s) inscrit(s) sur Fidéo.
        </p>
      </header>

      <AdminPushToggle />

      <section className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {(merchants ?? []).map((m: AdminMerchant) => (
            <li key={m.id} className="px-5 py-4">
              <button
                type="button"
                onClick={() => setOpenId(openId === m.id ? null : m.id)}
                className="flex w-full flex-wrap items-center gap-4 text-left"
              >
                <span className="bg-brand flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                  {m.nom_commerce.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.nom_commerce}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                    {m.telephone ? ` · ${m.telephone}` : ""}
                  </p>
                  {m.adresse && <p className="truncate text-xs text-muted-foreground">{m.adresse}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="text-sm font-semibold text-foreground">{m.clients} clients</p>
                  <p>Inscrit le {new Date(m.created_at).toLocaleDateString("fr-FR")}</p>
                  <p>
                    {m.access_status === "active"
                      ? "Accès permanent"
                      : m.access_status === "suspended"
                        ? "Suspendu"
                        : `Essai — ${trialDaysLeft(m.trial_ends_at)} j restants`}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openId === m.id ? "rotate-180" : ""}`}
                />
              </button>

              {openId === m.id && (
                <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background/50 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoRow icon={Store} label="Nom du commerce" value={m.nom_commerce} />
                    <InfoRow icon={Globe} label="Secteur" value={m.secteur} />
                    <InfoRow icon={Mail} label="Email" value={m.email} />
                    <InfoRow icon={Phone} label="Téléphone" value={m.telephone} />
                    <InfoRow icon={MapPin} label="Adresse" value={m.adresse} />
                    <InfoRow
                      icon={CalendarDays}
                      label="Inscription"
                      value={new Date(m.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Statut :{" "}
                    {m.access_status === "active"
                      ? "Accès permanent"
                      : m.access_status === "suspended"
                        ? "Suspendu"
                        : `Essai (${trialDaysLeft(m.trial_ends_at)} j restants)`}
                    {" · "}Onboarding {m.onboarding_completed ? "terminé" : "en cours"}
                    {" · "}{m.clients} client(s)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={m.access_status === "active" ? "default" : "outline"}
                      onClick={() => setStatus(m.id, "active")}
                    >
                      Accès permanent
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => extendTrial(m.id, m.trial_ends_at)}>
                      +14 j d'essai
                    </Button>
                    <Button
                      size="sm"
                      variant={m.access_status === "suspended" ? "destructive" : "outline"}
                      onClick={() => setStatus(m.id, "suspended")}
                    >
                      Suspendre
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {(merchants ?? []).length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun commerçant.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}