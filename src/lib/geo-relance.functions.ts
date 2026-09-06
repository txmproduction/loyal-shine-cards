import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_GEO_MESSAGE_PREFIX = "Vous passez près de";

/**
 * Enregistre les réglages de relance de proximité du commerçant puis rafraîchit
 * les cartes déjà installées (Apple via APNs, Google via l'API) pour que le
 * nouveau rayon / message s'appliquent sans réinstallation.
 */
export const saveGeoRelance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { active: boolean; rayon_m: number; message: string | null }) => ({
    active: Boolean(input?.active),
    rayon_m: Math.min(5000, Math.max(500, Math.round(Number(input?.rayon_m ?? 1500)))),
    message: (input?.message ?? "").trim().slice(0, 120) || null,
  }))
  .handler(async ({ data, context }) => {
    const { data: merchant } = await context.supabase.from("merchants").select("id").maybeSingle();
    if (!merchant) throw new Error("Commerce introuvable");

    const { error } = await context.supabase
      .from("merchants")
      .update({
        geo_relance_active: data.active,
        geo_relance_rayon_m: data.rayon_m,
        geo_relance_message: data.message,
      })
      .eq("id", merchant.id);
    if (error) throw new Error(error.message);

    const { getWalletAudienceFor } = await import("@/lib/notifications.server");
    const { buildWalletCardInput } = await import("@/lib/wallet-data.server");
    const { updateWalletObject } = await import("@/lib/google-wallet.server");
    const { pushApplePassUpdate } = await import("@/lib/apns.server");

    const audience = await getWalletAudienceFor(merchant.id);

    let google = 0;
    for (const id of audience.google) {
      try {
        const { input } = await buildWalletCardInput(id);
        await updateWalletObject(input);
        google += 1;
      } catch (e) {
        console.error("[GeoRelance] maj Google échouée", e);
      }
    }

    let apple = 0;
    for (const id of audience.apple) {
      const sent = await pushApplePassUpdate(id).catch(() => 0);
      if (sent > 0) apple += 1;
    }

    return { apple, google };
  });
