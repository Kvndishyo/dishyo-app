import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getAnonSupabase } from "../supabase";

export default defineTool({
  name: "search_profiles",
  title: "Rechercher des profils Dishyo",
  description:
    "Recherche des profils publics Dishyo par handle ou nom d'affichage. Retourne handle, nom, bio et avatar.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Terme de recherche (handle ou nom)."),
    limit: z.number().int().min(1).max(30).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, restaurateur")
      .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { profiles: data ?? [] },
    };
  },
});
