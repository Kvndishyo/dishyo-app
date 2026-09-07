import { createFileRoute } from "@tanstack/react-router";
import { sendWebPushToUser } from "@/lib/webpush.server";

/**
 * Sends a "your dish expires soon" push for posts expiring in the next 3 hours.
 * Called by a scheduler with the shared PUSH_DISPATCH_SECRET header.
 */
export const Route = createFileRoute("/api/public/expiry-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["PUSH_DISPATCH_SECRET"];
        const provided = request.headers.get("x-dispatch-secret");
        if (!expected || !provided || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const horizon = new Date(now + 3 * 60 * 60 * 1000).toISOString();

        const { data: posts, error } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, title, photo_url, expires_at")
          .eq("hidden", false)
          .gt("expires_at", new Date(now).toISOString())
          .lte("expires_at", horizon)
          .limit(200);
        if (error) return new Response(error.message, { status: 500 });

        let sent = 0;
        for (const post of posts ?? []) {
          const { error: markError } = await supabaseAdmin
            .from("post_expiry_reminders")
            .insert({ post_id: post.id });
          // Already reminded (primary key conflict) -> skip.
          if (markError) continue;

          try {
            await sendWebPushToUser(post.user_id, {
              title: "Ton plat expire bientôt ⏳",
              body: `« ${post.title} » disparaît dans moins de 3 h. Republie-le pour rester visible !`,
              url: `/plat/${post.id}`,
              image: post.photo_url ?? null,
              tag: `expiry-${post.id}`,
            });
            sent++;
          } catch (e) {
            console.error("expiry reminder failed", e);
          }
        }

        return Response.json({ ok: true, checked: posts?.length ?? 0, sent });
      },
    },
  },
});
