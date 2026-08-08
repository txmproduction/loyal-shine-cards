import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Apple, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoyaltyCard, useMerchant } from "@/lib/fideo";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/carte")({
  head: () => ({
    meta: [
      { title: "Carte de fidélité — Fidéo" },
      {
        name: "description",
        content: "Paramétrez le nombre de passages, la récompense et les couleurs de votre carte.",
      },
      { property: "og:title", content: "Carte de fidélité — Fidéo" },
      { property: "og:description", content: "Personnalisez votre programme de fidélité." },
    ],
  }),
  component: CardSettings,
});

function CardSettings() {
  const { data: merchant } = useMerchant();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const qc = useQueryClient();

  const [nbPoints, setNbPoints] = useState(10);
  const [valeur, setValeur] = useState("");
  const [couleur, setCouleur] = useState("#7C3AED");
  const [nomCommerce, setNomCommerce] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setNbPoints(card.nb_points_pour_recompense);
      setValeur(card.valeur_recompense);
    }
  }, [card]);

  useEffect(() => {
    if (merchant) {
      setNomCommerce(merchant.nom_commerce);
      setCouleur(merchant.couleur_marque ?? "#7C3AED");
    }
  }, [merchant]);

  const save = async () => {
    if (!merchant || !card) return;
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_cards")
      .update({
        nb_points_pour_recompense: nbPoints,
        valeur_recompense: valeur,
        design: { couleur, regle: "1 point = 1 passage" },
      })
      .eq("id", card.id);
    const { error: e2 } = await supabase
      .from("merchants")
      .update({ nom_commerce: nomCommerce, couleur_marque: couleur })
      .eq("id", merchant.id);
    setSaving(false);
    if (error || e2) {
      toast.error("Enregistrement impossible");
      return;
    }
    toast.success("Carte mise à jour");
    void qc.invalidateQueries();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">Carte de fidélité</h1>
        <p className="text-sm text-muted-foreground">Modifiable à tout moment.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="animate-rise space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="space-y-2">
            <Label>Nom du commerce</Label>
            <Input value={nomCommerce} onChange={(e) => setNomCommerce(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nombre de passages pour une récompense</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={nbPoints}
              onChange={(e) => setNbPoints(Math.max(1, Math.min(20, Number(e.target.value))))}
            />
          </div>
          <div className="space-y-2">
            <Label>Récompense offerte</Label>
            <Input
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              placeholder="Vidange offerte"
            />
          </div>
          <div className="space-y-2">
            <Label>Couleur de marque</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={couleur}
                onChange={(e) => setCouleur(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card"
                aria-label="Couleur de marque"
              />
              <Input value={couleur} onChange={(e) => setCouleur(e.target.value)} className="w-32" />
            </div>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </section>

        <section className="space-y-4">
          <div className="animate-rise flex justify-center">
            <LoyaltyCardPreview
              nomCommerce={nomCommerce || "Votre commerce"}
              valeurRecompense={valeur || "Récompense offerte"}
              nbPoints={nbPoints}
              points={Math.min(nbPoints, 3)}
              couleur={couleur}
            />
          </div>
          <div className="animate-rise rounded-2xl border border-dashed border-border bg-card p-5 text-sm shadow-soft">
            <h2 className="text-base font-bold">Wallet</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              La génération des pass sera activée dès que la licence Apple Developer sera disponible.
              La structure est déjà prête en base.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
                <Apple className="h-3 w-3" /> Apple Wallet — bientôt
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
                <Smartphone className="h-3 w-3" /> Google Wallet — bientôt
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
