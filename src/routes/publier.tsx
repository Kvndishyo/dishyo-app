import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImagePlus, Users, Globe, Utensils, Camera, Image as ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/dishyo-db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MentionTextarea } from "@/components/dishyo/MentionTextarea";
import { PhotoEditor } from "@/components/dishyo/PhotoEditor";

export const Route = createFileRoute("/publier")({
  head: () => ({ meta: [{ title: "Dishyo — Publier un plat" }] }),
  component: PublishPage,
});

const DRAFT_KEY = "dishyo:publish-draft:v1";

function PublishPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visibility, setVisibility] = useState<"friends" | "public">("public");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [recipe, setRecipe] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) navigate({ to: "/auth" });
  }, [authLoading, session, navigate]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.restaurant) setRestaurant(d.restaurant);
        if (d.recipe) setRecipe(d.recipe);
        if (d.category) setCategory(d.category);
        if (d.visibility) setVisibility(d.visibility);
        if (d.photoDataUrl) {
          setPreview(d.photoDataUrl);
          fetch(d.photoDataUrl).then(r => r.blob()).then(b => {
            setFile(new File([b], `draft-${Date.now()}.jpg`, { type: b.type || "image/jpeg" }));
          });
        }
      }
    } catch {}
    setDraftLoaded(true);
  }, []);

  // Save draft on changes
  useEffect(() => {
    if (!draftLoaded) return;
    const hasContent = preview || title || restaurant || recipe || category;
    if (!hasContent) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          title, restaurant, recipe, category, visibility,
          photoDataUrl: preview?.startsWith("data:") ? preview : null,
        }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draftLoaded, title, restaurant, recipe, category, visibility, preview]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPickerOpen(false);
    if (!f) return;
    setEditorSrc(URL.createObjectURL(f));
    e.target.value = "";
  }

  function handleEditorSave(blob: Blob) {
    const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(blob);
    setEditorSrc(null);
  }

  async function publish() {
    if (!file || !title.trim() || !session) return toast.error("Photo et titre requis");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dish-photos").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("dish-photos").getPublicUrl(path);
      const { error } = await supabase.from("posts").insert({
        user_id: session.user.id,
        photo_url: pub.publicUrl,
        title: title.trim(),
        restaurant: restaurant.trim() || null,
        category, recipe: recipe.trim() || null, visibility,
      });
      if (error) throw error;
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Plat publié ! Disparait dans 48h ✨");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur publication");
    } finally {
      setBusy(false);
    }
  }

  const canPublish = !!file && title.trim().length > 0 && !busy;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 text-center backdrop-blur-xl">
        <h1 className="text-xl font-bold">Nouveau plat</h1>
      </header>

      <div className="space-y-6 p-5">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pickFile} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />

        <div className="relative">
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              <img src={preview} alt="Plat" className="aspect-square w-full object-cover" />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button onClick={() => setEditorSrc(preview)} className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
                  Éditer
                </button>
                <button onClick={() => setPickerOpen(true)} className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
                  Changer
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPickerOpen(true)} className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center transition hover:border-primary hover:bg-accent/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <ImagePlus className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Ajoute une photo de ton plat</p>
                <p className="mt-1 text-sm text-muted-foreground">Caméra ou galerie</p>
              </div>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <VisBtn active={visibility === "friends"} onClick={() => setVisibility("friends")} icon={<Users className="h-4 w-4" />} label="Amis" />
          <VisBtn active={visibility === "public"} onClick={() => setVisibility("public")} icon={<Globe className="h-4 w-4" />} label="Public" />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.name;
              return (
                <button key={c.name} onClick={() => setCategory(active ? null : c.name)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-foreground hover:bg-accent"}`}>
                  <span>{c.emoji}</span><span className="font-medium">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du plat *"
            className="w-full rounded-2xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="Restaurant (optionnel) 📍"
            className="w-full rounded-2xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <MentionTextarea
            value={recipe} onChange={setRecipe}
            placeholder="Décris ton plat ou ta recette… (@mention #hashtag)"
            rows={4}
            className="w-full resize-none rounded-2xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button onClick={publish} disabled={!canPublish}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none">
          <Utensils className="h-5 w-5" />
          {busy ? "Publication…" : "Publier mon plat"}
        </button>
      </div>

      {pickerOpen && (
        <>
          <div onClick={() => setPickerOpen(false)} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />
            <h3 className="mb-4 text-center text-base font-semibold">Choisis une source</h3>
            <div className="space-y-2">
              <button onClick={() => cameraRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl bg-muted p-4 text-left transition hover:bg-accent">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Prendre une photo</div>
                  <div className="text-xs text-muted-foreground">Utiliser la caméra</div>
                </div>
              </button>
              <button onClick={() => galleryRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl bg-muted p-4 text-left transition hover:bg-accent">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Choisir depuis la galerie</div>
                  <div className="text-xs text-muted-foreground">Photos existantes</div>
                </div>
              </button>
              <button onClick={() => setPickerOpen(false)} className="w-full rounded-2xl py-3 text-sm font-medium text-muted-foreground hover:bg-muted">
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {editorSrc && <PhotoEditor src={editorSrc} onCancel={() => setEditorSrc(null)} onSave={handleEditorSave} />}
    </div>
  );
}

function VisBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-foreground hover:bg-accent"}`}>
      {icon}{label}
    </button>
  );
}
