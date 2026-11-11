grant insert, update on public.trader_profiles to authenticated;

create policy "Create own trader profile" on public.trader_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Update own trader profile" on public.trader_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
