
-- Add FK from public.profiles to enable Supabase relationship hints (profiles.id == auth.users.id)
-- We add additional FKs pointing to public.profiles so PostgREST can resolve embeds.
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_id_profiles_fkey
  FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_following_id_profiles_fkey
  FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
