import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Users, Utensils, Star, Bell, Moon, Shield, HelpCircle, MessageSquare, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { ME } from "@/lib/mock-data";

export const Route = createFileRoute("/compte")({
  head: () => ({
    meta: [
      { title: "Dishyo — Mon compte" },
      { name: "description", content: "Gère ton profil, tes plats et tes paramètres Dishyo." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [notif, setNotif] = useState(true);
  const [dark, setDark] = useState(false);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 text-center backdrop-blur-xl">
        <h1 className="text-xl font-bold">Mon Compte</h1>
      </header>

      <div className="px-5 py-6">
        {/* Profile */}
        <div className="relative flex flex-col items-center text-center">
          <button className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-accent">
            <Pencil className="h-4 w-4" />
          </button>
          <img src={ME.avatar} className="h-20 w-20 rounded-full object-cover ring-4 ring-background shadow-card" />
          <h2 className="mt-3 text-lg font-bold">{ME.username}</h2>
          <p className="text-sm text-primary">@{ME.handle}</p>
          <p className="mt-1 text-sm text-muted-foreground">"{ME.bio ?? ""}"</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 border-y border-border py-4 text-center">
          <Stat n={ME.following} label="Abonnements" />
          <Stat n={ME.followers} label="Abonnés" />
          <Stat n={ME.friends} label="Amis" />
          <Stat n={ME.posts} label="Plats" />
        </div>

        {/* Menu */}
        <div className="mt-6 space-y-1">
          <Row icon={<Users className="h-5 w-5" />} title="Mes amis" subtitle={`${ME.friends} amis mutuels`} to="/compte/amis" />
          <Row icon={<Utensils className="h-5 w-5" />} title="Mes plats" subtitle={`${ME.posts} plats postés`} to="/compte/mes-plats" />
          <Row
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            title="Mode Restaurateur"
            subtitleEl={<span className="text-emerald-600">Découvre les avantages →</span>}
            to="/compte/restaurateur"
            iconBg="bg-yellow-100"
          />
          <ToggleRow icon={<Bell className="h-5 w-5" />} title="Notifications" value={notif} onChange={setNotif} />
          <ToggleRow icon={<Moon className="h-5 w-5" />} title="Mode sombre" value={dark} onChange={toggleDark} />
          <Row icon={<Shield className="h-5 w-5" />} title="Confidentialité" to="/compte/confidentialite" />
          <Row icon={<HelpCircle className="h-5 w-5" />} title="Aide et support" to="/compte/aide" />
          <Row icon={<MessageSquare className="h-5 w-5" />} title="Contactez-nous" to="/compte/contact" />
        </div>

        {/* Logout / Delete */}
        <div className="mt-8 space-y-2">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
          <button
            onClick={() => confirm("Supprimer définitivement ton compte ?") && alert("Compte supprimé")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer mon compte
          </button>
        </div>
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

function Row({
  icon, title, subtitle, subtitleEl, to, iconBg = "bg-muted",
}: {
  icon: React.ReactNode; title: string; subtitle?: string; subtitleEl?: React.ReactNode;
  to: string; iconBg?: string;
}) {
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

function ToggleRow({
  icon, title, value, onChange,
}: { icon: React.ReactNode; title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="flex-1 font-semibold">{title}</div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
