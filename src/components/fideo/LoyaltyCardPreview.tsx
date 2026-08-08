import { BRAND_LOGO } from "@/lib/fideo";

export function LoyaltyCardPreview({
  nomCommerce,
  valeurRecompense,
  nbPoints,
  points = 0,
  couleur,
  logoUrl,
  mode = "passages",
  qrValue,
}: {
  nomCommerce: string;
  valeurRecompense: string;
  nbPoints: number;
  points?: number;
  couleur?: string | null | undefined;
  logoUrl?: string | null | undefined;
  mode?: "passages" | "montant";
  qrValue?: string;
}) {
  const amountMode = mode === "montant";
  const pct = nbPoints > 0 ? Math.min(100, (points / nbPoints) * 100) : 0;
  const stamps = Math.min(nbPoints, 20);

  return (
    <div
      className="relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-violet transition-transform duration-300 hover:-translate-y-1"
      style={{
        backgroundImage: couleur
          ? `linear-gradient(135deg, ${couleur}, #1a1024)`
          : "var(--gradient-brand)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 animate-shine opacity-40"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
          backgroundSize: "220% 100%",
        }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Carte de fidélité</p>
          <p className="font-display mt-1 text-xl font-bold">{nomCommerce}</p>
        </div>
        <img src={logoUrl || BRAND_LOGO} alt="" className="h-10 w-10 rounded-lg object-contain" />
      </div>

      <p className="relative mt-6 text-sm opacity-80">
        {amountMode ? `${nbPoints} € dépensés` : `${nbPoints} passages`} ={" "}
        <span className="font-semibold opacity-100">{valeurRecompense}</span>
      </p>

      {amountMode ? (
        <div className="relative mt-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs opacity-80">
            {points.toFixed(2)} € / {nbPoints.toFixed(2)} €
          </p>
        </div>
      ) : (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {Array.from({ length: stamps }).map((_, i) => (
            <span
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300"
              style={{
                borderColor: "rgba(255,255,255,0.45)",
                background: i < points ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.08)",
                color: i < points ? "#2a1147" : "rgba(255,255,255,0.7)",
                transform: i < points ? "scale(1)" : "scale(0.94)",
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      )}

      {qrValue && (
        <div className="relative mt-5 rounded-2xl bg-white p-3 text-center">
          <img
            src={qrValue}
            alt="QR code du client"
            className="mx-auto h-40 w-40 object-contain"
          />
        </div>
      )}
    </div>
  );
}
