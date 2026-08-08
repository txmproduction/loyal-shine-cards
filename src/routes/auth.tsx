import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BRAND_LOGO } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion commerçant — Fidéo" },
      {
        name: "description",
        content: "Connectez-vous à votre espace Fidéo pour gérer vos points, clients et récompenses.",
      },
      { property: "og:title", content: "Connexion commerçant — Fidéo" },
      { property: "og:description", content: "Accédez à votre tableau de bord de fidélité." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomCommerce, setNomCommerce] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nom_commerce: nomCommerce || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Compte créé", {
          description: "Vérifiez votre boîte mail pour confirmer votre adresse.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      return;
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-ink-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-11 w-11 object-contain" />
          <span className="font-display text-xl font-extrabold">Fidéo</span>
        </div>
        <div className="animate-rise">
          <h1 className="text-4xl font-extrabold leading-tight">
            Vos clients reviennent.
            <br />
            Vos données parlent.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            Un point par passage, une récompense méritée, et une vision claire de votre activité.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">Apple Wallet & Google Wallet à venir</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-10 w-10 object-contain" />
            <span className="font-display text-lg font-extrabold">Fidéo</span>
          </div>
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Connexion commerçant" : "Créer votre espace"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Accédez à votre tableau de bord."
              : "Votre carte de fidélité est prête en 30 secondes."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du commerce</Label>
                <Input
                  id="nom"
                  value={nomCommerce}
                  onChange={(e) => setNomCommerce(e.target.value)}
                  placeholder="La Maison Du 50"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@moncommerce.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon espace"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continuer avec Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Créer un espace" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
