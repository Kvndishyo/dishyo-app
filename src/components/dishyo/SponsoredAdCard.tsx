import { MapPin, ExternalLink } from "lucide-react";

export type SponsoredAd = {
  id: string;
  restaurant_name: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  distance_km: number;
};

export function SponsoredAdCard({ ad }: { ad: SponsoredAd }) {
  const content = (
    <article className="mx-4 my-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-primary">
            Sponsorisé
          </span>
          <span className="text-muted-foreground">· {ad.distance_km.toFixed(1)} km</span>
        </div>
        {ad.link_url && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
      </div>
      {ad.photo_url && (
        <img
          src={ad.photo_url}
          alt={ad.title}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      )}
      <div className="space-y-1.5 px-4 py-3">
        <h3 className="text-base font-semibold leading-tight">{ad.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {ad.restaurant_name}
        </p>
        {ad.description && (
          <p className="pt-1 text-sm text-muted-foreground">{ad.description}</p>
        )}
        {ad.link_url && (
          <div className="pt-2">
            <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              {ad.cta_label || "Découvrir"}
            </span>
          </div>
        )}
      </div>
    </article>
  );

  if (ad.link_url) {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener sponsored" className="block">
        {content}
      </a>
    );
  }
  return content;
}
