import { createFileRoute } from "@tanstack/react-router";

/** Web service Apple Wallet : liste des passes mis à jour pour un appareil. */
export const Route = createFileRoute(
  "/api/public/passes/v1/devices/$deviceId/registrations/$passTypeId",
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const since = new URL(request.url).searchParams.get("passesUpdatedSince");

        const { data } = await supabaseAdmin
          .from("apple_pass_registrations")
          .select("serial_number, updated_at")
          .eq("device_library_identifier", String(params.deviceId))
          .eq("pass_type_identifier", String(params.passTypeId));
        if (!data?.length) return new Response(null, { status: 204 });

        const serials = [...new Set(data.map((r) => r.serial_number))];

        // Vraie date de modification du contenu : dernier point / dernière récompense
        const latest = new Map<string, string>();
        for (const row of data) {
          const prev = latest.get(row.serial_number);
          if (!prev || row.updated_at > prev) latest.set(row.serial_number, row.updated_at);
        }

        const [points, rewards] = await Promise.all([
          supabaseAdmin
            .from("points_history")
            .select("customer_id, date")
            .in("customer_id", serials)
            .order("date", { ascending: false }),
          supabaseAdmin
            .from("rewards_redeemed")
            .select("customer_id, date")
            .in("customer_id", serials)
            .order("date", { ascending: false }),
        ]);

        for (const row of [...(points.data ?? []), ...(rewards.data ?? [])]) {
          const prev = latest.get(row.customer_id);
          if (!prev || row.date > prev) latest.set(row.customer_id, row.date);
        }

        const kept = serials.filter((s) => {
          const d = latest.get(s);
          if (!d) return false;
          return since ? new Date(d).getTime() > new Date(since).getTime() : true;
        });

        if (!kept.length) return new Response(null, { status: 204 });

        const lastUpdated = new Date(
          Math.max(...kept.map((s) => new Date(latest.get(s)!).getTime())),
        ).toISOString();

        return Response.json({
          serialNumbers: kept,
          lastUpdated,
        });
      },
    },
  },
});