// Edge function: génère un brouillon de réponse IA pour un message support Dishyo
// Utilise Lovable AI Gateway (pas de clé requise)
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body } = await req.json();
    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "subject et body requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `Tu es l'équipe support de Dishyo, une app où les gens partagent leurs plats (publications éphémères 24h).
Réponds en français, de manière chaleureuse, concise (4-8 lignes max), professionnelle.
Signe par "L'équipe Dishyo 🍽️".
Si tu ne sais pas, propose de transférer à un humain.`;

    const userPrompt = `Sujet : ${subject}\n\nMessage du client :\n${body}\n\nRédige un brouillon de réponse.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Recharge dans Lovable Cloud." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Erreur IA", details: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
