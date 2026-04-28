import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/compte/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { session, profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return toast.error("Connecte-toi d'abord");
    if (!email.trim() || !message.trim() || !subject.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      user_id: session.user.id, email, subject, body: message,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    setMessage("");
    setSubject("");
    setTimeout(() => setSent(false), 4000);
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
          {profile ? `Bonjour @${profile.handle} !` : ""} Une question, un bug, une suggestion ? On te répond rapidement.
        </p>

        <Field label="Sujet"><input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet" className={inputCls} /></Field>
        <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        <Field label="Message"><textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Décris-nous ta demande…" className={inputCls + " resize-none"} /></Field>

        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-50">
          <Send className="h-4 w-4" /> {busy ? "Envoi…" : "Envoyer"}
        </button>

        {sent && <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-sm text-emerald-700">✅ Message envoyé ! On revient vers toi très vite.</div>}
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>{children}</label>;
}
