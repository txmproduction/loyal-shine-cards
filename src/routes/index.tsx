import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_LOGO } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Créer votre compte commerçant — Fidéo" },
      {
        name: "description",
        content:
          "Inscrivez votre commerce sur Fidéo et créez votre carte de fidélité digitale en 5 minutes : points, clients et récompenses.",
      },
      { property: "og:title", content: "Créer votre compte commerçant — Fidéo" },
      {
        property: "og:description",
        content: "Créez votre carte de fidélité digitale en 5 minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: BRAND_LOGO },
      { name: "twitter:image", content: BRAND_LOGO },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState("");
  const [nomCommerce, setNomCommerce] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            prenom: prenom.trim(),
            telephone: telephone.trim(),
            nom_commerce: nomCommerce.trim() || email.split("@")[0],
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        void navigate({ to: "/dashboard" });
      } else {
        toast.success("Compte créé", {
          description: "Vérifiez votre boîte mail pour confirmer votre adresse.",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-ink-gradient flex min-h-screen items-center justify-center px-5 py-12 text-primary-foreground">
      <div className="animate-rise w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-16 w-16 object-contain" />
          <h1 className="font-display mt-4 text-3xl font-extrabold">Fidéo</h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Créez votre carte de fidélité en 5 minutes
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <div className="space-y-2">
            <Label htmlFor="prenom" className="text-primary-foreground/80">
              Votre prénom
            </Label>
            <Input
              id="prenom"
              required
              value={prenom}
              onChange={(ev) => setPrenom(ev.target.value)}
              autoComplete="given-name"
              className="border-white/15 bg-white/5 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="Guillaume"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commerce" className="text-primary-foreground/80">
              Nom de votre commerce
            </Label>
            <Input
              id="commerce"
              required
              value={nomCommerce}
              onChange={(ev) => setNomCommerce(ev.target.value)}
              className="border-white/15 bg-white/5 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="La Maison Du 50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-primary-foreground/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="email"
              className="border-white/15 bg-white/5 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="contact@moncommerce.fr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tel" className="text-primary-foreground/80">
              Téléphone
            </Label>
            <Input
              id="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(ev) => setTelephone(ev.target.value)}
              className="border-white/15 bg-white/5 text-primary-foreground placeholder:text-primary-foreground/40"
              placeholder="06 12 34 56 78"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-primary-foreground/80">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="new-password"
                className="border-white/15 bg-white/5 pr-11 text-primary-foreground placeholder:text-primary-foreground/40"
                placeholder="Minimum 6 caractères"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-primary-foreground/60 transition-colors hover:text-primary-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="cgu"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
            />
            <Label htmlFor="cgu" className="text-xs leading-relaxed text-primary-foreground/70">
              J'accepte les{" "}
              <a href="/cgv" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Conditions Générales
              </a>
              , la{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Politique de Confidentialité
              </a>{" "}
              et le{" "}
              <a href="/dpa" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Contrat de Sous-traitance (DPA)
              </a>{" "}
              de Fidéo.
            </Label>
          </div>

          <Button
            type="submit"
            disabled={!accepted || loading}
            className="bg-brand shadow-violet w-full text-primary-foreground disabled:opacity-40"
          >
            {loading ? "Création…" : "Créer mon compte"}
          </Button>

          <p className="text-center text-sm text-primary-foreground/70">
            Déjà un compte ?{" "}
            <Link to="/auth" className="font-semibold underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

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
