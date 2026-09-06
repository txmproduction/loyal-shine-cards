import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { saveGeoRelance } from "@/lib/geo-relance.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  nomCommerce: string;
  active?: boolean | null | undefined;
  rayonM?: number | null | undefined;
  message?: string | null | undefined;
};

/** Réglages de la relance de proximité poussée par Apple Wallet / Google Wallet. */
export function GeoRelanceSection({ nomCommerce, active, rayonM, message }: Props) {
  const save = useServerFn(saveGeoRelance);
  const [on, setOn] = useState(true);
  const [rayon, setRayon] = useState(1500);
  const [texte, setTexte] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOn(active !== false);
    setRayon(rayonM ?? 1500);
    setTexte(message ?? "");
  }, [active, rayonM, message]);

  const placeholder = `Vous passez près de ${nomCommerce || "votre commerce"} ! Passez faire tamponner votre carte Fidéo 🎉`;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await save({
        data: { active: on, rayon_m: rayon, message: texte.trim() || null },
      });
      toast.success(
        res.apple + res.google > 0
          ? `Réglages enregistrés — ${res.apple + res.google} carte(s) mise(s) à jour`
          : "Réglages enregistrés",
      );
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="animate-rise space-y-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MapPin className="h-4 w-4 text-primary" /> Relance de proximité
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Quand un client qui a votre carte dans son téléphone passe près de votre commerce, sa
            carte s'affiche sur son écran verrouillé avec votre message. Aucune application à
            installer, et le téléphone n'affiche pas le rappel en boucle.
          </p>
        </div>
        <Switch checked={on} onCheckedChange={setOn} aria-label="Activer la relance de proximité" />
      </div>

      <div className="space-y-2">
        <Label>Distance de déclenchement : {(rayon / 1000).toFixed(1).replace(".", ",")} km</Label>
        <Slider
          value={[rayon]}
          min={500}
          max={5000}
          step={100}
          disabled={!on}
          onValueChange={(v) => setRayon(v[0] ?? 1500)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>500 m</span>
          <span>5 km</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Message affiché (optionnel)</Label>
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value.slice(0, 120))}
          placeholder={placeholder}
          disabled={!on}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">{texte.length}/120 caractères</p>
      </div>

      <Button onClick={submit} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer et mettre à jour les cartes"}
      </Button>
    </section>
  );
}
