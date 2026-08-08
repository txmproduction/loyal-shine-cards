import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Award, Coins, Gift, UserPlus } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/fideo/StatCard";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import {
  DAY_LABELS,
  inRange,
  pctChange,
  startOfDay,
  useCustomers,
  useEmployees,
  useEmployeeSelf,
  useLoyaltyCard,
  useMerchant,
  usePoints,
  useRewards,
} from "@/lib/fideo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Fidéo" },
      {
        name: "description",
        content: "Points distribués, nouveaux clients et récompenses échangées de votre commerce.",
      },
      { property: "og:title", content: "Tableau de bord — Fidéo" },
      { property: "og:description", content: "Vos statistiques de fidélité en un coup d'œil." },
    ],
  }),
  component: Dashboard,
});

const chartAxis = { stroke: "var(--color-muted-foreground)", fontSize: 11 };

function Panel({
  title,
  subtitle,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="text-base font-bold">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 h-56 w-full">{children}</div>
    </section>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: employee, isLoading: employeeLoading } = useEmployeeSelf();

  useEffect(() => {
    if (employee) void navigate({ to: "/clients", replace: true });
  }, [employee, navigate]);

  const { data: merchant } = useMerchant();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: customers } = useCustomers(merchant?.id);
  const ids = useMemo(() => (customers ?? []).map((c) => c.id), [customers]);
  const { data: points } = usePoints(ids);
  const { data: rewards } = useRewards(ids);
  const { data: employees } = useEmployees(merchant?.id);
  const [claiming, setClaiming] = useState(false);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);

  const pts = points ?? [];
  const rws = rewards ?? [];
  const cls = customers ?? [];

  const ptsWeek = pts.filter((p) => inRange(p.date, weekAgo, now)).reduce((a, p) => a + p.points_ajoutes, 0);
  const ptsPrev = pts
    .filter((p) => inRange(p.date, twoWeeksAgo, weekAgo))
    .reduce((a, p) => a + p.points_ajoutes, 0);
  const newWeek = cls.filter((c) => inRange(c.created_at, weekAgo, now)).length;
  const newPrev = cls.filter((c) => inRange(c.created_at, twoWeeksAgo, weekAgo)).length;
  const rwWeek = rws.filter((r) => inRange(r.date, weekAgo, now)).length;
  const rwPrev = rws.filter((r) => inRange(r.date, twoWeeksAgo, weekAgo)).length;

  const perDay = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => startOfDay(new Date(now.getTime() - (13 - i) * 864e5)));
    return days.map((d) => {
      const next = new Date(d.getTime() + 864e5);
      return {
        jour: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        points: pts.filter((p) => inRange(p.date, d, next)).reduce((a, p) => a + p.points_ajoutes, 0),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const perHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ heure: `${h}h`, passages: 0 }));
    pts.forEach((p) => {
      const h = new Date(p.date).getHours();
      buckets[h]!.passages += 1;
    });
    return buckets.slice(7, 22);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const perWeekday = useMemo(() => {
    const buckets = DAY_LABELS.map((jour) => ({ jour, passages: 0 }));
    pts.forEach((p) => {
      buckets[new Date(p.date).getDay()]!.passages += 1;
    });
    return [...buckets.slice(1), buckets[0]!];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const newPerWeek = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const from = new Date(now.getTime() - (7 - i + 1) * 7 * 864e5);
      const to = new Date(from.getTime() + 7 * 864e5);
      return {
        semaine: `S-${7 - i}`,
        clients: cls.filter((c) => inRange(c.created_at, from, to)).length,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  const perEmployee = useMemo(() => {
    const rows = (employees ?? []).map((e) => {
      const mine = pts.filter((p) => p.employee_id === e.id);
      return {
        id: e.id,
        nom: e.nom,
        passages: mine.length,
        clients: new Set(mine.map((p) => p.customer_id)).size,
      };
    });
    return rows.sort((a, b) => b.clients - a.clients || b.passages - a.passages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, points]);

  const claimDemo = async () => {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_demo_merchant");
    setClaiming(false);
    if (error) {
      toast.error("Démo indisponible", { description: "Elle a déjà été récupérée par un compte." });
      return;
    }
    toast.success("Données de démonstration chargées");
    window.location.reload();
  };

  if (employeeLoading || employee) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour 👋</p>
          <h1 className="text-3xl font-extrabold">{merchant?.nom_commerce ?? "Votre commerce"}</h1>
        </div>
        {cls.length === 0 && (
          <Button onClick={claimDemo} disabled={claiming} variant="outline">
            {claiming ? "Chargement…" : "Charger la démo « La Maison Du 50 »"}
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Points distribués (7 j)" value={ptsWeek} delta={pctChange(ptsWeek, ptsPrev)} icon={Coins} index={0} />
        <StatCard label="Nouveaux clients (7 j)" value={newWeek} delta={pctChange(newWeek, newPrev)} icon={UserPlus} index={1} />
        <StatCard label="Récompenses échangées (7 j)" value={rwWeek} delta={pctChange(rwWeek, rwPrev)} icon={Gift} index={2} />
        <StatCard label="Clients fidèles" value={cls.length} icon={Award} hint="total sur votre carte" index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Points par jour" subtitle="14 derniers jours" delay={40}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={perDay} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gpts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="jour" tick={chartAxis} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
              <Area type="monotone" dataKey="points" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#gpts)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Heures de pointe" subtitle="Répartition des passages" delay={80}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perHour} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="heure" tick={chartAxis} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--color-accent)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
              <Bar dataKey="passages" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Jours actifs de la semaine" delay={120}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perWeekday} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="jour" tick={chartAxis} tickLine={false} axisLine={false} />
              <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--color-accent)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
              <Bar dataKey="passages" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Nouveaux clients par semaine" subtitle="8 dernières semaines" delay={160}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newPerWeek} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="semaine" tick={chartAxis} tickLine={false} axisLine={false} />
              <YAxis tick={chartAxis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
              <Line type="monotone" dataKey="clients" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">Classement des employés</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Qui fait signer le plus de cartes de fidélité
        </p>
        <ul className="divide-y divide-border">
          {perEmployee.map((e, i) => (
            <li key={e.id} className="flex items-center gap-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.nom}</span>
              <span className="text-xs text-muted-foreground">
                {e.clients} client(s) · {e.passages} passage(s)
              </span>
            </li>
          ))}
          {perEmployee.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Aucun employé enregistré.
            </li>
          )}
        </ul>
      </section>

      <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-bold">Votre carte</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {card ? `${card.nb_points_pour_recompense} passages = ${card.valeur_recompense}` : "—"}
        </p>
        <LoyaltyCardPreview
          nomCommerce={merchant?.nom_commerce ?? "Votre commerce"}
          valeurRecompense={card?.valeur_recompense ?? "Récompense offerte"}
          nbPoints={card?.nb_points_pour_recompense ?? 10}
          points={Math.min(card?.nb_points_pour_recompense ?? 10, 3)}
          couleur={merchant?.couleur_marque}
        />
      </section>
    </div>
  );
}
