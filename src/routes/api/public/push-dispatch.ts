import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendWebPushToUser } from "@/lib/webpush.server";

const bodySchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().min(1).max(500).default("/"),
  image: z.string().max(1000).nullable().optional(),
  notification_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: shared secret from the database trigger
        const expected = process.env["PUSH_DISPATCH_SECRET"];
        const provided = request.headers.get("x-dispatch-secret");
        if (!expected || !provided || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        try {
          const result = await sendWebPushToUser(parsed.user_id, {
            title: parsed.title,
            body: parsed.body,
            url: parsed.url,
            image: parsed.image ?? null,
            tag: parsed.notification_id ?? null,
          });
          return Response.json(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : "push failed";
          console.error(`push-dispatch failed: ${message}`);
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
