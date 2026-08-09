import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Apple, ImagePlus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoyaltyCard, useMerchant } from "@/lib/fideo";
import { CARD_PALETTE, uploadImage } from "@/lib/upload";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import { EstablishmentsSection } from "@/components/fideo/EstablishmentsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/_authenticated/carte")({
  head: () => ({
    meta: [
      { title: "Carte de fidélité — Fidéo" },
      {
        name: "description",
        content:
          "Choisissez le mode de récompense, ajoutez votre logo et personnalisez les couleurs de votre carte.",
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
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"passages" | "montant">("passages");
  const [nbPoints, setNbPoints] = useState(10);
  const [montantGoal, setMontantGoal] = useState(100);
  const [valeur, setValeur] = useState("");
  const [couleur, setCouleur] = useState("#7C3AED");
  const [nomCommerce, setNomCommerce] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setNbPoints(card.nb_points_pour_recompense);
      setMontantGoal(Number(card.montant_pour_recompense || 100));
      setValeur(card.valeur_recompense);
      setMode(card.mode_recompense === "montant" ? "montant" : "passages");
    }
  }, [card]);

  useEffect(() => {
    if (merchant) {
      setNomCommerce(merchant.nom_commerce);
      setCouleur(merchant.couleur_marque ?? "#7C3AED");
      setLogoUrl(merchant.logo_url);
      setPhotoUrl(merchant.photo_url ?? null);
    }
  }, [merchant]);

  const uploadPhoto = async (file: File) => {
    if (!merchant) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "photo");
      setPhotoUrl(url);
      const { error } = await supabase
        .from("merchants")
        .update({ photo_url: url })
        .eq("id", merchant.id);
      if (error) throw new Error(error.message);
      toast.success("Photo mise à jour");
      void qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const uploadLogo = async (file: File) => {
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid || !merchant) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image trop lourde (3 Mo max)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${uid}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      toast.error("Upload impossible", { description: error.message });
      return;
    }
    const { data: signed, error: e2 } = await supabase.storage
      .from("logos")
      .createSignedUrl(path, 60 * 60 * 24 * 3650);
    setUploading(false);
    if (e2 || !signed) {
      toast.error("Lien du logo indisponible");
      return;
    }
    setLogoUrl(signed.signedUrl);
    const { error: e3 } = await supabase
      .from("merchants")
      .update({ logo_url: signed.signedUrl })
      .eq("id", merchant.id);
    if (e3) {
      toast.error("Enregistrement du logo impossible");
      return;
    }
    toast.success("Logo mis à jour");
    void qc.invalidateQueries();
  };

  const save = async () => {
    if (!merchant || !card) return;
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_cards")
      .update({
        mode_recompense: mode,
        nb_points_pour_recompense: nbPoints,
        montant_pour_recompense: montantGoal,
        valeur_recompense: valeur,
        design: {
          couleur,
          regle: mode === "montant" ? `${montantGoal} € dépensés` : "1 point = 1 passage",
        },
      })
      .eq("id", card.id);
    const { error: e2 } = await supabase
      .from("merchants")
      .update({ nom_commerce: nomCommerce, couleur_marque: couleur, photo_url: photoUrl })
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Carte de fidélité</h1>
          <p className="text-sm text-muted-foreground">Modifiable à tout moment.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/onboarding">Relancer l'assistant de configuration</Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="animate-rise space-y-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="space-y-2">
            <Label>Nom du commerce</Label>
            <Input value={nomCommerce} onChange={(e) => setNomCommerce(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Logo du commerce</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo du commerce" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Envoi…" : "Choisir une image"}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG — 3 Mo max.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mode de récompense</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "passages" | "montant")}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="mode-passages"
                className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${mode === "passages" ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <RadioGroupItem value="passages" id="mode-passages" /> Nombre de passages
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  1 passage = 1 point.
                </span>
              </label>
              <label
                htmlFor="mode-montant"
                className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${mode === "montant" ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <RadioGroupItem value="montant" id="mode-montant" /> Montant dépensé
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Cumul des euros dépensés.
                </span>
              </label>
            </RadioGroup>
          </div>

          {mode === "passages" ? (
            <div className="space-y-2">
              <Label>Nombre de passages pour une récompense</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={nbPoints}
                onChange={(e) => setNbPoints(Math.max(1, Math.min(50, Number(e.target.value))))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Montant à atteindre pour une récompense (€)</Label>
              <Input
                type="number"
                min={1}
                step="1"
                value={montantGoal}
                onChange={(e) => setMontantGoal(Math.max(1, Number(e.target.value)))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Récompense offerte</Label>
            <Input
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              placeholder="Vidange offerte"
            />
          </div>

          <div className="space-y-2">
            <Label>Photo de la carte</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                {photoUrl ? (
                  <img src={photoUrl} alt="Photo du commerce" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadPhoto(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => photoRef.current?.click()} disabled={uploading}>
                    {uploading ? "Envoi…" : "Choisir une photo"}
                  </Button>
                  {photoUrl && (
                    <Button variant="ghost" onClick={() => setPhotoUrl(null)}>
                      Retirer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Utilisée en fond de carte (5 Mo max).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Couleur de la carte</Label>
            <div className="flex flex-wrap items-center gap-2">
              {CARD_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  onClick={() => setCouleur(c)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${couleur.toLowerCase() === c.toLowerCase() ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              nbPoints={mode === "montant" ? montantGoal : nbPoints}
              points={mode === "montant" ? Math.round(montantGoal / 3) : Math.min(nbPoints, 3)}
              couleur={couleur}
              logoUrl={logoUrl}
              photoUrl={photoUrl}
              mode={mode}
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

      <EstablishmentsSection merchantId={merchant?.id} />
    </div>
  );
}
