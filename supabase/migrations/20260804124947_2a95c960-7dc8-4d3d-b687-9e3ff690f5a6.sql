REVOKE EXECUTE ON FUNCTION public.verify_my_age(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_my_age(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_my_age(date) TO authenticated;