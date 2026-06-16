import { useEffect, useState } from "react";
import { Search, ShieldCheck, Wrench, LifeBuoy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  roles: string[];
};

const ROLES: { key: "admin" | "moderator" | "support"; label: string; icon: typeof ShieldCheck; tone: string }[] = [
  { key: "admin", label: "Admin", icon: ShieldCheck, tone: "bg-primary/15 text-primary" },
  { key: "moderator", label: "Modérateur", icon: Wrench, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { key: "support", label: "Support", icon: LifeBuoy, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
];

export function UserPermissionsPanel({ currentUserId }: { currentUserId: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function search(term: string) {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_search_users", { q: term });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function toggle(row: Row, role: "admin" | "moderator" | "support") {
    const has = row.roles.includes(role);
    if (row.user_id === currentUserId && role === "admin" && has) {
      return toast.error("Tu ne peux pas retirer ton propre rôle admin");
    }
    const key = `${row.user_id}:${role}`;
    setBusy(key);
    // Optimistic
    setRows((rs) => rs.map((r) => r.user_id !== row.user_id ? r : {
      ...r,
      roles: has ? r.roles.filter((x) => x !== role) : [...r.roles, role],
    }));
    const { error } = await supabase.rpc("admin_set_role", {
      target_user_id: row.user_id,
      target_role: role,
      should_grant: !has,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      search(q);
      return;
    }
    toast.success(has ? `Rôle ${role} retiré` : `Rôle ${role} accordé`);
  }

  return (
    <div className="space-y-3 px-3 pb-24">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par pseudo, nom ou email…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Recherche…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucun utilisateur trouvé.
        </div>
      )}

      {rows.map((row) => (
        <div key={row.user_id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-3">
            <img
              src={row.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${row.handle}`}
              alt={row.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-tight">{row.display_name}</div>
              <div className="truncate text-xs text-muted-foreground">@{row.handle}{row.email ? ` · ${row.email}` : ""}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ROLES.map(({ key, label, icon: Icon, tone }) => {
              const active = row.roles.includes(key);
              const isBusy = busy === `${row.user_id}:${key}`;
              return (
                <button
                  key={key}
                  onClick={() => toggle(row, key)}
                  disabled={isBusy}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    active ? tone : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                  {label}
                  {active && <span className="ml-0.5">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
