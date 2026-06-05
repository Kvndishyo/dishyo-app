DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages;

CREATE POLICY "Users subscribe to own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif:' || auth.uid()::text
  OR realtime.topic() = 'realtime:public:notifications:' || auth.uid()::text
);