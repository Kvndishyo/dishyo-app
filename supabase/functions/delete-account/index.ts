// Edge function: deletes the authenticated user's account and all related data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Delete all related data (RLS bypassed)
    await admin.from("comment_likes").delete().eq("user_id", uid);
    await admin.from("comments").delete().eq("user_id", uid);
    await admin.from("likes").delete().eq("user_id", uid);
    await admin.from("follows").delete().or(`follower_id.eq.${uid},following_id.eq.${uid}`);
    await admin.from("blocks").delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
    await admin.from("notifications").delete().or(`user_id.eq.${uid},actor_id.eq.${uid}`);
    await admin.from("reports").delete().eq("reporter_id", uid);
    await admin.from("posts").delete().eq("user_id", uid);
    await admin.from("support_messages").delete().eq("user_id", uid);
    await admin.from("user_roles").delete().eq("user_id", uid);
    await admin.from("profiles").delete().eq("id", uid);

    // Storage cleanup (best-effort)
    try {
      const { data: avatars } = await admin.storage.from("avatars").list(uid);
      if (avatars?.length) await admin.storage.from("avatars").remove(avatars.map((f) => `${uid}/${f.name}`));
      const { data: dishes } = await admin.storage.from("dish-photos").list(uid);
      if (dishes?.length) await admin.storage.from("dish-photos").remove(dishes.map((f) => `${uid}/${f.name}`));
    } catch (_) { /* ignore */ }

    // Finally, delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
