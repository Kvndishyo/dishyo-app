import { createServerFn } from "@tanstack/react-start";

type ReverseResult = { place_name: string | null };

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input: { lat: number; lng: number }) => {
    if (typeof input?.lat !== "number" || typeof input?.lng !== "number") {
      throw new Error("lat/lng required");
    }
    return input;
  })
  .handler(async ({ data }): Promise<ReverseResult> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}&zoom=14&addressdetails=1`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Dishyo/1.0 (contact@dishyo.app)", "Accept-Language": "fr" },
      });
      if (!r.ok) return { place_name: null };
      const j: any = await r.json();
      const a = j?.address ?? {};
      const name = [a.suburb || a.neighbourhood, a.city || a.town || a.village, a.country]
        .filter(Boolean).join(", ");
      return { place_name: name || j?.display_name || null };
    } catch {
      return { place_name: null };
    }
  });
