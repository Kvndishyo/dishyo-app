import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbPost, DbProfile } from "@/lib/dishyo-db";

const POST_SELECT =
  "*, profiles!posts_user_id_profiles_fkey(*), likes(emoji,user_id), comments(count)";

export const FEED_PAGE_SIZE = 8;

export const feedInfiniteOptions = () =>
  infiniteQueryOptions({
    queryKey: ["feed"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .gt("expires_at", new Date().toISOString())
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
