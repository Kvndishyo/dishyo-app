import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/compte/aide")({
  component: HelpPage,
  head: () => ({
    meta: [
      { title: "Aide et support — Assistant Dishyo" },
      {
        name: "description",
        content:
          "Pose ta question à l'assistant IA de Dishyo : publication de plats, visibilité, réactions, mode restaurateur et compte.",
      },
      { property: "og:title", content: "Aide et support — Assistant Dishyo" },
      {
        property: "og:description",
        content: "L'assistant IA de Dishyo répond à toutes tes questions sur l'application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Combien de temps reste un plat publié ?",
  "Quelle différence entre Amis et Public ?",
  "Comment fonctionne le mode Restaurateur ?",
  "Comment supprimer mon compte ?",
];

const GREETING =
  "Salut 👋 Je suis l'assistant Dishyo. Pose-moi n'importe quelle question sur l'application : publication de plats, visibilité, réactions, abonnements, compte…";

function HelpPage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.content) }),
      });

      if (!res.ok || !res.body) {
        const message =
          res.status === 429
            ? "Trop de questions d'un coup 😅 Réessaie dans quelques instants."
            : res.status === 402
              ? "L'assistant est momentanément indisponible. Utilise « Contactez-nous » juste en dessous."
              : "Oups, je n'ai pas réussi à répondre. Réessaie ou passe par « Contactez-nous ».";
        setMessages([...next, { role: "assistant", content: message }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (!acc) {
        setMessages([
          ...next,
          { role: "assistant", content: "Je n'ai pas de réponse pour celle-ci. Écris-nous via « Contactez-nous »." },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Connexion interrompue. Vérifie ton réseau et réessaie." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Aide et support</h1>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
          <span>Assistant Dishyo — il connaît toutes les fonctionnalités de l'app.</span>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {m.content ||
                (loading ? <span className="text-muted-foreground">L'assistant écrit…</span> : null)}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <Link
          to="/compte/contact"
          className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft transition hover:bg-accent"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Contactez-nous</div>
            <div className="text-xs text-muted-foreground">Besoin d'un humain ? Écris-nous directement</div>
          </div>
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Pose ta question sur Dishyo…"
          className="max-h-32 flex-1 resize-none rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
