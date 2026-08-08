import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Apple, Check, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_LOGO } from "@/lib/fideo";
import { QrImage } from "@/components/fideo/QrImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/rejoindre/$code")({
  head: () => ({
    meta: [
      { title: "Rejoindre le programme de fidélité — Fidéo" },
      {
        name: "description",
        content:
          "Inscrivez-vous en 10 secondes au programme de fidélité du commerce et recevez votre carte digitale.",
      },
      { property: "og:title", content: "Votre carte de fidélité — Fidéo" },
      {
        property: "og:description",
        content: "Nom, prénom, téléphone : votre carte de fidélité digitale est prête.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <Centered>
      <p className="text-sm text-muted-foreground">Ce lien n'est pas valide.</p>
    </Centered>
  ),
  notFoundComponent: () => (
    <Centered>
      <p className="text-sm text-muted-foreground">Établissement introuvable.</p>
    </Centered>
  ),
  component: JoinPage,
});

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">{children}</div>
    </main>
  );
}

type PublicEstablishment = {
  establishment_id: string;
  establishment_nom: string;
  nom_commerce: string;
  logo_url: string | null;
  couleur_marque: string | null;
};

function JoinPage() {
  const { code } = Route.useParams();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const { data: place, isLoading } = useQuery({
    queryKey: ["public_establishment", code],
    queryFn: async () => {
      const { data, error: e } = await supabase.rpc("get_public_establishment", { _code: code });
      if (e) throw e;
      return ((data as PublicEstablishment[] | null) ?? [])[0] ?? null;
    },
  });

  const submit = async () => {
    setError("");
    if (!nom.trim() || !telephone.trim()) {
      setError("Nom et téléphone sont obligatoires.");
      return;
    }
    setSaving(true);
    const { data, error: e } = await supabase.rpc("register_customer_public", {
      _code: code,
      _nom: nom.trim(),
      _prenom: prenom.trim(),
      _telephone: telephone.trim(),
    });
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setCustomerId(data as string);
  };

  const couleur = place?.couleur_marque ?? "#7C3AED";

  if (isLoading) {
    return (
      <Centered>
        <p className="text-center text-sm text-muted-foreground">Chargement…</p>
      </Centered>
    );
  }

  if (!place) {
    return (
      <Centered>
        <h1 className="text-center text-xl font-bold">Lien invalide</h1>
        <p className="text-center text-sm text-muted-foreground">
          Ce QR code ne correspond à aucun établissement.
        </p>
      </Centered>
    );
  }

  if (customerId) {
    return (
      <Centered>
        <div className="animate-rise space-y-5 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold">Votre carte est prête</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Présentez ce QR code à chaque passage chez {place.nom_commerce}.
            </p>
          </div>
          <div
            className="mx-auto w-full rounded-3xl p-5 text-primary-foreground"
            style={{ backgroundImage: `linear-gradient(135deg, ${couleur}, #1a1024)` }}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">{place.nom_commerce}</p>
              <img src={place.logo_url ?? BRAND_LOGO} alt="" className="h-9 w-9 object-contain" />
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3">
              <QrImage value={customerId} size={180} className="mx-auto" alt="Votre QR code client" />
            </div>
            <p className="mt-3 text-xs opacity-80">
              {[prenom, nom].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" disabled className="justify-center">
              <Apple className="mr-2 h-4 w-4" /> Ajouter à Apple Wallet — bientôt
            </Button>
            <Button variant="secondary" disabled className="justify-center">
              <Smartphone className="mr-2 h-4 w-4" /> Ajouter à Google Wallet — bientôt
            </Button>
            <p className="text-xs text-muted-foreground">
              En attendant, ajoutez cette page à votre écran d'accueil :{" "}
              <span className="break-all">{origin}/carte/{customerId}</span>
            </p>
          </div>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="animate-rise space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <header className="flex items-center gap-3">
          <img
            src={place.logo_url ?? BRAND_LOGO}
            alt=""
            className="h-12 w-12 rounded-xl object-contain"
          />
          <div>
            <h1 className="text-lg font-extrabold leading-tight">{place.nom_commerce}</h1>
            <p className="text-xs text-muted-foreground">{place.establishment_nom}</p>
          </div>
        </header>
        <p className="text-sm text-muted-foreground">
          Créez votre carte de fidélité gratuite en 10 secondes. Aucun compte, aucun mot de passe.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prenom">Prénom</Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tel">Numéro de téléphone</Label>
            <Input
              id="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? "Création…" : "Créer ma carte"}
        </Button>
      </div>
    </Centered>
  );
}
