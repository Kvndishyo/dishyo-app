import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { levelInfo, XP_RULES, activeStreak, streakMultiplier, parisToday, STREAK_BOOST_DAYS } from "@/lib/xp";

export function XpCard({ userId }: { userId: string }) {
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    supabase.from("user_xp").select("xp, streak_days, last_post_day").eq("user_id", userId).maybeSingle().then(({ data }) => {
      setXp(data?.xp ?? 0);
      setStreak(activeStreak(data?.streak_days ?? 0, data?.last_post_day ?? null, parisToday()));
    });
  }, [userId]);
  if (xp === null) return null;
  const l = levelInfo(xp);
  const boosted = streakMultiplier(streak) > 1;
  return (
    <details className="mt-4 rounded-2xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{l.level}</div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{l.title}</span>
            <span className="text-xs text-muted-foreground"><Flame className="mr-1 inline h-3 w-3 text-primary" />{xp} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(l.progress * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{l.needed - l.current} XP avant le niveau {l.level + 1}</p>
        </div>
      </summary>
      <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${boosted ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
        <span>🔥</span>
        <span className="flex-1">Série de cuisine : {streak} jour{streak > 1 ? "s" : ""}</span>
        <span className="text-xs">{boosted ? "XP ×1,5 actif" : `${Math.max(STREAK_BOOST_DAYS - streak, 0)} j avant ×1,5`}</span>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li>Publier un plat : +{XP_RULES.post} XP</li>
        <li>Commenter : +{XP_RULES.comment} XP · en recevoir un : +{XP_RULES.receivedComment} XP</li>
        <li>Réagir : +{XP_RULES.reaction} XP · recevoir une réaction : +{XP_RULES.receivedReaction} XP</li>
        <li>🔥 Publie un plat chaque jour : dès 7 jours d'affilée, tout ton XP est ×1,5. Un jour sauté et la série repart à zéro.</li>
      </ul>
    </details>
  );
}
