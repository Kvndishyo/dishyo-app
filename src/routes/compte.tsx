import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Users, Utensils, Star, Bell, Moon, Shield, HelpCircle, MessageSquare, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/compte")({
  head: () => ({ meta: [{ title: "Dishyo — Mon compte" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState(true);
  const [dark, setDark] = useState(false);
  const [stats, setStats] = useState({ following: 0, followers: 0, posts: 0 });
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
    if (profile) { setDisplayName(profile.display_name); setBio(profile.bio ?? ""); }
  }, [profile]);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  }

  async function saveProfile() {
    if (!session || !profile) return;
    let avatar_url = profile.avatar_url;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (!error) avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio, avatar_url }).eq("id", session.user.id);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour !");
    setEditing(false);
    setAvatarFile(null);
    refreshProfile();
  }

  if (loading || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>;

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
          <img src={profile.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${profile.handle}`} className="h-20 w-20 rounded-full object-cover ring-4 ring-background shadow-card" />
          {!editing ? (
            <>
              <h2 className="mt-3 text-lg font-bold">{profile.display_name}</h2>
              <p className="text-sm text-primary">@{profile.handle}</p>
              {profile.bio && <p className="mt-1 text-sm text-muted-foreground">"{profile.bio}"</p>}
            </>
          ) : (
            <div className="mt-3 w-full space-y-2">
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="text-xs w-full" />
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nom"
                className="w-full rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2}
                className="w-full resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none" />
              <button onClick={saveProfile} className="w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                Enregistrer
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 border-y border-border py-4 text-center">
          <Stat n={stats.following} label="Abonnements" />
          <Stat n={stats.followers} label="Abonnés" />
          <Stat n={stats.posts} label="Plats actifs" />
        </div>

        <div className="mt-6 space-y-1">
          <Row icon={<Users className="h-5 w-5" />} title="Mes amis" to="/compte/amis" />
          <Row icon={<Utensils className="h-5 w-5" />} title="Mes plats" to="/compte/mes-plats" />
          <Row icon={<Star className="h-5 w-5 text-yellow-500" />} title="Mode Restaurateur" subtitleEl={<span className="text-emerald-600">Découvre les avantages →</span>} to="/compte/restaurateur" iconBg="bg-yellow-100" />
          <ToggleRow icon={<Bell className="h-5 w-5" />} title="Notifications" value={notif} onChange={setNotif} />
          <ToggleRow icon={<Moon className="h-5 w-5" />} title="Mode sombre" value={dark} onChange={toggleDark} />
          <Row icon={<Shield className="h-5 w-5" />} title="Confidentialité" to="/compte/confidentialite" />
          <Row icon={<HelpCircle className="h-5 w-5" />} title="Aide et support" to="/compte/aide" />
          <Row icon={<MessageSquare className="h-5 w-5" />} title="Contactez-nous" to="/compte/contact" />
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

function Stat({ n, label }: { n: number; label: string }) {
  return <div><div className="text-xl font-bold">{n}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}

function Row({ icon, title, subtitle, subtitleEl, to, iconBg = "bg-muted" }: { icon: React.ReactNode; title: string; subtitle?: string; subtitleEl?: React.ReactNode; to: string; iconBg?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-muted">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {subtitleEl && <div className="text-xs">{subtitleEl}</div>}
      </div>
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
