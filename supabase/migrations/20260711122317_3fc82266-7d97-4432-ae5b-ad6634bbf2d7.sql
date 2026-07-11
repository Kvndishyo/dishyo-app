
-- blocks
DROP POLICY "Users manage own blocks" ON public.blocks;
DROP POLICY "Users see own blocks" ON public.blocks;
CREATE POLICY "Users manage own blocks" ON public.blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users see own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);

-- comments
DROP POLICY "Users delete own or post-owner comments" ON public.comments;
DROP POLICY "Users insert own comments" ON public.comments;
CREATE POLICY "Users delete own or post-owner comments" ON public.comments FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND p.user_id = auth.uid())));
CREATE POLICY "Users insert own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- comment_likes
DROP POLICY "Users manage own comment likes" ON public.comment_likes;
CREATE POLICY "Users manage own comment likes" ON public.comment_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- likes
DROP POLICY "Users manage own likes" ON public.likes;
CREATE POLICY "Users manage own likes" ON public.likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- follows
DROP POLICY "Users manage own follows" ON public.follows;
CREATE POLICY "Users manage own follows" ON public.follows FOR ALL TO authenticated USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

-- notifications
DROP POLICY "Users delete own notifications" ON public.notifications;
DROP POLICY "Users see own notifications" ON public.notifications;
DROP POLICY "Users update own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY "Users insert own profile" ON public.profiles;
DROP POLICY "Users update own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- support_messages
DROP POLICY "Admins update support" ON public.support_messages;
DROP POLICY "Users see own support" ON public.support_messages;
CREATE POLICY "Admins update support" ON public.support_messages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own support" ON public.support_messages FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- user_roles
DROP POLICY "Admins manage roles" ON public.user_roles;
DROP POLICY "View own or admin roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "View own or admin roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
