import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/compte")({
  head: () => ({ meta: [{ title: "Dishyo — Mon compte" }] }),
  component: () => <Outlet />,
});
