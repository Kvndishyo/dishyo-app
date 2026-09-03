import { useEffect, useState } from "react";
import { Download, Share, X, PlusSquare } from "lucide-react";
import { canPromptInstall, detectPlatform, isInIframe, isStandalone, promptInstall } from "@/lib/install";

const DISMISS_KEY = "dishyo_install_dismissed";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("unknown");

  useEffect(() => {
    if (isInIframe() || isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const p = detectPlatform();
    setPlatform(p);
    if (p === "ios") {
      setVisible(true);
      return;
    }
    if (canPromptInstall()) setVisible(true);
    const onInstallable = () => setVisible(true);
    window.addEventListener("dishyo:installable", onInstallable);
    return () => window.removeEventListener("dishyo:installable", onInstallable);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-24 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold">Installer Dishyo</div>
          <div className="text-xs text-muted-foreground">
            {platform === "ios"
              ? "Nécessaire sur iPhone pour recevoir les notifications."
              : "Icône sur l'écran d'accueil et vraies notifications."}
          </div>
        </div>
        <button
          onClick={async () => {
            if (platform === "ios") return setShowIosHelp(true);
            const res = await promptInstall();
            if (res !== "unavailable") dismiss();
          }}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          Installer
        </button>
        <button onClick={dismiss} aria-label="Fermer" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {showIosHelp && <IosInstallHelp onClose={() => setShowIosHelp(false)} />}
    </>
  );
}

export function IosInstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-card p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Ajouter Dishyo à l'écran d'accueil</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sur iPhone, Apple n'autorise les notifications que pour les apps installées depuis Safari.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">1</span>
            <span className="flex flex-1 items-center gap-2">
              Ouvre Dishyo dans <b>Safari</b>, puis touche <Share className="inline h-4 w-4" /> Partager
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">2</span>
            <span className="flex flex-1 items-center gap-2">
              Choisis <PlusSquare className="inline h-4 w-4" /> <b>Sur l'écran d'accueil</b>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">3</span>
            <span className="flex-1">
              Ouvre Dishyo depuis l'icône, puis active les notifications dans <b>Mon compte</b>.
            </span>
          </li>
        </ol>
        <button onClick={onClose} className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
          J'ai compris
        </button>
      </div>
    </div>
  );
}
