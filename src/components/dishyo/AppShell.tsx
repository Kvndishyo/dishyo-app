import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, MessageCircle, User } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";
import { Onboarding } from "./Onboarding";
import { AgeGate } from "./AgeGate";
import { Logo } from "./Logo";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const TABS = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/recherche", label: "Recherche", icon: Search },
  { to: "/publier", label: "Publier", icon: null },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/compte", label: "Compte", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { total: unread } = useUnreadMessages();

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1300);
    return () => clearTimeout(t);
  }, []);

  const currentIndex = TABS.findIndex((t) => t.to === location.pathname);
  const onTab = currentIndex !== -1;

  function handleSwipe(_: unknown, info: PanInfo) {
    if (!onTab) return;
    const threshold = 80;
    if (info.offset.x < -threshold && currentIndex < TABS.length - 1) {
      navigate({ to: TABS[currentIndex + 1].to });
    } else if (info.offset.x > threshold && currentIndex > 0) {
      navigate({ to: TABS[currentIndex - 1].to });
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-background">
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      {!showSplash && <Onboarding />}
      {!showSplash && <AgeGate />}

      <motion.main
        drag={onTab ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipe}
        className="flex-1 pb-24"
      >
        {children}
      </motion.main>


      {!/^\/(auth|reset-password)/.test(location.pathname) && (
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur-xl">
          <ul className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
            {TABS.map((t) => {
              const active = t.to === "/" ? location.pathname === "/" : location.pathname.startsWith(t.to);
              const Icon = t.icon;
              const isPrimary = t.to === "/publier";
              return (
                <li key={t.to} className="flex items-center justify-center">
                  {isPrimary ? (
                    <Link to={t.to} className="relative flex flex-col items-center gap-0.5">
                      <motion.span
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.05 }}
                        className={`relative -mt-5 flex items-center justify-center rounded-full p-[3px] shadow-lg transition-all ${
                          active
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "ring-1 ring-border"
                        }`}
                        style={{
                          boxShadow: active
                            ? "0 8px 24px -4px var(--color-primary, #f97316)"
                            : "0 6px 16px -6px rgba(0,0,0,0.35)",
                        }}
                      >
                        <Logo size={54} className="rounded-full" />
                      </motion.span>
                      <span
                        className={`mt-0.5 text-[11px] font-semibold transition-colors ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {t.label}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      to={t.to}
                      className="relative flex flex-col items-center gap-1 py-2 text-xs"
                    >
                      {Icon && (
                        <Icon
                          className={`h-6 w-6 transition-colors ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                          strokeWidth={active ? 2.4 : 1.8}
                        />
                      )}
                      {t.to === "/messages" && unread > 0 && (
                        <span className="absolute right-3 top-0 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                      <span
                        className={`text-[11px] transition-colors ${
                          active ? "font-semibold text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {t.label}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="tab-indicator"
                          className="absolute -top-2 h-1 w-8 rounded-full bg-primary"
                        />
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
