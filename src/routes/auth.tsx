import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/dishyo/Logo";
import { MIN_AGE, maxBirthdateInput, minBirthdateInput, validateBirthdate } from "@/lib/age";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Dishyo — Connexion" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false);
  const [birthdate, setBirthdate] = useState("");
  const [attestAge, setAttestAge] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return "Le mot de passe doit faire au moins 8 caractères.";
    if (!/[A-Z]/.test(pw)) return "Ajoute au moins une majuscule.";
    if (!/[a-z]/.test(pw)) return "Ajoute au moins une minuscule.";
    if (!/[0-9]/.test(pw)) return "Ajoute au moins un chiffre.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      if (!acceptTerms) return toast.error("Tu dois accepter les CGU et la politique de confidentialité.");
      if (!acceptCookies) return toast.error("Tu dois accepter l'utilisation des cookies essentiels.");
      const pwErr = validatePassword(password);
      if (pwErr) return toast.error(pwErr);
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName || email.split("@")[0],
              accepted_terms_at: new Date().toISOString(),
              accepted_cookies_at: new Date().toISOString(),
            },
          },
        });
        if (error) throw error;
        try {
          localStorage.setItem("dishyo_cookie_consent", "essential");
          localStorage.setItem("dishyo_terms_accepted_at", new Date().toISOString());
        } catch {}
        toast.success("Compte créé ! Bienvenue 🍽️");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connecté !");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    if (result.error) { toast.error("Connexion Google échouée"); setBusy(false); }
  }

  async function handleReset() {
    if (!email) return toast.error("Entre ton email d'abord");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email envoyé !");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size={64} />
          <h1 className="text-3xl font-bold">Dishyo</h1>
          <p className="text-sm text-muted-foreground">Partage tes plats préférés</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1">
          <button
            onClick={() => setMode("login")}
            className={`rounded-full py-2 text-sm font-semibold transition ${mode === "login" ? "bg-background shadow-card" : "text-muted-foreground"}`}
          >Connexion</button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-full py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-background shadow-card" : "text-muted-foreground"}`}
          >Inscription</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text" placeholder="Ton nom"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          )}
          <input
            type="email" placeholder="Email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password" placeholder="Mot de passe" required minLength={mode === "signup" ? 8 : 6}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {mode === "signup" && (
            <>
              <p className="px-1 text-[11px] text-muted-foreground">8 caractères min., avec majuscule, minuscule et chiffre.</p>
              <label className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                  J'accepte les{" "}
                  <Link to="/cgu" className="text-primary underline">CGU</Link>{" "}et la{" "}
                  <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.
                </span>
              </label>
              <label className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
                <input type="checkbox" checked={acceptCookies} onChange={(e) => setAcceptCookies(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>J'accepte l'utilisation des cookies essentiels nécessaires au fonctionnement de Dishyo.</span>
              </label>
            </>
          )}
          <button
            type="submit" disabled={busy || (mode === "signup" && (!acceptTerms || !acceptCookies))}
            className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >{busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
        </form>

        {mode === "login" && (
          <button onClick={handleReset} className="mt-3 w-full text-center text-xs text-muted-foreground hover:underline">
            Mot de passe oublié ?
          </button>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OU</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle} disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.7 0 19.5-7.7 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5c-7.6 0-14.2 4.3-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.2 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
          Continuer avec Google
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Retour</Link>
        </p>
      </motion.div>
    </div>
  );
}
