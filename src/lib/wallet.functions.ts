import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Génère (ou met à jour) la carte Google Wallet d'un client et renvoie l'URL "Save to Google Wallet". */
export const generateWalletCard = createServerFn({ method: "POST" })
  .inputValidator((input: { customer_id: string }) => {
    const id = String(input?.customer_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Client invalide");
    return { customer_id: id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildSaveUrl } = await import("@/lib/google-wallet.server");

    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .select("id, nom, prenom, merchant_id, establishment_id")
      .eq("id", data.customer_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!customer) throw new Error("Client introuvable");

    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select(
        "id, nom_commerce, logo_url, photo_url, couleur_marque, access_status, trial_ends_at",
      )
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

    // Points en direct : historique - récompenses déjà utilisées.
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

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const suffix = (value: string) => value.replace(/[^A-Za-z0-9_.-]/g, "_");
    const fullName = [customer.prenom, customer.nom].filter(Boolean).join(" ") || "Client";

    const url = await buildSaveUrl(
      {
        classSuffix: `fideo_${suffix(customer.establishment_id ?? customer.merchant_id)}`,
        objectSuffix: `fideo_${suffix(customer.id)}`,
        programName: `Carte de fidélité ${merchant.nom_commerce}`,
        issuerName: merchant.nom_commerce,
        logoUrl:
          merchant.logo_url ??
          "https://res.cloudinary.com/dgfdye7cl/image/upload/v1785332228/3F3112CB-3549-42D3-8EE2-5B1F9C118801_ikxoy5.png",
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
        rewardText: card?.valeur_recompense ?? "Récompense offerte",
        nextTierText: amountMode
          ? `${goal.toFixed(2)} € dépensés → ${card?.valeur_recompense ?? "Récompense offerte"}`
          : `${goal} étoiles → ${card?.valeur_recompense ?? "Récompense offerte"}`,
        barcodeValue: customer.id,
        locationName: establishmentName,
      },
      origin,
    );

    await supabaseAdmin
      .from("customers")
      .update({ google_wallet_pass_id: `fideo_${suffix(customer.id)}` })
      .eq("id", customer.id);

    return { url };
  });
