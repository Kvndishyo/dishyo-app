import { Crown, ShieldCheck, Wrench, LifeBuoy, type LucideIcon } from "lucide-react";

export type ManagedRole = "owner" | "admin" | "moderator" | "support";

export const ROLE_META: Record<ManagedRole, { label: string; icon: LucideIcon; tone: string }> = {
  owner: { label: "Owner", icon: Crown, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  admin: { label: "Admin", icon: ShieldCheck, tone: "bg-primary/15 text-primary" },
  moderator: { label: "Modérateur", icon: Wrench, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  support: { label: "Support", icon: LifeBuoy, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
};

export const ROLE_ORDER: ManagedRole[] = ["owner", "admin", "moderator", "support"];

export function topRole(roles: string[]): ManagedRole | null {
  return ROLE_ORDER.find((r) => roles.includes(r)) ?? null;
}
