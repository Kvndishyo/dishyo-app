import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";

const KEY = "dishyo_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  function accept(level: "essential" | "all") {
    try { localStorage.setItem(KEY, level); } catch {}
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <p className="text-sm font-semibold">🍪 Cookies</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dishyo utilise uniquement des cookies essentiels (session, préférences).
            Voir notre{" "}
            <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => accept("essential")}
              className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              Accepter
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
