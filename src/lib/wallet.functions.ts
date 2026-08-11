import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const validateCustomerId = (input: { customer_id: string }) => {
  const id = String(input?.customer_id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Client invalide");
  return { customer_id: id };
};

/** Génère (ou met à jour) la carte Google Wallet d'un client et renvoie l'URL "Save to Google Wallet". */
export const generateWalletCard = createServerFn({ method: "POST" })
  .inputValidator(validateCustomerId)
  .handler(async ({ data }) => {
    const { buildSaveUrl } = await import("@/lib/google-wallet.server");
    const { buildWalletCardInput, suffix } = await import("@/lib/wallet-data.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { input, customerId } = await buildWalletCardInput(data.customer_id);
    const origin = new URL(getRequest().url).origin;
    const url = await buildSaveUrl(input, origin);

    await supabaseAdmin
      .from("customers")
      .update({ google_wallet_pass_id: `fideo_${suffix(customerId)}` })
      .eq("id", customerId);

    return { url };
  });

/** Met à jour l'objet Google Wallet existant d'un client (solde à jour). No-op si aucune carte. */
export const refreshWalletCard = createServerFn({ method: "POST" })
  .inputValidator(validateCustomerId)
  .handler(async ({ data }) => {
    const { buildWalletCardInput } = await import("@/lib/wallet-data.server");
    const { updateWalletObject } = await import("@/lib/google-wallet.server");

    const { input, hasWalletPass } = await buildWalletCardInput(data.customer_id);
    if (!hasWalletPass) return { updated: false };

    await updateWalletObject(input);
    return { updated: true };
  });
