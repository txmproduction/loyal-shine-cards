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
        subscription: data.subscription as unknown as Record<string, unknown>,
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

    const { data: rows } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .select("endpoint, subscription");
    if (!rows?.length) return { sent: 0 };

    let sent = 0;
    for (const row of rows) {
      try {
        const sub = row.subscription as unknown as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        const res = await sendWebPush(sub, {
          title: "Nouvelle inscription commerçant",
          body: `${data.nomCommerce} vient de créer un compte Fidéo (${data.email}).`,
          url: "/admin",
        });
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