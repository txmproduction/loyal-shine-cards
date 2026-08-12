import { createFileRoute } from "@tanstack/react-router";

/** Web service Apple Wallet : renvoie la dernière version du pass d'un client. */
export const Route = createFileRoute("/api/public/passes/v1/passes/$passTypeId/$serial")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const serial = String(params.serial ?? "");
        const { passAuthToken, buildPkPass } = await import("@/lib/apple-wallet.server");
        const token = (request.headers.get("authorization") ?? "")
          .replace(/^ApplePass\s+/i, "")
          .trim();
        if (!token || token !== passAuthToken(serial)) return new Response(null, { status: 401 });

        try {
          const { buildWalletCardInput } = await import("@/lib/wallet-data.server");
          const { input } = await buildWalletCardInput(serial);
          const pass = await buildPkPass(input, serial, new URL(request.url).origin);
          return new Response(pass as unknown as BodyInit, {
            headers: {
              "content-type": "application/vnd.apple.pkpass",
              "last-modified": new Date().toUTCString(),
              "cache-control": "no-store",
            },
          });
        } catch {
          return new Response(null, { status: 404 });
        }
      },
    },
  },
});