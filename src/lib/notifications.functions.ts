import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Nombre de clients du commerçant ayant réellement ajouté leur carte à un wallet. */
export const getWalletAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getWalletAudienceFor } = await import("@/lib/notifications.server");
    const { data: merchant } = await context.supabase
      .from("merchants")
      .select("id")
      .maybeSingle();
    if (!merchant) return { count: 0 };
    const audience = await getWalletAudienceFor(merchant.id);
    return { count: audience.apple.length + audience.googleOnly.length };
  });

/** Envoie un message promo aux clients wallet-actifs (Apple + Google). */
export const envoyerNotificationPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = String(input?.message ?? "").trim().slice(0, 150);
    if (!message) throw new Error("Message vide");
    return { message };
  })
  .handler(async ({ data, context }) => {
    const { data: merchant } = await context.supabase
      .from("merchants")
      .select("id, nom_commerce")
      .maybeSingle();
    if (!merchant) throw new Error("Commerce introuvable");

    const { getWalletAudienceFor } = await import("@/lib/notifications.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { addWalletMessage } = await import("@/lib/google-wallet.server");
    const { pushApplePassUpdate } = await import("@/lib/apns.server");
    const { suffix } = await import("@/lib/wallet-data.server");

    const audience = await getWalletAudienceFor(merchant.id);

    // Le message promo devient le message courant du commerçant : il est injecté
    // dans le pass Apple régénéré (champ séparé du solde, avec changeMessage).
    await supabaseAdmin
      .from("merchants")
      .update({ message_promo: data.message, message_promo_date: new Date().toISOString() })
      .eq("id", merchant.id);

    let google = 0;
    for (const id of audience.google) {
      const ok = await addWalletMessage(
        `fideo_${suffix(id)}`,
        merchant.nom_commerce,
        data.message,
      ).catch((e) => {
        console.error("[Wallet] promo Google échouée", e);
        return false;
      });
      if (ok) google += 1;
    }

    let apple = 0;
    for (const id of audience.apple) {
      const sent = await pushApplePassUpdate(id).catch(() => 0);
      if (sent > 0) apple += 1;
    }

    return { apple, google, total: audience.apple.length + audience.googleOnly.length };
  });
