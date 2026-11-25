import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Apple, Smartphone } from "lucide-react";
import { generateWalletCard, getSharedCard } from "@/lib/wallet.functions";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/c/$token")({
  loader: async ({ params }) => {
    const card = await getSharedCard({ data: { token: params.token } }).catch(() => null);
    if (!card) throw notFound();
    return card;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Votre carte ${loaderData.nomCommerce} — Fidéo` : "Carte de fidélité — Fidéo" },
      { name: "description", content: "Ajoutez votre carte de fidélité à Apple Wallet ou Google Wallet en un geste." },
      { property: "og:title", content: loaderData ? `Votre carte de fidélité ${loaderData.nomCommerce}` : "Votre carte de fidélité" },
      { property: "og:description", content: "Appuyez sur « Ajouter à Apple Wallet » pour garder votre carte sur votre téléphone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <Shell>
      <p className="text-center text-sm text-muted-foreground">Ce lien de carte n'est pas valide.</p>
    </Shell>
  ),
  errorComponent: () => (
    <Shell>
      <p className="text-center text-sm text-muted-foreground">Impossible d'afficher la carte.</p>
    </Shell>
  ),
  component: SharedCardPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">{children}</div>
    </main>
  );
}

function SharedCardPage() {
  const card = Route.useLoaderData();
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [appleBusy, setAppleBusy] = useState(false);
  const createGoogle = useServerFn(generateWalletCard);

  useEffect(() => {
    const ua = navigator.userAgent;
    setOs(/iPhone|iPad|iPod|Macintosh/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other");
  }, []);

  if (!card.active) {
    return (
      <Shell>
        <h1 className="text-center text-xl font-bold">Carte indisponible</h1>
        <p className="text-center text-sm text-muted-foreground">
          Le programme de fidélité de {card.nomCommerce} est momentanément indisponible.
        </p>
      </Shell>
    );
  }

  const apple = () => {
    if (appleBusy) return;
    setAppleBusy(true);
    window.setTimeout(() => setAppleBusy(false), 20000);
    window.location.href = `/api/public/apple-pass/${card.customerId}`;
  };
  const google = async () => {
    setErr("");
    setLoading(true);
    try {
      const { url } = await createGoogle({ data: { customer_id: card.customerId } });
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Impossible de générer la carte Google Wallet.");
    } finally {
      setLoading(false);
    }
  };

  const appleBtn = (
    <Button key="a" size="lg" variant={os === "android" ? "secondary" : "default"} className="w-full" onClick={apple} disabled={appleBusy}>
      <Apple className="mr-2 h-5 w-5" /> {appleBusy ? "Ouverture de Wallet… patientez 10-15 s" : "Ajouter à Apple Wallet"}
    </Button>
  );
  const googleBtn = (
    <Button key="g" size="lg" variant={os === "android" ? "default" : "secondary"} className="w-full" onClick={google} disabled={loading}>
      <Smartphone className="mr-2 h-5 w-5" /> {loading ? "Préparation…" : "Ajouter à Google Wallet"}
    </Button>
  );

  return (
    <Shell>
      <div className="animate-rise space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">Votre carte {card.nomCommerce}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {card.mode === "montant" ? `${card.points.toFixed(2)} € / ${card.goal.toFixed(2)} €` : `${card.points} / ${card.goal} points`} · {card.reward}
          </p>
        </div>
        <div className="flex justify-center">
          <LoyaltyCardPreview
            nomCommerce={card.nomCommerce}
            valeurRecompense={card.reward}
            nbPoints={card.goal}
            points={card.points}
            mode={card.mode}
            couleur={card.couleur}
            logoUrl={card.logoUrl}
            photoUrl={card.photoUrl}
            titulaire={card.titulaire}
            qrValue={card.customerId}
          />
        </div>
        <div className="flex flex-col gap-2">{os === "android" ? [googleBtn, appleBtn] : [appleBtn, googleBtn]}</div>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </Shell>
  );
}
