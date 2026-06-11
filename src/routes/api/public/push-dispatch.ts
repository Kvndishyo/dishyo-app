import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import { z } from "zod";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

const bodySchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().min(1).max(500).default("/"),
  notification_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: shared secret from the database trigger
        const expected = process.env.PUSH_DISPATCH_SECRET;
        const provided = request.headers.get("x-dispatch-secret");
        if (!expected || !provided || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed;
        try {
          const raw = await request.json();
          parsed = bodySchema.parse(raw);
        } catch (e) {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", parsed.user_id);
        if (error) return new Response(error.message, { status: 500 });
        if (!subs || subs.length === 0) return Response.json({ sent: 0 });

        const vapid: VapidKeys = {
          subject: "mailto:support@dishyo.app",
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY!,
        };

        const data = JSON.stringify({
          title: parsed.title,
          body: parsed.body,
          url: parsed.url,
          tag: parsed.notification_id,
        });

        let sent = 0;
        const stale: string[] = [];
        await Promise.all(
          subs.map(async (s) => {
            const subscription: PushSubscription = {
              endpoint: s.endpoint,
              expirationTime: null,
              keys: { p256dh: s.p256dh, auth: s.auth },
            };
            try {
              const payload = await buildPushPayload({ data, options: { ttl: 60 } }, subscription, vapid);
              const res = await fetch(s.endpoint, payload);
              if (res.status === 201 || res.status === 200) {
                sent++;
              } else if (res.status === 404 || res.status === 410) {
                stale.push(s.endpoint);
              }
            } catch {
              /* swallow per-subscription errors */
            }
          }),
        );

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ sent, removed: stale.length });
      },
    },
  },
});
