import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Word = { id: string; word: string };
type HiddenPost = { id: string; title: string; photo_url: string; user_id: string };

export function ModerationPanel() {
  const [words, setWords] = useState<Word[]>([]);
  const [newWord, setNewWord] = useState("");
  const [hidden, setHidden] = useState<HiddenPost[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const [w, p] = await Promise.all([
      supabase.from("forbidden_words" as any).select("id,word").order("word"),
      supabase.from("posts").select("id,title,photo_url,user_id").eq("hidden" as any, true).limit(50),
    ]);
    setWords(((w.data as any[]) ?? []) as Word[]);
    setHidden(((p.data as any[]) ?? []) as HiddenPost[]);
  }

  useEffect(() => { loadAll(); }, []);

  async function addWord() {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    setBusy(true);
    const { error } = await supabase.from("forbidden_words" as any).insert({ word: w });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewWord("");
    loadAll();
  }

  async function removeWord(id: string) {
    const { error } = await supabase.from("forbidden_words" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  }

  async function unhide(id: string) {
    const { error } = await supabase.from("posts").update({ hidden: false } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plat restauré");
    loadAll();
  }

  async function deletePost(id: string) {
    if (!confirm("Supprimer définitivement ce plat ?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plat supprimé");
    loadAll();
  }

  return (
    <div className="space-y-6 px-3 pb-24">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Ban className="h-4 w-4" /> Mots interdits ({words.length})
        </h2>
        <div className="mb-3 flex gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
            placeholder="ajouter un mot…"
            className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={addWord} disabled={busy || !newWord.trim()} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <span key={w.id} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              {w.word}
              <button onClick={() => removeWord(w.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
          {words.length === 0 && <p className="text-xs text-muted-foreground">Aucun mot interdit pour l'instant.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <EyeOff className="h-4 w-4" /> Plats masqués ({hidden.length})
        </h2>
        {hidden.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun plat masqué automatiquement.</p>
        ) : (
          <div className="space-y-2">
            {hidden.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-2">
                <img src={p.photo_url} alt={p.title} className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">user {p.user_id.slice(0, 8)}…</p>
                </div>
                <button onClick={() => unhide(p.id)} className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Eye className="h-3 w-3" /> Restaurer
                </button>
                <button onClick={() => deletePost(p.id)} className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
