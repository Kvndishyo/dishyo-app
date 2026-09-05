import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Dishyo — Messages" },
      { name: "description", content: "Discute en privé et partage tes plats préférés avec tes amis sur Dishyo." },
      { property: "og:title", content: "Dishyo — Messages" },
      { property: "og:description", content: "Discute en privé et partage tes plats préférés avec tes amis sur Dishyo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Outlet />,
});
