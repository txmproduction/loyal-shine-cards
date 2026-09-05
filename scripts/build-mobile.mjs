// Construit l'interface Fidéo en version "embarquable" pour l'app iOS (Capacitor).
// Sortie : dist/mobile (HTML + JS + assets, aucun rendu serveur).
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "dist", "mobile");

const apiBase = process.env.VITE_API_BASE_URL || "https://fideoloyalty.app";

console.log(`> build mobile — API : ${apiBase}`);
execSync("vite build", {
  stdio: "inherit",
  env: { ...process.env, MOBILE_BUILD: "1", VITE_API_BASE_URL: apiBase },
});

const candidates = [
  join(root, ".output", "public"),
  join(root, "dist", "client"),
  join(root, ".tanstack", "start", "build", "client-dist"),
];
const source = candidates.find((p) => existsSync(p));
if (!source) {
  console.error("Sortie client introuvable :", candidates.join(", "));
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(source, outDir, { recursive: true });

// Capacitor a besoin d'un index.html à la racine : on réutilise le shell SPA.
const indexPath = join(outDir, "index.html");
if (!existsSync(indexPath)) {
  const shells = [
    join(outDir, "_shell.html"),
    join(outDir, "_shell", "index.html"),
    join(outDir, "404.html"),
  ];
  const shell = shells.find((p) => existsSync(p));
  if (!shell) {
    console.error("Shell SPA introuvable dans", outDir);
    process.exit(1);
  }
  writeFileSync(indexPath, readFileSync(shell));
}

console.log(`> prêt : ${outDir}`);
