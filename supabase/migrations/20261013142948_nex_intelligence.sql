-- N.E.X: no service-role key; all API calls carry the verified user's JWT.
create schema if not exists nex_private;
revoke all on schema nex_private from public, anon;
grant usage on schema nex_private to authenticated;
create table nex_private.budget (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null,
 units integer not null check (units > 0),
 created_at timestamptz not null default now()
);
alter table nex_private.budget enable row level security;
revoke all on nex_private.budget from public, anon, authenticated;
create index nex_budget_window on nex_private.budget(provider,created_at);
create function nex_private.reserve(p_provider text,p_units integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_day timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'; v_limit int;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_provider not in ('groq','gemini','workers','whisper','google') or p_units not between 1 and 8000 then raise exception 'Invalid reservation'; end if;
 -- Serializes the shared organization budget across users and Worker isolates.
 perform pg_advisory_xact_lock(hashtextextended('nex-budget-'||p_provider,0));
 delete from nex_private.budget where created_at < now()-interval '7 days';
 v_limit := case p_provider when 'whisper' then 600 when 'google' then 100 else 50000 end;
 if (select count(*) from nex_private.budget where provider=p_provider and created_at>=v_day)>=100
 or (select count(*) from nex_private.budget where provider=p_provider and user_id=v_user and created_at>=v_day)>=25
 or (select count(*) from nex_private.budget where provider=p_provider and created_at>now()-interval '60 seconds')>=2
 or coalesce((select sum(units) from nex_private.budget where provider=p_provider and created_at>=v_day),0)+p_units>v_limit
 or (p_provider not in ('google','whisper') and coalesce((select sum(units) from nex_private.budget where provider=p_provider and created_at>now()-interval '60 seconds'),0)+p_units>7000)
 then return false; end if;
 insert into nex_private.budget(user_id,provider,units) values(v_user,p_provider,p_units);
 return true;
end $$;
revoke all on function nex_private.reserve(text,integer) from public,anon;
grant execute on function nex_private.reserve(text,integer) to authenticated;
create function public.nex_reserve(p_provider text,p_units integer) returns boolean
language sql security invoker set search_path='' as $$select nex_private.reserve(p_provider,p_units)$$;
revoke all on function public.nex_reserve(text,integer) from public,anon;
grant execute on function public.nex_reserve(text,integer) to authenticated;

create table public.nex_memories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 module text not null check (module in ('geral','agora','hoje','calendario','inbox','estudos','projetos','missoes','rotinas','foco')),
 agent text not null default 'N.E.X' check(length(agent) between 1 and 40),
 content text not null check(length(content) between 1 and 1200), created_at timestamptz not null default now()
);
create index nex_memories_owner on public.nex_memories(user_id,module,created_at);
create table public.nex_google_connections (
 user_id uuid primary key references auth.users(id) on delete cascade, ciphertext text not null check(length(ciphertext)<20000),
 scopes text[] not null default '{}',updated_at timestamptz not null default now()
);
create table public.nex_oauth_states (
 user_id uuid primary key references auth.users(id) on delete cascade, state_hash text not null unique,expires_at timestamptz not null
);
create table public.nex_actions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('mission','inbox')), title text not null,
 mission_id uuid references public.missions(id) on delete set null,created_at timestamptz not null default now()
);
create index nex_actions_owner on public.nex_actions(user_id,created_at);
do $$declare t text;begin
 foreach t in array array['nex_memories','nex_google_connections','nex_oauth_states','nex_actions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 end loop;
end $$;
-- Explicit confirmation is UI-owned; this RPC validates, applies RLS and atomically
-- deduplicates the permitted mutation. It never completes a mission or grants XP.
create function public.nex_create_mission(p_id uuid,p_kind text,p_title text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_user uuid:=auth.uid(); v_row public.nex_actions; v_mission uuid;
begin
 if v_user is null or p_kind not in ('mission','inbox') or length(trim(p_title)) not between 1 and 200 then raise exception 'Invalid action';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_id::text,0));
 select * into v_row from public.nex_actions where id=p_id and user_id=v_user;
 if found then
 if v_row.kind<>p_kind or v_row.title<>trim(p_title) then raise exception 'Conflicting action';end if;
 if v_row.mission_id is null then raise exception 'Action was removed';end if;
 return v_row.mission_id;
 end if;
 insert into public.missions(user_id,title,status,context) values(v_user,trim(p_title),case when p_kind='inbox' then 'Inbox' else 'A fazer' end,'Criada com confirmação no N.E.X') returning id into v_mission;
 insert into public.nex_actions(id,user_id,kind,title,mission_id) values(p_id,v_user,p_kind,trim(p_title),v_mission);
 return v_mission;
end $$;
revoke all on function public.nex_create_mission(uuid,text,text) from public,anon;
grant execute on function public.nex_create_mission(uuid,text,text) to authenticated;

create function public.nex_memory_limit() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||'nex-memory',0));
 if (select count(*) from public.nex_memories where user_id=new.user_id)>=60 then raise exception 'Memory limit reached';end if;
 return new;
end $$;
revoke all on function public.nex_memory_limit() from public,anon;
grant execute on function public.nex_memory_limit() to authenticated;
create trigger nex_memory_limit before insert on public.nex_memories for each row execute function public.nex_memory_limit();
