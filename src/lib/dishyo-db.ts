import { supabase } from "@/integrations/supabase/client";

export type DbProfile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  restaurateur: boolean;
  restaurateur_plan: string | null;
};

export type DbPost = {
  id: string;
  user_id: string;
  photo_url: string;
  title: string;
  restaurant: string | null;
  category: string | null;
  recipe: string | null;
  visibility: "public" | "friends";
  created_at: string;
  expires_at: string;
  profiles: DbProfile | null;
  likes: { emoji: string; user_id: string }[];
  comments: { count: number }[];
};

export const CATEGORIES = [
  { name: "Healthy", emoji: "🥗" },
  { name: "Gourmand", emoji: "🍰" },
  { name: "Végétarien", emoji: "🌿" },
  { name: "Exotique", emoji: "🌍" },
  { name: "Comfort Food", emoji: "🍲" },
] as const;

export const REACTIONS = ["❤️", "😍", "🔥", "🤤", "👏", "🙌"] as const;

const HOUR_MS = 3600 * 1000;

export function timeRemaining(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  if (ms <= 0) return "Expiré";
  const h = Math.floor(ms / HOUR_MS);
  const m = Math.floor((ms % HOUR_MS) / 60000);
  return `${h}h ${m}min`;
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export async function fetchFeed(): Promise<DbPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(*), likes(emoji,user_id), comments(count)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as DbPost[];
}

export async function fetchUserPosts(userId: string): Promise<DbPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(*), likes(emoji,user_id), comments(count)")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbPost[];
}

export async function fetchProfileByHandle(handle: string): Promise<DbProfile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  return (data as DbProfile | null) ?? null;
}

export async function searchProfiles(q: string): Promise<DbProfile[]> {
  let qb = supabase.from("profiles").select("*").limit(30);
  if (q.trim()) qb = qb.or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`);
  const { data } = await qb;
  return (data as DbProfile[]) ?? [];
}
