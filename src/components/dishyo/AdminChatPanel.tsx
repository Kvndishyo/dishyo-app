import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Pin, Trash2, Loader2, MicOff, Megaphone, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ROLE_META, topRole } from "@/lib/roles";

export type ChatSettings = {
  chat_enabled: boolean;
  read_only: boolean;
  slow_mode_seconds: number;
  max_message_length: number;
  welcome_message: string | null;
  pinned_message: string | null;
  retention_days: number;
  allow_admin_delete: boolean;
  allow_reactions: boolean;
  show_roles: boolean;
};

type Message = {
  id: string;
  user_id: string;
  body: string;
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

type Author = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  roles: string[];
};

export function AdminChatPanel({
  currentUserId,
  isOwner,
  isAdmin,
}: {
  currentUserId: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [s, m, a, sp] = await Promise.all([
      supabase.from("admin_chat_settings").select("*").maybeSingle(),
      supabase.from("admin_chat_messages").select("*").order("created_at", { ascending: true }).limit(300),
      supabase.rpc("admin_chat_authors"),
      supabase.from("admin_chat_speakers").select("*").eq("user_id", currentUserId).maybeSingle(),
    ]);
    if (s.data) setSettings(s.data as ChatSettings);
    setMessages((m.data ?? []) as Message[]);
    const map: Record<string, Author> = {};
    for (const row of (a.data ?? []) as Author[]) map[row.user_id] = row;
    setAuthors(map);
    const st = s.data as ChatSettings | null;
    const speaker = sp.data as { can_speak: boolean; muted_until: string | null } | null;
    const muted = speaker?.muted_until ? new Date(speaker.muted_until) > new Date() : false;
    setCanSpeak(
      !!st?.chat_enabled &&
        (isOwner || (!st.read_only && !!speaker?.can_speak && !muted)),
    );
    setLoading(false);
  }, [currentUserId, isOwner]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_chat_messages" }, (payload) => {
        const row = payload.new as Message;
        setMessages((prev) => {
          if (payload.eventType === "INSERT") return prev.some((x) => x.id === row.id) ? prev : [...prev, row];
          if (payload.eventType === "UPDATE") return prev.map((x) => (x.id === row.id ? row : x));
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const pinned = useMemo(() => messages.filter((m) => m.pinned && !m.deleted_at), [messages]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("admin_chat_messages").insert({ user_id: currentUserId, body });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  }

  async function softDelete(m: Message) {
    const { error } = await supabase
      .from("admin_chat_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted_at: new Date().toISOString() } : x)));
  }

  async function togglePin(m: Message) {
    const { error } = await supabase.from("admin_chat_messages").update({ pinned: !m.pinned }).eq("id", m.id);
    if (error) return toast.error(error.message);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du chat…
      </div>
    );
  }

  const maxLen = settings?.max_message_length ?? 1000;

  return (
    <div className="flex flex-col px-3 pb-28">
      {settings?.welcome_message && (
        <div className="mb-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">{settings.welcome_message}</div>
      )}
      {settings?.pinned_message && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs">
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="whitespace-pre-wrap">{settings.pinned_message}</span>
        </div>
      )}
      {pinned.map((m) => (
        <div key={`pin-${m.id}`} className="mb-2 flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs">
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="whitespace-pre-wrap">{m.body}</span>
        </div>
      ))}

      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun message pour l'instant.
          </div>
        )}
        {messages.map((m) => {
          const a = authors[m.user_id];
          const role = topRole(a?.roles ?? []);
          const meta = role ? ROLE_META[role] : null;
          const mine = m.user_id === currentUserId;
          const canDelete = mine || isOwner || (isAdmin && settings?.allow_admin_delete);
          return (
            <div key={m.id} className="group flex gap-3">
              <img
                src={a?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${a?.handle ?? "?"}`}
                alt={a?.display_name ?? "Membre"}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{a?.display_name ?? "Membre"}</span>
                  <span className="text-[11px] text-muted-foreground">@{a?.handle ?? "?"}</span>
                  {settings?.show_roles !== false && meta && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}>{meta.label}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {m.deleted_at ? (
                  <p className="text-sm italic text-muted-foreground">Message supprimé</p>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                )}
              </div>
              {!m.deleted_at && (
                <div className="flex shrink-0 items-start gap-1 opacity-0 transition group-hover:opacity-100">
                  {isOwner && (
                    <button onClick={() => togglePin(m)} className="rounded-full p-1.5 hover:bg-muted" title="Épingler">
                      <Pin className={`h-3.5 w-3.5 ${m.pinned ? "text-amber-500" : "text-muted-foreground"}`} />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => softDelete(m)} className="rounded-full p-1.5 hover:bg-muted" title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur-xl">
        {!settings?.chat_enabled ? (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Le chat est désactivé.
          </p>
        ) : !canSpeak ? (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <MicOff className="h-3.5 w-3.5" />
            {settings.read_only ? "Chat en lecture seule" : "Tu n'as pas la parole dans ce chat"}
          </p>
        ) : (
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLen))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              placeholder="Écrire un message à l'équipe…"
              className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
        {settings?.chat_enabled && canSpeak && (
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            {text.length}/{maxLen}
            {settings.slow_mode_seconds > 0 && !isOwner ? ` · mode lent ${settings.slow_mode_seconds}s` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
