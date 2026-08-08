import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, LineChart, Smartphone, Sparkles, Store, Users } from "lucide-react";
import { BRAND_LOGO } from "@/lib/fideo";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fidéo — La carte de fidélité digitale des commerçants" },
      {
        name: "description",
        content:
          "Fidéo remplace la carte à tampons : points en un clic, clients fidélisés, statistiques claires et cartes prêtes pour Apple Wallet et Google Wallet.",
      },
      { property: "og:title", content: "Fidéo — La carte de fidélité digitale" },
      {
        property: "og:description",
        content: "Digitalisez votre programme de fidélité en quelques minutes.",
      },
      { property: "og:image", content: BRAND_LOGO },
      { name: "twitter:image", content: BRAND_LOGO },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CreditCard,
    title: "Carte 100 % digitale",
    text: "Un design violet signature, des points qui se remplissent, plus aucun carton perdu au fond d'une poche.",
  },
  {
    icon: Smartphone,
    title: "Prêt pour Apple & Google Wallet",
    text: "La structure des pass est déjà en place : vos clients garderont leur carte dans leur téléphone.",
  },
  {
    icon: LineChart,
    title: "Statistiques utiles",
    text: "Points distribués, heures de pointe, jours forts et nouveaux clients, semaine après semaine.",
  },
  {
    icon: Users,
    title: "Équipe et multi-sites",
    text: "Chaque employé ajoute un point avec son code PIN, sur chacun de vos établissements.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-11 w-11 object-contain" />
          <span className="font-display text-xl font-extrabold">Fidéo</span>
        </div>
        <Link
          to="/auth"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-violet transition-transform duration-200 hover:-translate-y-0.5"
        >
          Espace commerçant
        </Link>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-accent-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> Fidélité nouvelle génération
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              La fidélité de votre commerce,
              <span className="block bg-brand bg-clip-text text-transparent">sans carte papier.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              Fidéo crée votre carte de fidélité digitale, suit chaque passage et vous montre
              exactement ce qui fait revenir vos clients.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-violet transition-transform duration-200 hover:-translate-y-0.5"
              >
                Créer ma carte
              </Link>
              <Link
                to="/auth"
                className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Voir la démo
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" /> Déjà utilisé par des commerces indépendants
            </div>
          </div>
          <div className="flex animate-float justify-center lg:justify-end">
            <LoyaltyCardPreview
              nomCommerce="La Maison Du 50"
              valeurRecompense="Vidange offerte"
              nbPoints={6}
              points={4}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <article
              key={title}
              className="card-hover animate-rise rounded-2xl border border-border bg-card p-6 shadow-soft"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="inline-flex rounded-xl bg-accent p-2.5 text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Fidéo</p>
          <p>Apple Wallet & Google Wallet — bientôt disponibles</p>
        </div>
      </footer>
    </div>
  );
}
