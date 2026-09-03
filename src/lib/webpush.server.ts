import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY } from "./push-config";

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  image?: string | null;
  tag?: string | null;
};

/** Sends a Web Push message to every registered browser device of a user.
 *  Returns how many were delivered and how many stale devices were cleaned up. */
export async function sendWebPushToUser(userId: string, msg: PushMessage) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!subs || subs.length === 0) return { sent: 0, removed: 0, devices: 0 };

  const vapid: VapidKeys = {
    subject: "mailto:support@dishyo.app",
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: process.env["VAPID_PRIVATE_KEY"]!,
  };

  const data = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: msg.url ?? "/",
    image: msg.image ?? undefined,
    tag: msg.tag ?? undefined,
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
        const res = await fetch(s.endpoint, {
          method: payload.method,
          headers: payload.headers,
          body: new Uint8Array(payload.body).buffer,
        });
        if (res.status === 200 || res.status === 201) sent++;
        else if (res.status === 404 || res.status === 410) stale.push(s.endpoint);
      } catch {
        /* per-device failures are ignored */
      }
    }),
  );

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { sent, removed: stale.length, devices: subs.length };
}
