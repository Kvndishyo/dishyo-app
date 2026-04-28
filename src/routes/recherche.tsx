import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Share2, Flag, UserPlus, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { USERS } from "@/lib/mock-data";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Dishyo — Recherche" },
      { name: "description", content: "Trouve des foodies et restaurateurs sur Dishyo." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const results = useMemo(() => {
    const list = q
      ? USERS.filter((u) =>
          u.username.toLowerCase().includes(q.toLowerCase()) ||
          u.handle.toLowerCase().includes(q.toLowerCase()))
      : USERS;
    return list;
  }, [q]);

  function share() {
    const url = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: "Dishyo", text: "Rejoins-moi sur Dishyo !", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <h1 className="mb-3 text-xl font-bold">Recherche</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un pseudo…"
            className="w-full rounded-full bg-muted py-3 pl-12 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </header>

      <div className="px-5 py-4">
        <button
          onClick={share}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98]"
        >
          <Share2 className="h-5 w-5" />
          Inviter des amis
        </button>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {q ? "Résultats" : "Recommandations"}
        </h2>

        <ul className="space-y-2">
          {results.map((u) => {
            const isFollowing = following[u.id] ?? false;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
              >
                <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex flex-1 items-center gap-3">
                  <img src={u.avatar} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{u.username}</span>
                      {u.isRestaurant && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">★</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">@{u.handle}</div>
                  </div>
                </Link>
                <button
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                  title="Signaler"
                  onClick={() => alert("Signalement envoyé")}
                >
                  <Flag className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFollowing((f) => ({ ...f, [u.id]: !isFollowing }))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    isFollowing
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground shadow-glow"
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {isFollowing ? "Suivi" : "Suivre"}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">Aucun résultat pour « {q} »</li>
          )}
        </ul>
      </div>
    </div>
  );
}
