import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { timeAgo } from "@/lib/dishyo-db";
import { feedInfiniteOptions } from "@/lib/queries";
import { PostCard } from "@/components/dishyo/PostCard";
import { SponsoredAdCard, type SponsoredAd } from "@/components/dishyo/SponsoredAdCard";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/dishyo/Logo";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition } from "@/lib/geo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dishyo — Accueil" },
      { name: "description", content: "Découvre les plats publiés par tes amis sur Dishyo." },
    ],
  }),
  component: HomePage,
});

type Notif = {
  id: string;
  type: "like" | "comment" | "follow";
  actor_id: string | null;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor: { handle: string; display_name: string; avatar_url: string | null } | null;
};

function HomePage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const feed = useInfiniteQuery({
    ...feedInfiniteOptions(),
    enabled: !!session,
  });
  const posts = feed.data?.pages.flat() ?? [];
  const loading = feed.isLoading;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !feed.hasNextPage || feed.isFetchingNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) feed.fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed]);

  // Load notifications + unread badge + realtime
  useEffect(() => {
    if (!session) { setNotifs([]); setUnread(0); return; }
    const uid = session.user.id;
    const load = async () => {
      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", uid)
        .order("created_at", { ascending: false }).limit(50);
      const list = (data ?? []) as unknown as Notif[];
      const ids = [...new Set(list.map((n) => n.actor_id).filter(Boolean) as string[])];
      let actors: Record<string, Notif["actor"]> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", ids);
        actors = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      }
      const enriched = list.map((n) => ({ ...n, actor: n.actor_id ? actors[n.actor_id] ?? null : null }));
      setNotifs(enriched);
      setUnread(enriched.filter((n) => !n.read).length);
    };
    load();
    const ch = supabase.channel(`home-notifs-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session]);

  // Load location-relevant sponsored ads
  useEffect(() => {
    if (!session) { setAds([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { lat, lng } = await getCurrentPosition();
        const { data } = await supabase.rpc("nearby_ads", { _lat: lat, _lng: lng });
        if (!cancelled) setAds((data ?? []) as SponsoredAd[]);
      } catch {
        if (!cancelled) setAds([]);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  async function openNotifs() {
    setNotifOpen(true);
    if (!session) return;
    if (unread > 0) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
      setUnread(0);
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    }
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Logo size={48} /></div>;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Logo size={72} />
        <h1 className="mt-4 text-3xl font-bold">Dishyo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connecte-toi pour voir les plats de tes amis</p>
        <button onClick={() => navigate({ to: "/auth" })} className="mt-6 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow">
          Commencer
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="w-10" />
        <h1 className="text-xl font-bold tracking-tight">Dishyo</h1>
        <button onClick={openNotifs} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted transition hover:bg-accent">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </header>

      <div className="pt-4">
        {loading ? (
          <div className="space-y-6 px-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-semibold">Pas encore de plats 🍽️</p>
            <p className="mt-2 text-sm text-muted-foreground">Suis tes amis ou publie ton premier plat !</p>
            <Link to="/publier" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
              Publier un plat
            </Link>
          </div>
        ) : (
          posts.map((p, i) => {
            const showAdAfter = ads.length > 0 && i > 0 && (i + 1) % 4 === 0;
            const ad = showAdAfter ? ads[Math.floor(i / 4) % ads.length] : null;
            return (
              <div key={p.id}>
                <PostCard
                  post={p}
                  currentUserId={session.user.id}
                  onHide={() => qc.invalidateQueries({ queryKey: ["feed"] })}
                />
                {ad && <SponsoredAdCard key={`ad-${i}-${ad.id}`} ad={ad} />}
              </div>
            );
          })
        )}
        <div ref={sentinelRef} />
        {feed.isFetchingNextPage && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        )}
        {!loading && posts.length > 0 && !feed.hasNextPage && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Tu as tout vu ! ✨</p>
        )}
      </div>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotifOpen(false)} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[88%] max-w-[420px] flex-col bg-background shadow-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <button onClick={() => setNotifOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Aucune notification pour l'instant.
                    <div className="mt-6 flex items-center justify-center gap-3 text-xs">
                      <Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><UserPlus className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifs.map((n) => {
                      const icon = n.type === "like" ? <Heart className="h-4 w-4 text-red-500" />
                        : n.type === "comment" ? <MessageCircle className="h-4 w-4 text-blue-500" />
                        : <UserPlus className="h-4 w-4 text-primary" />;
                      const text = n.type === "like" ? "a aimé ton plat" : n.type === "comment" ? "a commenté ton plat" : "a commencé à te suivre";
                      const handle = n.actor?.handle ?? "";
                      const name = n.actor?.display_name ?? "Quelqu'un";
                      const avatar = n.actor?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${handle || "user"}`;
                      const goTo = () => {
                        setNotifOpen(false);
                        if (n.type === "follow" && handle) {
                          navigate({ to: "/profil/$handle", params: { handle } });
                        } else if ((n.type === "like" || n.type === "comment")) {
                          navigate({ to: "/compte/mes-plats" });
                        } else if (handle) {
                          navigate({ to: "/profil/$handle", params: { handle } });
                        }
                      };
                      return (
                        <motion.li
                          key={n.id}
                          whileTap={{ scale: 0.98, backgroundColor: "hsl(var(--muted))" }}
                          onClick={goTo}
                          className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-muted"
                        >
                          <div className="relative flex-shrink-0">
                            <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-soft">{icon}</span>
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            <span className="font-semibold">{name}</span>{" "}
                            <span className="text-muted-foreground">{text}</span>
                            <div className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
