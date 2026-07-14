import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { postByIdOptions } from "@/lib/queries";
import { PostCard } from "@/components/dishyo/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/dishyo/Logo";

export const Route = createFileRoute("/plat/$id")({
  head: () => ({
    meta: [
      { title: "Dishyo — Un plat à découvrir" },
      { name: "description", content: "Découvre ce plat partagé sur Dishyo." },
      { property: "og:title", content: "Un plat sur Dishyo" },
      { property: "og:description", content: "Découvre les plats éphémères partagés autour de toi." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatPage,
});

function PlatPage() {
  const { id } = Route.useParams();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: post, isLoading, error } = useQuery(postByIdOptions(id));

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Logo size={48} /></div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Logo size={72} />
        <h1 className="mt-4 text-2xl font-bold">Connecte-toi pour voir ce plat</h1>
        <button onClick={() => navigate({ to: "/auth" })} className="mt-6 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-glow">
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Plat</h1>
      </header>

      <div className="pt-4">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {(error || (!isLoading && !post)) && (
          <div className="p-6 text-center">
            <p className="text-base font-semibold">Ce plat n'est plus disponible 🍽️</p>
            <p className="mt-2 text-sm text-muted-foreground">Il a expiré ou n'est pas visible pour toi.</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
              Retour à l'accueil
            </Link>
          </div>
        )}
        {post && <PostCard post={post} currentUserId={session.user.id} />}
      </div>
    </div>
  );
}
