import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function blockUser(targetId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
  if (error) { toast.error(error.message); return false; }
  toast.success("Utilisateur bloqué");
  return true;
}

export async function unblockUser(targetId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("blocks").delete()
    .eq("blocker_id", user.id).eq("blocked_id", targetId);
  if (error) { toast.error(error.message); return false; }
  toast.success("Utilisateur débloqué");
  return true;
}

export async function isUserBlocked(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("blocks").select("blocker_id")
    .eq("blocker_id", user.id).eq("blocked_id", targetId).maybeSingle();
  return !!data;
}
