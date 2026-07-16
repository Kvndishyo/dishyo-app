import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getAnonSupabase } from "../supabase";

export default defineTool({
  name: "search_public_dishes",
  title: "Rechercher des plats publics",
  description:
    "Liste les plats publics récents (non expirés) partagés sur Dishyo. Retourne id, titre, restaurant, catégorie, photo, auteur (handle) et date d'expiration.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Filtre optionnel sur le titre ou le restaurant."),
    category: z.string().trim().optional().describe("Filtre optionnel par catégorie (ex: Pizza, Dessert)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Nombre max de résultats (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }) => {
    const supabase = getAnonSupabase();
    let q = supabase
      .from("posts")
      .select("id, title, restaurant, category, photo_url, expires_at, created_at, profiles!posts_user_id_profiles_fkey(handle, display_name)")
      .eq("visibility", "public")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (query) q = q.or(`title.ilike.%${query}%,restaurant.ilike.%${query}%`);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { dishes: data ?? [] },
    };
  },
});
