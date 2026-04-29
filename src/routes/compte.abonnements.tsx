import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DbProfile } from "@/lib/dishyo-db";
import { toast } from "sonner";

export const Route = createFileRoute("/compte/abonnements")({
  head: () => ({ meta: [{ title: "Dishyo — Abonnements" }] }),
  component: FollowingPage,
});

function FollowingPage() {
  const { session } = useAuth();
  const [list, setList] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) return;
    const { data: rows } = await supabase.from("follows").select("following_id").eq("follower_id", session.user.id);
    const ids = (rows ?? []).map((r) => r.following_id);
    if (!ids.length) { setList([]); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").in("id", ids);
    setList((data as DbProfile[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [session]);

  async function unfollow(id: string) {
    if (!session) return;
    if (!confirm("Se désabonner ?")) return;
    const { error } = await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", id);
    if (error) return toast.error(error.message);
    setList((l) => l.filter((p) => p.id !== id));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes abonnements</h1>
      </header>
      <div className="p-5">
        {loading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Tu ne suis personne pour l'instant.</p>}
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex flex-1 items-center gap-3">
                <img src={u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.handle}`} className="h-12 w-12 rounded-full object-cover" alt="" />
                <div>
                  <div className="font-semibold">{u.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{u.handle}</div>
                </div>
              </Link>
              <button onClick={() => unfollow(u.id)} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 hover:text-destructive">
                <UserMinus className="h-3.5 w-3.5" /> Se désabonner
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
