import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Heart, MessageCircle, Utensils, Users, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/compte/dashboard")({
  head: () => ({ meta: [{ title: "Dishyo — Dashboard restaurateur" }] }),
  component: DashboardPage,
});

type Stats = {
  postsTotal: number;
  postsActive: number;
  likesTotal: number;
  commentsTotal: number;
  followers: number;
  topPost: { id: string; title: string; photo_url: string; likes: number } | null;
};

function DashboardPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const uid = session.user.id;
      const [tot, act, fol, posts] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid).gt("expires_at", new Date().toISOString()),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
        supabase.from("posts").select("id,title,photo_url,likes(id),comments(id)").eq("user_id", uid),
      ]);
      type R = { id: string; title: string; photo_url: string; likes: { id: string }[]; comments: { id: string }[] };
      const rows = (posts.data ?? []) as R[];
      let likesTotal = 0, commentsTotal = 0, top: Stats["topPost"] = null;
      rows.forEach((r) => {
        const l = r.likes?.length ?? 0;
        likesTotal += l;
        commentsTotal += r.comments?.length ?? 0;
        if (!top || l > top.likes) top = { id: r.id, title: r.title, photo_url: r.photo_url, likes: l };
      });
      setStats({
        postsTotal: tot.count ?? 0,
        postsActive: act.count ?? 0,
        likesTotal,
        commentsTotal,
        followers: fol.count ?? 0,
        topPost: top,
      });
    })();
  }, [session]);

  if (loading || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      <div className="space-y-5 p-5">
        <div className="rounded-3xl gradient-warm p-5 text-white shadow-glow">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h2 className="text-xl font-bold">Tes statistiques</h2>
          </div>
          <p className="mt-1 text-sm text-white/90">Aperçu de ton activité sur Dishyo.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Utensils className="h-5 w-5" />} label="Plats publiés" value={stats?.postsTotal ?? "—"} sub={`${stats?.postsActive ?? 0} actifs`} />
          <Stat icon={<Users className="h-5 w-5" />} label="Abonnés" value={stats?.followers ?? "—"} />
          <Stat icon={<Heart className="h-5 w-5 text-red-500" />} label="Likes reçus" value={stats?.likesTotal ?? "—"} />
          <Stat icon={<MessageCircle className="h-5 w-5" />} label="Commentaires" value={stats?.commentsTotal ?? "—"} />
        </div>

        {stats?.topPost && (
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Plat le plus aimé
            </div>
            <div className="flex items-center gap-3">
              <img src={stats.topPost.photo_url} alt={stats.topPost.title} className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="font-semibold">{stats.topPost.title}</div>
                <div className="text-xs text-muted-foreground">{stats.topPost.likes} like(s)</div>
              </div>
            </div>
          </div>
        )}

        {!profile.restaurateur && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/30 p-4 text-sm">
            <p className="font-semibold">Passe en mode Restaurateur</p>
            <p className="mt-1 text-xs text-muted-foreground">Pour booster ta visibilité au-delà de tes abonnés.</p>
            <Link to="/compte/restaurateur" className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              Découvrir
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
