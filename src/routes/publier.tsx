import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImagePlus, Pencil, Users, Globe, Utensils } from "lucide-react";
import { useRef, useState } from "react";
import { CATEGORIES, type Category } from "@/lib/mock-data";

export const Route = createFileRoute("/publier")({
  head: () => ({
    meta: [
      { title: "Dishyo — Publier un plat" },
      { name: "description", content: "Partage ton plat avec ta communauté Dishyo." },
    ],
  }),
  component: PublishPage,
});

function PublishPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"friends" | "public">("friends");
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImage(url);
  }

  function publish() {
    if (!image || !title.trim()) {
      alert("Ajoute une photo et un titre !");
      return;
    }
    alert("Plat publié ! Il disparaîtra dans 24h ✨");
    navigate({ to: "/" });
  }

  const canPublish = image && title.trim().length > 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 text-center backdrop-blur-xl">
        <h1 className="text-xl font-bold">Nouveau plat</h1>
      </header>

      <div className="space-y-6 p-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={pickFile}
          className="hidden"
        />

        {/* Upload area */}
        <div className="relative">
          {image ? (
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              <img src={image} alt="Plat" className="aspect-square w-full object-cover" />
              <button
                onClick={() => alert("Éditeur photo bientôt disponible ✏️")}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-soft backdrop-blur"
                title="Éditer"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-3 right-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur"
              >
                Changer
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center transition hover:border-primary hover:bg-accent/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <ImagePlus className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Prends ton plat en photo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Appuie pour prendre ou choisir une photo
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Visibility */}
        <div className="grid grid-cols-2 gap-2">
          <VisBtn active={visibility === "friends"} onClick={() => setVisibility("friends")}
            icon={<Users className="h-4 w-4" />} label="Amis" />
          <VisBtn active={visibility === "public"} onClick={() => setVisibility("public")}
            icon={<Globe className="h-4 w-4" />} label="Public" />
        </div>

        {/* Categories */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Catégorie
          </h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setCategory(active ? null : c.name)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span className="font-medium">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title + Desc */}
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nom du plat *"
            className="w-full rounded-2xl bg-muted px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Décris ton plat… (@mention #hashtag)"
            rows={4}
            className="w-full resize-none rounded-2xl bg-muted px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Publish */}
        <button
          onClick={publish}
          disabled={!canPublish}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          <Utensils className="h-5 w-5" />
          Publier mon plat
        </button>
      </div>
    </div>
  );
}

function VisBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground shadow-glow"
          : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
