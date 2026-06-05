
-- 1) Notifications: replace permissive insert policy
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "Users insert notifications as actor"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 2) Support messages: enforce user_id NOT NULL
ALTER TABLE public.support_messages ALTER COLUMN user_id SET NOT NULL;

-- 3) Realtime: restrict channel subscriptions to user's own topic
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages;
CREATE POLICY "Users subscribe to own topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    (realtime.topic() = ('notif:' || auth.uid()::text))
    OR (realtime.topic() LIKE 'realtime:public:notifications:%' AND realtime.topic() LIKE ('%user_id=eq.' || auth.uid()::text || '%'))
    OR (realtime.topic() LIKE 'realtime:%')
  );
