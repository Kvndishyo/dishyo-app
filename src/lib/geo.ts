import { reverseGeocode as reverseGeocodeFn } from "./geocoding.functions";

export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("Géolocalisation indisponible"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => rej(new Error(e.message || "Position refusée")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await reverseGeocodeFn({ data: { lat, lng } });
    return (r as any).place_name ?? null;
  } catch {
    return null;
  }
}
