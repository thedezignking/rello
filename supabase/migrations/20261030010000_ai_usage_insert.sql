-- The tailoring routes log each AI call as the signed-in user, which is what
-- the daily cap counts. Users may add rows for themselves only; they can't
-- edit or delete them, so the count can't be reset from the client.
create policy "log own usage" on public.ai_usage
  for insert with check (user_id = (select auth.uid()));
