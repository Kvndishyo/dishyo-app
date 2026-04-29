import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { type DbPost, REACTIONS, timeRemaining, timeAgo } from "@/lib/dishyo-db";
import { CommentSheet } from "./CommentSheet";
import { HighlightedText } from "./MentionTextarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PostCard({ post, currentUserId }: { post: DbPost; currentUserId: string }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const myInitial = post.likes.find((l) => l.user_id === currentUserId)?.emoji ?? null;
  const [liked, setLiked] = useState<string | null>(myInitial);
  const [delta, setDelta] = useState(0);
  const [commentsDelta, setCommentsDelta] = useState(0);

  const totalLikes = post.likes.length + delta;
  const author = post.profiles;
  const commentsCount = (post.comments?.[0]?.count ?? 0) + commentsDelta;

  async function setReaction(emoji: string | null) {
    const wasLiked = !!liked;
    setLiked(emoji);
    if (!wasLiked && emoji) setDelta((d) => d + 1);
    if (wasLiked && !emoji) setDelta((d) => d - 1);

    if (!emoji) {
      const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      if (error) toast.error("Erreur");
    } else {
      const { error } = await supabase.from("likes").upsert({ post_id: post.id, user_id: currentUserId, emoji }, { onConflict: "post_id,user_id" });
      if (error) toast.error("Erreur");
    }
  }

  if (!author) return null;

  return (
    <article className="px-4 pb-6">
      <Link to="/profil/$handle" params={{ handle: author.handle }} className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <div className="text-sm text-primary">@{author.handle}</div>
            <div className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {timeRemaining(post.expires_at)}
        </div>
      </Link>

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
                className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full bg-card p-1.5 shadow-card"
              >
                {REACTIONS.map((r) => (
                  <button key={r} onClick={() => { setReaction(r); setReactionsOpen(false); }} className="text-xl transition hover:scale-125">
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

      <CommentSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} postId={post.id} currentUserId={currentUserId} />
    </article>
  );
}

