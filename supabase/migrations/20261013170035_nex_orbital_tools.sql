-- A02: immutable, user-owned operation receipts; no client ledger grants.
create table nex_private.operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null, kind text not null, request_hash text not null,
  state text not null default 'pending' check(state in ('pending','applied')),
  receipt jsonb, created_at timestamptz not null default now(),
  primary key(user_id,id)
);
alter table nex_private.operations enable row level security;
revoke all on nex_private.operations from public,anon,authenticated;
create index nex_operations_history on nex_private.operations(user_id,created_at desc);

create function nex_private.claim_operation(p_id uuid,p_kind text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r nex_private.operations; h text;
begin
  if u is null or p_id is null or p_kind is null or length(p_kind)>50 or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8000 then raise exception 'Invalid operation'; end if;
  h:=md5(p_kind||p_payload::text);
  perform pg_advisory_xact_lock(hashtextextended('nex-operation-'||u::text||p_id::text,0));
  select * into r from nex_private.operations where user_id=u and id=p_id;
  if found then
    if r.request_hash<>h then raise exception 'Conflicting operation'; end if;
    if r.state='applied' then return r.receipt||jsonb_build_object('reused',true); end if;
    raise exception 'Operation outcome pending: inspect destination before retrying';
  end if;
  if (select count(*) from nex_private.operations where user_id=u and created_at>now()-interval '1 day')>=100 then raise exception 'Daily operation limit';end if;
  insert into nex_private.operations(user_id,id,kind,request_hash) values(u,p_id,p_kind,h);
  return jsonb_build_object('claimed',true);
end $$;
create function nex_private.finish_operation(p_id uuid,p_receipt jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_receipt is null or jsonb_typeof(p_receipt)<>'object' or octet_length(p_receipt::text)>2000 then raise exception 'Invalid receipt';end if;
  update nex_private.operations set state='applied',receipt=p_receipt
    where user_id=auth.uid() and id=p_id and state='pending';
  if not found then raise exception 'Operation not pending';end if;
  return p_receipt;
end $$;
create function nex_private.operation_history() returns jsonb
language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select id,kind,state,receipt,created_at from nex_private.operations
    where user_id=auth.uid() and auth.uid() is not null order by created_at desc limit 20
  )t
$$;
revoke all on function nex_private.claim_operation(uuid,text,jsonb),nex_private.finish_operation(uuid,jsonb),nex_private.operation_history() from public,anon;
grant execute on function nex_private.claim_operation(uuid,text,jsonb),nex_private.finish_operation(uuid,jsonb),nex_private.operation_history() to authenticated;
create function public.nex_claim_operation(p_id uuid,p_kind text,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$select nex_private.claim_operation(p_id,p_kind,p_payload)$$;
create function public.nex_finish_operation(p_id uuid,p_receipt jsonb) returns jsonb
language sql security invoker set search_path='' as $$select nex_private.finish_operation(p_id,p_receipt)$$;
create function public.nex_operation_history() returns jsonb
language sql security invoker set search_path='' as $$select nex_private.operation_history()$$;
revoke all on function public.nex_claim_operation(uuid,text,jsonb),public.nex_finish_operation(uuid,jsonb),public.nex_operation_history() from public,anon;
grant execute on function public.nex_claim_operation(uuid,text,jsonb),public.nex_finish_operation(uuid,jsonb),public.nex_operation_history() to authenticated;

-- Domain writes remain invoker: existing ownership policies still apply.
create function public.nex_apply_operation(p_id uuid,p_kind text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); r jsonb; target uuid; area text; v_title text; current_version timestamptz; current_status text; d date; imported int:=0; event jsonb; step text; position int:=0;
begin
  if u is null or p_kind not in ('project.create','project.edit','mission.edit','mission.complete','google.calendar.import','calendar.create','routine.create','study.create','checkin.save','review.save','finance.create','memory.save') then raise exception 'Invalid operation kind';end if;
  r:=nex_private.claim_operation(p_id,p_kind,p_payload);
  if not coalesce((r->>'claimed')::boolean,false) then return r;end if;
  v_title:=coalesce(p_payload->>'title',p_payload->>'name',p_payload->>'subject','');
  if length(v_title)>200 then raise exception 'Title too long';end if;
  if p_kind in ('project.create','project.edit','mission.edit','calendar.create','routine.create','study.create','finance.create') and length(trim(v_title))<1 then raise exception 'Title required';end if;
  if p_kind='mission.complete' then
    select updated_at into current_version from public.missions where id=(p_payload->>'id')::uuid and user_id=u for update;
    if not found or p_payload->>'expected_updated_at' is null or current_version is distinct from (p_payload->>'expected_updated_at')::timestamptz then raise exception 'Mission changed: review again';end if;
    perform public.complete_mission((p_payload->>'id')::uuid);
    target:=(p_payload->>'id')::uuid;area:='missoes';
  elsif p_kind='google.calendar.import' then
    if jsonb_typeof(p_payload->'events') is distinct from 'array' or jsonb_array_length(p_payload->'events')>20 then raise exception 'Invalid import';end if;
    for event in select jsonb_array_elements(p_payload->'events') loop
      if length(event->>'external_id') not between 1 and 240 or length(event->>'title') not between 1 and 200 or (event->>'ends_at')::timestamptz <= (event->>'starts_at')::timestamptz then raise exception 'Invalid imported event';end if;
      insert into public.calendar_commitments(user_id,external_id,title,starts_at,ends_at,source,is_fixed)
        values(u,event->>'external_id',event->>'title',(event->>'starts_at')::timestamptz,(event->>'ends_at')::timestamptz,'google_calendar',false)
        on conflict(user_id,external_id) do nothing;
      if found then imported:=imported+1;end if;
    end loop;
    return nex_private.finish_operation(p_id,jsonb_build_object('applied',true,'id',p_id,'area','calendario','kind',p_kind,'imported',imported,'preserved',jsonb_array_length(p_payload->'events')-imported));
  elsif p_kind='project.edit' then
    select updated_at into current_version from public.projects where id=(p_payload->>'id')::uuid and user_id=u for update;
    if not found or p_payload->>'expected_updated_at' is null or current_version is distinct from (p_payload->>'expected_updated_at')::timestamptz then raise exception 'Project changed: review again';end if;
    update public.projects set name=v_title,description=coalesce(p_payload->>'description',description),next_action=coalesce(p_payload->>'next_action',next_action),status=coalesce(p_payload->>'status',status),updated_at=now() where id=(p_payload->>'id')::uuid and user_id=u returning id into target;
    area:='projetos';
  elsif p_kind='mission.edit' then
    select updated_at into current_version from public.missions where id=(p_payload->>'id')::uuid and user_id=u for update;
    if not found or p_payload->>'expected_updated_at' is null or current_version is distinct from (p_payload->>'expected_updated_at')::timestamptz then raise exception 'Mission changed: review again';end if;
    if p_payload->>'status' not in ('Inbox','A fazer','Em andamento','Bloqueada','Cancelada') then raise exception 'Unsupported mission status';end if;
    if p_payload->>'project_id' is not null and not exists(select 1 from public.projects where id=(p_payload->>'project_id')::uuid and user_id=u) then raise exception 'Project not owned';end if;
    select status into current_status from public.missions where id=(p_payload->>'id')::uuid and user_id=u;
    if current_status='Feita' and p_payload->>'status' is not null then raise exception 'Completed missions cannot be reopened through N.E.X';end if;
    update public.missions set title=v_title,status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),project_id=coalesce((p_payload->>'project_id')::uuid,project_id),updated_at=now() where id=(p_payload->>'id')::uuid and user_id=u returning id into target;
    area:='missoes';
  elsif p_kind='project.create' then
    insert into public.projects(user_id,name,description,next_action,status) values(u,v_title,p_payload->>'description',p_payload->>'next_action',coalesce(p_payload->>'status','Ativo')) returning id into target;
    area:='projetos';
  elsif p_kind='calendar.create' then
    if (p_payload->>'ends_at')::timestamptz <= (p_payload->>'starts_at')::timestamptz or p_payload->>'starts_at' is null or p_payload->>'ends_at' is null then raise exception 'Invalid event dates';end if;
    insert into public.calendar_commitments(user_id,external_id,title,starts_at,ends_at,note,source,is_fixed) values(u,'nex-'||p_id::text,v_title,(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,p_payload->>'note','nex',false) returning id into target;
    area:='calendario';
  elsif p_kind='routine.create' then
    if jsonb_typeof(p_payload->'steps') is distinct from 'array' or jsonb_array_length(p_payload->'steps') not between 1 and 8 then raise exception 'Routine needs 1 to 8 steps';end if;
    insert into public.routines(user_id,name,description,period) values(u,v_title,p_payload->>'description',coalesce(p_payload->>'period','anytime')) returning id into target;
    for step in select jsonb_array_elements_text(p_payload->'steps') loop
      if length(trim(step)) not between 1 and 160 then raise exception 'Invalid routine step';end if;
      insert into public.routine_items(user_id,routine_id,title,sort_order) values(u,target,step,position);
      position:=position+1;
    end loop;
    area:='rotinas';
  elsif p_kind='study.create' then
    if (p_payload->>'end_time')::time <= (p_payload->>'start_time')::time then raise exception 'Invalid study interval';end if;
    insert into public.academic_schedule(user_id,subject,weekday,start_time,end_time,schedule_type,note) values(u,v_title,(p_payload->>'weekday')::smallint,(p_payload->>'start_time')::time,(p_payload->>'end_time')::time,'study_block',p_payload->>'note') returning id into target;
    area:='estudos';
  elsif p_kind='checkin.save' then
    d:=(now() at time zone 'America/Sao_Paulo')::date;
    select updated_at into current_version from public.daily_checkins where user_id=u and checkin_date=d for update;
    if found and (p_payload->>'expected_updated_at' is null or current_version is distinct from (p_payload->>'expected_updated_at')::timestamptz) then raise exception 'Check-in changed: review again';end if;
    if p_payload->>'energy' is null or p_payload->>'focus' is null then raise exception 'Check-in values required';end if;
    insert into public.daily_checkins(user_id,checkin_date,energy,focus,mood,note) values(u,d,(p_payload->>'energy')::smallint,(p_payload->>'focus')::smallint,p_payload->>'mood',p_payload->>'note')
      on conflict(user_id,checkin_date) do update set energy=excluded.energy,focus=excluded.focus,mood=coalesce(excluded.mood,daily_checkins.mood),note=coalesce(excluded.note,daily_checkins.note),updated_at=now() returning id into target;
    area:='hoje';
  elsif p_kind='review.save' then
    d:=date_trunc('week',now() at time zone 'America/Sao_Paulo')::date;
    select updated_at into current_version from public.weekly_reviews where user_id=u and week_start=d for update;
    if found and (p_payload->>'expected_updated_at' is null or current_version is distinct from (p_payload->>'expected_updated_at')::timestamptz) then raise exception 'Review changed: review again';end if;
    if length(p_payload->>'note') not between 1 and 1000 or p_payload->>'note' is null then raise exception 'Review required';end if;
    insert into public.weekly_reviews(user_id,week_start,note,next_week_focus) values(u,d,p_payload->>'note',p_payload->>'next_week_focus')
      on conflict(user_id,week_start) do update set note=excluded.note,next_week_focus=coalesce(excluded.next_week_focus,weekly_reviews.next_week_focus),updated_at=now() returning id into target;
    area:='revisao';
  elsif p_kind='finance.create' then
    if (p_payload->>'amount')::numeric<=0 or (p_payload->>'amount')::numeric>9999999.99 or p_payload->>'amount' is null then raise exception 'Invalid amount';end if;
    if round((p_payload->>'amount')::numeric,2)<>(p_payload->>'amount')::numeric then raise exception 'Amount must have cents precision';end if;
    insert into public.personal_finance_entries(user_id,title,kind,category,amount,entry_date,status) values(u,v_title,p_payload->>'kind',coalesce(p_payload->>'category','Pessoal'),(p_payload->>'amount')::numeric,(p_payload->>'entry_date')::date,coalesce(p_payload->>'status','planned')) returning id into target;
    area:='financas';
  elsif p_kind='memory.save' then
    insert into public.nex_memories(user_id,module,agent,content) values(u,p_payload->>'module','N.E.X',p_payload->>'content') returning id into target;
    area:='geral';
  end if;
  if target is null then raise exception 'No owned record changed';end if;
  return nex_private.finish_operation(p_id,jsonb_build_object('applied',true,'id',target,'area',area,'kind',p_kind));
end $$;
revoke all on function public.nex_apply_operation(uuid,text,jsonb) from public,anon;
grant execute on function public.nex_apply_operation(uuid,text,jsonb) to authenticated;
alter table public.nex_memories drop constraint nex_memories_module_check;
alter table public.nex_memories add constraint nex_memories_module_check check(module in ('geral','agora','hoje','calendario','inbox','estudos','projetos','missoes','rotinas','foco','life','metas','insights','revisao','saude','financas','conhecimento','tutorial','planejamento','historico','biblioteca'));
