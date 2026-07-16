import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getAnonSupabase } from "../supabase";

export default defineTool({
  name: "get_public_dish",
  title: "Détails d'un plat public",
  description:
    "Récupère un plat public Dishyo par son id : titre, restaurant, catégorie, recette, photo, auteur et date d'expiration.",
  inputSchema: {
    id: z.string().uuid().describe("Identifiant UUID du plat."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, restaurant, category, recipe, photo_url, visibility, expires_at, created_at, profiles!posts_user_id_profiles_fkey(handle, display_name, avatar_url)")
      .eq("id", id)
      .eq("visibility", "public")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Plat introuvable ou non public." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { dish: data },
    };
  },
});
