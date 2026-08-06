import { useEffect, useState } from "react";
import { Loader2, Save, Mic, MicOff, Timer, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ROLE_META, topRole } from "@/lib/roles";
import type { ChatSettings } from "./AdminChatPanel";

type StaffRow = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  roles: string[];
  can_speak: boolean;
  muted_until: string | null;
};

const MUTE_OPTIONS = [
  { label: "5 min", mins: 5 },
  { label: "1 h", mins: 60 },
  { label: "24 h", mins: 1440 },
];

export function AdminChatSettingsPanel({ currentUserId }: { currentUserId: string }) {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [s, st] = await Promise.all([
      supabase.from("admin_chat_settings").select("*").maybeSingle(),
      supabase.rpc("admin_chat_staff"),
    ]);
    if (s.error) toast.error(s.error.message);
    if (st.error) toast.error(st.error.message);
    if (s.data) setSettings(s.data as ChatSettings);
    setStaff((st.data ?? []) as StaffRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function patch(p: Partial<ChatSettings>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("admin_chat_settings")
      .update({ ...settings, updated_by: currentUserId })
      .eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Réglages enregistrés");
  }

  async function setSpeaker(row: StaffRow, canSpeak: boolean) {
    setBusy(row.user_id);
    const { error } = await supabase.from("admin_chat_speakers").upsert(
      { user_id: row.user_id, can_speak: canSpeak, granted_by: currentUserId, muted_until: null },
      { onConflict: "user_id" },
    );
    setBusy(null);
    if (error) return toast.error(error.message);
    setStaff((rs) => rs.map((r) => (r.user_id === row.user_id ? { ...r, can_speak: canSpeak, muted_until: null } : r)));
    toast.success(canSpeak ? "Parole accordée" : "Parole retirée");
  }

  async function mute(row: StaffRow, mins: number) {
    const until = new Date(Date.now() + mins * 60000).toISOString();
    setBusy(row.user_id);
    const { error } = await supabase.from("admin_chat_speakers").upsert(
      { user_id: row.user_id, can_speak: row.can_speak, granted_by: currentUserId, muted_until: until },
      { onConflict: "user_id" },
    );
    setBusy(null);
    if (error) return toast.error(error.message);
    setStaff((rs) => rs.map((r) => (r.user_id === row.user_id ? { ...r, muted_until: until } : r)));
    toast.success(`Muet pendant ${mins} min`);
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-24">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Crown className="h-4 w-4 text-violet-500" /> Réglages du chat</h2>

        <Toggle label="Chat activé" desc="Désactive complètement le chat d'équipe" value={settings.chat_enabled} onChange={(v) => patch({ chat_enabled: v })} />
        <Toggle label="Lecture seule" desc="Seuls les owners peuvent écrire" value={settings.read_only} onChange={(v) => patch({ read_only: v })} />
        <Toggle label="Afficher les rôles" desc="Badge du rôle à côté du pseudo" value={settings.show_roles} onChange={(v) => patch({ show_roles: v })} />
        <Toggle label="Suppression par les admins" desc="Les admins peuvent supprimer les messages des autres" value={settings.allow_admin_delete} onChange={(v) => patch({ allow_admin_delete: v })} />
        <Toggle label="Réactions" desc="Autoriser les réactions aux messages" value={settings.allow_reactions} onChange={(v) => patch({ allow_reactions: v })} />

        <Num label="Mode lent (secondes)" value={settings.slow_mode_seconds} min={0} max={3600} onChange={(v) => patch({ slow_mode_seconds: v })} />
        <Num label="Longueur max d'un message" value={settings.max_message_length} min={50} max={4000} onChange={(v) => patch({ max_message_length: v })} />
        <Num label="Conservation des messages (jours)" value={settings.retention_days} min={1} max={365} onChange={(v) => patch({ retention_days: v })} />

        <Field label="Message d'accueil">
          <textarea
            value={settings.welcome_message ?? ""}
            onChange={(e) => patch({ welcome_message: e.target.value })}
            rows={2}
            className="w-full rounded-2xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
          />
        </Field>
        <Field label="Annonce épinglée">
          <textarea
            value={settings.pinned_message ?? ""}
            onChange={(e) => patch({ pinned_message: e.target.value })}
            rows={2}
            className="w-full rounded-2xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
          />
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold">Droit de parole du staff</h2>
        {staff.map((row) => {
          const role = topRole(row.roles);
          const meta = role ? ROLE_META[role] : null;
          const isOwnerRow = row.roles.includes("owner");
          const muted = row.muted_until ? new Date(row.muted_until) > new Date() : false;
          return (
            <div key={row.user_id} className="rounded-2xl border border-border p-3">
              <div className="flex items-center gap-3">
                <img
                  src={row.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${row.handle}`}
                  alt={row.display_name}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{row.display_name}</span>
                    {meta && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}>{meta.label}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{row.handle}
                    {muted && ` · muet jusqu'à ${new Date(row.muted_until!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                  </div>
                </div>
              </div>
              {isOwnerRow ? (
                <p className="mt-2 text-xs text-muted-foreground">Les owners ont toujours la parole.</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSpeaker(row, !row.can_speak)}
                    disabled={busy === row.user_id}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      row.can_speak ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {busy === row.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : row.can_speak ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    {row.can_speak ? "Peut parler" : "Muet"}
                  </button>
                  {row.can_speak && MUTE_OPTIONS.map((o) => (
                    <button
                      key={o.mins}
                      onClick={() => mute(row, o.mins)}
                      disabled={busy === row.user_id}
                      className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
                    >
                      <Timer className="h-3 w-3" /> {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-left">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
