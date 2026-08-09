create table if not exists public.personal_finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('income','expense')),
  category text not null default 'Pessoal',
  amount numeric(12,2) not null check (amount >= 0),
  entry_date date not null default current_date,
  status text not null default 'realized' check (status in ('planned','realized')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_finance_entries_user_date_idx on public.personal_finance_entries(user_id, entry_date desc);
alter table public.personal_finance_entries enable row level security;
drop policy if exists personal_finance_entries_own on public.personal_finance_entries;
create policy personal_finance_entries_own on public.personal_finance_entries for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant select,insert,update,delete on public.personal_finance_entries to authenticated;
