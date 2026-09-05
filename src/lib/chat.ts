import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

export type ConversationRow = {
  id: string;
  is_group: boolean;
  title: string | null;
  photo_url: string | null;
  last_message_at: string;
  pinned: boolean;
  archived: boolean;
  muted_until: string | null;
  unread_count: number;
  last_message_body: string | null;
  last_message_kind: string | null;
  last_message_sender: string | null;
  other_user_id: string | null;
  other_handle: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
};

export type MessageKind = "text" | "image" | "post" | "system";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  media_url: string | null;
  post_id: string | null;
  reply_to_id: string | null;
  expires_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type MemberRow = {
  conversation_id: string;
  user_id: string;
  role: string;
  nickname: string | null;
  last_read_at: string;
  muted_until: string | null;
  pinned: boolean;
  archived: boolean;
  profiles?: { id: string; handle: string; display_name: string; avatar_url: string | null } | null;
};

export const QUICK_REACTIONS = ["❤️", "😂", "🔥", "🤤", "👍", "😮", "😢", "🙏"] as const;

/** Ephemeral options, in seconds (0 = never disappears). */
export const EPHEMERAL_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1 min", value: 60 },
  { label: "1 h", value: 3600 },
  { label: "24 h", value: 86400 },
] as const;

export async function listConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw error;
  return (data ?? []) as unknown as ConversationRow[];
}

export async function startDirect(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_direct_conversation", {
    _other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function createGroup(title: string, memberIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc("create_group_conversation", {
    _title: title,
    _member_ids: memberIds,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function markRead(conversationId: string) {
  await supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
}

export async function fetchMessages(conversationId: string, limit = 60): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as MessageRow[]).reverse();
  const now = Date.now();
  return rows.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now);
}

export async function fetchMembers(conversationId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("*, profiles:user_id(id, handle, display_name, avatar_url)")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return (data ?? []) as unknown as MemberRow[];
}

export async function fetchConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type SendInput = {
  conversationId: string;
  senderId: string;
  kind?: MessageKind;
  body?: string | null;
  mediaUrl?: string | null;
  postId?: string | null;
  replyToId?: string | null;
  ephemeralSeconds?: number;
};

export async function sendMessage(input: SendInput): Promise<MessageRow> {
  const expires_at =
    input.ephemeralSeconds && input.ephemeralSeconds > 0
      ? new Date(Date.now() + input.ephemeralSeconds * 1000).toISOString()
      : null;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      kind: input.kind ?? "text",
      body: input.body ?? null,
      media_url: input.mediaUrl ?? null,
      post_id: input.postId ?? null,
      reply_to_id: input.replyToId ?? null,
      expires_at,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as MessageRow;
}

/** Uploads a picture to the private chat bucket, returns the storage path. */
export async function uploadChatImage(userId: string, file: File): Promise<string> {
  const compressed = await compressImage(file, `chat-${Date.now()}.jpg`);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("chat-media").upload(path, compressed);
  if (error) throw error;
  return path;
}

const signedCache = new Map<string, { url: string; at: number }>();

export async function signedChatUrl(path: string): Promise<string | null> {
  const cached = signedCache.get(path);
  if (cached && Date.now() - cached.at < 45 * 60 * 1000) return cached.url;
  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, at: Date.now() });
  return data.signedUrl;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const { data } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (data) {
    await supabase.from("message_reactions").delete().eq("id", (data as { id: string }).id);
  } else {
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
  }
}

export async function fetchReactions(conversationId: string) {
  const { data } = await supabase
    .from("message_reactions")
    .select("id, message_id, user_id, emoji, messages!inner(conversation_id)")
    .eq("messages.conversation_id", conversationId);
  return (data ?? []) as unknown as { id: string; message_id: string; user_id: string; emoji: string }[];
}

export async function softDeleteMessage(id: string) {
  await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

export async function editMessage(id: string, body: string) {
  await supabase.from("messages").update({ body, edited_at: new Date().toISOString() }).eq("id", id);
}

export async function updateMembership(
  conversationId: string,
  userId: string,
  patch: Partial<Pick<MemberRow, "pinned" | "archived" | "muted_until" | "nickname">>,
) {
  await supabase
    .from("conversation_members")
    .update(patch)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function leaveConversation(conversationId: string, userId: string) {
  await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export function previewText(kind: string | null, body: string | null): string {
  if (kind === "image") return "📷 Photo";
  if (kind === "post") return "🍽️ Plat partagé";
  return body ?? "Nouvelle conversation";
}

export function chatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yest.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
