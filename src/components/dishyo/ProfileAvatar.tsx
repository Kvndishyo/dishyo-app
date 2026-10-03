import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpiryRing } from "./ExpiryRing";

type AvatarProfile = {
  handle: string;
  display_name?: string;
  avatar_url: string | null;
  plus_active?: boolean;
  plus_frame?: string | null;
};

const FRAME_CLASSES: Record<string, string> = {
  gold: "profile-frame-gold",
  gradient: "profile-frame-gradient",
  glow: "profile-frame-glow",
};

export function ProfileAvatar({
  profile,
  size = "md",
  className,
  showBadge = true,
  expiresAt,
}: {
  profile: AvatarProfile;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showBadge?: boolean;
  expiresAt?: string;
}) {
  const sizeClass = { xs: "h-7 w-7", sm: "h-9 w-9", md: "h-12 w-12", lg: "h-24 w-24" }[size];
  const frameClass = profile.plus_active && profile.plus_frame ? FRAME_CLASSES[profile.plus_frame] : undefined;
  const hasFrame = Boolean(frameClass);
  const src = profile.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${profile.handle}`;
  const basePixels = size === "lg" ? 96 : size === "md" ? 48 : size === "sm" ? 36 : 28;

  return (
    <span className={cn("relative inline-flex shrink-0 rounded-full", sizeClass, frameClass, className)}>
      {expiresAt ? (
        <ExpiryRing expiresAt={expiresAt} size={hasFrame ? basePixels - 6 : basePixels}>
          <img src={src} alt={profile.display_name ?? ""} className="h-full w-full object-cover" />
        </ExpiryRing>
      ) : (
        <img src={src} alt={profile.display_name ?? ""} className="h-full w-full rounded-full object-cover" />
      )}
      {showBadge && profile.plus_active && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-soft" title="Membre Dishyo+">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      )}
    </span>
  );
}