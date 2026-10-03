import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Clock, MoreHorizontal, Flag, Ban, X, Share2, Send, Bookmark, Lock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { savedIdsQueryOptions } from "@/lib/queries";
import { type DbPost, PLUS_REACTIONS, REACTIONS, timeRemaining, timeAgo } from "@/lib/dishyo-db";
import { CommentSheet } from "./CommentSheet";
import { HighlightedText } from "./MentionTextarea";
import { ReportDialog } from "./ReportDialog";
import { ProfileAvatar } from "./ProfileAvatar";
import { ShareToChatSheet } from "./ShareToChatSheet";
import { supabase } from "@/integrations/supabase/client";
import { blockUser } from "@/lib/moderation";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

export function PostCard({ post, currentUserId, onHide }: { post: DbPost; currentUserId: string; onHide?: (postId: string) => void }) {
  const qc = useQueryClient();
  const { isPlus } = useSubscription();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareChatOpen, setShareChatOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const serverMyLike = post.likes.find((l) => l.user_id === currentUserId)?.emoji ?? null;
  const [liked, setLiked] = useState<string | null>(serverMyLike);
  const [commentsAdded, setCommentsAdded] = useState(0);
  const seenCommentsCountRef = useRef(post.comments?.[0]?.count ?? 0);
  const lastTapRef = useRef(0);
  const { data: savedIds } = useQuery(savedIdsQueryOptions(currentUserId));
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const saved = savedOverride ?? !!savedIds?.has(post.id);

  async function toggleSave() {
    const next = !saved;
    setSavedOverride(next);
    const { error } = next
      ? await supabase.from("saved_posts").upsert({ post_id: post.id, user_id: currentUserId }, { onConflict: "user_id,post_id" })
      : await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    if (error) {
      setSavedOverride(!next);
      return toast.error("Erreur");
    }
    toast.success(next ? "Ajouté à tes favoris" : "Retiré des favoris");
    qc.invalidateQueries({ queryKey: ["saved-ids"] });
    qc.invalidateQueries({ queryKey: ["saved-posts"] });
  }


  // Derive total without double-counting: adjust by diff between optimistic local state and the latest server snapshot.
  const serverHasMine = !!serverMyLike;
  const localHasMine = !!liked;
  const likeAdjustment = (localHasMine ? 1 : 0) - (serverHasMine ? 1 : 0);
  const totalLikes = post.likes.length + likeAdjustment;
  const visibleLikes = post.likes.filter((like) => like.user_id !== currentUserId);
  if (liked) visibleLikes.push({ emoji: liked, user_id: currentUserId });
  const reactionCounts = visibleLikes.reduce<Record<string, number>>((counts, like) => {
    counts[like.emoji] = (counts[like.emoji] ?? 0) + 1;
    return counts;
  }, {});
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
    if (emoji && (PLUS_REACTIONS as readonly string[]).includes(emoji) && !isPlus) {
      toast.info("Cette réaction est réservée aux membres Dishyo+");
      return;
    }
    const wasLiked = !!liked;
    setLiked(emoji);
    if (!wasLiked && emoji) setBurst((b) => b + 1);

    if (!emoji) {
      const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      if (error) {
        setLiked(serverMyLike);
        toast.error(error.message);
      }
    } else {
      const { error } = await supabase.from("likes").upsert({ post_id: post.id, user_id: currentUserId, emoji }, { onConflict: "post_id,user_id" });
      if (error) {
        setLiked(serverMyLike);
        toast.error(error.message);
      }
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
          <ProfileAvatar profile={author} expiresAt={post.expires_at} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold leading-tight">{author.display_name}</span>
              {author.restaurateur && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">★</span>
              )}
              {author.plus_active && (
                <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"><Sparkles className="h-2.5 w-2.5" /> Plus</span>
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
              {liked ? <span className="emoji-glyph text-xl" aria-hidden="true">{liked}</span> : <Heart className="h-5 w-5" />}
            </motion.span>
            <motion.span key={totalLikes} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-medium">{totalLikes}</motion.span>
          </motion.button>
          <AnimatePresence>
            {reactionsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="absolute bottom-full left-0 z-30 mb-2 w-[304px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-2 shadow-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-6 gap-1">
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
                    className="emoji-glyph flex h-11 w-11 items-center justify-center rounded-xl text-2xl leading-none hover:bg-muted"
                    aria-label={`Réagir avec ${r}`}
                  >
                    {r}
                  </motion.button>
                ))}
                </div>
                <div className="my-1.5 h-px bg-border" />
                <div className="mb-1 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase text-primary"><Sparkles className="h-3 w-3" /> Réactions Dishyo+</div>
                <div className="grid grid-cols-6 gap-1">
                  {PLUS_REACTIONS.map((r) => (
                    <motion.button
                      key={r}
                      type="button"
                      whileHover={{ scale: isPlus ? 1.15 : 1 }}
                      whileTap={{ scale: isPlus ? 0.85 : 1 }}
                      onClick={() => {
                        if (!isPlus) return toast.info("Cette réaction est réservée aux membres Dishyo+");
                        setReaction(r);
                        setReactionsOpen(false);
                      }}
                      className={`emoji-glyph relative flex h-11 w-11 items-center justify-center rounded-xl text-2xl leading-none ${isPlus ? "hover:bg-accent" : "opacity-40"}`}
                      aria-label={isPlus ? `Réagir avec ${r}` : `${r}, réservé à Dishyo+`}
                    >
                      {r}
                      {!isPlus && <Lock className="absolute bottom-0.5 right-0.5 h-3 w-3 text-muted-foreground" />}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.04 }} onClick={() => setCommentsOpen(true)} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{commentsCount}</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          onClick={() => setShareChatOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent"
          aria-label="Envoyer en message"
        >
          <Send className="h-5 w-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          onClick={toggleSave}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${saved ? "bg-primary/15 text-primary" : "bg-muted hover:bg-accent"}`}
          aria-label={saved ? "Retirer des favoris" : "Enregistrer"}
        >
          <Bookmark className={`h-5 w-5 ${saved ? "fill-primary" : ""}`} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          onClick={async () => {
            const url = `${window.location.origin}/plat/${post.id}`;
            const shareData = { title: post.title, text: `${post.title} sur Dishyo`, url };
            try {
              if (navigator.share) await navigator.share(shareData);
              else { await navigator.clipboard.writeText(url); toast.success("Lien copié !"); }
            } catch {}
          }}
          className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent"
          aria-label="Partager"
        >
          <Share2 className="h-5 w-5" />
        </motion.button>
      </div>

      {Object.keys(reactionCounts).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Réactions à cette publication">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setReaction(liked === emoji ? null : emoji)}
              className={`emoji-glyph flex h-7 items-center gap-1 rounded-full border px-2 text-sm leading-none transition ${liked === emoji ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}
              aria-label={`${count} réaction${count > 1 ? "s" : ""} ${emoji}`}
            >
              <span>{emoji}</span><span className="font-sans text-[11px] font-semibold text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
      )}

      <CommentSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} postId={post.id} postOwnerId={post.user_id} currentUserId={currentUserId} onAdded={() => setCommentsAdded((c) => c + 1)} />

      <ShareToChatSheet open={shareChatOpen} onClose={() => setShareChatOpen(false)} postId={post.id} />

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

