
revoke all on function public.owns_merchant(uuid) from public, anon, authenticated;
revoke all on function public.owns_customer(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_merchant_user() from public, anon, authenticated;
revoke all on function public.claim_demo_merchant() from public, anon;
grant execute on function public.claim_demo_merchant() to authenticated;
