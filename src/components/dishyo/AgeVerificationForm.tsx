import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MIN_AGE, maxBirthdateInput, minBirthdateInput, validateBirthdate } from "@/lib/age";

type Props = {
  initialValue?: string;
  submitLabel?: string;
  onVerified: (birthdate: string) => void;
  onCancel?: () => void;
};

/** Formulaire de (re)vérification d'âge. La validation finale est faite par le serveur. */
export function AgeVerificationForm({ initialValue = "", submitLabel = "Vérifier mon âge", onVerified, onCancel }: Props) {
  const [birthdate, setBirthdate] = useState(initialValue);
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateBirthdate(birthdate);
    if (err) return toast.error(err);
    if (!attest) return toast.error("Tu dois certifier l'exactitude de ta date de naissance.");
    setBusy(true);
    try {
      // Le serveur revalide l'âge et horodate la vérification.
      const { error } = await supabase.rpc("verify_my_age", { _birthdate: birthdate });
      if (error) throw error;
      toast.success("Âge vérifié ✅");
      onVerified(birthdate);
    } catch (e: any) {
      toast.error(e?.message ?? "Vérification impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="date"
        required
        value={birthdate}
        max={maxBirthdateInput()}
        min={minBirthdateInput()}
        onChange={(e) => setBirthdate(e.target.value)}
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <label className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
        <span>
          Je certifie sur l'honneur que cette date de naissance est exacte et que j'ai au moins {MIN_AGE} ans.
          Toute fausse déclaration peut entraîner la suppression du compte.
        </span>
      </label>
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border py-2.5 text-sm font-medium">
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !attest}
          className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
