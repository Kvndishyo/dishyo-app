import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Loader2, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition } from "@/lib/geo";
import { toast } from "sonner";

export const Route = createFileRoute("/carte")({
  head: () => ({ meta: [{ title: "Dishyo — Carte des plats" }, { name: "description", content: "Découvre les plats publiés autour de toi sur Dishyo." }] }),
  component: MapPage,
});

type Pin = {
  id: string; user_id: string; title: string; photo_url: string;
  lat: number; lng: number; place_name: string | null; distance_km: number;
};

const RADII = [5, 10, 25, 50] as const;

function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(10);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await getCurrentPosition();
        setPos(p);
      } catch {
        setPos({ lat: 48.8566, lng: 2.3522 });
        toast.message("Position non disponible — Paris par défaut");
      }
    })();
  }, []);

  // init map
  useEffect(() => {
    if (!pos || !containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [pos.lng, pos.lat],
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    new maplibregl.Marker({ color: "#3b82f6" })
      .setLngLat([pos.lng, pos.lat])
      .setPopup(new maplibregl.Popup().setText("Tu es ici"))
      .addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, [pos]);

  // load pins
  useEffect(() => {
    if (!pos) return;
    setLoading(true);
    supabase.rpc("nearby_posts" as any, { _lat: pos.lat, _lng: pos.lng, _radius_km: radius })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setPins(((data as any[]) ?? []) as Pin[]);
        setLoading(false);
      });
  }, [pos, radius]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    pins.forEach((p) => {
      const el = document.createElement("div");
      el.className = "h-10 w-10 rounded-full border-2 border-white shadow-lg overflow-hidden cursor-pointer";
      el.style.background = `url(${p.photo_url}) center/cover`;
      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
        `<div style="min-width:160px"><img src="${p.photo_url}" style="width:100%;height:90px;object-fit:cover;border-radius:8px"/><div style="margin-top:6px;font-weight:600;font-size:13px">${escapeHtml(p.title)}</div><div style="font-size:11px;color:#666">${p.distance_km.toFixed(1)} km</div><a href="/profil/${p.user_id}" style="font-size:12px;color:#3b82f6">Voir le profil</a></div>`,
      );
      const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins]);

  async function recenter() {
    try {
      const p = await getCurrentPosition();
      setPos(p);
      mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 13 });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Carte des plats</h1>
          {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {RADII.map((r) => (
            <button key={r} onClick={() => setRadius(r)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${radius === r ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-foreground hover:bg-accent"}`}>
              {r} km
            </button>
          ))}
          <button onClick={recenter} className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-accent">
            <Crosshair className="h-3 w-3" /> Recentrer
          </button>
        </div>
      </header>

      <div ref={containerRef} className="h-[calc(100vh-180px)] w-full" />

      <div className="px-3 pb-24 pt-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {pins.length} plat{pins.length > 1 ? "s" : ""} dans un rayon de {radius} km
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {pins.map((p) => (
            <div key={p.id} className="block w-36 shrink-0 overflow-hidden rounded-2xl bg-card shadow-card">
              <img src={p.photo_url} alt={p.title} className="h-28 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs font-semibold">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.distance_km.toFixed(1)} km</p>
              </div>
            </div>
          ))}
          {pins.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">Aucun plat actif autour de toi pour ce rayon.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
