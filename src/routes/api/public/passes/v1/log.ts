import { createFileRoute } from "@tanstack/react-router";

/** Web service Apple Wallet : journal d'erreurs envoyé par les appareils. */
export const Route = createFileRoute("/api/public/passes/v1/log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        console.log("[ApplePass] device log", body);
        return new Response(null, { status: 200 });
      },
    },
  },
});