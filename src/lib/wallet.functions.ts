import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { pushApplePassUpdate } = await import("@/lib/apns.server");

    const { input, hasGooglePass } = await buildWalletCardInput(data.customer_id);

    if (hasGooglePass) {
      await updateWalletObject(input).catch((e) =>
        console.error("[Wallet] Google update failed", e),
      );
    }

    // Apple Wallet : notifie les appareils enregistrés (marqueur = points_history / rewards_redeemed).
    const pushed = await pushApplePassUpdate(data.customer_id).catch(() => 0);

    return { updated: hasGooglePass, applePushed: pushed };
  });

/** Renvoie, pour une liste de clients, ceux qui ont un pass Apple et/ou Google actif. */
export const getWalletStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customer_ids: string[] }) => ({
    customer_ids: (input?.customer_ids ?? [])
      .map((id) => String(id).trim())
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      .slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    if (data.customer_ids.length === 0) return { apple: [], google: [] };

    // RLS : ne garde que les clients visibles par l'appelant.
    const { data: allowed } = await context.supabase
      .from("customers")
      .select("id, google_wallet_pass_id")
      .in("id", data.customer_ids);
    const ids = (allowed ?? []).map((c) => c.id);
    if (ids.length === 0) return { apple: [], google: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: regs } = await supabaseAdmin
      .from("apple_pass_registrations")
      .select("serial_number")
      .in("serial_number", ids);

    return {
      apple: Array.from(new Set((regs ?? []).map((r) => r.serial_number))),
      google: (allowed ?? []).filter((c) => c.google_wallet_pass_id).map((c) => c.id),
    };
  });
