import { useEffect, useRef, useState } from "react";
import { suggestProfiles, suggestHashtags, type DbProfile } from "@/lib/dishyo-db";

type Suggestion =
  | { kind: "user"; profile: DbProfile }
  | { kind: "tag"; tag: string; count: number };

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  maxLength?: number;
  /** When true, render <input> instead of <textarea>. */
  asInput?: boolean;
  onEnterSubmit?: () => void;
};

/** Detect the active @ or # token at the caret. */
function getActiveToken(text: string, caret: number): { type: "@" | "#"; query: string; start: number } | null {
  const left = text.slice(0, caret);
  const m = left.match(/(^|\s)([@#])([\p{L}0-9_]*)$/u);
  if (!m) return null;
  const start = caret - m[2].length - m[3].length;
  return { type: m[2] as "@" | "#", query: m[3], start };
}

export function MentionTextarea({
  value, onChange, placeholder, rows = 4, className = "", maxLength, asInput, onEnterSubmit,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState<ReturnType<typeof getActiveToken>>(null);

  useEffect(() => {
    let cancelled = false;
    if (!active) { setSuggestions([]); return; }
    (async () => {
      if (active.type === "@") {
        const profiles = await suggestProfiles(active.query, 6);
        if (!cancelled) setSuggestions(profiles.map((p) => ({ kind: "user", profile: p })));
      } else {
        const tags = await suggestHashtags(active.query, 6);
        if (!cancelled) setSuggestions(tags.map((t) => ({ kind: "tag", tag: t.tag, count: t.count })));
      }
    })();
    return () => { cancelled = true; };
  }, [active?.type, active?.query]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    const caret = e.target.selectionStart ?? v.length;
    setActive(getActiveToken(v, caret));
  }

  function pick(s: Suggestion) {
    if (!active) return;
    const insertion = s.kind === "user" ? `@${s.profile.handle} ` : `#${s.tag} `;
    const before = value.slice(0, active.start);
    const after = value.slice((ref.current?.selectionStart) ?? value.length);
    const next = before + insertion + after;
    onChange(next);
    setActive(null);
    setSuggestions([]);
    setTimeout(() => {
      const pos = (before + insertion).length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  const commonProps = {
    value,
    onChange: handleChange,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (asInput && e.key === "Enter" && onEnterSubmit) { e.preventDefault(); onEnterSubmit(); }
    },
    placeholder,
    maxLength,
    className,
  };

  return (
    <div className="relative">
      {asInput ? (
        <input ref={ref as React.Ref<HTMLInputElement>} {...commonProps} />
      ) : (
        <textarea ref={ref as React.Ref<HTMLTextAreaElement>} rows={rows} {...commonProps} />
      )}
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-card">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {s.kind === "user" ? (
                  <>
                    <img
                      src={s.profile.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${s.profile.handle}`}
                      className="h-7 w-7 rounded-full object-cover" alt=""
                    />
                    <span className="font-semibold">{s.profile.display_name}</span>
                    <span className="text-primary">@{s.profile.handle}</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary font-bold">#</span>
                    <span className="font-semibold text-primary">#{s.tag}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{s.count} plat{s.count > 1 ? "s" : ""}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Render text with @mentions and #hashtags highlighted. */
export function HighlightedText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (/^@[\p{L}0-9_]+/u.test(p)) return <span key={i} className="font-semibold text-primary">{p}</span>;
        if (/^#[\p{L}0-9_]+/u.test(p)) return <span key={i} className="font-medium text-[hsl(280_70%_55%)] dark:text-[hsl(280_80%_70%)]">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}
