import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, Trash2, Reply, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/dishyo-db";
import { toast } from "sonner";
import { MentionTextarea, HighlightedText } from "./MentionTextarea";
import { ReportDialog } from "./ReportDialog";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: { handle: string; display_name: string; avatar_url: string | null } | null;
};

type CLike = { comment_id: string; user_id: string };

export function CommentSheet({
  open, onClose, postId, postOwnerId, currentUserId, onAdded,
}: { open: boolean; onClose: () => void; postId: string; postOwnerId?: string; currentUserId: string; onAdded?: () => void }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<CLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id,body,created_at,user_id,parent_id,profiles!comments_user_id_profiles_fkey(handle,display_name,avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const list = (data as unknown as Comment[]) ?? [];
    setComments(list);
    if (list.length) {
      const ids = list.map((c) => c.id);
      const { data: lk } = await supabase.from("comment_likes").select("comment_id,user_id").in("comment_id", ids);
      setLikes((lk as CLike[]) ?? []);
    } else setLikes([]);
    setLoading(false);
  }

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, postId]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    const payload: any = { post_id: postId, user_id: currentUserId, body: v };
    if (replyTo) payload.parent_id = replyTo.id;
    const { data, error } = await supabase
      .from("comments")
      .insert(payload)
      .select("id,body,created_at,user_id,parent_id,profiles!comments_user_id_profiles_fkey(handle,display_name,avatar_url)")
      .single();
    if (error) return toast.error(error.message);
    setComments((c) => [...c, data as unknown as Comment]);
    setText("");
    setReplyTo(null);
    onAdded?.();
  }

  async function toggleLike(c: Comment) {
    const mine = likes.find((l) => l.comment_id === c.id && l.user_id === currentUserId);
    if (mine) {
      setLikes((ls) => ls.filter((l) => !(l.comment_id === c.id && l.user_id === currentUserId)));
      await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", currentUserId);
    } else {
      setLikes((ls) => [...ls, { comment_id: c.id, user_id: currentUserId }]);
      await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: currentUserId });
    }
  }

  async function remove(c: Comment) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setComments((cs) => cs.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  }

  const roots = comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function renderComment(c: Comment, depth = 0) {
    const myLike = likes.some((l) => l.comment_id === c.id && l.user_id === currentUserId);
    const count = likes.filter((l) => l.comment_id === c.id).length;
    const canDelete = c.user_id === currentUserId || postOwnerId === currentUserId;
    return (
      <div key={c.id} className={depth > 0 ? "ml-10 mt-2" : ""}>
        <div className="flex gap-3">
          <img src={c.profiles?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${c.profiles?.handle ?? "?"}`} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
              <div className="text-sm font-semibold">{c.profiles?.display_name ?? "?"}</div>
              <div className="text-sm break-words"><HighlightedText text={c.body} /></div>
            </div>
            <div className="mt-1 flex items-center gap-3 px-2 text-xs text-muted-foreground">
              <span>{timeAgo(c.created_at)}</span>
              <button onClick={() => toggleLike(c)} className="flex items-center gap-1 hover:text-primary">
                <Heart className={`h-3.5 w-3.5 ${myLike ? "fill-primary text-primary" : ""}`} />
                {count > 0 && <span>{count}</span>}
              </button>
              {depth === 0 && (
                <button onClick={() => setReplyTo(c)} className="flex items-center gap-1 hover:text-primary">
                  <Reply className="h-3.5 w-3.5" /> Répondre
                </button>
              )}
              {canDelete && (
                <button onClick={() => remove(c)} className="flex items-center gap-1 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {c.user_id !== currentUserId && (
                <button onClick={() => setReportId(c.id)} className="flex items-center gap-1 hover:text-destructive" title="Signaler">
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        {childrenOf(c.id).map((r) => renderComment(r, depth + 1))}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-t-3xl bg-card shadow-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-lg font-semibold">Commentaires</h3>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {loading && <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}
              {!loading && roots.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Sois le premier à commenter ✨</p>
              )}
              {roots.map((c) => renderComment(c))}
            </div>
            {replyTo && (
              <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-xs">
                <span className="truncate text-muted-foreground">Réponse à <b>{replyTo.profiles?.display_name}</b></span>
                <button onClick={() => setReplyTo(null)} className="text-primary">Annuler</button>
              </div>
            )}
            <div className="flex items-end gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex-1">
                <MentionTextarea
                  asInput
                  value={text}
                  onChange={setText}
                  onEnterSubmit={send}
                  placeholder={replyTo ? "Ta réponse… (@ #)" : "Ajoute un commentaire… (@ #)"}
                  maxLength={500}
                  className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={send} disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
          {reportId && (
            <ReportDialog open={!!reportId} onClose={() => setReportId(null)} targetType="comment" targetId={reportId} />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
