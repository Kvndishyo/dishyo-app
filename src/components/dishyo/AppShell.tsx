import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Search, PlusCircle, User } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

const TABS = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/recherche", label: "Recherche", icon: Search },
  { to: "/publier", label: "Publier", icon: PlusCircle },
  { to: "/compte", label: "Compte", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

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

      <motion.main
        drag={onTab ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipe}
        className="flex-1 pb-24"
      >
        {children}
      </motion.main>


      {onTab && (
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur-xl">
          <ul className="grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
            {TABS.map((t) => {
              const active = location.pathname === t.to;
              const Icon = t.icon;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className="relative flex flex-col items-center gap-1 py-2 text-xs"
                  >
                    <Icon
                      className={`h-6 w-6 transition-colors ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                      strokeWidth={active ? 2.4 : 1.8}
                    />
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
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
