update public.routines set is_active = false, updated_at = now() where name in ('Ativação da manhã','Shutdown do Nexus');

insert into public.routines(user_id,name,description,icon,period,days_of_week,is_active,sort_order)
select id,'Abrir o dia','Um check-in rápido. O calendário e o Nexus fazem o resto da priorização.','☀️','morning',array[0,1,2,3,4,5,6],true,10 from public.profiles
on conflict (user_id,name) do update set description=excluded.description,icon=excluded.icon,period=excluded.period,days_of_week=excluded.days_of_week,is_active=true,sort_order=excluded.sort_order,updated_at=now();

insert into public.routines(user_id,name,description,icon,period,days_of_week,is_active,sort_order)
select id,'Fechar o dia','Um fechamento curto antes de desacelerar para dormir.','🌙','evening',array[0,1,2,3,4,5,6],true,20 from public.profiles
on conflict (user_id,name) do update set description=excluded.description,icon=excluded.icon,period=excluded.period,days_of_week=excluded.days_of_week,is_active=true,sort_order=excluded.sort_order,updated_at=now();

insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,is_optional,sort_order)
select r.user_id,r.id,'Check-in de energia',2,10,false,10 from public.routines r where r.name='Abrir o dia'
on conflict (routine_id,title) do update set duration_minutes=2,xp_reward=10,is_optional=false,sort_order=10,updated_at=now();

insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,is_optional,sort_order)
select r.user_id,r.id,'Fechar o Nexus',2,15,false,10 from public.routines r where r.name='Fechar o dia'
on conflict (routine_id,title) do update set duration_minutes=2,xp_reward=15,is_optional=false,sort_order=10,updated_at=now();

create or replace function public.bootstrap_nexus()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_open uuid;
  v_close uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.areas(user_id, slug, name, icon, color, sort_order) values
    (v_user,'estudos','Estudos','🎓','blue',10),(v_user,'saude','Saúde','🌿','green',20),(v_user,'criacao','Criação','✦','violet',30),(v_user,'financas','Finanças','◈','amber',40),(v_user,'conexoes','Conexões','🤝','rose',50),(v_user,'espiritualidade','Espiritualidade','✧','slate',60),(v_user,'sistema','Sistema','⌘','cyan',70)
  on conflict (user_id, slug) do nothing;

  insert into public.attributes(user_id, key, label, icon, color, sort_order) values
    (v_user,'conhecimento','Conhecimento','◉','blue',10),(v_user,'disciplina','Disciplina','◆','indigo',20),(v_user,'corpo','Corpo','▲','green',30),(v_user,'saude','Saúde','✚','emerald',40),(v_user,'criatividade','Criatividade','✦','violet',50),(v_user,'financas','Finanças','◈','amber',60),(v_user,'conexoes','Conexões','◎','rose',70),(v_user,'espiritualidade','Espiritualidade','✧','slate',80)
  on conflict (user_id, key) do nothing;

  insert into public.rewards(user_id, name, description, category, cost, minimum_level) values
    (v_user,'Noite de filme','Uma noite de filme escolhida sem culpa.','Lazer',120,1),(v_user,'Hora premium','Uma hora reservada para um hobby ou projeto prazeroso.','Tempo',180,1),(v_user,'Experiência especial','Um passeio, refeição ou experiência planejada.','Experiência',500,3),(v_user,'Upgrade criativo','Um pequeno recurso para criação, estudo ou organização.','Criação',750,5)
  on conflict (user_id, name) do nothing;

  insert into public.routines(user_id,name,description,icon,period,days_of_week,is_active,sort_order)
  values (v_user,'Abrir o dia','Um check-in rápido. O calendário e o Nexus fazem o resto da priorização.','☀️','morning',array[0,1,2,3,4,5,6],true,10)
  on conflict (user_id,name) do update set is_active=true,updated_at=now()
  returning id into v_open;

  insert into public.routines(user_id,name,description,icon,period,days_of_week,is_active,sort_order)
  values (v_user,'Fechar o dia','Um fechamento curto antes de desacelerar para dormir.','🌙','evening',array[0,1,2,3,4,5,6],true,20)
  on conflict (user_id,name) do update set is_active=true,updated_at=now()
  returning id into v_close;

  insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,is_optional,sort_order)
  values (v_user,v_open,'Check-in de energia',2,10,false,10)
  on conflict (routine_id,title) do nothing;

  insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,is_optional,sort_order)
  values (v_user,v_close,'Fechar o Nexus',2,15,false,10)
  on conflict (routine_id,title) do nothing;

  if not exists (select 1 from public.seasons where user_id=v_user and status='Ativa') then
    insert into public.seasons(user_id,name,theme,status,starts_on,ends_on,xp_goal,boss_name,final_reward)
    values (v_user,'Ascensão do Nexus','Construir um sistema pessoal confiável.','Ativa',current_date,current_date+41,6000,'Consolidar a revisão semanal','Experiência especial');
  end if;

  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.bootstrap_nexus() from public;
grant execute on function public.bootstrap_nexus() to authenticated;
