import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listConversations, sendMessage, previewText, type ConversationRow } from "@/lib/chat";

/** Bottom sheet to send a dish into one or several conversations. */
export function ShareToChatSheet({
  open,
  onClose,
  postId,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
}) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [sent, setSent] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", uid],
    queryFn: listConversations,
    enabled: !!uid && open,
    staleTime: 10_000,
  });

  async function share(c: ConversationRow) {
    if (!uid || sent.includes(c.id)) return;
    try {
      await sendMessage({ conversationId: c.id, senderId: uid, kind: "post", postId });
      if (note.trim()) {
        await sendMessage({ conversationId: c.id, senderId: uid, body: note.trim() });
      }
      setSent((s) => [...s, c.id]);
      toast.success("Plat envoyé 🍽️");
    } catch {
      toast.error("Envoi impossible");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[75vh] overflow-y-auto rounded-t-3xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card"
          >
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Envoyer en message</h2>
              <button onClick={onClose} aria-label="Fermer">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter un mot (optionnel)"
              className="mb-3 w-full rounded-2xl bg-muted px-4 py-2 text-sm outline-none"
            />

            {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
            {!isLoading && conversations.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune discussion pour l'instant. Ouvre l'onglet Messages pour en démarrer une.
              </p>
            )}

            <ul className="space-y-1">
              {conversations.map((c) => {
                const name = c.is_group ? c.title ?? "Groupe" : c.other_display_name ?? c.other_handle ?? "Discussion";
                const done = sent.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => share(c)}
                      disabled={done}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-muted disabled:opacity-60"
                    >
                      <img
                        src={
                          c.other_avatar_url ??
                          c.photo_url ??
                          `https://api.dicebear.com/7.x/initials/svg?seed=${c.other_handle ?? name}`
                        }
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {previewText(c.last_message_kind, c.last_message_body)}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {done ? "Envoyé" : <Send className="h-4 w-4" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
