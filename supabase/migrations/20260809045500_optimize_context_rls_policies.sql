drop policy if exists calendar_commitments_own on public.calendar_commitments;
create policy calendar_commitments_own on public.calendar_commitments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists personal_finance_entries_own on public.personal_finance_entries;
create policy personal_finance_entries_own on public.personal_finance_entries
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
