import { createFileRoute } from "@tanstack/react-router";

/** Télécharge le fichier .pkpass Apple Wallet d'un client (lien public, id = secret). */
export const Route = createFileRoute("/api/public/apple-pass/$customerId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const customerId = String(params.customerId ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(customerId)) {
          return new Response("Client invalide", { status: 400 });
        }
        try {
          const { buildWalletCardInput } = await import("@/lib/wallet-data.server");
          const { buildPkPass } = await import("@/lib/apple-wallet.server");
          const { input } = await buildWalletCardInput(customerId);
          const origin = new URL(request.url).origin;
          const pass = await buildPkPass(input, customerId, origin);
          return new Response(pass as unknown as BodyInit, {
            headers: {
              "content-type": "application/vnd.apple.pkpass",
              "content-disposition": `attachment; filename="fideo-${customerId}.pkpass"`,
              "cache-control": "no-store",
            },
          });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Erreur", { status: 500 });
        }
      },
    },
  },
});