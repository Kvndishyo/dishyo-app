import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Clock, MoreHorizontal, Flag, Ban, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type DbPost, REACTIONS, timeRemaining, timeAgo } from "@/lib/dishyo-db";
import { CommentSheet } from "./CommentSheet";
import { HighlightedText } from "./MentionTextarea";
import { ReportDialog } from "./ReportDialog";
import { ExpiryRing } from "./ExpiryRing";
import { supabase } from "@/integrations/supabase/client";
import { blockUser } from "@/lib/moderation";
import { toast } from "sonner";

export function PostCard({ post, currentUserId, onHide }: { post: DbPost; currentUserId: string; onHide?: (postId: string) => void }) {
  const qc = useQueryClient();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const myInitial = post.likes.find((l) => l.user_id === currentUserId)?.emoji ?? null;
  const [liked, setLiked] = useState<string | null>(myInitial);
  const [delta, setDelta] = useState(0);
  const [commentsDelta, setCommentsDelta] = useState(0);
  const lastTapRef = useRef(0);

  const totalLikes = post.likes.length + delta;
  const author = post.profiles;
  const commentsCount = (post.comments?.[0]?.count ?? 0) + commentsDelta;

  async function setReaction(emoji: string | null) {
    const wasLiked = !!liked;
    setLiked(emoji);
    if (!wasLiked && emoji) { setDelta((d) => d + 1); setBurst((b) => b + 1); }
    if (wasLiked && !emoji) setDelta((d) => d - 1);

    if (!emoji) {
      const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      if (error) toast.error("Erreur");
    } else {
      const { error } = await supabase.from("likes").upsert({ post_id: post.id, user_id: currentUserId, emoji }, { onConflict: "post_id,user_id" });
      if (error) toast.error("Erreur");
    }
    qc.invalidateQueries({ queryKey: ["feed"] });
  }

  function handleImageTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) setReaction("❤️");
      else setBurst((b) => b + 1);
    }
    lastTapRef.current = now;
  }

  if (!author) return null;

  const isOwn = post.user_id === currentUserId;

  async function doBlock() {
    if (!confirm(`Bloquer ${author!.display_name} ? Tu ne verras plus son contenu.`)) return;
    const ok = await blockUser(post.user_id);
    if (ok) onHide?.(post.id);
    setMenuOpen(false);
  }

  return (
    <article className="px-4 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <Link to="/profil/$handle" params={{ handle: author.handle }} className="flex items-center gap-3">
          <img
            src={author.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${author.handle}`}
            alt={author.display_name}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold leading-tight">{author.display_name}</span>
              {author.restaurateur && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">★</span>
              )}
            </div>
            {currentUserId === author.id && <div className="text-sm text-primary">@{author.handle}</div>}
            <div className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {timeRemaining(post.expires_at)}
          </div>
          {!isOwn && (
            <button onClick={() => setMenuOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted" aria-label="Plus d'options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl shadow-card">
        <img src={post.photo_url} alt={post.title} className="aspect-square w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
          <h3 className="text-2xl font-bold leading-tight">{post.title}</h3>
          {post.restaurant && <p className="mt-1 text-xs opacity-90">📍 {post.restaurant}</p>}
          {post.recipe && <p className="mt-1 text-sm leading-snug"><HighlightedText text={post.recipe} /></p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => liked ? setReaction(null) : setReactionsOpen((v) => !v)}
            onContextMenu={(e) => { e.preventDefault(); setReactionsOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : ""}`} />
            {liked ? <span>{liked}</span> : null}
            <span className="font-medium">{totalLikes}</span>
          </button>
          <AnimatePresence>
            {reactionsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.9 }}
                className="absolute bottom-full left-0 mb-2 flex max-w-[min(90vw,360px)] gap-1 overflow-x-auto rounded-2xl bg-card p-2 shadow-card"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTIONS.map((r) => (
                  <button key={r} onClick={() => { setReaction(r); setReactionsOpen(false); }} className="flex-shrink-0 rounded-full px-2 text-2xl transition hover:scale-125">
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setCommentsOpen(true)} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{commentsCount}</span>
        </button>
      </div>

      <CommentSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} postId={post.id} postOwnerId={post.user_id} currentUserId={currentUserId} onAdded={() => setCommentsDelta((c) => c + 1)} />

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-card">
              <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-muted" />
              <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:bg-muted">
                <Flag className="h-5 w-5 text-red-500" /> Signaler ce plat
              </button>
              <button onClick={doBlock}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:bg-muted">
                <Ban className="h-5 w-5 text-red-500" /> Bloquer {author.display_name}
              </button>
              <button onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:bg-muted">
                <X className="h-5 w-5" /> Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </article>
  );
}

