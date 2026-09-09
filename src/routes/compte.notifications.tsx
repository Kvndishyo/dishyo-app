import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, Utensils, Megaphone, Moon, Smartphone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getPushDevices,
  sendTestPush,
  DEFAULT_PREFS,
  type NotificationPrefs,
} from "@/lib/notificationPrefs.functions";
import { PushToggle } from "@/components/dishyo/PushToggle";

export const Route = createFileRoute("/compte/notifications")({
  head: () => ({
    meta: [
      { title: "Dishyo — Réglages des notifications" },
      { name: "description", content: "Choisis les notifications que tu reçois sur Dishyo et définis tes heures calmes." },
      { property: "og:title", content: "Dishyo — Réglages des notifications" },
      { property: "og:description", content: "Choisis les notifications que tu reçois sur Dishyo et définis tes heures calmes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsSettingsPage,
});

type Device = { id: string; user_agent: string | null; platform: string; created_at: string };

function NotificationsSettingsPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const loadPrefs = useServerFn(getNotificationPrefs);
  const savePrefs = useServerFn(saveNotificationPrefs);
  const loadDevices = useServerFn(getPushDevices);
  const testPush = useServerFn(sendTestPush);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [devices, setDevices] = useState<Device[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    (async () => {
      try {
        const [p, d] = await Promise.all([loadPrefs({}), loadDevices({})]);
        if (!alive) return;
        if (p) setPrefs(p);
        setDevices(Array.isArray(d) ? (d as Device[]) : []);
      } catch (e: any) {
        toast.error(e?.message ?? "Chargement impossible");
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, loadPrefs, loadDevices]);

  async function update(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch, tz_offset_minutes: -new Date().getTimezoneOffset() };
    setPrefs(next);
    setSaving(true);
    try {
      await savePrefs({ data: next });
    } catch (e: any) {
      toast.error(e?.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Notifications</h1>
        {saving && <span className="ml-auto text-xs text-muted-foreground">Enregistrement…</span>}
      </header>

      <div className="space-y-6 p-4">
        <section className="rounded-3xl bg-card p-2 shadow-soft">
          <PushToggle Row={ToggleRow} />
        </section>

        <section>
          <h2 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Ce que je veux recevoir
          </h2>
          <div className="rounded-3xl bg-card p-2 shadow-soft">
            <ToggleRow icon={<Heart className="h-5 w-5" />} title="Réactions" subtitle="Quand on réagit à mes plats"
              value={prefs.push_like} onChange={(v) => update({ push_like: v })} />
            <ToggleRow icon={<MessageCircle className="h-5 w-5" />} title="Commentaires" subtitle="Nouveaux commentaires et réponses"
              value={prefs.push_comment} onChange={(v) => update({ push_comment: v })} />
            <ToggleRow icon={<UserPlus className="h-5 w-5" />} title="Nouveaux abonnés" subtitle="Quand quelqu'un me suit"
              value={prefs.push_follow} onChange={(v) => update({ push_follow: v })} />
            <ToggleRow icon={<Utensils className="h-5 w-5" />} title="Plats de mes amis" subtitle="Quand une personne suivie publie"
              value={prefs.push_post} onChange={(v) => update({ push_post: v })} />
            <ToggleRow icon={<Megaphone className="h-5 w-5" />} title="Annonces Dishyo" subtitle="Nouveautés et messages importants"
              value={prefs.push_announce} onChange={(v) => update({ push_announce: v })} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Heures calmes
          </h2>
          <div className="rounded-3xl bg-card p-2 shadow-soft">
            <ToggleRow icon={<Moon className="h-5 w-5" />} title="Ne pas déranger" subtitle="Aucune notification pendant ce créneau"
              value={prefs.quiet_enabled} onChange={(v) => update({ quiet_enabled: v })} />
            {prefs.quiet_enabled && (
              <div className="flex items-center gap-3 px-3 pb-3 pt-1">
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">De</span>
                  <input type="time" value={prefs.quiet_start} onChange={(e) => update({ quiet_start: e.target.value })}
                    className="w-full rounded-2xl bg-muted px-3 py-2 text-sm outline-none" />
                </label>
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">À</span>
                  <input type="time" value={prefs.quiet_end} onChange={(e) => update({ quiet_end: e.target.value })}
                    className="w-full rounded-2xl bg-muted px-3 py-2 text-sm outline-none" />
                </label>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Mes appareils
          </h2>
          <div className="space-y-2 rounded-3xl bg-card p-3 shadow-soft">
            {!ready && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {ready && devices.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun appareil enregistré. Active les notifications ci-dessus depuis chaque téléphone.
              </p>
            )}
            {devices.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{describeDevice(d.user_agent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.platform === "web" ? "Navigateur" : d.platform} · ajouté le{" "}
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
            <button
              onClick={async () => {
                try {
                  await testPush({});
                  toast.success("Notification de test envoyée 🔔");
                } catch (e: any) {
                  toast.error(e?.message ?? "Envoi impossible");
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium hover:bg-muted"
            >
              <Send className="h-4 w-4" /> Envoyer une notification de test
            </button>
          </div>
        </section>

        <p className="px-2 text-xs text-muted-foreground">
          <Bell className="mr-1 inline h-3 w-3" />
          Sur iPhone, ajoute d'abord Dishyo à ton écran d'accueil depuis Safari pour recevoir les notifications.
        </p>
      </div>
    </div>
  );
}

function describeDevice(ua: string | null) {
  if (!ua) return "Appareil inconnu";
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Autre appareil";
}

function ToggleRow({
  icon, title, subtitle, value, onChange,
}: { icon: React.ReactNode; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
