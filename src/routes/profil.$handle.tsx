import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, UserPlus, UserCheck } from "lucide-react";
import { useState } from "react";
import { USERS, POSTS } from "@/lib/mock-data";

export const Route = createFileRoute("/profil/$handle")({
  loader: ({ params }) => {
    const user = USERS.find((u) => u.handle === params.handle);
    if (!user) throw notFound();
    return { user };
  },
  notFoundComponent: () => (
    <div className="p-6 text-center">Utilisateur introuvable. <Link to="/recherche" className="text-primary">Retour</Link></div>
  ),
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useLoaderData();
  const [following, setFollowing] = useState(false);
  const userPosts = POSTS.filter((p) => p.user.id === user.id);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/recherche" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">@{user.handle}</h1>
      </header>

      <div className="px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <img src={user.avatar} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-card" />
          <h2 className="mt-3 flex items-center gap-2 text-xl font-bold">
            {user.username}
            {user.isRestaurant && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">★ Restaurateur</span>
            )}
          </h2>
          <p className="text-sm text-primary">@{user.handle}</p>
          {user.bio && <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>}
          {user.googleMapsUrl && (
            <a
              href={user.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> Voir sur Google Maps
            </a>
          )}

          <div className="mt-5 flex w-full gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold transition ${
                following
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground shadow-glow"
              }`}
            >
              {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "Suivi" : "Suivre"}
            </button>
            <button className="flex-1 rounded-2xl bg-muted py-2.5 text-sm font-semibold hover:bg-accent">
              Message
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 border-y border-border py-4 text-center">
          <Stat n={user.following} label="Abonnements" />
          <Stat n={user.followers} label="Abonnés" />
          <Stat n={user.friends} label="Amis" />
          <Stat n={user.posts} label="Plats" />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Plats actifs
        </h3>
        {userPosts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun plat actif pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((p) => (
              <div key={p.id} className="aspect-square overflow-hidden rounded-lg">
                <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
