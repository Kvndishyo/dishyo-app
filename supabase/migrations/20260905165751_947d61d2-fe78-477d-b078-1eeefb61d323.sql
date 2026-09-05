-- ============ CONVERSATIONS ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  photo_url text,
  created_by uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  nickname text,
  last_read_at timestamptz NOT NULL DEFAULT 'epoch',
  muted_until timestamptz,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  expires_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- ============ POLICIES ============
CREATE POLICY "Members read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "Users create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members update conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (public.is_conversation_member(id, auth.uid()))
  WITH CHECK (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Members read member rows" ON public.conversation_members
  FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Add members to own conversations" ON public.conversation_members
  FOR INSERT TO authenticated WITH CHECK (
    public.is_conversation_member(conversation_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Update own membership" ON public.conversation_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leave conversation" ON public.conversation_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members read messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid())
  );
CREATE POLICY "Edit own messages" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE POLICY "Members read reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id
            AND public.is_conversation_member(m.conversation_id, auth.uid()))
  );
CREATE POLICY "React to messages" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.messages m WHERE m.id = message_id
      AND public.is_conversation_member(m.conversation_id, auth.uid()))
  );
CREATE POLICY "Remove own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TRIGGERS ============
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  UPDATE public.conversation_members SET archived = false
    WHERE conversation_id = NEW.conversation_id AND archived = true;
  UPDATE public.conversation_members SET last_read_at = NEW.created_at
    WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bump_conversation AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- ============ RPC ============
CREATE OR REPLACE FUNCTION public.start_direct_conversation(_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); conv uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user_id = uid THEN RAISE EXCEPTION 'Impossible de discuter avec soi-même'; END IF;
  IF public.is_blocked_between(uid, _other_user_id) THEN RAISE EXCEPTION 'Discussion indisponible'; END IF;

  SELECT c.id INTO conv
  FROM public.conversations c
  JOIN public.conversation_members a ON a.conversation_id = c.id AND a.user_id = uid
  JOIN public.conversation_members b ON b.conversation_id = c.id AND b.user_id = _other_user_id
  WHERE c.is_group = false
  LIMIT 1;

  IF conv IS NOT NULL THEN RETURN conv; END IF;

  INSERT INTO public.conversations (is_group, created_by) VALUES (false, uid) RETURNING id INTO conv;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (conv, uid), (conv, _other_user_id);
  RETURN conv;
END $$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(_title text, _member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); conv uuid; m uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.conversations (is_group, title, created_by)
  VALUES (true, NULLIF(trim(_title), ''), uid) RETURNING id INTO conv;
  INSERT INTO public.conversation_members (conversation_id, user_id, role) VALUES (conv, uid, 'admin');
  FOREACH m IN ARRAY _member_ids LOOP
    IF m <> uid AND NOT public.is_blocked_between(uid, m) THEN
      INSERT INTO public.conversation_members (conversation_id, user_id)
      VALUES (conv, m) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN conv;
END $$;

CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE(
  id uuid, is_group boolean, title text, photo_url text, last_message_at timestamptz,
  pinned boolean, archived boolean, muted_until timestamptz, unread_count integer,
  last_message_body text, last_message_kind text, last_message_sender uuid,
  other_user_id uuid, other_handle text, other_display_name text, other_avatar_url text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, c.is_group, c.title, c.photo_url, c.last_message_at,
         me.pinned, me.archived, me.muted_until,
         (SELECT COUNT(*)::int FROM public.messages m
            WHERE m.conversation_id = c.id AND m.created_at > me.last_read_at
              AND m.sender_id <> uid AND m.deleted_at IS NULL),
         lm.body, lm.kind, lm.sender_id,
         op.id, op.handle, op.display_name, op.avatar_url
  FROM public.conversations c
  JOIN public.conversation_members me ON me.conversation_id = c.id AND me.user_id = uid
  LEFT JOIN LATERAL (
    SELECT m.body, m.kind, m.sender_id FROM public.messages m
    WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT p.id, p.handle, p.display_name, p.avatar_url
    FROM public.conversation_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.conversation_id = c.id AND cm.user_id <> uid
    LIMIT 1
  ) op ON NOT c.is_group
  ORDER BY me.pinned DESC, c.last_message_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.conversation_members SET last_read_at = now()
  WHERE conversation_id = _conversation_id AND user_id = auth.uid();
$$;

-- ============ REALTIME ============
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;