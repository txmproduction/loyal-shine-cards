import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/fideo/LegalPage";
import source from "@/content/privacy.md?raw";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de Confidentialité — Fidéo" },
      {
        name: "description",
        content:
          "Comment Fidéo collecte, traite et conserve les données personnelles des commerçants et de leurs clients finaux, conformément au RGPD.",
      },
      { property: "og:title", content: "Politique de Confidentialité — Fidéo" },
      { property: "og:description", content: "Traitement des données personnelles chez Fidéo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage source={source} />,
});