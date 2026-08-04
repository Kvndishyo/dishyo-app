import { useEffect, useState } from "react";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { computeAge, formatBirthdate, MIN_AGE } from "@/lib/age";
import { AgeVerificationForm } from "./AgeVerificationForm";

/** Ligne "Âge vérifié" + flux de re-vérification en cas de modification. */
export function AgeSettings() {
  const { session } = useAuth();
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    supabase
      .from("user_ages")
      .select("birthdate, verified_at")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted || !data) return;
        setBirthdate(data.birthdate);
        setVerifiedAt(data.verified_at);
      });
    return () => {
      mounted = false;
    };
  }, [session]);

  return (
    <div className="rounded-2xl">
      <button onClick={() => setEditing((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-muted">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <CalendarCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Âge vérifié</div>
          <div className="text-xs text-muted-foreground">
            {birthdate
              ? `${computeAge(birthdate)} ans · né(e) le ${formatBirthdate(birthdate)}`
              : "Vérification requise"}
          </div>
        </div>
        <ChevronRight className={`h-5 w-5 text-muted-foreground transition ${editing ? "rotate-90" : ""}`} />
      </button>

      {editing && (
        <div className="mt-1 space-y-3 rounded-2xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">
            Modifier ta date de naissance déclenche une nouvelle vérification d'âge. L'accès reste interdit aux
            moins de {MIN_AGE} ans.
            {verifiedAt && ` Dernière vérification : ${new Date(verifiedAt).toLocaleDateString("fr-FR")}.`}
          </p>
          <AgeVerificationForm
            initialValue={birthdate ?? ""}
            submitLabel="Revérifier mon âge"
            onCancel={() => setEditing(false)}
            onVerified={(v) => {
              setBirthdate(v);
              setVerifiedAt(new Date().toISOString());
              setEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
