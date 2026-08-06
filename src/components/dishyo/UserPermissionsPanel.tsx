import { useEffect, useState } from "react";
import { Search, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ROLE_META, ROLE_ORDER, type ManagedRole } from "@/lib/roles";

type Row = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  roles: string[];
};

export function UserPermissionsPanel({ currentUserId, isOwner }: { currentUserId: string; isOwner: boolean }) {
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

  async function toggle(row: Row, role: ManagedRole) {
    const has = row.roles.includes(role);
    if (role === "owner" && !isOwner) return toast.error("Seul un owner peut gérer le rôle owner");
    if (row.roles.includes("owner") && !isOwner) return toast.error("Seul un owner peut modifier les rôles d'un owner");
    if (row.user_id === currentUserId && (role === "admin" || role === "owner") && has) {
      return toast.error("Tu ne peux pas retirer ton propre rôle");
    }
    const key = `${row.user_id}:${role}`;
    setBusy(key);
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
    toast.success(has ? `Rôle ${ROLE_META[role].label} retiré` : `Rôle ${ROLE_META[role].label} accordé`);
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

      {!isOwner && (
        <p className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Seuls les owners peuvent accorder le rôle Owner ou modifier un owner.
        </p>
      )}

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

      {rows.map((row) => {
        const targetIsOwner = row.roles.includes("owner");
        return (
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
              {ROLE_ORDER.map((key) => {
                const { label, icon: Icon, tone } = ROLE_META[key];
                const active = row.roles.includes(key);
                const isBusy = busy === `${row.user_id}:${key}`;
                const locked = (key === "owner" || targetIsOwner) && !isOwner;
                return (
                  <button
                    key={key}
                    onClick={() => toggle(row, key)}
                    disabled={isBusy || locked}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                      active ? tone : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : locked ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {label}
                    {active && <span className="ml-0.5">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
