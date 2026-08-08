import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/fideo/LegalPage";
import source from "@/content/cgv.md?raw";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions Générales de Vente et d'Utilisation — Fidéo" },
      {
        name: "description",
        content:
          "Conditions générales de vente et d'utilisation du service de carte de fidélité digitale Fidéo pour les commerçants.",
      },
      { property: "og:title", content: "CGV / CGU — Fidéo" },
      { property: "og:description", content: "Les conditions d'utilisation du service Fidéo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage source={source} />,
});