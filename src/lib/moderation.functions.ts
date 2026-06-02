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
    if (!apiKey) return { safe: true, reason: "no api key" };
    try {
      const r = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Tu es un modérateur pour Dishyo, app de partage de plats. Analyse cette image: contient-elle de la nudité, du contenu sexuel, de la violence, du contenu choquant, ou autre chose qu'un plat / une scène culinaire ? Réponds UNIQUEMENT en JSON: {"safe": true|false, "category": "ok|nudity|violence|shock|off_topic", "reason": "court motif en français"}.` },
              { type: "image_url", image_url: { url: data.imageBase64 } },
            ],
          }],
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
