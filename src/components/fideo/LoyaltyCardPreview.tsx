import { BRAND_LOGO } from "@/lib/fideo";
import { QrImage } from "@/components/fideo/QrImage";

export function LoyaltyCardPreview({
  nomCommerce,
  valeurRecompense,
  nbPoints,
  points = 0,
  couleur,
  logoUrl,
  photoUrl,
  mode = "passages",
  titulaire,
  qrValue,
}: {
  nomCommerce: string;
  valeurRecompense: string;
  nbPoints: number;
  points?: number;
  couleur?: string | null | undefined;
  logoUrl?: string | null | undefined;
  photoUrl?: string | null | undefined;
  mode?: "passages" | "montant";
  titulaire?: string | null | undefined;
  /** Valeur encodée dans le QR code du client (son identifiant). */
  qrValue?: string;
}) {
  const amountMode = mode === "montant";
  const base = couleur || "#7C3AED";
  const pct = nbPoints > 0 ? Math.min(100, (points / nbPoints) * 100) : 0;
  const unitLabel = amountMode ? "POINTS" : "ÉTOILES";
  const score = amountMode ? `${points.toFixed(0)}` : `${points}`;
  const goal = amountMode ? `${nbPoints.toFixed(0)} €` : `${nbPoints}`;

  return (
    <div
      className="shadow-violet relative w-full max-w-sm overflow-hidden rounded-[28px] text-primary-foreground ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1"
      style={{ backgroundColor: base }}
    >
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: photoUrl
            ? `linear-gradient(180deg, ${base}cc 0%, rgba(10,6,16,0.88) 100%)`
            : `linear-gradient(150deg, ${base} 0%, rgba(12,7,20,0.92) 130%)`,
        }}
        aria-hidden
      />
      <div
        className="animate-shine pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
          backgroundSize: "220% 100%",
        }}
        aria-hidden
      />

      <div className="relative p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 ring-1 ring-white/40">
            <img
              src={logoUrl || BRAND_LOGO}
              alt=""
              className="h-9 w-9 rounded-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">Carte de membre</p>
            <p className="font-display truncate text-2xl font-extrabold leading-tight">
              {nomCommerce}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">{unitLabel}</p>
            <p className="font-display text-4xl font-extrabold leading-none">{score}</p>
          </div>
          <div className="max-w-[58%] text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Prochain palier</p>
            <p className="text-sm font-semibold leading-snug">
              {goal} {amountMode ? "dépensés" : unitLabel.toLowerCase()} → {valeurRecompense}
            </p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">Titulaire</p>
            <p className="text-sm font-semibold">{titulaire || "Votre client"}</p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] opacity-60">Fidéo</p>
        </div>

        {qrValue && (
          <div className="mt-5 rounded-2xl bg-white p-3 text-center shadow-lg">
            <QrImage value={qrValue} size={160} className="mx-auto" alt="QR code du client" />
          </div>
        )}
      </div>
    </div>
  );
}
