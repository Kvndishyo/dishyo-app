import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { type Post, REACTIONS, timeRemaining, timeAgo } from "@/lib/mock-data";
import { CommentSheet } from "./CommentSheet";

export function PostCard({ post }: { post: Post }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liked, setLiked] = useState<string | null>(null);
  const [bonusLikes, setBonusLikes] = useState(0);

  const totalLikes =
    post.likes.reduce((s, l) => s + l.count, 0) + bonusLikes + (liked ? 1 : 0);

  return (
    <article className="px-4 pb-6">
      {/* Header user */}
      <Link
        to="/profil/$handle"
        params={{ handle: post.user.handle }}
        className="mb-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <img
            src={post.user.avatar}
            alt={post.user.username}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold leading-tight">{post.user.username}</span>
              {post.user.isRestaurant && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  ★
                </span>
              )}
            </div>
            <div className="text-sm text-primary">@{post.user.handle}</div>
            <div className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {timeRemaining(post.createdAt)}
        </div>
      </Link>

      {/* Image */}
      <div className="relative overflow-hidden rounded-2xl shadow-card">
        <img src={post.image} alt={post.title} className="aspect-square w-full object-cover" />
        {post.isAd && (
          <span className="absolute left-3 top-3 rounded-md bg-foreground/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-background backdrop-blur-sm">
            Pub
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
          <h3 className="text-2xl font-bold leading-tight">{post.title}</h3>
          <p className="mt-1 text-sm leading-snug">
            {renderDescription(post.description)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => liked ? setLiked(null) : setReactionsOpen((v) => !v)}
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
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full bg-card p-1.5 shadow-card"
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setLiked(r);
                      setBonusLikes((n) => n + 1);
                      setReactionsOpen(false);
                    }}
                    className="text-xl transition hover:scale-125"
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm transition hover:bg-accent"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{post.comments.length}</span>
        </button>
      </div>

      <CommentSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        post={post}
      />
    </article>
  );
}

function renderDescription(text: string) {
  return text.split(/(\s+)/).map((part, i) => {
    if (part.startsWith("#")) return <span key={i} className="text-primary">{part}</span>;
    if (part.startsWith("@")) return <span key={i} className="font-semibold text-primary">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}
