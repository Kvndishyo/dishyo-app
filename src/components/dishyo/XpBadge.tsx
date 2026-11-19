import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { levelInfo } from "@/lib/xp";

/** Public level + prestige stars for any profile. */
export function XpBadge({ userId }: { userId: string }) {
  const [r, setR] = useState<{ xp: number; prestige: number } | null>(null);
  useEffect(() => {
    supabase.rpc("public_xp_rank", { _user: userId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setR(row ? { xp: row.xp, prestige: row.prestige } : { xp: 0, prestige: 0 });
    });
  }, [userId]);
  if (!r) return null;
  const l = levelInfo(r.xp);
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
      {r.prestige > 0 && <span title={`Prestige ${r.prestige}`}>{"⭐".repeat(Math.min(r.prestige, 5))}{r.prestige > 5 ? `×${r.prestige}` : ""}</span>}
      <span>Niv. {l.level} · {l.title}</span>
    </p>
  );
}
