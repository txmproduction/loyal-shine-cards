// Mode démo : jeu de données fictif, 100 % local (aucune écriture en base).
import { useCallback, useSyncExternalStore } from "react";
import type { Customer, Employee, PointEntry } from "@/lib/fideo";

const KEY = "fideo_demo_mode";
const EVENT = "fideo-demo-change";

function read() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setDemoMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** true quand l'utilisateur consulte l'interface avec des données de démonstration. */
export function useDemoMode() {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function useToggleDemoMode() {
  return useCallback((on: boolean) => setDemoMode(on), []);
}

/* ---------- Données fictives ---------- */

const NAMES: Array<[string, string]> = [
  ["Martin", "Julie"],
  ["Dubois", "Karim"],
  ["Bernard", "Chloé"],
  ["Petit", "Antoine"],
  ["Moreau", "Sarah"],
  ["Lefevre", "Hugo"],
  ["Garcia", "Inès"],
  ["Roux", "Thomas"],
  ["Fontaine", "Léa"],
  ["Nguyen", "Minh"],
  ["Leroy", "Camille"],
  ["Girard", "Yanis"],
  ["Marchand", "Emma"],
  ["Perrin", "Lucas"],
  ["Blanc", "Nora"],
  ["Faure", "Paul"],
  ["Chevalier", "Aya"],
  ["Robin", "Mathis"],
];

/** Générateur pseudo-aléatoire déterministe : la démo reste identique d'un rechargement à l'autre. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const DAY = 86400000;

export const DEMO_EMPLOYEES: Employee[] = [
  { id: "demo-emp-1", nom: "Sofiane", pin_code: "1234", role: "employe" },
  { id: "demo-emp-2", nom: "Marie", pin_code: "5678", role: "employe" },
  { id: "demo-emp-3", nom: "Yassine", pin_code: "9012", role: "employe" },
];

function build() {
  const rand = rng(20260813);
  const now = Date.now();
  const customers: Customer[] = NAMES.map(([nom, prenom], i) => ({
    id: `demo-cli-${i + 1}`,
    nom,
    prenom,
    email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@example.com`,
    telephone: `06 ${10 + i} ${20 + i} ${30 + i} ${40 + i}`.slice(0, 14),
    created_at: new Date(now - Math.floor(rand() * 55 + 1) * DAY).toISOString(),
    apple_wallet_pass_id: i % 3 === 0 ? `demo-apple-${i}` : null,
    google_wallet_pass_id: i % 4 === 0 ? `demo-google-${i}` : null,
  }));

  const points: PointEntry[] = [];
  const rewards: { id: string; customer_id: string; valeur: string | null; date: string }[] = [];

  customers.forEach((c, i) => {
    const visits = 2 + Math.floor(rand() * 9);
    for (let v = 0; v < visits; v++) {
      const daysAgo = Math.floor(rand() * 28);
      const hour = 9 + Math.floor(rand() * 11);
      const d = new Date(now - daysAgo * DAY);
      d.setHours(hour, Math.floor(rand() * 60), 0, 0);
      points.push({
        id: `demo-pt-${i}-${v}`,
        customer_id: c.id,
        employee_id: DEMO_EMPLOYEES[Math.floor(rand() * DEMO_EMPLOYEES.length)]!.id,
        establishment_id: null,
        points_ajoutes: 1,
        montant: 12 + Math.floor(rand() * 40),
        type: "passage",
        date: d.toISOString(),
      });
    }
    if (visits >= 8) {
      rewards.push({
        id: `demo-rw-${i}`,
        customer_id: c.id,
        valeur: "Récompense offerte",
        date: new Date(now - Math.floor(rand() * 12) * DAY).toISOString(),
      });
    }
  });

  points.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { customers, points, rewards };
}

const DATA = build();

export const DEMO_CUSTOMERS = DATA.customers;
export const DEMO_POINTS = DATA.points;
export const DEMO_REWARDS = DATA.rewards;
