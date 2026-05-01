import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/dishyo-db";

type Notif = {
  id: string;
  type: "like" | "comment" | "follow";
  actor_id: string | null;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor: { handle: string; display_name: string; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Dishyo — Notifications" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const list = (data ?? []) as Notif[];
      const actorIds = [...new Set(list.map((n) => n.actor_id).filter(Boolean) as string[])];
      let actors: Record<string, Notif["actor"]> = {};
      if (actorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", actorIds);
        actors = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      }
      setItems(list.map((n) => ({ ...n, actor: n.actor_id ? actors[n.actor_id] ?? null : null })));
      setLoadingItems(false);
      await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    })();
  }, [session]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold">Notifications</h1>
      </header>

      {loadingItems ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <Bell className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune notification pour le moment</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => <Item key={n.id} n={n} />)}
        </ul>
      )}
    </div>
  );
}

function Item({ n }: { n: Notif }) {
  const icon = n.type === "like" ? <Heart className="h-4 w-4 text-red-500" />
    : n.type === "comment" ? <MessageCircle className="h-4 w-4 text-blue-500" />
    : <UserPlus className="h-4 w-4 text-primary" />;
  const text = n.type === "like" ? "a aimé ton plat" : n.type === "comment" ? "a commenté ton plat" : "a commencé à te suivre";
  const handle = n.actor?.handle ?? "quelqu'un";
  const displayName = n.actor?.display_name ?? "Quelqu'un";
  const avatar = n.actor?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${handle}`;
  const linkProps = n.actor ? { to: "/profil/$handle" as const, params: { handle } } : { to: "/" as const };
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${n.read ? "" : "bg-accent/30"}`}>
      <Link {...linkProps} className="relative flex-shrink-0">
        <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-soft">{icon}</span>
      </Link>
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{displayName}</span>{" "}
        <span className="text-muted-foreground">{text}</span>
        <div className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</div>
      </div>
    </li>
  );
}
