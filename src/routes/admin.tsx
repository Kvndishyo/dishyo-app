import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Send, RefreshCw, CheckCircle2, Mail, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRoles } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { ModerationPanel } from "@/components/dishyo/ModerationPanel";
import { UserPermissionsPanel } from "@/components/dishyo/UserPermissionsPanel";
import { AdminChatPanel } from "@/components/dishyo/AdminChatPanel";
import { AdminChatSettingsPanel } from "@/components/dishyo/AdminChatSettingsPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Dishyo — Dashboard admin" }] }),
  component: AdminPage,
});

type SupportMessage = {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  body: string;
  ai_reply: string | null;
  status: string;
  created_at: string;
};

type Tab = "support" | "moderation" | "users" | "chat" | "chat-settings";

function AdminPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, isModerator, isSupport, isStaff, isOwner, loading: rolesLoading } = useStaffRoles();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<"open" | "answered" | "all">("open");
  const [tab, setTab] = useState<Tab>("support");

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth" });
  }, [authLoading, session, navigate]);

  async function load() {
    let q = supabase.from("support_messages").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setMessages((data ?? []) as SupportMessage[]);
  }

  useEffect(() => {
    if (isSupport) load();
  }, [isSupport, filter]);

  useEffect(() => {
    if (rolesLoading) return;
    if (tab === "support" && !isSupport) setTab(isModerator ? "moderation" : isAdmin ? "users" : tab);
    if (tab === "moderation" && !isModerator) setTab(isSupport ? "support" : isAdmin ? "users" : tab);
    if (tab === "users" && !isAdmin) setTab(isSupport ? "support" : isModerator ? "moderation" : tab);
  }, [rolesLoading, isSupport, isModerator, isAdmin, tab]);

  async function generateAI(msg: SupportMessage) {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-reply", {
        body: { subject: msg.subject, body: msg.body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.reply ?? "");
      toast.success("Brouillon IA généré");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function saveAndClose(msg: SupportMessage) {
    if (!draft.trim()) return toast.error("Réponse vide");
    setBusy(true);
    const { error } = await supabase
      .from("support_messages")
      .update({ ai_reply: draft, status: "answered" })
      .eq("id", msg.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Message clôturé");
    setSelected(null);
    setDraft("");
    load();
  }

  if (authLoading || rolesLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Accès refusé</h1>
        <p className="text-muted-foreground">Cette page est réservée à l'équipe Dishyo.</p>
        <Link to="/" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Retour</Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; visible: boolean }[] = [
    { key: "support", label: "Support", visible: isSupport },
    { key: "moderation", label: "Modération", visible: isModerator },
    { key: "users", label: "Permissions", visible: isAdmin },
    { key: "chat", label: "Chat équipe", visible: isStaff },
    { key: "chat-settings", label: "Réglages chat", visible: isOwner },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Dashboard admin</h1>
          <p className="text-xs text-muted-foreground">
            {[isAdmin && "admin", !isAdmin && isModerator && "modérateur", !isAdmin && isSupport && "support"].filter(Boolean).join(" · ") || "équipe"}
          </p>
        </div>
        {tab === "support" && isSupport && (
          <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="flex gap-2 px-4 py-3">
        {tabs.filter((t) => t.visible).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "moderation" && isModerator && <ModerationPanel />}
      {tab === "users" && isAdmin && session && <UserPermissionsPanel currentUserId={session.user.id} isOwner={isOwner} />}
      {tab === "chat" && isStaff && session && (
        <AdminChatPanel currentUserId={session.user.id} isOwner={isOwner} isAdmin={isAdmin} />
      )}
      {tab === "chat-settings" && isOwner && session && <AdminChatSettingsPanel currentUserId={session.user.id} />}

      {tab === "support" && <div className="flex gap-2 px-4 pb-3">
        {(["open", "answered", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f === "open" ? "Ouverts" : f === "answered" ? "Répondus" : "Tous"}
          </button>
        ))}
      </div>}

      {tab === "support" && <div className="space-y-2 px-3 pb-24">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun message {filter === "open" ? "en attente" : filter === "answered" ? "répondu" : ""}.
          </div>
        )}
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => { setSelected(m); setDraft(m.ai_reply ?? ""); }}
            className="block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{m.email}</span>
              </div>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                m.status === "answered" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
              }`}>
                {m.status === "answered" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {m.status}
              </span>
            </div>
            <p className="mt-2 line-clamp-1 font-semibold">{m.subject}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {new Date(m.created_at).toLocaleString("fr-FR")}
            </p>
          </button>
        ))}
      </div>}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 sm:max-w-lg sm:rounded-3xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
                <h2 className="text-lg font-bold">{selected.subject}</h2>
              </div>
              <button onClick={() => { setSelected(null); setDraft(""); }} className="text-sm text-muted-foreground">
                Fermer
              </button>
            </div>
            <div className="mb-4 rounded-2xl bg-muted p-3 text-sm whitespace-pre-wrap">{selected.body}</div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Réponse</label>
              <button
                onClick={() => generateAI(selected)}
                disabled={generating}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-orange-400 px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Génération…" : "Générer avec l'IA"}
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="Rédige une réponse ou génère un brouillon IA…"
              className="w-full rounded-2xl border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setSelected(null); setDraft(""); }}
                className="flex-1 rounded-full border border-border py-3 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => saveAndClose(selected)}
                disabled={busy || !draft.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? "Envoi…" : "Sauvegarder & clôturer"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              La réponse est enregistrée dans la base. L'envoi par e-mail au client peut être branché plus tard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
