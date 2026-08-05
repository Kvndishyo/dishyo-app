import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_profiles",
  title: "Rechercher des profils Dishyo",
  description:
    "Recherche des profils Dishyo par handle ou nom d'affichage, au nom de l'utilisateur connecté. Retourne handle, nom, bio et avatar.",
  inputSchema: {
    query: z.string().trim().min(1).max(80).describe("Terme de recherche (handle ou nom)."),
    limit: z.number().int().min(1).max(30).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Authentification requise." }], isError: true };
    const safe = query.replace(/[%,()*]/g, "");
    if (!safe) return { content: [{ type: "text", text: "Recherche invalide." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, restaurateur")
      .or(`handle.ilike.%${safe}%,display_name.ilike.%${safe}%`)
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { profiles: data ?? [] },
    };
  },
});
