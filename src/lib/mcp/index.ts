import { defineMcp } from "@lovable.dev/mcp-js";
import searchPublicDishes from "./tools/search-public-dishes";
import getPublicDish from "./tools/get-public-dish";
import searchProfiles from "./tools/search-profiles";

export default defineMcp({
  name: "dishyo-mcp",
  title: "Dishyo MCP",
  version: "0.1.0",
  instructions:
    "Serveur MCP public de Dishyo. Outils en lecture seule sur les plats publics (éphémères) et les profils publics. Utilise search_public_dishes pour parcourir le feed public, get_public_dish pour un plat précis, search_profiles pour trouver un utilisateur.",
  tools: [searchPublicDishes, getPublicDish, searchProfiles],
});
