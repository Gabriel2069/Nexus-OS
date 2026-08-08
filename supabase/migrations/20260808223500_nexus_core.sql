-- Nexus OS · core schema
-- Prepared for Supabase Postgres. All public tables use owner-scoped RLS.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Jogador',
  avatar_url text,
  class_name text not null default 'Tecelão',
  title text not null default 'Iniciado da Trama',
  motto text,
  level integer not null default 1 check (level >= 1),
  xp_total integer not null default 0 check (xp_total >= 0),
  nexus_coins integer not null default 0 check (nexus_coins >= 0),
  streak_current integer not null default 0 check (streak_current >= 0),
  streak_best integer not null default 0 check (streak_best >= 0),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  icon text,
  color text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'Ativo' check (status in ('Ideia', 'Ativo', 'Em espera', 'Concluído', 'Arquivado')),
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta', 'Crítica')),
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  progress smallint not null default 0 check (progress between 0 and 100),
  next_action text,
  reward text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  theme text,
  status text not null default 'Planejada' check (status in ('Planejada', 'Ativa', 'Concluída', 'Arquivada')),
  starts_on date,
  ends_on date,
  xp_goal integer not null default 0 check (xp_goal >= 0),
  boss_name text,
  final_reward text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  icon text,
  color text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_date date not null default current_date,
  title text not null default 'Jornada diária',
  xp_goal integer not null default 0 check (xp_goal >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  coins_earned integer not null default 0 check (coins_earned >= 0),
  combo_xp integer not null default 0 check (combo_xp >= 0),
  energy_start smallint check (energy_start between 1 and 10),
  energy_end smallint check (energy_end between 1 and 10),
  mood text,
  victory text,
  learning text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, journey_date)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  attribute_id uuid references public.attributes(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  journey_id uuid references public.journeys(id) on delete set null,
  title text not null,
  notes text,
  mission_type text not null default 'Missão' check (mission_type in ('Missão', 'Boss', 'Rotina', 'Desafio', 'Evento')),
  rank text not null default 'D' check (rank in ('D', 'C', 'B', 'A', 'S')),
  status text not null default 'A fazer' check (status in ('Inbox', 'A fazer', 'Em andamento', 'Bloqueada', 'Feita', 'Cancelada')),
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta', 'Crítica')),
  context text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  energy text,
  xp_base integer not null default 0 check (xp_base >= 0),
  xp_bonus integer not null default 0 check (xp_bonus >= 0),
  coins_base integer not null default 0 check (coins_base >= 0),
  special_reward text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.talents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attribute_id uuid references public.attributes(id) on delete cascade,
  name text not null,
  description text,
  tier smallint not null default 1 check (tier between 1 and 5),
  required_level integer not null default 1 check (required_level >= 1),
  effect text,
  acquired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  rarity text not null default 'Comum' check (rarity in ('Comum', 'Rara', 'Épica', 'Lendária')),
  criteria text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  coin_reward integer not null default 0 check (coin_reward >= 0),
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  cost integer not null default 0 check (cost >= 0),
  minimum_level integer not null default 1 check (minimum_level >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  cost_paid integer not null check (cost_paid >= 0),
  note text,
  redeemed_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  description text,
  icon text,
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly', 'custom')),
  target_per_period integer not null default 1 check (target_per_period >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  entry_date date not null default current_date,
  completed boolean not null default false,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create index areas_user_id_idx on public.areas(user_id);
create index projects_user_id_idx on public.projects(user_id);
create index projects_area_id_idx on public.projects(area_id);
create index projects_status_idx on public.projects(user_id, status);
create index seasons_user_id_idx on public.seasons(user_id);
create index attributes_user_id_idx on public.attributes(user_id);
create index journeys_user_id_idx on public.journeys(user_id);
create index missions_user_id_idx on public.missions(user_id);
create index missions_due_idx on public.missions(user_id, due_at);
create index missions_status_idx on public.missions(user_id, status);
create index missions_project_id_idx on public.missions(project_id);
create index missions_journey_id_idx on public.missions(journey_id);
create index talents_user_id_idx on public.talents(user_id);
create index achievements_user_id_idx on public.achievements(user_id);
create index rewards_user_id_idx on public.rewards(user_id);
create index reward_redemptions_user_id_idx on public.reward_redemptions(user_id);
create index habits_user_id_idx on public.habits(user_id);
create index habit_entries_user_id_idx on public.habit_entries(user_id);
create index habit_entries_habit_date_idx on public.habit_entries(habit_id, entry_date desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles, public.areas, public.projects, public.seasons, public.attributes, public.journeys, public.missions, public.talents, public.achievements, public.rewards, public.reward_redemptions, public.habits, public.habit_entries to authenticated;

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.seasons enable row level security;
alter table public.attributes enable row level security;
alter table public.journeys enable row level security;
alter table public.missions enable row level security;
alter table public.talents enable row level security;
alter table public.achievements enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = id) with check ((select auth.uid()) is not null and (select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "areas_select_own" on public.areas for select to authenticated using ((select auth.uid()) = user_id);
create policy "areas_insert_own" on public.areas for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "areas_update_own" on public.areas for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "areas_delete_own" on public.areas for delete to authenticated using ((select auth.uid()) = user_id);
create policy "projects_select_own" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);
create policy "seasons_select_own" on public.seasons for select to authenticated using ((select auth.uid()) = user_id);
create policy "seasons_insert_own" on public.seasons for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "seasons_update_own" on public.seasons for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "seasons_delete_own" on public.seasons for delete to authenticated using ((select auth.uid()) = user_id);
create policy "attributes_select_own" on public.attributes for select to authenticated using ((select auth.uid()) = user_id);
create policy "attributes_insert_own" on public.attributes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "attributes_update_own" on public.attributes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "attributes_delete_own" on public.attributes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "journeys_select_own" on public.journeys for select to authenticated using ((select auth.uid()) = user_id);
create policy "journeys_insert_own" on public.journeys for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journeys_update_own" on public.journeys for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journeys_delete_own" on public.journeys for delete to authenticated using ((select auth.uid()) = user_id);
create policy "missions_select_own" on public.missions for select to authenticated using ((select auth.uid()) = user_id);
create policy "missions_insert_own" on public.missions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "missions_update_own" on public.missions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "missions_delete_own" on public.missions for delete to authenticated using ((select auth.uid()) = user_id);
create policy "talents_select_own" on public.talents for select to authenticated using ((select auth.uid()) = user_id);
create policy "talents_insert_own" on public.talents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "talents_update_own" on public.talents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "talents_delete_own" on public.talents for delete to authenticated using ((select auth.uid()) = user_id);
create policy "achievements_select_own" on public.achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy "achievements_insert_own" on public.achievements for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "achievements_update_own" on public.achievements for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "achievements_delete_own" on public.achievements for delete to authenticated using ((select auth.uid()) = user_id);
create policy "rewards_select_own" on public.rewards for select to authenticated using ((select auth.uid()) = user_id);
create policy "rewards_insert_own" on public.rewards for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rewards_update_own" on public.rewards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rewards_delete_own" on public.rewards for delete to authenticated using ((select auth.uid()) = user_id);
create policy "redemptions_select_own" on public.reward_redemptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "redemptions_insert_own" on public.reward_redemptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "redemptions_update_own" on public.reward_redemptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "redemptions_delete_own" on public.reward_redemptions for delete to authenticated using ((select auth.uid()) = user_id);
create policy "habits_select_own" on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "habits_insert_own" on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "habits_update_own" on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits_delete_own" on public.habits for delete to authenticated using ((select auth.uid()) = user_id);
create policy "habit_entries_select_own" on public.habit_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "habit_entries_insert_own" on public.habit_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "habit_entries_update_own" on public.habit_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_entries_delete_own" on public.habit_entries for delete to authenticated using ((select auth.uid()) = user_id);
