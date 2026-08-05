import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { moderateText as moderateTextFn, moderateImage as moderateImageFn } from "@/lib/moderation.functions";

export type ModResult = { safe: boolean; reason: string; category?: string };

let cachedForbidden: string[] | null = null;
async function getForbiddenWords(): Promise<string[]> {
  if (cachedForbidden) return cachedForbidden;
  const { data } = await supabase.from("forbidden_words" as any).select("word");
  cachedForbidden = ((data as any[]) ?? []).map((r) => String(r.word).toLowerCase());
  return cachedForbidden;
}

export async function checkForbiddenWords(text: string): Promise<string | null> {
  const words = await getForbiddenWords();
  const lower = text.toLowerCase();
  for (const w of words) {
    if (!w) continue;
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) return w;
  }
  return null;
}

export async function moderateText(text: string, context?: string): Promise<ModResult> {
  const bad = await checkForbiddenWords(text);
  if (bad) return { safe: false, reason: `Mot interdit détecté : « ${bad} »`, category: "blacklist" };
  try {
    const r = await moderateTextFn({ data: { text, context } });
    return r as ModResult;
  } catch {
    return { safe: true, reason: "" };
  }
}

export async function moderateImageDataUrl(imageBase64: string): Promise<ModResult> {
  try {
    const r = await moderateImageFn({ data: { imageBase64 } });
    return r as ModResult;
  } catch {
    return { safe: false, reason: "Vérification de la photo impossible, réessaie.", category: "unavailable" };
  }
}

export async function checkRateLimit(action: "post" | "comment"): Promise<boolean> {
  const max = action === "post" ? 5 : 30;
  const win = action === "post" ? 600 : 300;
  const { data, error } = await supabase.rpc("check_rate_limit" as any, { _action: action, _max: max, _window_seconds: win });
  if (error) return true;
  return Boolean(data);
}

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
