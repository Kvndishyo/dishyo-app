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
  const serverMyLike = post.likes.find((l) => l.user_id === currentUserId)?.emoji ?? null;
  const [liked, setLiked] = useState<string | null>(serverMyLike);
  const [commentsAdded, setCommentsAdded] = useState(0);
  const seenCommentsCountRef = useRef(post.comments?.[0]?.count ?? 0);
  const lastTapRef = useRef(0);

  // Derive total without double-counting: adjust by diff between optimistic local state and the latest server snapshot.
  const serverHasMine = !!serverMyLike;
  const localHasMine = !!liked;
  const likeAdjustment = (localHasMine ? 1 : 0) - (serverHasMine ? 1 : 0);
  const totalLikes = post.likes.length + likeAdjustment;
  const author = post.profiles;
  // When the server count catches up with locally-added comments, drop the optimistic offset.
  const serverCommentsCount = post.comments?.[0]?.count ?? 0;
  if (serverCommentsCount > seenCommentsCountRef.current && commentsAdded > 0) {
    const advanced = serverCommentsCount - seenCommentsCountRef.current;
    seenCommentsCountRef.current = serverCommentsCount;
    queueMicrotask(() => setCommentsAdded((c) => Math.max(0, c - advanced)));
  }
  const commentsCount = serverCommentsCount + commentsAdded;

  async function setReaction(emoji: string | null) {
    const wasLiked = !!liked;
    setLiked(emoji);
    if (!wasLiked && emoji) setBurst((b) => b + 1);

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
          <ExpiryRing expiresAt={post.expires_at} size={48}>
            <img
              src={author.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${author.handle}`}
              alt={author.display_name}
              className="h-full w-full object-cover"
            />
          </ExpiryRing>
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

      <div className="relative overflow-hidden rounded-2xl shadow-card" onClick={handleImageTap}>
        <img src={post.photo_url} alt={post.title} className="aspect-square w-full select-none object-cover" />
        <AnimatePresence>
          {burst > 0 && (
            <motion.div
              key={burst}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1.1, 1.6] }}
              transition={{ duration: 0.9, times: [0, 0.2, 0.6, 1] }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Heart className="h-32 w-32 fill-white text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
          <h3 className="text-2xl font-bold leading-tight">{post.title}</h3>
          {post.restaurant && <p className="mt-1 text-xs opacity-90">📍 {post.restaurant}</p>}
          {post.recipe && <p className="mt-1 text-sm leading-snug"><HighlightedText text={post.recipe} /></p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => liked ? setReaction(null) : setReactionsOpen((v) => !v)}
            onContextMenu={(e) => { e.preventDefault(); setReactionsOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent"
          >
            <motion.span
              key={liked ?? "none"}
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 14 }}
            >
              <Heart className={`h-5 w-5 transition-colors ${liked ? "fill-primary text-primary" : ""}`} />
            </motion.span>
            {liked ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>{liked}</motion.span>
            ) : null}
            <motion.span key={totalLikes} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-medium">{totalLikes}</motion.span>
          </motion.button>
          <AnimatePresence>
            {reactionsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="absolute bottom-full left-0 z-30 mb-2 grid w-[280px] max-w-[90vw] grid-cols-6 gap-1 rounded-2xl bg-card p-2 shadow-card"
                onClick={(e) => e.stopPropagation()}
              >
                {REACTIONS.map((r, i) => (
                  <motion.button
                    key={r}
                    type="button"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.012, type: "spring", stiffness: 700, damping: 18 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => { setReaction(r); setReactionsOpen(false); }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl leading-none hover:bg-muted"
                  >
                    {r}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.04 }} onClick={() => setCommentsOpen(true)} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{commentsCount}</span>
        </motion.button>
      </div>

      <CommentSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} postId={post.id} postOwnerId={post.user_id} currentUserId={currentUserId} onAdded={() => setCommentsAdded((c) => c + 1)} />

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

