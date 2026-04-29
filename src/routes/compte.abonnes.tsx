import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DbProfile } from "@/lib/dishyo-db";

export const Route = createFileRoute("/compte/abonnes")({
  head: () => ({ meta: [{ title: "Dishyo — Abonnés" }] }),
  component: FollowersPage,
});

function FollowersPage() {
  const { session } = useAuth();
  const [list, setList] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: rows } = await supabase.from("follows").select("follower_id").eq("following_id", session.user.id);
      const ids = (rows ?? []).map((r) => r.follower_id);
      if (!ids.length) { setList([]); setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").in("id", ids);
      setList((data as DbProfile[]) ?? []);
      setLoading(false);
    })();
  }, [session]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes abonnés</h1>
      </header>
      <div className="p-5">
        {loading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun abonné pour l'instant.</p>}
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.id}>
              <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <img src={u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.handle}`} className="h-12 w-12 rounded-full object-cover" alt="" />
                <div>
                  <div className="font-semibold">{u.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{u.handle}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
