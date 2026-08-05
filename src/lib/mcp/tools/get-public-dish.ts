import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_public_dish",
  title: "Détails d'un plat",
  description:
    "Récupère un plat Dishyo visible par l'utilisateur connecté : titre, restaurant, catégorie, recette, photo, auteur et date d'expiration.",
  inputSchema: {
    id: z.string().uuid().describe("Identifiant UUID du plat."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Authentification requise." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, restaurant, category, recipe, photo_url, visibility, expires_at, created_at, profiles!posts_user_id_profiles_fkey(handle, display_name, avatar_url)")
      .eq("id", id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Plat introuvable ou non accessible." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { dish: data },
    };
  },
});
