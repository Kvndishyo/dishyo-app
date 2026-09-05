import { useEffect, useState } from "react";
import { signedChatUrl } from "@/lib/chat";

export function ChatImage({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedChatUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) return <div className={`animate-pulse rounded-2xl bg-muted ${className ?? "h-48 w-48"}`} />;
  return <img src={url} alt="Photo partagée" className={className} loading="lazy" />;
}
