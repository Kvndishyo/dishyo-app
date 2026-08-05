import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_public_dishes",
  title: "Rechercher des plats",
  description:
    "Liste les plats récents (non expirés) visibles par l'utilisateur connecté. Retourne id, titre, restaurant, catégorie, photo, auteur (handle) et date d'expiration.",
  inputSchema: {
    query: z.string().trim().max(80).optional().describe("Filtre optionnel sur le titre ou le restaurant."),
    category: z.string().trim().max(50).optional().describe("Filtre optionnel par catégorie (ex: Pizza, Dessert)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Nombre max de résultats (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Authentification requise." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("posts")
      .select("id, title, restaurant, category, photo_url, expires_at, created_at, profiles!posts_user_id_profiles_fkey(handle, display_name)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);
    const safe = query?.replace(/[%,()*]/g, "");
    if (safe) q = q.or(`title.ilike.%${safe}%,restaurant.ilike.%${safe}%`);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { dishes: data ?? [] },
    };
  },
});
