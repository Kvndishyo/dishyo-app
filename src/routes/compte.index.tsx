import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Utensils, Star, Bell, Moon, Shield, HelpCircle, ChevronRight, LogOut, ShieldCheck, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/compte/")({
  head: () => ({ meta: [{ title: "Dishyo — Mon compte" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [notif, setNotif] = useState(true);
  const [dark, setDark] = useState(false);
  const [stats, setStats] = useState({ following: 0, followers: 0, posts: 0 });
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", session.user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", session.user.id),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).gt("expires_at", new Date().toISOString()),
    ]).then(([fg, fs, ps]) => setStats({ following: fg.count ?? 0, followers: fs.count ?? 0, posts: ps.count ?? 0 }));
  }, [session]);

  useEffect(() => {
    if (profile) { setDisplayName(profile.display_name); setBio(profile.bio ?? ""); setHandle(profile.handle); }
  }, [profile]);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  }

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function saveProfile() {
    if (!session || !profile) return;
    // Update handle if changed
    if (handle !== profile.handle) {
      const { error: hErr } = await supabase.rpc("update_my_handle", { new_handle: handle });
      if (hErr) return toast.error(hErr.message);
    }
    let avatar_url = profile.avatar_url;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) return toast.error(error.message);
      avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio, avatar_url }).eq("id", session.user.id);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour !");
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    refreshProfile();
  }

  if (loading || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>;

  const avatarSrc = avatarPreview ?? profile.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${profile.handle}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 text-center backdrop-blur-xl">
        <h1 className="text-xl font-bold">Mon Compte</h1>
      </header>

      <div className="px-5 py-6">
        <div className="relative flex flex-col items-center text-center">
          <button onClick={() => setEditing((v) => !v)} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-accent">
            <Pencil className="h-4 w-4" />
          </button>

          <div className="relative">
            <img src={avatarSrc} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-card" alt="" />
            {editing && (
              <button
                onClick={() => galleryRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
                aria-label="Changer la photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <input ref={galleryRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
          <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={pickAvatar} className="hidden" />

          {!editing ? (
            <>
              <h2 className="mt-3 text-lg font-bold">{profile.display_name}</h2>
              <p className="text-sm text-primary">@{profile.handle}</p>
              {profile.bio && <p className="mt-1 text-sm text-muted-foreground">"{profile.bio}"</p>}
            </>
          ) : (
            <div className="mt-3 w-full space-y-2">
              <div className="flex gap-2">
                <button onClick={() => cameraRef.current?.click()} className="flex-1 rounded-2xl bg-muted py-2 text-xs font-medium">📷 Caméra</button>
                <button onClick={() => galleryRef.current?.click()} className="flex-1 rounded-2xl bg-muted py-2 text-xs font-medium">🖼️ Galerie</button>
              </div>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nom"
                className="w-full rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none" />
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
                <AtSign className="h-4 w-4 text-primary" />
                <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="pseudo_unique" maxLength={20}
                  className="w-full bg-transparent text-sm outline-none" />
              </div>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2}
                className="w-full resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none" />
              <button onClick={saveProfile} className="w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                Enregistrer
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 border-y border-border py-4">
          <StatBtn n={stats.following} label="Abonnements" to="/compte/abonnements" />
          <StatBtn n={stats.followers} label="Abonnés" to="/compte/abonnes" />
          <StatBtn n={stats.posts} label="Plats actifs" to="/compte/mes-plats" />
        </div>

        <div className="mt-6 space-y-1">
          <Row icon={<Utensils className="h-5 w-5" />} title="Mes plats" to="/compte/mes-plats" />
          <Row icon={<Star className="h-5 w-5 text-yellow-500" />} title="Mode Restaurateur" subtitleEl={<span className="text-emerald-600">Découvre les avantages →</span>} to="/compte/restaurateur" iconBg="bg-yellow-100" />
          <Row icon={<Bell className="h-5 w-5" />} title="Notifications" to="/notifications" badge={unread} />
          <ToggleRow icon={<Bell className="h-5 w-5" />} title="Alertes activées" value={notif} onChange={setNotif} />
          <ToggleRow icon={<Moon className="h-5 w-5" />} title="Mode sombre" value={dark} onChange={toggleDark} />
          <Row icon={<Shield className="h-5 w-5" />} title="Confidentialité" to="/compte/confidentialite" />
          <Row icon={<HelpCircle className="h-5 w-5" />} title="Aide et support" to="/compte/aide" />
          
          {isAdmin && (
            <Row icon={<ShieldCheck className="h-5 w-5 text-primary" />} title="Dashboard admin" subtitle="Messages support & réponses IA" to="/admin" iconBg="bg-primary/10" />
          )}
        </div>

        <div className="mt-8 space-y-2">
          <button onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBtn({ n, label, to }: { n: number; label: string; to: string }) {
  return (
    <Link to={to} className="rounded-2xl py-1 transition active:scale-95 hover:bg-muted">
      <div className="text-xl font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

function Row({ icon, title, subtitle, subtitleEl, to, iconBg = "bg-muted", badge }: { icon: React.ReactNode; title: string; subtitle?: string; subtitleEl?: React.ReactNode; to: string; iconBg?: string; badge?: number }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-muted">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {subtitleEl && <div className="text-xs">{subtitleEl}</div>}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{badge}</span>
      )}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

function ToggleRow({ icon, title, value, onChange }: { icon: React.ReactNode; title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="flex-1 font-semibold">{title}</div>
      <button onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
