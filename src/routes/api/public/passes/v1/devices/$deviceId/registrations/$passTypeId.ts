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

        let query = supabaseAdmin
          .from("apple_pass_registrations")
          .select("serial_number, updated_at")
          .eq("device_library_identifier", String(params.deviceId))
          .eq("pass_type_identifier", String(params.passTypeId));
        if (since) query = query.gt("updated_at", since);

        const { data } = await query;
        if (!data?.length) return new Response(null, { status: 204 });

        const lastUpdated = data
          .map((row) => row.updated_at)
          .sort()
          .at(-1)!;
        return Response.json({
          serialNumbers: data.map((row) => row.serial_number),
          lastUpdated,
        });
      },
    },
  },
});