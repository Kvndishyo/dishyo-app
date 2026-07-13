import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Bell, ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

const KEY = "dishyo:onboarded:v1";

const SLIDES = [
  {
    icon: Clock,
    title: "Éphémère par nature",
    text: "Publie ton plat, il disparaît après 24h, 48h ou 72h. Comme un vrai bon moment.",
    accent: "from-orange-500 to-rose-500",
  },
  {
    icon: MapPin,
    title: "Autour de toi",
    text: "Découvre les plats et restaurateurs proches grâce à la géolocalisation.",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: Bell,
    title: "Ne rate rien",
    text: "Active les notifications pour être prévenu quand tes favoris publient.",
    accent: "from-indigo-500 to-fuchsia-500",
  },
] as const;

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  function next() {
    if (step < SLIDES.length - 1) setStep((s) => s + 1);
    else finish();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col bg-background"
        >
          <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <Logo size={36} />
            <button
              onClick={finish}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Passer
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-8">
            <AnimatePresence mode="wait">
              {SLIDES.map((s, i) =>
                i === step ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br ${s.accent} shadow-xl`}
                    >
                      <s.icon className="h-14 w-14 text-white" strokeWidth={1.8} />
                    </div>
                    <h2
                      className="text-3xl font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {s.title}
                    </h2>
                    <p className="mt-4 max-w-sm text-base text-muted-foreground">
                      {s.text}
                    </p>
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-6 px-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step ? "w-8 bg-primary" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg transition active:scale-[0.98]"
            >
              {step === SLIDES.length - 1 ? "Commencer" : "Suivant"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
