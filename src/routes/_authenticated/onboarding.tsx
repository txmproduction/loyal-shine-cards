import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Monitor, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishments, useLoyaltyCard, useMerchant } from "@/lib/fideo";
import { CARD_PALETTE, SECTEURS, uploadImage } from "@/lib/upload";
import { LoyaltyCardPreview } from "@/components/fideo/LoyaltyCardPreview";
import { NameSpacingHint } from "@/components/fideo/NameSpacingHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurer votre carte — Fidéo" },
      {
        name: "description",
        content:
          "Assistant de configuration Fidéo : établissement, identité visuelle, récompense et partage de votre carte de fidélité.",
      },
      { property: "og:title", content: "Configurer votre carte — Fidéo" },
      {
        property: "og:description",
        content: "Créez votre carte de fidélité digitale en six étapes guidées.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingWizard,
});

const STEPS = [
  "Établissement",
  "Identité visuelle",
  "Récompense",
  "Détail",
  "Partage",
  "Récapitulatif",
];

const SHARE_MODES = [
  {
    value: "qr",
    label: "QR code fixe en boutique",
    hint: "Un QR code à afficher sur le comptoir ou la vitrine.",
    icon: QrCode,
  },
  {
    value: "poster",
    label: "Poster imprimable",
    hint: "Une affiche A4 à imprimer avec votre QR code.",
    icon: Printer,
  },
  {
    value: "ecran",
    label: "Écran comptoir",
    hint: "Le QR code affiché en plein écran sur une tablette.",
    icon: Monitor,
  },
] as const;

function OnboardingWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: merchant } = useMerchant();
  const { data: card } = useLoyaltyCard(merchant?.id);
  const { data: establishments } = useEstablishments(merchant?.id);
  const establishment = establishments?.[0];

  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [nomEtab, setNomEtab] = useState("");
  const [telephone, setTelephone] = useState("");
  const [secteur, setSecteur] = useState("");
  const [adresse, setAdresse] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [couleur, setCouleur] = useState("#6C5DD3");
  const [mode, setMode] = useState<"passages" | "montant">("passages");
  const [seuil, setSeuil] = useState(6);
  const [montant, setMontant] = useState(100);
  const [valeur, setValeur] = useState("");
  const [partage, setPartage] = useState<string>("qr");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!merchant) return;
    setNomEtab((v) => v || merchant.nom_commerce);
    setTelephone((v) => v || merchant.telephone || "");
    setSecteur((v) => v || merchant.secteur || "");
    setAdresse((v) => v || merchant.adresse || "");
    setLogoUrl((v) => v ?? merchant.logo_url);
    setPhotoUrl((v) => v ?? merchant.photo_url ?? null);
    if (merchant.couleur_marque) setCouleur((v) => (v === "#6C5DD3" ? merchant.couleur_marque! : v));
    if (merchant.partage_mode) setPartage(merchant.partage_mode);
  }, [merchant]);

  useEffect(() => {
    if (!establishment) return;
    setNomEtab((v) => v || establishment.nom);
    setAdresse((v) => v || establishment.adresse || "");
  }, [establishment]);

  useEffect(() => {
    if (!card) return;
    setMode(card.mode_recompense === "montant" ? "montant" : "passages");
    setSeuil(card.nb_points_pour_recompense || 6);
    setMontant(Number(card.montant_pour_recompense || 100));
    setValeur((v) => v || card.valeur_recompense);
  }, [card]);

  const pickImage = async (file: File, kind: "logo" | "photo") => {
    setBusy(true);
    try {
      const url = await uploadImage(file, kind);
      if (kind === "logo") setLogoUrl(url);
      else setPhotoUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!merchant) return;
    if (!nomEtab.trim() || !telephone.trim() || !secteur.trim() || !adresse.trim() || !logoUrl) {
      toast.error("Veuillez remplir toutes les informations obligatoires.");
      return;
    }
    setBusy(true);
    const { error: e1 } = await supabase
      .from("merchants")
      .update({
        telephone: telephone.trim(),
        secteur: secteur.trim(),
        adresse: adresse.trim(),
        logo_url: logoUrl,
        photo_url: photoUrl,
        couleur_marque: couleur,
        partage_mode: partage,
        onboarding_completed: true,
      })
      .eq("id", merchant.id);

    if (establishment) {
      await supabase
        .from("establishments")
        .update({ nom: nomEtab.trim(), adresse: adresse.trim() })
        .eq("id", establishment.id);
      if (adresse.trim()) {
        const { geocoderEtablissement } = await import("@/lib/geocode.functions");
        void geocoderEtablissement({ data: { establishment_id: establishment.id } }).catch(
          () => undefined,
        );
      }
    }

    let e2 = null;
    if (card) {
      const res = await supabase
        .from("loyalty_cards")
        .update({
          mode_recompense: mode,
          nb_points_pour_recompense: seuil,
          montant_pour_recompense: montant,
          valeur_recompense: valeur.trim() || "Récompense offerte",
          design: { couleur, photo_url: photoUrl },
        })
        .eq("id", card.id);
      e2 = res.error;
    }
    setBusy(false);
    if (e1 || e2) {
      toast.error("Enregistrement impossible");
      return;
    }
    await qc.invalidateQueries();
    toast.success("Votre carte de fidélité est créée 🎉");
    void navigate({ to: "/dashboard" });
  };

  const canNext =
    step === 0
      ? nomEtab.trim().length > 1
      : step === 3
        ? (mode === "passages" ? seuil > 0 : montant > 0) && valeur.trim().length > 1
        : true;

  const preview = (
    <LoyaltyCardPreview
      nomCommerce={nomEtab || merchant?.nom_commerce || "Votre commerce"}
      valeurRecompense={valeur || "Récompense offerte"}
      nbPoints={mode === "montant" ? montant : seuil}
      points={mode === "montant" ? Math.round(montant / 3) : Math.min(seuil, 3)}
      couleur={couleur}
      logoUrl={logoUrl}
      photoUrl={photoUrl}
      mode={mode}
      titulaire="Dupont Patrick"
    />
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Étape {step + 1} / {STEPS.length}
        </p>
        <h1 className="text-3xl font-extrabold">{STEPS[step]}</h1>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="bg-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="animate-rise space-y-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="etab">Nom de l'établissement</Label>
                <Input id="etab" value={nomEtab} onChange={(e) => setNomEtab(e.target.value)} />
                <NameSpacingHint value={nomEtab} onFix={setNomEtab} />
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité</Label>
                <div className="flex flex-wrap gap-2">
                  {SECTEURS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSecteur(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${secteur === s ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adr">Adresse</Label>
                <Input
                  id="adr"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="12 rue des Lilas, 75011 Paris"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void pickImage(f, "logo");
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={busy}>
                    Choisir un logo
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Photo (commerce, produit, portrait)</Label>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Photo" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void pickImage(f, "photo");
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => photoRef.current?.click()}
                      disabled={busy}
                    >
                      Choisir une photo
                    </Button>
                    {photoUrl && (
                      <Button variant="ghost" onClick={() => setPhotoUrl(null)}>
                        Retirer
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Couleur de fond de la carte</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {CARD_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Couleur ${c}`}
                      onClick={() => setCouleur(c)}
                      className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 ${couleur.toLowerCase() === c.toLowerCase() ? "ring-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    aria-label="Couleur personnalisée"
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-card"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setMode("passages")}
                className={`rounded-xl border p-4 text-left transition-colors ${mode === "passages" ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
              >
                <p className="font-semibold">Nombre de passages</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Exemple : 6 visites = 1 produit offert.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("montant")}
                className={`rounded-xl border p-4 text-left transition-colors ${mode === "montant" ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
              >
                <p className="font-semibold">Montant dépensé</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Exemple : 100 € dépensés = 10 € offerts.
                </p>
              </button>
            </div>
          )}

          {step === 3 && (
            <>
              {mode === "passages" ? (
                <div className="space-y-2">
                  <Label htmlFor="seuil">Nombre de passages pour une récompense</Label>
                  <Input
                    id="seuil"
                    type="number"
                    min={1}
                    max={50}
                    value={seuil}
                    onChange={(e) => setSeuil(Math.max(1, Math.min(50, Number(e.target.value))))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="montant">Montant à atteindre (€)</Label>
                  <Input
                    id="montant"
                    type="number"
                    min={1}
                    value={montant}
                    onChange={(e) => setMontant(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="valeur">Description de la récompense</Label>
                <Textarea
                  id="valeur"
                  rows={3}
                  value={valeur}
                  onChange={(e) => setValeur(e.target.value)}
                  placeholder="Un menu offert"
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              {SHARE_MODES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPartage(s.value)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${partage === s.value ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}
                >
                  <s.icon className="mt-0.5 h-5 w-5" />
                  <span>
                    <span className="block font-semibold">{s.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground">
                Votre QR code d'inscription reste disponible à tout moment depuis la page « Carte de
                fidélité ».
              </p>
            </div>
          )}

          {step === 5 && (
            <ul className="space-y-3 text-sm">
              <Recap label="Établissement" value={nomEtab} />
              <Recap label="Secteur" value={secteur || "—"} />
              <Recap label="Adresse" value={adresse || "—"} />
              <Recap
                label="Récompense"
                value={`${mode === "montant" ? `${montant} € dépensés` : `${seuil} passages`} → ${valeur || "Récompense offerte"}`}
              />
              <Recap
                label="Partage"
                value={SHARE_MODES.find((s) => s.value === partage)?.label ?? "—"}
              />
            </ul>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || busy}
            >
              Retour
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext || busy}>
                Continuer
              </Button>
            ) : (
              <Button onClick={finish} disabled={busy}>
                <Check className="mr-2 h-4 w-4" />
                {busy ? "Création…" : "Créer ma carte"}
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Aperçu de la carte
          </p>
          <div className="flex justify-center">{preview}</div>
        </section>
      </div>
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </li>
  );
}
