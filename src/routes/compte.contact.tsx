import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { ME } from "@/lib/mock-data";

export const Route = createFileRoute("/compte/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [handle, setHandle] = useState(ME.handle);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    setSent(true);
    setTimeout(() => setSent(false), 3500);
    setMessage("");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Contactez-nous</h1>
      </header>

      <form onSubmit={send} className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Une question, un bug, une suggestion ? On te répond par email rapidement.
        </p>

        <Field label="Pseudo">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" className={inputCls} />
        </Field>
        <Field label="Message">
          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Décris-nous ta demande…" className={inputCls + " resize-none"} />
        </Field>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98]"
        >
          <Send className="h-4 w-4" />
          Envoyer
        </button>

        {sent && (
          <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-sm text-emerald-700">
            ✅ Message envoyé ! On revient vers toi très vite.
          </div>
        )}
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
