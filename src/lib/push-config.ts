// Public VAPID key — safe to ship to clients (publishable counterpart of VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC_KEY =
  "BMdsQkxNmnSgqRbii8c1EYwyz5YpM40SSe4yEt3f0s-MH_eLHIEJXydzPxnwludgCxZts-BpWezmxP9Rx9LTkeY";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
