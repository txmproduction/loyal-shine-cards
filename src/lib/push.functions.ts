import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveAdminPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase.from("admin_push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.subscription.endpoint,
        subscription: JSON.parse(JSON.stringify(data.subscription)),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAdminPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("admin_push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const notifyAdminsNewMerchant = createServerFn({ method: "POST" })
  .inputValidator((input: { nomCommerce: string; email: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("./webpush.server");
    const { sendApnsAlert } = await import("./apns.server");

    const { data: rows } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .select("endpoint, subscription");
    if (!rows?.length) return { sent: 0 };

    const title = "Nouvelle inscription commerçant";
    const body = `${data.nomCommerce} vient de créer un compte Fidéo (${data.email}).`;

    let sent = 0;
    for (const row of rows) {
      try {
        // Jetons de l'app iOS native : envoi direct via APNs.
        if (row.endpoint.startsWith("apns:")) {
          const token = row.endpoint.slice("apns:".length);
          const res = await sendApnsAlert(token, { title, body, url: "/admin" });
          if (res.ok) sent += 1;
          else if (
            res.status === 410 ||
            res.reason === "BadDeviceToken" ||
            res.reason === "Unregistered" ||
            res.reason === "DeviceTokenNotForTopic"
          ) {
            await supabaseAdmin
              .from("admin_push_subscriptions")
              .delete()
              .eq("endpoint", row.endpoint);
          }
          continue;
        }

        const sub = row.subscription as unknown as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        const res = await sendWebPush(sub, { title, body, url: "/admin" });
        if (res.ok) sent += 1;
        else if (res.status === 404 || res.status === 410) {
          await supabaseAdmin.from("admin_push_subscriptions").delete().eq("endpoint", row.endpoint);
        }
      } catch {
        // ignore individual delivery failures
      }
    }
    return { sent };

  });
/** Enregistre le jeton APNs de l'app iOS native (Capacitor) pour un admin. */
export const saveNativePushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string; platform: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase.from("admin_push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: `apns:${data.token}`,
        subscription: { native: true, platform: data.platform, token: data.token },
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
