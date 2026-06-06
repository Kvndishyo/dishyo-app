
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.sponsored_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  link_url TEXT,
  cta_label TEXT DEFAULT 'Découvrir',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsored_ads TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsored_ads TO authenticated;
GRANT ALL ON public.sponsored_ads TO service_role;

ALTER TABLE public.sponsored_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ads"
  ON public.sponsored_ads FOR SELECT
  USING (active = true AND (ends_at IS NULL OR ends_at > now()) AND starts_at <= now());

CREATE POLICY "Admins can manage ads"
  ON public.sponsored_ads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sponsored_ads_updated_at
  BEFORE UPDATE ON public.sponsored_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.nearby_ads(_lat double precision, _lng double precision)
RETURNS TABLE(
  id uuid, restaurant_name text, title text, description text, photo_url text,
  link_url text, cta_label text, lat double precision, lng double precision,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.restaurant_name, a.title, a.description, a.photo_url,
         a.link_url, a.cta_label, a.lat, a.lng,
         (6371 * acos(
            cos(radians(_lat)) * cos(radians(a.lat)) *
            cos(radians(a.lng) - radians(_lng)) +
            sin(radians(_lat)) * sin(radians(a.lat))
         )) AS distance_km
  FROM public.sponsored_ads a
  WHERE a.active = true
    AND a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
    AND (6371 * acos(
            cos(radians(_lat)) * cos(radians(a.lat)) *
            cos(radians(a.lng) - radians(_lng)) +
            sin(radians(_lat)) * sin(radians(a.lat))
         )) <= a.radius_km
  ORDER BY distance_km ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_ads(double precision, double precision) TO anon, authenticated;
