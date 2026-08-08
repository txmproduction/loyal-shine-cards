import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/fideo/LegalPage";
import source from "@/content/dpa.md?raw";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Contrat de Sous-traitance (DPA) — Fidéo" },
      {
        name: "description",
        content:
          "Contrat de sous-traitance des données personnelles (article 28 RGPD) entre le commerçant et Fidéo.",
      },
      { property: "og:title", content: "Contrat de Sous-traitance (DPA) — Fidéo" },
      { property: "og:description", content: "DPA conforme à l'article 28 du RGPD." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage source={source} />,
});