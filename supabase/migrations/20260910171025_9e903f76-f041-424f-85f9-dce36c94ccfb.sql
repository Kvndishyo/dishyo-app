REVOKE ALL ON FUNCTION public.start_trial(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_my_subscription(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_plan(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_restaurateur_flag() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_trial(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_subscription(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_plan(uuid, text) TO authenticated;