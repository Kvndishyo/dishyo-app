import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, PenSquare, Pin, PinOff, BellOff, Bell, Archive, ArchiveRestore,
  MoreHorizontal, Users, X, Check, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations, previewText, chatTime, updateMembership, startDirect, createGroup,
  type ConversationRow,
} from "@/lib/chat";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Dishyo — Mes messages" },
      { name: "description", content: "Toutes tes discussions Dishyo : partage de plats, photos et messages éphémères." },
      { property: "og:title", content: "Dishyo — Mes messages" },
      { property: "og:description", content: "Toutes tes discussions Dishyo : partage de plats, photos et messages éphémères." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

type MiniProfile = { id: string; handle: string; display_name: string; avatar_url: string | null };

function avatarOf(p: { avatar_url?: string | null; handle?: string | null }) {
  return p.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p.handle ?? "dishyo"}`;
}

function MessagesPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [menu, setMenu] = useState<ConversationRow | null>(null);
  const [composer, setComposer] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", uid],
    queryFn: listConversations,
    enabled: !!uid,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations", uid] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, qc]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return conversations
      .filter((c) => !!c.archived === showArchived)
      .filter((c) => {
        if (!term) return true;
        const name = c.is_group ? c.title ?? "Groupe" : c.other_display_name ?? "";
        return (
          name.toLowerCase().includes(term) ||
          (c.other_handle ?? "").toLowerCase().includes(term) ||
          (c.last_message_body ?? "").toLowerCase().includes(term)
        );
      });
  }, [conversations, q, showArchived]);

  const archivedCount = conversations.filter((c) => c.archived).length;

  async function patch(c: ConversationRow, p: Parameters<typeof updateMembership>[2]) {
    if (!uid) return;
    await updateMembership(c.id, uid, p);
    qc.invalidateQueries({ queryKey: ["conversations", uid] });
    setMenu(null);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Messages</h1>
          <button
            onClick={() => setComposer(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"
            aria-label="Nouvelle discussion"
          >
            <PenSquare className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une discussion"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="mt-2 text-xs font-medium text-primary"
          >
            {showArchived ? "← Retour aux discussions" : `Archivées (${archivedCount})`}
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-8 py-20 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-semibold">Aucune discussion</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lance une conversation et partage tes plats préférés.
          </p>
          <button
            onClick={() => setComposer(true)}
            className="mt-5 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Nouvelle discussion
          </button>
        </div>
      ) : (
        <ul className="px-2 py-2">
          {filtered.map((c) => {
            const name = c.is_group ? c.title ?? "Groupe" : c.other_display_name ?? "Utilisateur";
            const muted = c.muted_until && new Date(c.muted_until) > new Date();
            return (
              <li key={c.id} className="relative">
                <Link
                  to="/messages/$id"
                  params={{ id: c.id }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-muted"
                >
                  <div className="relative">
                    {c.is_group ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <img
                        src={avatarOf({ avatar_url: c.other_avatar_url, handle: c.other_handle })}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    )}
                    {c.unread_count > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {c.unread_count > 99 ? "99+" : c.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {c.pinned && <Pin className="h-3 w-3 text-primary" />}
                      <span className={`truncate ${c.unread_count > 0 ? "font-bold" : "font-semibold"}`}>{name}</span>
                      {muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div
                      className={`truncate text-sm ${c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {c.last_message_sender === uid ? "Toi : " : ""}
                      {previewText(c.last_message_kind, c.last_message_body)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[11px] text-muted-foreground">{chatTime(c.last_message_at)}</span>
                  </div>
                </Link>
                <button
                  onClick={() => setMenu(c)}
                  aria-label="Options de la discussion"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 hover:bg-accent focus:opacity-100 group-hover:opacity-100 md:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AnimatePresence>
        {menu && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenu(null)}
              className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[520px] rounded-t-3xl bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-muted" />
              <SheetBtn
                icon={menu.pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                label={menu.pinned ? "Désépingler" : "Épingler en haut"}
                onClick={() => patch(menu, { pinned: !menu.pinned })}
              />
              <SheetBtn
                icon={menu.muted_until ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                label={menu.muted_until ? "Réactiver les alertes" : "Mettre en sourdine 8 h"}
                onClick={() =>
                  patch(menu, {
                    muted_until: menu.muted_until ? null : new Date(Date.now() + 8 * 3600_000).toISOString(),
                  })
                }
              />
              <SheetBtn
                icon={menu.archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                label={menu.archived ? "Désarchiver" : "Archiver"}
                onClick={() => patch(menu, { archived: !menu.archived })}
              />
              <SheetBtn icon={<X className="h-5 w-5" />} label="Annuler" onClick={() => setMenu(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {composer && (
        <NewConversationSheet
          onClose={() => setComposer(false)}
          onCreated={(id) => {
            setComposer(false);
            qc.invalidateQueries({ queryKey: ["conversations", uid] });
            navigate({ to: "/messages/$id", params: { id } });
          }}
        />
      )}
    </div>
  );
}

function SheetBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:bg-muted">
      {icon} {label}
    </button>
  );
}

function NewConversationSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState(false);
  const [selected, setSelected] = useState<MiniProfile[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["chat-people", q],
    staleTime: 20_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("search_users", { q });
      return ((data as unknown as MiniProfile[] | null) ?? []).slice(0, 20);
    },
  });

  async function go(p: MiniProfile) {
    if (group) {
      setSelected((s) => (s.find((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p]));
      return;
    }
    setBusy(true);
    try {
      onCreated(await startDirect(p.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ouvrir la discussion");
    } finally {
      setBusy(false);
    }
  }

  async function makeGroup() {
    if (selected.length < 2) return toast.error("Choisis au moins 2 personnes");
    setBusy(true);
    try {
      onCreated(await createGroup(title || "Groupe gourmand", selected.map((s) => s.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{group ? "Nouveau groupe" : "Nouvelle discussion"}</h3>
          <button onClick={() => setGroup((v) => !v)} className="text-xs font-semibold text-primary">
            {group ? "Discussion à deux" : "Créer un groupe"}
          </button>
        </div>

        {group && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nom du groupe"
            className="mt-3 w-full rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none"
          />
        )}

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, pseudo ou email"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {group && selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((s) => (
              <span key={s.id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {s.display_name}
              </span>
            ))}
          </div>
        )}

        <ul className="mt-3 space-y-1">
          {people.map((p) => {
            const on = !!selected.find((x) => x.id === p.id);
            return (
              <li key={p.id}>
                <button
                  disabled={busy}
                  onClick={() => go(p)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-muted disabled:opacity-50"
                >
                  <img src={avatarOf(p)} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <span className="flex-1 truncate font-medium">{p.display_name}</span>
                  {group && (
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {group && (
          <button
            onClick={makeGroup}
            disabled={busy}
            className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Créer le groupe
          </button>
        )}
      </div>
    </div>
  );
}
