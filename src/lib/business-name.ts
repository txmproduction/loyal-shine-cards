/** Détecte les noms de commerce saisis sans espace (ex. « LaMaisonDuScootChelles »). */
export function needsSpacing(name: string): boolean {
  const clean = name.trim();
  return clean.length > 12 && !/\s/.test(clean) && /[a-zà-ÿ][A-ZÀ-Ý]/.test(clean);
}

/** Sépare les mots sur les majuscules internes : LaMaisonDuScootChelles → La Maison Du Scoot Chelles. */
export function suggestSpacing(name: string): string {
  return name
    .trim()
    .replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý])/g, "$1 $2")
    .replace(/([A-ZÀ-Ý]+)([A-ZÀ-Ý][a-zà-ÿ])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}