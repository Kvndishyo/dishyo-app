import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useState } from "react";
import { type Post, ME, timeAgo } from "@/lib/mock-data";

export function CommentSheet({
  open, onClose, post,
}: { open: boolean; onClose: () => void; post: Post }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(post.comments);

  function send() {
    const v = text.trim();
    if (!v) return;
    setComments((c) => [
      ...c,
      { id: `local-${Date.now()}`, user: ME, text: v, createdAt: Date.now() },
    ]);
    setText("");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          />
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
              {comments.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sois le premier à commenter ✨
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.user.avatar} className="h-9 w-9 rounded-full object-cover" />
                  <div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                      <div className="text-sm font-semibold">{c.user.username}</div>
                      <div className="text-sm">{renderText(c.text)}</div>
                    </div>
                    <div className="mt-1 px-2 text-xs text-muted-foreground">{timeAgo(c.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <img src={ME.avatar} className="h-9 w-9 rounded-full object-cover" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ajoute un commentaire… (@ #)"
                className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function renderText(text: string) {
  return text.split(/(\s+)/).map((p, i) =>
    p.startsWith("@") || p.startsWith("#")
      ? <span key={i} className="font-medium text-primary">{p}</span>
      : <span key={i}>{p}</span>
  );
}
