import { createFileRoute } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { POSTS, NOTIFICATIONS, timeAgo } from "@/lib/mock-data";
import { PostCard } from "@/components/dishyo/PostCard";

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
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="w-10" />
        <h1 className="text-xl font-bold tracking-tight">Dishyo</h1>
        <button
          onClick={() => setNotifOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted transition hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {NOTIFICATIONS.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </header>

      <div className="pt-4">
        {POSTS.map((p) => <PostCard key={p.id} post={p} />)}
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Tu as tout vu ! ✨
        </p>
      </div>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            />
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
                {NOTIFICATIONS.map((n) => {
                  const Icon = n.type === "like" ? Heart : n.type === "comment" ? MessageCircle : UserPlus;
                  const text =
                    n.type === "like" ? `a aimé ton plat « ${n.postPreview} »` :
                    n.type === "comment" ? `a commenté « ${n.postPreview} »` :
                    "a commencé à te suivre";
                  return (
                    <div key={n.id} className="flex items-center gap-3 border-b border-border px-5 py-4">
                      <div className="relative">
                        <img src={n.user.avatar} className="h-11 w-11 rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Icon className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{n.user.username}</span> {text}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
