import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { savedPostsQueryOptions } from "@/lib/queries";
import { PostCard } from "@/components/dishyo/PostCard";

export const Route = createFileRoute("/compte/favoris")({
  head: () => ({
    meta: [
      { title: "Dishyo — Mes favoris" },
      { name: "description", content: "Retrouve tous les plats que tu as enregistrés sur Dishyo." },
      { property: "og:title", content: "Dishyo — Mes favoris" },
      { property: "og:description", content: "Retrouve tous les plats que tu as enregistrés sur Dishyo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const { data: posts = [], isLoading } = useQuery(savedPostsQueryOptions(uid));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes favoris</h1>
      </header>

      <div className="space-y-5 p-5">
        {isLoading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && posts.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Bookmark className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Aucun plat enregistré pour l'instant.
          </div>
        )}
        {uid && posts.map((p) => <PostCard key={p.id} post={p} currentUserId={uid} />)}
      </div>
    </div>
  );
}
