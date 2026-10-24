import { reverseGeocode as reverseGeocodeFn } from "./geocoding.functions";

export type Pos = { lat: number; lng: number };

const POS_KEY = "dishyo.geo.v1";
const ASKED_KEY = "dishyo.geo.asked.v1";
// Une position de moins de 6 h est réutilisée sans jamais réinterroger le navigateur.
const FRESH_MS = 6 * 60 * 60 * 1000;
// Au-delà, elle reste utilisable (pubs locales, carte) pendant 7 jours.
const VALID_MS = 7 * 24 * 60 * 60 * 1000;

function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPos(maxAgeMs: number): Pos | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(POS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { lat?: number; lng?: number; at?: number };
    if (typeof v?.lat !== "number" || typeof v?.lng !== "number") return null;
    if (Date.now() - (v.at ?? 0) > maxAgeMs) return null;
    return { lat: v.lat, lng: v.lng };
  } catch {
    return null;
  }
}

function writePos(p: Pos) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(POS_KEY, JSON.stringify({ lat: p.lat, lng: p.lng, at: Date.now() }));
  } catch {
    /* stockage indisponible : on s'en passe */
  }
}

function hasBeenAsked(): boolean {
  const s = store();
  if (!s) return false;
  try {
    return s.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAsked() {
  const s = store();
  if (!s) return;
  try {
    s.setItem(ASKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function askBrowser(): Promise<Pos> {
  return new Promise((res, rej) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return rej(new Error("Géolocalisation indisponible"));
    }
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => rej(new Error(e.message || "Position refusée")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** Dernière position enregistrée (valable 7 jours), sans rien demander au navigateur. */
export function getCachedPosition(): Pos | null {
  return readPos(VALID_MS);
}

/**
 * Demande faite par l'utilisateur (bouton « Ajouter ma position », recentrage).
 * Réutilise la dernière position si elle a moins de 6 h, sinon interroge le navigateur.
 * `force: true` (clic explicite) repart toujours chercher une position fraîche.
 */
export async function getCurrentPosition(opts: { force?: boolean } = {}): Promise<Pos> {
  if (!opts.force) {
    const cached = readPos(FRESH_MS);
    if (cached) return cached;
  }
  const pos = await askBrowser();
  writePos(pos);
  markAsked();
  return pos;
}

/**
 * Usage automatique (flux d'accueil, ouverture de la carte) : le navigateur n'est
 * sollicité qu'une seule fois, la toute première fois. Ensuite on prend la position
 * enregistrée, et on ne relance plus jamais la demande.
 */
export async function getStoredPosition(): Promise<Pos | null> {
  const cached = readPos(VALID_MS);
  if (cached) return cached;
  if (hasBeenAsked()) return null;
  markAsked();
  try {
    const pos = await askBrowser();
    writePos(pos);
    return pos;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await reverseGeocodeFn({ data: { lat, lng } });
    return (r as any).place_name ?? null;
  } catch {
    return null;
  }
}
