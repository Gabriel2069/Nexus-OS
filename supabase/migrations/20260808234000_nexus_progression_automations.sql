-- Nexus OS · progression automations

create or replace function public.refresh_nexus_streak(p_user uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_current integer := 0;
begin
  if not exists (
    select 1 from public.activity_events
    where user_id = p_user and xp_delta > 0
      and (created_at at time zone 'America/Sao_Paulo')::date = v_day
  ) then
    v_day := v_day - 1;
  end if;

  while exists (
    select 1 from public.activity_events
    where user_id = p_user and xp_delta > 0
      and (created_at at time zone 'America/Sao_Paulo')::date = v_day
  ) loop
    v_current := v_current + 1;
    v_day := v_day - 1;
  end loop;

  update public.profiles
  set streak_current = v_current,
      streak_best = greatest(streak_best, v_current),
      updated_at = now()
  where id = p_user;
end;
$$;
revoke all on function public.refresh_nexus_streak(uuid) from public;
grant execute on function public.refresh_nexus_streak(uuid) to authenticated;

create or replace function public.sync_nexus_streak_from_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.refresh_nexus_streak(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_nexus_streak_from_event() from public;

drop trigger if exists activity_events_refresh_streak on public.activity_events;
create trigger activity_events_refresh_streak
after insert or delete on public.activity_events
for each row execute function public.sync_nexus_streak_from_event();

create or replace function public.set_routine_item_completion(p_item_id uuid, p_completed boolean)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_item public.routine_items%rowtype;
  v_completion uuid;
  v_xp integer;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_item from public.routine_items where id = p_item_id and user_id = v_user;
  if not found then raise exception 'Routine item not found'; end if;
  v_xp := greatest(0, coalesce(v_item.xp_reward, 0));

  if p_completed then
    insert into public.routine_completions(user_id, routine_item_id, completion_date)
    values (v_user, v_item.id, v_today)
    on conflict (routine_item_id, completion_date) do nothing
    returning id into v_completion;

    if v_completion is not null then
      update public.profiles
      set xp_total = xp_total + v_xp,
          level = floor((xp_total + v_xp) / 500.0)::integer + 1,
          updated_at = now()
      where id = v_user;
      insert into public.activity_events(user_id,event_type,source_type,source_id,label,xp_delta,metadata)
      values (v_user,'routine.completed','routine_item',v_item.id,v_item.title,v_xp,jsonb_build_object('date',v_today));
    end if;
  else
    delete from public.routine_completions
    where user_id = v_user and routine_item_id = v_item.id and completion_date = v_today
    returning id into v_completion;

    if v_completion is not null then
      update public.profiles
      set xp_total = greatest(0, xp_total - v_xp),
          level = floor(greatest(0, xp_total - v_xp) / 500.0)::integer + 1,
          updated_at = now()
      where id = v_user;
      delete from public.activity_events
      where user_id = v_user
        and event_type = 'routine.completed'
        and source_id = v_item.id
        and metadata ->> 'date' = v_today::text;
    end if;
  end if;

  perform public.refresh_nexus_streak(v_user);
  return jsonb_build_object('ok', true, 'completed', p_completed, 'xp_delta', case when p_completed and v_completion is not null then v_xp when not p_completed and v_completion is not null then -v_xp else 0 end);
end;
$$;
revoke all on function public.set_routine_item_completion(uuid, boolean) from public;
grant execute on function public.set_routine_item_completion(uuid, boolean) to authenticated;
