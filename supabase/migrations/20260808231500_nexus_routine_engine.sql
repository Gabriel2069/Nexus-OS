-- Nexus OS · routine engine, analytics and transactional gamification

alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists daily_xp_goal integer not null default 300 check (daily_xp_goal >= 0);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null default current_date,
  energy smallint check (energy between 1 and 10),
  focus smallint check (focus between 1 and 10),
  stress smallint check (stress between 1 and 10),
  sleep_quality smallint check (sleep_quality between 1 and 10),
  sleep_hours numeric(4,2) check (sleep_hours is null or sleep_hours between 0 and 24),
  mood text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  label text,
  planned_minutes integer not null default 25 check (planned_minutes between 1 and 360),
  actual_minutes integer check (actual_minutes is null or actual_minutes between 0 and 720),
  distraction_count integer not null default 0 check (distraction_count >= 0),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  description text,
  icon text,
  period text not null default 'anytime' check (period in ('morning','afternoon','evening','anytime')),
  days_of_week smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 360),
  xp_reward integer not null default 10 check (xp_reward >= 0),
  is_optional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_item_id uuid not null references public.routine_items(id) on delete cascade,
  completion_date date not null default current_date,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (routine_item_id, completion_date)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  score smallint check (score between 1 and 10),
  wins text[] not null default '{}',
  friction text[] not null default '{}',
  adjustments text[] not null default '{}',
  next_week_focus text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  source_type text,
  source_id uuid,
  label text,
  xp_delta integer not null default 0,
  coins_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','delivered','dismissed','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index daily_checkins_user_date_idx on public.daily_checkins(user_id, checkin_date desc);
create index focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index focus_sessions_mission_id_idx on public.focus_sessions(mission_id);
create index routines_user_active_idx on public.routines(user_id, is_active, sort_order);
create index routines_area_id_idx on public.routines(area_id);
create index routine_items_routine_id_idx on public.routine_items(routine_id, sort_order);
create index routine_items_user_id_idx on public.routine_items(user_id);
create index routine_completions_user_date_idx on public.routine_completions(user_id, completion_date desc);
create index routine_completions_item_id_idx on public.routine_completions(routine_item_id);
create index weekly_reviews_user_week_idx on public.weekly_reviews(user_id, week_start desc);
create index activity_events_user_created_idx on public.activity_events(user_id, created_at desc);
create index reminders_user_due_idx on public.reminders(user_id, remind_at) where status = 'scheduled';
create index reminders_mission_id_idx on public.reminders(mission_id);
create unique index activity_events_mission_completion_unique
  on public.activity_events(user_id, event_type, source_id)
  where event_type = 'mission.completed' and source_id is not null;

alter table public.daily_checkins enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.routine_completions enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.activity_events enable row level security;
alter table public.reminders enable row level security;

grant select, insert, update, delete on table
  public.daily_checkins,
  public.focus_sessions,
  public.routines,
  public.routine_items,
  public.routine_completions,
  public.weekly_reviews,
  public.activity_events,
  public.reminders
  to authenticated;

create policy "daily_checkins_own" on public.daily_checkins for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "focus_sessions_own" on public.focus_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "routines_own" on public.routines for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "routine_items_own" on public.routine_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "routine_completions_own" on public.routine_completions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_reviews_own" on public.weekly_reviews for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activity_events_own" on public.activity_events for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reminders_own" on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.nexus_keepalive()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object('ok', true, 'database_time', now());
$$;
revoke all on function public.nexus_keepalive() from public;
grant execute on function public.nexus_keepalive() to anon, authenticated;

create or replace function public.complete_mission(p_mission_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_mission public.missions%rowtype;
  v_xp integer;
  v_coins integer;
  v_profile public.profiles%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_mission
  from public.missions
  where id = p_mission_id and user_id = v_user
  for update;

  if not found then raise exception 'Mission not found'; end if;

  if v_mission.status = 'Feita' then
    select * into v_profile from public.profiles where id = v_user;
    return jsonb_build_object('ok', true,'already_completed', true,'xp_awarded', 0,'coins_awarded', 0,'profile_xp', coalesce(v_profile.xp_total, 0),'profile_coins', coalesce(v_profile.nexus_coins, 0),'level', coalesce(v_profile.level, 1));
  end if;

  v_xp := greatest(0, coalesce(v_mission.xp_base, 0) + coalesce(v_mission.xp_bonus, 0));
  v_coins := greatest(0, coalesce(v_mission.coins_base, 0));

  update public.missions set status = 'Feita', completed_at = now(), updated_at = now() where id = v_mission.id and user_id = v_user;

  update public.profiles
  set xp_total = xp_total + v_xp,
      nexus_coins = nexus_coins + v_coins,
      level = floor((xp_total + v_xp) / 500.0)::integer + 1,
      updated_at = now()
  where id = v_user returning * into v_profile;

  if v_mission.attribute_id is not null then
    update public.attributes set xp = xp + v_xp, level = floor((xp + v_xp) / 400.0)::integer + 1, updated_at = now() where id = v_mission.attribute_id and user_id = v_user;
  end if;

  if v_mission.project_id is not null then
    update public.projects set xp = xp + v_xp, level = floor((xp + v_xp) / 1000.0)::integer + 1, updated_at = now() where id = v_mission.project_id and user_id = v_user;
  end if;

  if v_mission.journey_id is not null then
    update public.journeys set xp_earned = xp_earned + v_xp, coins_earned = coins_earned + v_coins, updated_at = now() where id = v_mission.journey_id and user_id = v_user;
  else
    update public.journeys set xp_earned = xp_earned + v_xp, coins_earned = coins_earned + v_coins, updated_at = now() where user_id = v_user and journey_date = current_date;
  end if;

  insert into public.activity_events(user_id, event_type, source_type, source_id, label, xp_delta, coins_delta)
  values (v_user, 'mission.completed', 'mission', v_mission.id, v_mission.title, v_xp, v_coins)
  on conflict do nothing;

  return jsonb_build_object('ok', true,'already_completed', false,'xp_awarded', v_xp,'coins_awarded', v_coins,'profile_xp', coalesce(v_profile.xp_total, 0),'profile_coins', coalesce(v_profile.nexus_coins, 0),'level', coalesce(v_profile.level, 1));
end;
$$;
revoke all on function public.complete_mission(uuid) from public;
grant execute on function public.complete_mission(uuid) to authenticated;

create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_reward public.rewards%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_reward from public.rewards where id = p_reward_id and user_id = v_user and is_active = true for update;
  if not found then raise exception 'Reward not available'; end if;
  select * into v_profile from public.profiles where id = v_user for update;
  if v_profile.level < v_reward.minimum_level then raise exception 'Minimum level not reached'; end if;
  if v_profile.nexus_coins < v_reward.cost then raise exception 'Insufficient Nexus Coins'; end if;

  update public.profiles set nexus_coins = nexus_coins - v_reward.cost, updated_at = now() where id = v_user returning * into v_profile;
  insert into public.reward_redemptions(user_id, reward_id, cost_paid) values (v_user, v_reward.id, v_reward.cost);
  insert into public.activity_events(user_id, event_type, source_type, source_id, label, coins_delta) values (v_user, 'reward.redeemed', 'reward', v_reward.id, v_reward.name, -v_reward.cost);

  return jsonb_build_object('ok', true, 'coins_remaining', v_profile.nexus_coins, 'reward', v_reward.name);
end;
$$;
revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
