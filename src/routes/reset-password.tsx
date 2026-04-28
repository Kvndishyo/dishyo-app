import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/dishyo/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Dishyo — Nouveau mot de passe" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour !");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size={56} />
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" required minLength={6} placeholder="Nouveau mot de passe"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button disabled={busy} className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "..." : "Mettre à jour"}
          </button>
        </form>
      </div>
    </div>
  );
}
