import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/compte/amis")({
  beforeLoad: () => {
    throw redirect({ to: "/compte/abonnements" });
  },
});
