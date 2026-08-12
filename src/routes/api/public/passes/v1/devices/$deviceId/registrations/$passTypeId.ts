import { createFileRoute } from "@tanstack/react-router";

/** Web service Apple Wallet : liste des passes mis à jour pour un appareil. */
export const Route = createFileRoute(
  "/api/public/passes/v1/devices/$deviceId/registrations/$passTypeId",
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sinceRaw = new URL(request.url).searchParams.get("passesUpdatedSince");
        // URLSearchParams décode le "+" de "+00:00" comme un espace. Sans
        // normalisation, Date.parse retourne NaN et aucun pass ne paraît modifié.
        const sinceNormalized = sinceRaw?.replace(
          /(T\d{2}:\d{2}:\d{2}(?:\.\d+)?) (\d{2}:\d{2})$/,
          "$1+$2",
        );
        const parsedSince = sinceNormalized ? Date.parse(sinceNormalized) : undefined;
        const sinceTimestamp =
          parsedSince !== undefined && Number.isFinite(parsedSince) ? parsedSince : undefined;

        const { data } = await supabaseAdmin
          .from("apple_pass_registrations")
          .select("serial_number")
          .eq("device_library_identifier", String(params.deviceId))
          .eq("pass_type_identifier", String(params.passTypeId));
        if (!data?.length) return new Response(null, { status: 204 });

        const serials = [...new Set(data.map((r) => r.serial_number))];

        // Source de vérité exclusive : dernier point / dernière récompense.
        const latest = new Map<string, number>();

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
          const timestamp = Date.parse(row.date);
          if (!Number.isFinite(timestamp)) continue;
          const prev = latest.get(row.customer_id);
          if (prev === undefined || timestamp > prev) latest.set(row.customer_id, timestamp);
        }

        const kept = sinceRaw
          ? serials.filter((serial) => {
              const modifiedAt = latest.get(serial);
              // Une date Apple illisible ne doit jamais masquer une mise à jour.
              return sinceTimestamp === undefined ||
                (modifiedAt !== undefined && modifiedAt > sinceTimestamp);
            })
          : serials;

        console.log(
          "[Apple Poll]",
          "sinceRaw",
          sinceRaw,
          "sinceUtc",
          sinceTimestamp === undefined ? "invalid/none" : new Date(sinceTimestamp).toISOString(),
          "latest",
          Object.fromEntries(
            serials.map((serial) => {
              const timestamp = latest.get(serial);
              return [serial, timestamp === undefined ? null : new Date(timestamp).toISOString()];
            }),
          ),
          "serialsReturned",
          kept,
        );

        if (!kept.length) return new Response(null, { status: 204 });

        const modificationTimes = kept
          .map((serial) => latest.get(serial))
          .filter((timestamp): timestamp is number => timestamp !== undefined);
        const lastUpdated = new Date(
          modificationTimes.length ? Math.max(...modificationTimes) : Date.now(),
        ).toISOString();

        return Response.json({
          serialNumbers: kept,
          lastUpdated,
        });
      },
    },
  },
});