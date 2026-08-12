// Server-only : construction des données de carte Wallet partagées.
import type { WalletCardInput } from "@/lib/google-wallet.server";

const DEFAULT_LOGO =
  "https://res.cloudinary.com/dgfdye7cl/image/upload/v1785332228/3F3112CB-3549-42D3-8EE2-5B1F9C118801_ikxoy5.png";

export const suffix = (value: string) => value.replace(/[^A-Za-z0-9_.-]/g, "_");

/** Tronque proprement un nom trop long pour l'en-tête d'une carte Wallet. */
function shortName(name: string, max = 40): string {
  const clean = name.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Barre de tampons : un segment par palier configuré par le commerçant. */
function stampBar(current: number, goal: number): string {
  const segments = Math.max(1, Math.min(20, Math.round(goal)));
  const filled = Math.max(0, Math.min(segments, Math.round((current / goal) * segments)));
  return `${"●".repeat(filled)}${"○".repeat(segments - filled)}`;
}

export type WalletCardContext = {
  input: WalletCardInput;
  customerId: string;
  hasWalletPass: boolean;
};

/** Récupère client + commerçant + carte, calcule le solde en direct et construit l'objet Wallet. */
export async function buildWalletCardInput(customerId: string): Promise<WalletCardContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: customer, error: cErr } = await supabaseAdmin
    .from("customers")
    .select("id, nom, prenom, merchant_id, establishment_id, google_wallet_pass_id")
    .eq("id", customerId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!customer) throw new Error("Client introuvable");

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, nom_commerce, logo_url, photo_url, couleur_marque, access_status, trial_ends_at")
    .eq("id", customer.merchant_id)
    .maybeSingle();
  if (!merchant) throw new Error("Commerce introuvable");

  const trialActive = new Date(merchant.trial_ends_at).getTime() > Date.now();
  const accessOk =
    merchant.access_status === "active" || (merchant.access_status === "trial" && trialActive);
  if (!accessOk) {
    throw new Error(
      "L'accès de ce commerce est suspendu. Merci de mettre à jour le moyen de paiement.",
    );
  }

  const { data: card } = await supabaseAdmin
    .from("loyalty_cards")
    .select(
      "id, mode_recompense, nb_points_pour_recompense, montant_pour_recompense, valeur_recompense",
    )
    .eq("merchant_id", customer.merchant_id)
    .maybeSingle();

  const amountMode = card?.mode_recompense === "montant";
  const goal = amountMode
    ? Number(card?.montant_pour_recompense ?? 100)
    : Number(card?.nb_points_pour_recompense ?? 10);

  const { data: history } = await supabaseAdmin
    .from("points_history")
    .select("points_ajoutes, montant")
    .eq("customer_id", customer.id);
  const { count: redeemed } = await supabaseAdmin
    .from("rewards_redeemed")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customer.id);

  const earned = (history ?? []).reduce(
    (sum, row) => sum + (amountMode ? Number(row.montant ?? 0) : Number(row.points_ajoutes ?? 0)),
    0,
  );
  const balance = Math.max(0, earned - (redeemed ?? 0) * goal);

  let establishmentName: string | undefined;
  if (customer.establishment_id) {
    const { data: est } = await supabaseAdmin
      .from("establishments")
      .select("nom")
      .eq("id", customer.establishment_id)
      .maybeSingle();
    establishmentName = est?.nom ?? undefined;
  }

  const fullName = [customer.prenom, customer.nom].filter(Boolean).join(" ") || "Client";
  const reward = card?.valeur_recompense ?? "Récompense offerte";
  const ratio = goal > 0 ? Math.min(1, balance / goal) : 0;

  return {
    customerId: customer.id,
    hasWalletPass: Boolean(customer.google_wallet_pass_id),
    input: {
      classSuffix: `fideo_${suffix(customer.establishment_id ?? customer.merchant_id)}`,
      objectSuffix: `fideo_${suffix(customer.id)}`,
      programName: `Carte de fidélité ${shortName(merchant.nom_commerce, 30)}`,
      issuerName: shortName(merchant.nom_commerce),
      logoUrl: merchant.logo_url ?? DEFAULT_LOGO,
      heroImageUrl: merchant.photo_url ?? undefined,
      backgroundColor: /^#[0-9a-f]{6}$/i.test(merchant.couleur_marque ?? "")
        ? (merchant.couleur_marque as string)
        : "#7C3AED",
      accountName: fullName,
      accountId: customer.id,
      pointsLabel: amountMode ? "Points" : "Étoiles",
      pointsValue: amountMode
        ? `${balance.toFixed(2)} € / ${goal.toFixed(2)} €`
        : `${balance} / ${goal}`,
      rewardText: reward,
      progressText: progressBar(ratio),
      progressLabel: `${Math.round(ratio * 100)} %`,
      nextTierText: amountMode
        ? `${goal.toFixed(2)} € dépensés → ${reward}`
        : `${goal} étoiles → ${reward}`,
      barcodeValue: customer.id,
      locationName: establishmentName,
    },
  };
}
