import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const REASONS = [
  "Contenu inapproprié",
  "Harcèlement",
  "Spam ou publicité",
  "Discours haineux",
  "Désinformation",
  "Violence",
  "Autre",
] as const;

type Target = "post" | "comment" | "profile";

export function ReportDialog({
  open, onClose, targetType, targetId,
}: { open: boolean; onClose: () => void; targetType: Target; targetId: string }) {
  const { session } = useAuth();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: session.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signalement envoyé. Merci !");
    setDetails("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><Flag className="h-5 w-5 text-red-500" /><h3 className="text-lg font-semibold">Signaler</h3></div>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Aide-nous à garder Dishyo bienveillant. Tes signalements restent confidentiels.</p>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${reason === r ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <span>{r}</span>
                </button>
              ))}
            </div>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="Détails (optionnel)" rows={3} maxLength={500}
              className="mt-3 w-full resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none" />
            <button onClick={submit} disabled={busy}
              className="mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {busy ? "Envoi…" : "Envoyer le signalement"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
