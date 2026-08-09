create table if not exists public.academic_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time,
  subject text not null,
  schedule_type text not null default 'class' check (schedule_type in ('class','support','study_block')),
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academic_schedule_user_slot_idx
  on public.academic_schedule(user_id,weekday,start_time,subject,schedule_type);
create index if not exists academic_schedule_user_weekday_idx
  on public.academic_schedule(user_id,weekday,start_time);

create table if not exists public.academic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  format text,
  stage text,
  status text not null default 'Planejado',
  starts_at timestamptz,
  event_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academic_events_user_title_date_idx
  on public.academic_events(user_id,title,coalesce(event_date,(starts_at at time zone 'America/Sao_Paulo')::date));
create index if not exists academic_events_user_time_idx
  on public.academic_events(user_id,starts_at,event_date);

alter table public.academic_schedule enable row level security;
alter table public.academic_events enable row level security;

grant select, insert, update, delete on public.academic_schedule to authenticated;
grant select, insert, update, delete on public.academic_events to authenticated;

create policy academic_schedule_owner_select on public.academic_schedule
  for select to authenticated using ((select auth.uid()) = user_id);
create policy academic_schedule_owner_insert on public.academic_schedule
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy academic_schedule_owner_update on public.academic_schedule
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy academic_schedule_owner_delete on public.academic_schedule
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy academic_events_owner_select on public.academic_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy academic_events_owner_insert on public.academic_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy academic_events_owner_update on public.academic_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy academic_events_owner_delete on public.academic_events
  for delete to authenticated using ((select auth.uid()) = user_id);
