import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { POSTS, ME, timeRemaining } from "@/lib/mock-data";

export const Route = createFileRoute("/compte/mes-plats")({
  component: MyPostsPage,
});

function MyPostsPage() {
  // Pour la démo on prend les premiers posts comme étant "à moi"
  const myPosts = POSTS.slice(0, 3).map((p) => ({ ...p, user: ME }));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes plats</h1>
      </header>

      <div className="space-y-3 p-5">
        {myPosts.map((p) => {
          const remaining = timeRemaining(p.createdAt);
          const expired = remaining === "Expiré";
          return (
            <div key={p.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <img src={p.image} className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        expired
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {expired ? "Expiré" : "Actif"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {expired ? "Plus disponible" : `Disparaît dans ${remaining}`}
                  </div>
                </div>
                <button className="self-end rounded-full p-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
