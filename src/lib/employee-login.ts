/** Helpers partagés (client + serveur) pour les identifiants employés. */

export function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** nomducommerce@prenom.fr */
export function employeeLoginEmail(nomCommerce: string, prenom: string) {
  const left = slugPart(nomCommerce) || "commerce";
  const right = slugPart(prenom) || "employe";
  return `${left}@${right}.fr`;
}

/** Le PIN saisi est court : on le préfixe pour respecter la longueur minimale. */
export function pinToPassword(pin: string) {
  return `fideo-${pin}`;
}

export function isPin(value: string) {
  return /^\d{4,6}$/.test(value);
}
