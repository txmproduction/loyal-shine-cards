import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAllMerchants, useIsAdmin } from "@/lib/fideo";

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

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: merchants } = useAllMerchants(!!isAdmin);

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

      <section className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {(merchants ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
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
              </div>
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