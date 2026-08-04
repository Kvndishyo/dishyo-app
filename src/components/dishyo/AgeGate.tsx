import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MIN_AGE } from "@/lib/age";
import { AgeVerificationForm } from "./AgeVerificationForm";
import { Logo } from "./Logo";

/**
 * Bloque l'accès à l'app tant que l'utilisateur connecté n'a pas
 * de date de naissance vérifiée côté serveur (>= 15 ans).
 */
export function AgeGate() {
  const { session, loading, signOut } = useAuth();
  const [checked, setChecked] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (loading) return;
    if (!session) {
      setChecked(true);
      setNeedsVerification(false);
      return;
    }
    setChecked(false);
    supabase
      .from("user_ages")
      .select("birthdate, verified_at")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        // En cas d'erreur réseau, on ne bloque pas l'app inutilement.
        setNeedsVerification(!error && !data);
        setChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [session, loading]);

  if (!checked || !needsVerification) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/98 px-6 backdrop-blur-xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldAlert className="h-3.5 w-3.5" /> Vérification d'âge
          </div>
          <h1 className="text-xl font-bold">Quel est ton âge ?</h1>
          <p className="text-sm text-muted-foreground">
            Dishyo est réservé aux personnes de {MIN_AGE} ans et plus. Indique ta date de naissance pour continuer.
            Elle reste privée : aucun autre utilisateur ne peut la voir.
          </p>
        </div>

        <AgeVerificationForm onVerified={() => setNeedsVerification(false)} />

        <button
          onClick={() => signOut()}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:underline"
        >
          Se déconnecter
        </button>
      </motion.div>
    </div>
  );
}
