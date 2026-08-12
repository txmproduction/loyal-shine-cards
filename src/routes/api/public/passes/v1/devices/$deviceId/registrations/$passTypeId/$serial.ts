import { createFileRoute } from "@tanstack/react-router";

async function authorize(request: Request, serial: string) {
  const { passAuthToken } = await import("@/lib/apple-wallet.server");
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^ApplePass\s+/i, "").trim();
  return token.length > 0 && token === passAuthToken(serial);
}

/** Web service Apple Wallet : enregistrement / désenregistrement d'un appareil pour un pass. */
export const Route = createFileRoute(
  "/api/public/passes/v1/devices/$deviceId/registrations/$passTypeId/$serial",
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const serial = String(params.serial ?? "");
        if (!(await authorize(request, serial))) return new Response(null, { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { pushToken?: string };
        if (!body.pushToken) return new Response(null, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("apple_pass_registrations").upsert(
          {
            device_library_identifier: String(params.deviceId),
            pass_type_identifier: String(params.passTypeId),
            serial_number: serial,
            push_token: body.pushToken,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "device_library_identifier,pass_type_identifier,serial_number" },
        );
        if (error) return new Response(null, { status: 500 });
        return new Response(null, { status: 201 });
      },
      DELETE: async ({ params, request }) => {
        const serial = String(params.serial ?? "");
        if (!(await authorize(request, serial))) return new Response(null, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("apple_pass_registrations")
          .delete()
          .eq("device_library_identifier", String(params.deviceId))
          .eq("serial_number", serial);
        return new Response(null, { status: 200 });
      },
    },
  },
});