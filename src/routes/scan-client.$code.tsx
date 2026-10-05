import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Apple, Check, CreditCard, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_LOGO } from "@/lib/fideo";
import { generateWalletCard, refreshWalletCard } from "@/lib/wallet.functions";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/scan-client/$code")({
  head: () => ({
    meta: [
      { title: "Validez votre passage — Fidéo" },
      {
        name: "description",
        content:
          "Scannez le QR code du comptoir, tapez votre numéro de téléphone et gagnez votre point de fidélité en quelques secondes.",
      },
      { property: "og:title", content: "Validez votre passage — Fidéo" },
      {
        property: "og:description",
        content: "Scannez le QR code du comptoir et gagnez votre point de fidélité.",
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
  component: ScanCounterPage,
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
  photo_url: string | null;
  couleur_marque: string | null;
  acces_actif: boolean;
  mode_recompense: string | null;
  seuil: number | null;
  valeur_recompense: string | null;
};

type ScanResult = {
  customer_id: string;
  nom: string;
  prenom: string | null;
  already: boolean;
  mode: string;
  total: number;
  seuil: number;
  valeur: string;
};

function ScanCounterPage() {
  const { code } = Route.useParams();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const createWalletCard = useServerFn(generateWalletCard);
  const refreshWallet = useServerFn(refreshWalletCard);

  const addToGoogleWallet = async () => {
    if (!result) return;
    setWalletError("");
    setWalletLoading(true);
    try {
      const { url } = await createWalletCard({ data: { customer_id: result.customer_id } });
      window.location.href = url;
    } catch (e) {
      setWalletError(
        e instanceof Error ? e.message : "Impossible de générer la carte Google Wallet.",
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const { data: place, isLoading } = useQuery({
    queryKey: ["public_establishment_scan", code],
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
    const { data, error: e } = await supabase.rpc("scan_client_public", {
      _code: code,
      _nom: nom.trim(),
      _prenom: prenom.trim(),
      _telephone: telephone.trim(),
    });
    setSaving(false);
    if (e) {
      setError(friendlyError(e.message));
      return;
    }
    const res = data as ScanResult;
    setResult(res);
    // Met à jour la carte Wallet du client (Google + push Apple), sans bloquer l'écran.
    void refreshWallet({ data: { customer_id: res.customer_id } }).catch(() => undefined);
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

  if (!place.acces_actif) {
    return (
      <Centered>
        <div className="animate-rise space-y-4 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CreditCard className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-extrabold">Programme indisponible</h1>
          <p className="text-sm text-muted-foreground">
            Le scan au comptoir est désactivé. L'accès du commerce est suspendu : merci de mettre à
            jour votre moyen de paiement dans votre espace Fidéo pour le réactiver.
          </p>
        </div>
      </Centered>
    );
  }

  if (result) {
    const amountMode = result.mode === "montant";
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent);
    return (
      <Centered>
        <div className="animate-rise space-y-5 rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold">
              {result.already ? "Déjà validé aujourd'hui" : isMobile ? "Point ajouté 🎉" : "Passage validé"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.already
                ? "Vous avez déjà reçu votre point il y a moins de 24 h. À demain !"
                : place.nom_commerce + " vous remercie. À très vite !"}
            </p>
          </div>
          <div className="flex justify-center">
            <LoyaltyCardPreview
              nomCommerce={place.nom_commerce}
              valeurRecompense={result.valeur || place.valeur_recompense || "Récompense offerte"}
              nbPoints={Number(result.seuil ?? place.seuil ?? 10)}
              points={Number(result.total ?? 0)}
              mode={amountMode ? "montant" : "passages"}
              couleur={couleur}
              logoUrl={place.logo_url}
              photoUrl={place.photo_url}
              titulaire={[result.prenom, result.nom].filter(Boolean).join(" ")}
              qrValue={result.customer_id}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Ajoutez votre carte dans votre wallet pour la retrouver à chaque visite :
            </p>
            <Button
              variant="secondary"
              className="justify-center"
              onClick={() => {
                window.location.href = `/api/public/apple-pass/${result.customer_id}`;
              }}
            >
              <Apple className="mr-2 h-4 w-4" /> Ajouter à Apple Wallet
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              onClick={addToGoogleWallet}
              disabled={walletLoading}
            >
              <Smartphone className="mr-2 h-4 w-4" />
              {walletLoading ? "Génération…" : "Ajouter à Google Wallet"}
            </Button>
            {walletError && <p className="text-xs text-destructive">{walletError}</p>}
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
          Validez votre passage en quelques secondes : votre point est ajouté automatiquement.
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
            <p className="text-xs text-muted-foreground">
              Votre numéro sert à retrouver votre carte. Maximum 1 point par jour.
            </p>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? "Validation…" : "Valider mon passage"}
        </Button>
      </div>
    </Centered>
  );
}

function friendlyError(message: string) {
  if (message.includes("Établissement introuvable")) {
    return "Ce QR code n'est pas valide.";
  }
  if (message.includes("désactivé")) {
    return "Le scan au comptoir est désactivé pour ce commerce.";
  }
  if (message.includes("momentanément indisponible")) {
    return "Programme momentanément indisponible. Merci de réessayer plus tard.";
  }
  return message;
}
