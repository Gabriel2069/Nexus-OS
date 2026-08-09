create table if not exists public.financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  monthly_allowance numeric(12,2) not null default 0,
  saved_money numeric(12,2) not null default 0,
  spending_plan numeric(12,2) not null default 0,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,snapshot_date)
);

create index if not exists financial_snapshots_user_date_idx
  on public.financial_snapshots(user_id,snapshot_date desc);

alter table public.financial_snapshots enable row level security;
grant select, insert, update, delete on public.financial_snapshots to authenticated;

create policy financial_snapshots_owner_select on public.financial_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy financial_snapshots_owner_insert on public.financial_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy financial_snapshots_owner_update on public.financial_snapshots
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy financial_snapshots_owner_delete on public.financial_snapshots
  for delete to authenticated using ((select auth.uid()) = user_id);
