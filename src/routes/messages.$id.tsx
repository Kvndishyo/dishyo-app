import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Send, Timer, Reply, Trash2, Pencil, X, Smile } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChatImage } from "@/components/dishyo/ChatImage";
import { SharedDishCard } from "@/components/dishyo/SharedDishCard";
import {
  fetchMessages, fetchMembers, fetchReactions, sendMessage, markRead, uploadChatImage,
  toggleReaction, softDeleteMessage, editMessage, chatTime, dayLabel,
  QUICK_REACTIONS, EPHEMERAL_OPTIONS, type MessageRow, type MemberRow,
} from "@/lib/chat";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [
      { title: "Dishyo — Discussion" },
      { name: "description", content: "Discussion privée Dishyo : photos, plats partagés et messages éphémères." },
      { property: "og:title", content: "Dishyo — Discussion" },
      { property: "og:description", content: "Discussion privée Dishyo : photos, plats partagés et messages éphémères." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  const { id } = useParams({ from: "/messages/$id" });
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = session?.user.id;

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [ephemeral, setEphemeral] = useState(0);
  const [picker, setPicker] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id),
    enabled: !!uid,
    staleTime: 5_000,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", id],
    queryFn: () => fetchMembers(id),
    enabled: !!uid,
    staleTime: 60_000,
  });
  const { data: reactions = [] } = useQuery({
    queryKey: ["reactions", id],
    queryFn: () => fetchReactions(id),
    enabled: !!uid,
    staleTime: 5_000,
  });

  const byUser = useMemo(() => {
    const m = new Map<string, MemberRow>();
    members.forEach((x) => m.set(x.user_id, x));
    return m;
  }, [members]);

  const other = members.find((m) => m.user_id !== uid);
  const title = other?.profiles?.display_name ?? other?.profiles?.handle ?? "Discussion";

  useEffect(() => {
    if (!uid) return;
    markRead(id);
    const ch = supabase
      .channel(`conv-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
        qc.invalidateQueries({ queryKey: ["conversations", uid] });
        markRead(id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        qc.invalidateQueries({ queryKey: ["reactions", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, uid, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!uid) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      if (editing) {
        await editMessage(editing.id, body);
        setEditing(null);
      } else {
        await sendMessage({
          conversationId: id,
          senderId: uid,
          body,
          replyToId: replyTo?.id ?? null,
          ephemeralSeconds: ephemeral,
        });
        setReplyTo(null);
      }
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch {
      toast.error("Message non envoyé");
    } finally {
      setSending(false);
    }
  }

  async function handleFile(file: File) {
    if (!uid) return;
    setSending(true);
    try {
      const path = await uploadChatImage(uid, file);
      await sendMessage({ conversationId: id, senderId: uid, kind: "image", mediaUrl: path, ephemeralSeconds: ephemeral });
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch {
      toast.error("Photo non envoyée");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate({ to: "/messages" })} aria-label="Retour" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <img
          src={other?.profiles?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${other?.profiles?.handle ?? "dishyo"}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const mine = m.sender_id === uid;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const author = byUser.get(m.sender_id)?.profiles;
          const reacts = reactions.filter((r) => r.message_id === m.id);
          const parent = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;

          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center text-xs text-muted-foreground">{day}</p>
              )}
              <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  {!mine && (
                    <p className="mb-0.5 text-xs text-muted-foreground">{author?.display_name ?? author?.handle}</p>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {parent && (
                      <p className="mb-1 border-l-2 border-current/40 pl-2 text-xs opacity-70">
                        {parent.body ?? "Média"}
                      </p>
                    )}
                    {m.deleted_at ? (
                      <em className="opacity-70">Message supprimé</em>
                    ) : m.kind === "image" && m.media_url ? (
                      <ChatImage path={m.media_url} className="max-h-64 rounded-xl object-cover" />
                    ) : m.kind === "post" && m.post_id ? (
                      <SharedDishCard postId={m.post_id} />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{m.body}</span>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                      <span>{chatTime(m.created_at)}</span>
                      {m.edited_at && <span>modifié</span>}
                      {m.expires_at && <Timer className="h-3 w-3" />}
                    </div>
                  </div>

                  {reacts.length > 0 && (
                    <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                      {Object.entries(
                        reacts.reduce<Record<string, number>>((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => uid && toggleReaction(m.id, uid, emoji).then(() => qc.invalidateQueries({ queryKey: ["reactions", id] }))}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}

                  {!m.deleted_at && (
                    <div className={`mt-1 flex gap-2 opacity-0 transition group-hover:opacity-100 ${mine ? "justify-end" : ""}`}>
                      <button onClick={() => setPicker(picker === m.id ? null : m.id)} aria-label="Réagir">
                        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setReplyTo(m)} aria-label="Répondre">
                        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {mine && m.kind === "text" && (
                        <button onClick={() => { setEditing(m); setText(m.body ?? ""); }} aria-label="Modifier">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      {mine && (
                        <button
                          onClick={() => softDeleteMessage(m.id).then(() => qc.invalidateQueries({ queryKey: ["messages", id] }))}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}

                  {picker === m.id && (
                    <div className={`mt-1 flex flex-wrap gap-1 rounded-2xl bg-card p-2 shadow ${mine ? "justify-end" : ""}`}>
                      {QUICK_REACTIONS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            if (!uid) return;
                            toggleReaction(m.id, uid, e).then(() => qc.invalidateQueries({ queryKey: ["reactions", id] }));
                            setPicker(null);
                          }}
                          className="text-lg"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(replyTo || editing) && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="truncate">
            {editing ? "Modification…" : `Réponse à : ${replyTo?.body ?? "média"}`}
          </span>
          <button onClick={() => { setReplyTo(null); setEditing(null); setText(""); }} aria-label="Annuler">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileRef.current?.click()} aria-label="Envoyer une photo" className="p-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </button>
        <select
          value={ephemeral}
          onChange={(e) => setEphemeral(Number(e.target.value))}
          className="rounded-full bg-muted px-2 py-1 text-xs"
          aria-label="Message éphémère"
        >
          {EPHEMERAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Écris un message…"
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none"
        />
        <button onClick={handleSend} disabled={sending || !text.trim()} aria-label="Envoyer" className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
