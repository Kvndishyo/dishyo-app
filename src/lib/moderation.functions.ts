import { createServerFn } from "@tanstack/react-start";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ModerationResult = { safe: boolean; reason: string; category?: string };

export const moderateText = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; context?: string }) => {
    if (!input?.text || typeof input.text !== "string") throw new Error("text required");
    if (input.text.length > 4000) throw new Error("text too long");
    return input;
  })
  .handler(async ({ data }): Promise<ModerationResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { safe: true, reason: "no api key" };
    const prompt = `Tu es un modérateur pour Dishyo, une app de partage de plats. Analyse ce texte et détermine s'il contient: haine, harcèlement, menaces, contenu sexuel explicite, spam évident, ou contenu illégal. Le contexte est: ${data.context ?? "publication culinaire"}. Réponds UNIQUEMENT en JSON: {"safe": true|false, "category": "ok|hate|harass|sexual|spam|illegal", "reason": "court motif en français"}.\n\nTEXTE: """${data.text}"""`;
    try {
      const r = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return { safe: true, reason: "moderation unavailable" };
      const j = await r.json();
      const content = j?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      return {
        safe: Boolean(parsed.safe),
        reason: String(parsed.reason ?? ""),
        category: String(parsed.category ?? "ok"),
      };
    } catch {
      return { safe: true, reason: "moderation error" };
    }
  });

export const moderateImage = createServerFn({ method: "POST" })
  .inputValidator((input: { imageBase64: string }) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") throw new Error("image required");
    if (input.imageBase64.length > 8_000_000) throw new Error("image too large");
    return input;
  })
  .handler(async ({ data }): Promise<ModerationResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { safe: false, reason: "Modération indisponible, réessaie plus tard.", category: "unavailable" };
    try {
      const r = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Tu es le modérateur de Dishyo, une application dédiée EXCLUSIVEMENT au partage de nourriture.

RÈGLE PRINCIPALE : l'image DOIT montrer de la nourriture ou une boisson de manière clairement identifiable (plat cuisiné, assiette, dessert, pâtisserie, fruits/légumes, ingrédients, street food, boisson, table garnie, plan rapproché d'un repas). Une personne, un animal, un paysage, un objet, un texte, une capture d'écran, un selfie, un meme, un intérieur de restaurant vide ou une photo floue SANS nourriture visible et reconnaissable au premier plan doit être REFUSÉ avec category "not_food".
Une photo où de la nourriture est présente mais reste le sujet principal (ex : quelqu'un qui tient son plat) est ACCEPTÉE.

REFUSE AUSSI : nudité ou sous-vêtements, contenu sexuel, violence, sang/gore, cadavres, drogues illicites, armes, symboles haineux, contenu choquant, publicité/spam hors-sujet.

Réponds UNIQUEMENT en JSON: {"safe": true|false, "is_food": true|false, "category": "ok|not_food|nudity|sexual|violence|gore|drugs|weapons|hate|shock|spam", "reason": "court motif en français"}. Si is_food vaut false, safe DOIT valoir false et reason doit expliquer que seules les photos de nourriture sont autorisées.` } },
              { type: "image_url", image_url: { url: data.imageBase64 } },
            ],
          }],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return { safe: false, reason: "Vérification de la photo impossible, réessaie.", category: "unavailable" };
      const j = await r.json();
      const content = j?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      return {
        safe: parsed.safe !== false && parsed.is_food !== false,
        reason:
          parsed.is_food === false
            ? "Dishyo n'accepte que les photos de nourriture ou de boissons."
            : String(parsed.reason ?? ""),
        category: parsed.is_food === false ? "not_food" : String(parsed.category ?? "ok"),
      };
    } catch {
      return { safe: false, reason: "Vérification de la photo impossible, réessaie.", category: "unavailable" };
    }
  });
