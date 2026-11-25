/** Ramène un numéro FR/CH à sa forme nationale (0 + 9 chiffres), ou null si invalide. */
export function normalizePhone(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if ((d.startsWith("33") || d.startsWith("41")) && d.length === 11) d = "0" + d.slice(2);
  if (d.length === 9 && !d.startsWith("0")) d = "0" + d;
  return /^0[1-9]\d{8}$/.test(d) ? d : null;
}

/** Clé de comparaison : 9 derniers chiffres (06… et +33 6… donnent la même clé). */
export function phoneKey(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(-9);
}
