create table if not exists public.calendar_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  title text not null,
  category text not null default 'other',
  note text,
  weekdays smallint[] not null default '{}',
  start_time time,
  end_time time,
  starts_at timestamptz,
  ends_at timestamptz,
  active_from date,
  active_until date,
  is_fixed boolean not null default true,
  is_optional boolean not null default false,
  source text not null default 'google_calendar',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id),
  check ((starts_at is not null and ends_at is not null) or (cardinality(weekdays) > 0 and start_time is not null and end_time is not null))
);

create index if not exists calendar_commitments_user_time_idx on public.calendar_commitments(user_id, starts_at);
create index if not exists calendar_commitments_user_active_idx on public.calendar_commitments(user_id, active_from, active_until);

alter table public.calendar_commitments enable row level security;

drop policy if exists calendar_commitments_own on public.calendar_commitments;
create policy calendar_commitments_own on public.calendar_commitments
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.calendar_commitments to authenticated;
