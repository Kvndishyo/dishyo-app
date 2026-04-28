import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, UserPlus, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchProfileByHandle, fetchUserPosts, type DbProfile, type DbPost } from "@/lib/dishyo-db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/profil/$handle")({
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await fetchProfileByHandle(handle);
      if (cancelled) return;
      if (!p) { setLoading(false); return; }
      setProfile(p);
      const [posts, followers, followingC, isFollow] = await Promise.all([
        fetchUserPosts(p.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
        session ? supabase.from("follows").select("*", { head: true }).eq("follower_id", session.user.id).eq("following_id", p.id) : Promise.resolve({ count: 0 } as any),
      ]);
      if (cancelled) return;
      setPosts(posts);
      setStats({ followers: followers.count ?? 0, following: followingC.count ?? 0 });
      setFollowing((isFollow as any).count ? true : false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [handle, session]);

  async function toggle() {
    if (!session || !profile) return navigate({ to: "/auth" });
    if (following) {
      setFollowing(false);
      setStats((s) => ({ ...s, followers: s.followers - 1 }));
      await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", profile.id);
    } else {
      setFollowing(true);
      setStats((s) => ({ ...s, followers: s.followers + 1 }));
      await supabase.from("follows").insert({ follower_id: session.user.id, following_id: profile.id });
    }
  }

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>;
  if (!profile) return <div className="p-6 text-center">Utilisateur introuvable. <Link to="/recherche" className="text-primary">Retour</Link></div>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/recherche" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">@{profile.handle}</h1>
      </header>

      <div className="px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <img src={profile.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${profile.handle}`} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-card" />
          <h2 className="mt-3 flex items-center gap-2 text-xl font-bold">
            {profile.display_name}
            {profile.restaurateur && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">★ Restaurateur</span>}
          </h2>
          <p className="text-sm text-primary">@{profile.handle}</p>
          {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}

          {session && session.user.id !== profile.id && (
            <div className="mt-5 flex w-full gap-2">
              <button onClick={toggle}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold transition ${following ? "bg-muted text-foreground" : "bg-primary text-primary-foreground shadow-glow"}`}>
                {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? "Suivi" : "Suivre"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 border-y border-border py-4 text-center">
          <Stat n={stats.following} label="Abonnements" />
          <Stat n={stats.followers} label="Abonnés" />
          <Stat n={posts.length} label="Plats actifs" />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plats actifs</h3>
        {posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun plat actif pour le moment.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((p) => (
              <div key={p.id} className="aspect-square overflow-hidden rounded-lg">
                <img src={p.photo_url} alt={p.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div><div className="text-xl font-bold">{n}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
