import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPublicDishes from "./tools/search-public-dishes";
import getPublicDish from "./tools/get-public-dish";
import searchProfiles from "./tools/search-profiles";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "dishyo",
  title: "Dishyo: Your Daily Dish",
  version: "0.1.0",
  instructions:
    "Serveur MCP de Dishyo. L'utilisateur doit se connecter : les outils agissent en son nom. Outils en lecture seule sur les plats visibles par l'utilisateur et les profils.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPublicDishes, getPublicDish, searchProfiles],
});
