import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchFeed, type DbPost } from "@/lib/dishyo-db";
import { PostCard } from "@/components/dishyo/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/dishyo/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dishyo — Accueil" },
      { name: "description", content: "Découvre les plats publiés par tes amis sur Dishyo." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    fetchFeed().then((p) => { setPosts(p); setLoading(false); }).catch(() => setLoading(false));
  }, [session, authLoading]);

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
        <button onClick={() => setNotifOpen(true)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted transition hover:bg-accent">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      <div className="pt-4">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : posts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-semibold">Pas encore de plats 🍽️</p>
            <p className="mt-2 text-sm text-muted-foreground">Suis tes amis ou publie ton premier plat !</p>
            <Link to="/publier" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
              Publier un plat
            </Link>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} currentUserId={session.user.id} />)
        )}
        {!loading && posts.length > 0 && (
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
              <div className="flex-1 overflow-y-auto p-6 text-center text-sm text-muted-foreground">
                Aucune notification pour l'instant.
                <div className="mt-6 flex items-center justify-center gap-3 text-xs">
                  <Heart className="h-4 w-4" /><MessageCircle className="h-4 w-4" /><UserPlus className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
