-- Run only against NexOS after both N.E.X migrations. Every fixture rolls back.
-- Uses one existing identity and one synthetic JWT subject; creates no Auth account.
begin;
set local statement_timeout = '20s';
do $test$
declare
  a uuid; b uuid := gen_random_uuid(); fixture uuid := gen_random_uuid();
  action_id uuid := gen_random_uuid(); request_id uuid := gen_random_uuid();
  mission uuid; repeated uuid; n integer; t text; denied boolean;
  used bigint; reserved_units bigint;
begin
  select id into a from auth.users order by id limit 1;
  if a is null then raise exception 'No existing identity for rollback tests'; end if;
  insert into public.nex_memories(id,user_id,module,content)
    values(fixture,a,'geral','NEX rollback fixture');
  insert into public.nex_google_connections(user_id,ciphertext)
    values(a,'rollback-fixture') on conflict(user_id) do nothing;
  insert into public.nex_oauth_states(user_id,state_hash,expires_at)
    values(a,'rollback-'||fixture::text,now()+interval '1 minute') on conflict(user_id) do nothing;
  insert into public.nex_actions(id,user_id,kind,title)
    values(action_id,a,'inbox','NEX rollback fixture');

  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  if (select count(*) from public.nex_memories where id=fixture)<>1 then raise exception 'Owner SELECT failed'; end if;
  update public.nex_memories set content='Updated rollback fixture' where id=fixture;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner UPDATE failed'; end if;
  foreach t in array array['nex_google_connections','nex_oauth_states'] loop
    execute format('select count(*) from public.%I where user_id=$1',t) into n using a;
    if n<>1 then raise exception 'Owner SELECT failed in %',t; end if;
  end loop;
  if (select count(*) from public.nex_actions where id=action_id)<>1 then raise exception 'Owner actions SELECT failed'; end if;
  foreach t in array array['nex_memories','nex_google_connections','nex_oauth_states','nex_actions'] loop
    if has_table_privilege('authenticated','public.'||t,'TRUNCATE')
      or has_table_privilege('authenticated','public.'||t,'TRIGGER')
      or has_table_privilege('authenticated','public.'||t,'REFERENCES')
      or has_table_privilege('authenticated','public.'||t,'MAINTAIN')
    then raise exception 'Excessive table grants in %',t; end if;
  end loop;
  denied:=false;
  begin perform count(*) from nex_private.budget; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Private ledger exposed'; end if;
  denied:=false;
  begin update public.nex_memories set user_id=b where id=fixture; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Owner reassignment allowed'; end if;

  select public.nex_create_mission(request_id,'mission','NEX rollback confirmed mission') into mission;
  select public.nex_create_mission(request_id,'mission','NEX rollback confirmed mission') into repeated;
  if mission is null or mission<>repeated or (select count(*) from public.nex_actions where id=request_id)<>1
    then raise exception 'RPC idempotency failed'; end if;
  if (select xp_base+xp_bonus+coins_base from public.missions where id=mission)<>0
    then raise exception 'Creation awarded progression'; end if;
  denied:=false;
  begin perform public.nex_create_mission(request_id,'inbox','different'); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Conflicting payload accepted'; end if;
  n:=(select count(*) from public.nex_memories);
  if n<60 then
    insert into public.nex_memories(user_id,module,content)
      select a,'geral','NEX rollback capacity fixture' from generate_series(1,60-n);
  end if;
  denied:=false;
  begin insert into public.nex_memories(user_id,module,content) values(a,'geral','NEX overflow');
    exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Memory cap not enforced'; end if;
  delete from public.nex_memories where id=fixture;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner DELETE failed'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',b::text,true);
  foreach t in array array['nex_memories','nex_google_connections','nex_oauth_states','nex_actions'] loop
    execute format('select count(*) from public.%I where user_id=$1',t) into n using a;
    if n<>0 then raise exception 'Cross-user SELECT leak in %',t; end if;
    execute format('update public.%I set user_id=user_id where user_id=$1',t) using a;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'Cross-user UPDATE allowed in %',t; end if;
    execute format('delete from public.%I where user_id=$1',t) using a;
    get diagnostics n=row_count;
    if n<>0 then raise exception 'Cross-user DELETE allowed in %',t; end if;
  end loop;
  denied:=false;
  begin insert into public.nex_memories(user_id,module,content) values(a,'geral','Cross-user fixture');
    exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-user INSERT accepted'; end if;
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('request.jwt.claim.sub','',true);
  denied:=false;
  begin perform public.nex_reserve('groq',1); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Reservation without identity accepted'; end if;
  execute 'set local role anon';
  foreach t in array array['nex_memories','nex_google_connections','nex_oauth_states','nex_actions'] loop
    denied:=false;
    begin execute format('select count(*) from public.%I',t) into n; exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'Anon access in %',t; end if;
  end loop;
  if has_function_privilege('anon','public.nex_reserve(text,integer)','EXECUTE')
    or has_function_privilege('anon','public.nex_create_mission(uuid,text,text)','EXECUTE')
    then raise exception 'Anon RPC exposure'; end if;
  execute 'reset role';

  select count(*),coalesce(sum(q.units),0) into used,reserved_units
    from nex_private.budget q where provider='groq' and created_at>now()-interval '60 seconds';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  if used<2 and reserved_units<7000 then perform public.nex_reserve('groq',1); end if;
  if used<1 and reserved_units<6999 then perform public.nex_reserve('groq',1); end if;
  if public.nex_reserve('groq',1) then raise exception 'Minute budget exceeded'; end if;
  denied:=false;
  begin perform public.nex_reserve('paid_provider',1); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Unknown provider accepted'; end if;
  denied:=false;
  begin perform public.nex_reserve('groq',0); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Zero-unit reservation accepted'; end if;
  execute 'reset role';
end $test$;
-- Seed only uncommitted ledger fixtures to exercise the UTC-day caps.
do $daily$
declare a uuid; inbox uuid;
begin
  select id into a from auth.users order by id limit 1;
  insert into nex_private.budget(user_id,provider,units,created_at)
    select a,'google',1,now()-interval '2 minutes' from generate_series(1,25);
  insert into nex_private.budget(user_id,provider,units,created_at)
    values(a,'groq',49000,now()-interval '2 minutes');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  if public.nex_reserve('google',1) then raise exception 'Daily user request cap exceeded'; end if;
  if public.nex_reserve('groq',2000) then raise exception 'Daily unit cap exceeded'; end if;
  select public.nex_create_mission(gen_random_uuid(),'inbox','NEX rollback inbox') into inbox;
  if (select status from public.missions where id=inbox)<>'Inbox' then raise exception 'Inbox RPC status mismatch'; end if;
  execute 'reset role';
end $daily$;
rollback;
