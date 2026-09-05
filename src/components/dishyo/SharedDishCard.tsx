import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeRemaining } from "@/lib/dishyo-db";

type MiniPost = {
  id: string;
  title: string;
  photo_url: string;
  restaurant: string | null;
  expires_at: string;
  profiles: { handle: string; display_name: string } | null;
};

export function SharedDishCard({ postId }: { postId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["shared-dish", postId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, photo_url, restaurant, expires_at, profiles!posts_user_id_profiles_fkey(handle, display_name)")
        .eq("id", postId)
        .maybeSingle();
      return (data as unknown as MiniPost | null) ?? null;
    },
  });

  if (isLoading) return <div className="h-40 w-56 animate-pulse rounded-2xl bg-muted" />;
  if (!data)
    return (
      <div className="rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        Ce plat n'est plus disponible 🕓
      </div>
    );

  const expired = new Date(data.expires_at).getTime() < Date.now();

  return (
    <Link
      to="/plat/$id"
      params={{ id: data.id }}
      className="block w-56 overflow-hidden rounded-2xl bg-card shadow-card transition active:scale-[0.98]"
    >
      <img src={data.photo_url} alt={data.title} className="aspect-square w-full object-cover" />
      <div className="p-2.5">
        <div className="truncate text-sm font-semibold">{data.title}</div>
        {data.profiles && (
          <div className="truncate text-[11px] text-muted-foreground">par {data.profiles.display_name}</div>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {expired ? "Expiré" : timeRemaining(data.expires_at)}
        </div>
      </div>
    </Link>
  );
}
