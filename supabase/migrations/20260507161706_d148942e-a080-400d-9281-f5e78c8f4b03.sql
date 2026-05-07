
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS place_name text;

CREATE INDEX IF NOT EXISTS posts_geo_idx ON public.posts (lat, lng) WHERE lat IS NOT NULL;

CREATE OR REPLACE FUNCTION public.nearby_posts(_lat double precision, _lng double precision, _radius_km double precision)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  photo_url text,
  restaurant text,
  category text,
  lat double precision,
  lng double precision,
  place_name text,
  created_at timestamptz,
  expires_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.title, p.photo_url, p.restaurant, p.category,
         p.lat, p.lng, p.place_name, p.created_at, p.expires_at,
         (6371 * acos(
            cos(radians(_lat)) * cos(radians(p.lat)) *
            cos(radians(p.lng) - radians(_lng)) +
            sin(radians(_lat)) * sin(radians(p.lat))
         )) AS distance_km
  FROM public.posts p
  WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
    AND p.expires_at > now()
    AND p.hidden = false
    AND NOT public.is_blocked_between(auth.uid(), p.user_id)
    AND (6371 * acos(
            cos(radians(_lat)) * cos(radians(p.lat)) *
            cos(radians(p.lng) - radians(_lng)) +
            sin(radians(_lat)) * sin(radians(p.lat))
         )) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT 200;
$$;
