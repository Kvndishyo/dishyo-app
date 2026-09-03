import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const prefsSchema = z.object({
  push_like: z.boolean(),
  push_comment: z.boolean(),
  push_follow: z.boolean(),
  push_post: z.boolean(),
  push_announce: z.boolean(),
  quiet_enabled: z.boolean(),
  quiet_start: z.string().regex(/^\d{2}:\d{2}$/),
  quiet_end: z.string().regex(/^\d{2}:\d{2}$/),
  tz_offset_minutes: z.number().int().min(-840).max(840),
});

export type NotificationPrefs = z.infer<typeof prefsSchema>;

export const DEFAULT_PREFS: NotificationPrefs = {
  push_like: true,
  push_comment: true,
  push_follow: true,
  push_post: true,
  push_announce: true,
  quiet_enabled: false,
  quiet_start: "22:00",
  quiet_end: "08:00",
  tz_offset_minutes: 0,
};

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_PREFS;
    return {
      push_like: data.push_like,
      push_comment: data.push_comment,
      push_follow: data.push_follow,
      push_post: data.push_post,
      push_announce: data.push_announce,
      quiet_enabled: data.quiet_enabled,
      quiet_start: String(data.quiet_start).slice(0, 5),
      quiet_end: String(data.quiet_end).slice(0, 5),
      tz_offset_minutes: data.tz_offset_minutes,
    };
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPushDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("push_subscriptions")
      .select("id, user_agent, platform, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendWebPushToUser } = await import("@/lib/webpush.server");
    return sendWebPushToUser(context.userId, {
      title: "Dishyo 🔔",
      body: "Tes notifications fonctionnent parfaitement !",
      url: "/compte/notifications",
      tag: "dishyo-test",
    });
  });
