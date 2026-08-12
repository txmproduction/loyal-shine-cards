import { needsSpacing, suggestSpacing } from "@/lib/business-name";

/** Avertit quand un nom de commerce est saisi sans espace et propose la correction. */
export function NameSpacingHint({
  value,
  onFix,
  tone = "light",
}: {
  value: string;
  onFix: (fixed: string) => void;
  tone?: "light" | "dark";
}) {
  if (!needsSpacing(value)) return null;
  const suggestion = suggestSpacing(value);
  if (suggestion === value.trim()) return null;
  return (
    <p className={tone === "dark" ? "text-xs text-primary-foreground/70" : "text-xs text-muted-foreground"}>
      Ce nom ne contient aucun espace et s'affichera tel quel sur la carte wallet.{" "}
      <button
        type="button"
        onClick={() => onFix(suggestion)}
        className="font-semibold underline underline-offset-2"
      >
        Utiliser « {suggestion} »
      </button>
    </p>
  );
}