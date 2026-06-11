import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { enablePush, disablePush, getCurrentPushSubscription, isPushSupported } from "@/lib/push";

export function PushToggle({ Row }: { Row: React.ComponentType<{ icon: React.ReactNode; title: string; value: boolean; onChange: (v: boolean) => void; subtitle?: string }> }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    getCurrentPushSubscription().then((s) => setEnabled(!!s && Notification.permission === "granted"));
  }, [supported]);

  async function onChange(v: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (v) {
        const res = await enablePush();
        if (!res.ok) {
          toast.error(res.reason ?? "Activation impossible");
          setEnabled(false);
        } else {
          toast.success("Notifications activées 🔔");
          setEnabled(true);
        }
      } else {
        await disablePush();
        toast.success("Notifications désactivées");
        setEnabled(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row
      icon={<Bell className="h-5 w-5" />}
      title="Notifications push"
      subtitle={!supported ? "Non supporté sur ce navigateur" : enabled ? "Activées" : "Désactivées"}
      value={enabled}
      onChange={onChange}
    />
  );
}
