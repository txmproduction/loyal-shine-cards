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
