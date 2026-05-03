import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Share2, UserPlus, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { DbProfile } from "@/lib/dishyo-db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/recherche")({
  head: () => ({ meta: [{ title: "Dishyo — Recherche" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DbProfile[]>([]);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [followedBy, setFollowedBy] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_users", { q });
      setResults(((data as DbProfile[] | null) ?? []).filter((u) => u.id !== session?.user.id));
    }, 200);
    return () => clearTimeout(t);
  }, [q, session]);

  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", uid),
      supabase.from("follows").select("follower_id").eq("following_id", uid),
    ]).then(([a, b]) => {
      setFollows(new Set((a.data ?? []).map((d) => d.following_id)));
      setFollowedBy(new Set((b.data ?? []).map((d) => d.follower_id)));
    });
  }, [session]);

  async function toggleFollow(targetId: string) {
    if (!session) return;
    const isFollowing = follows.has(targetId);
    const next = new Set(follows);
    if (isFollowing) {
      next.delete(targetId);
      await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", targetId);
    } else {
      next.add(targetId);
      await supabase.from("follows").insert({ follower_id: session.user.id, following_id: targetId });
    }
    setFollows(next);
  }

  async function share() {
    const url = window.location.origin;
    const text = "Rejoins-moi sur Dishyo, l'app pour partager tes plats préférés ! 🍽️";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Dishyo", text, url });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Lien copié ! Partage-le à tes amis 🎉");
    } catch {
      window.prompt("Copie ce lien :", `${text} ${url}`);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <h1 className="mb-3 text-xl font-bold">Recherche</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pseudo…"
            className="w-full rounded-full bg-muted py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </header>

      <div className="px-5 py-4">
        <button onClick={share} className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98]">
          <Share2 className="h-5 w-5" /> Inviter des amis
        </button>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {q ? "Résultats" : "Découvrir"}
        </h2>

        <ul className="space-y-2">
          {results.map((u) => {
            const isFollowing = follows.has(u.id);
            return (
              <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex flex-1 items-center gap-3">
                  <img src={u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.handle}`} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{u.display_name}</span>
                      {u.restaurateur && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">★</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">@{u.handle}</div>
                  </div>
                </Link>
                <button onClick={() => toggleFollow(u.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${isFollowing ? "bg-muted text-foreground" : "bg-primary text-primary-foreground shadow-glow"}`}>
                  {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {isFollowing ? "Suivi" : "Suivre"}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">{q ? `Aucun résultat pour « ${q} »` : "Aucun utilisateur"}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
