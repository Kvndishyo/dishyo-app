import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbPost, DbProfile } from "@/lib/dishyo-db";

const POST_SELECT =
  "*, profiles!posts_user_id_profiles_fkey(*), likes(emoji,user_id), comments(count)";

export const FEED_PAGE_SIZE = 8;

export type FeedScope = "friends" | "public";

export const feedInfiniteOptions = (scope: FeedScope = "friends", uid?: string) =>
  infiniteQueryOptions({
    queryKey: ["feed", scope, uid ?? null],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;
      let q = supabase
        .from("posts")
        .select(POST_SELECT)
        .gt("expires_at", new Date().toISOString());
      if (scope === "public") {
        q = q.eq("visibility", "public");
      } else if (scope === "friends" && uid) {
        const { data: fol } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", uid);
        const ids = (fol ?? []).map((f: any) => f.following_id as string);
        const authorIds = [...new Set([uid, ...ids])];
        q = q.in("user_id", authorIds);
      }
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as DbPost[];
    },
    getNextPageParam: (last, all) =>
      last.length < FEED_PAGE_SIZE ? undefined : all.length,
    staleTime: 30_000,
  });

export const myPostsQueryOptions = (uid: string | undefined) =>
  queryOptions({
    queryKey: ["my-posts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbPost[];
    },
    staleTime: 60_000,
  });

export const profileByHandleOptions = (handle: string) =>
  queryOptions({
    queryKey: ["profile", handle],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("*").eq("handle", handle).maybeSingle();
      return (data as DbProfile | null) ?? null;
    },
    staleTime: 60_000,
  });

export const userPostsOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("user_id", userId!)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DbPost[];
    },
    staleTime: 30_000,
  });

export const searchUsersOptions = (q: string) =>
  queryOptions({
    queryKey: ["search-users", q],
    queryFn: async () => {
      const { data } = await supabase.rpc("search_users", { q });
      return ((data as DbProfile[] | null) ?? []);
    },
    staleTime: 15_000,
  });

export const postByIdOptions = (id: string) =>
  queryOptions({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as DbPost | null) ?? null;
    },
    staleTime: 30_000,
  });
