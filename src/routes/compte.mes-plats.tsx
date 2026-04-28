import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserPosts, timeRemaining, type DbPost } from "@/lib/dishyo-db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/compte/mes-plats")({
  component: MyPostsPage,
});

function MyPostsPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetchUserPosts(session.user.id).then((p) => { setPosts(p); setLoading(false); });
  }, [session]);

  async function remove(id: string) {
    if (!confirm("Supprimer ce plat ?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPosts((p) => p.filter((x) => x.id !== id));
    toast.success("Plat supprimé");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes plats</h1>
      </header>

      <div className="space-y-3 p-5">
        {loading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && posts.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun plat actif. Publie ton premier plat ! 🍽️</p>
        )}
        {posts.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
            <img src={p.photo_url} className="h-20 w-20 rounded-xl object-cover" />
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{p.title}</h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">Actif</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Disparaît dans {timeRemaining(p.expires_at)}
                </div>
              </div>
              <button onClick={() => remove(p.id)} className="self-end rounded-full p-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
