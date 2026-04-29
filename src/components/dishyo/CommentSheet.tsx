import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/dishyo-db";
import { toast } from "sonner";
import { MentionTextarea, HighlightedText } from "./MentionTextarea";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { handle: string; display_name: string; avatar_url: string | null } | null;
};

export function CommentSheet({
  open, onClose, postId, currentUserId,
}: { open: boolean; onClose: () => void; postId: string; currentUserId: string }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("comments")
      .select("id,body,created_at,user_id,profiles!comments_user_id_profiles_fkey(handle,display_name,avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setComments((data as unknown as Comment[]) ?? []);
        setLoading(false);
      });
  }, [open, postId]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: currentUserId, body: v })
      .select("id,body,created_at,user_id,profiles!comments_user_id_profiles_fkey(handle,display_name,avatar_url)")
      .single();
    if (error) return toast.error(error.message);
    setComments((c) => [...c, data as unknown as Comment]);
    setText("");
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
              {!loading && comments.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Sois le premier à commenter ✨</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.profiles?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${c.profiles?.handle ?? "?"}`} className="h-9 w-9 rounded-full object-cover" />
                  <div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                      <div className="text-sm font-semibold">{c.profiles?.display_name ?? "?"}</div>
                      <div className="text-sm"><HighlightedText text={c.body} /></div>
                    </div>
                    <div className="mt-1 px-2 text-xs text-muted-foreground">{timeAgo(c.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex-1">
                <MentionTextarea
                  asInput
                  value={text}
                  onChange={setText}
                  onEnterSubmit={send}
                  placeholder="Ajoute un commentaire… (@ #)"
                  maxLength={500}
                  className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={send} disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

