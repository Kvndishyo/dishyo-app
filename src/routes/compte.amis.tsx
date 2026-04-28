import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DbProfile } from "@/lib/dishyo-db";

export const Route = createFileRoute("/compte/amis")({
  component: FriendsPage,
});

function FriendsPage() {
  const { session } = useAuth();
  const [friends, setFriends] = useState<DbProfile[]>([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [{ data: following }, { data: followers }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", session.user.id),
        supabase.from("follows").select("follower_id").eq("following_id", session.user.id),
      ]);
      const followingIds = new Set((following ?? []).map((f) => f.following_id));
      const mutualIds = (followers ?? []).map((f) => f.follower_id).filter((id) => followingIds.has(id));
      if (mutualIds.length === 0) return setFriends([]);
      const { data } = await supabase.from("profiles").select("*").in("id", mutualIds);
      setFriends((data as DbProfile[]) ?? []);
    })();
  }, [session]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes amis</h1>
      </header>

      <div className="p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          Tes amis mutuels apparaissent ici. Suis quelqu'un qui te suit déjà pour devenir amis.
        </p>
        {friends.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun ami mutuel pour l'instant.</p>}
        <ul className="space-y-2">
          {friends.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex flex-1 items-center gap-3">
                <img src={u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.handle}`} className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <div className="font-semibold">{u.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{u.handle}</div>
                </div>
              </Link>
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <UserCheck className="h-3 w-3" /> Ami
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
