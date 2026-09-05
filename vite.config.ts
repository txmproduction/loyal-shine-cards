// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Build "mobile" (npm run build:mobile) : sortie 100 % client embarquée dans l'app iOS.
// Le build web habituel n'est pas affecté.
const isMobileBuild = process.env["MOBILE_BUILD"] === "1";

export default defineConfig({
  // Le build mobile n'a pas de serveur : pas de bundle Nitro.
  ...(isMobileBuild ? { nitro: false as const } : {}),
  tanstackStart: isMobileBuild
    ? { spa: { enabled: true } }
    : {
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this
        server: { entry: "server" },
      },
});
