create unique index if not exists routines_user_name_unique on public.routines(user_id, name);
create unique index if not exists routine_items_routine_title_unique on public.routine_items(routine_id, title);
create unique index if not exists rewards_user_name_unique on public.rewards(user_id, name);

create or replace function public.bootstrap_nexus()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_morning uuid;
  v_shutdown uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.areas(user_id, slug, name, icon, color, sort_order) values
    (v_user,'estudos','Estudos','🎓','blue',10),
    (v_user,'saude','Saúde','🌿','green',20),
    (v_user,'criacao','Criação','✦','violet',30),
    (v_user,'financas','Finanças','◈','amber',40),
    (v_user,'conexoes','Conexões','🤝','rose',50),
    (v_user,'espiritualidade','Espiritualidade','✧','slate',60),
    (v_user,'sistema','Sistema','⌘','cyan',70)
  on conflict (user_id, slug) do nothing;

  insert into public.attributes(user_id, key, label, icon, color, sort_order) values
    (v_user,'conhecimento','Conhecimento','◉','blue',10),
    (v_user,'disciplina','Disciplina','◆','indigo',20),
    (v_user,'corpo','Corpo','▲','green',30),
    (v_user,'saude','Saúde','✚','emerald',40),
    (v_user,'criatividade','Criatividade','✦','violet',50),
    (v_user,'financas','Finanças','◈','amber',60),
    (v_user,'conexoes','Conexões','◎','rose',70),
    (v_user,'espiritualidade','Espiritualidade','✧','slate',80)
  on conflict (user_id, key) do nothing;

  insert into public.rewards(user_id, name, description, category, cost, minimum_level) values
    (v_user,'Noite de filme','Uma noite de filme escolhida sem culpa.','Lazer',120,1),
    (v_user,'Hora premium','Uma hora reservada para um hobby ou projeto prazeroso.','Tempo',180,1),
    (v_user,'Experiência especial','Um passeio, refeição ou experiência planejada.','Experiência',500,3),
    (v_user,'Upgrade criativo','Um pequeno recurso para criação, estudo ou organização.','Criação',750,5)
  on conflict (user_id, name) do nothing;

  insert into public.routines(user_id, name, description, icon, period, sort_order)
  values (v_user,'Ativação da manhã','Começar o dia com clareza antes de reagir ao mundo.','☀️','morning',10)
  on conflict (user_id, name) do update set updated_at = now()
  returning id into v_morning;

  insert into public.routines(user_id, name, description, icon, period, sort_order)
  values (v_user,'Shutdown do Nexus','Fechar ciclos, preparar amanhã e desligar o modo operacional.','🌙','evening',20)
  on conflict (user_id, name) do update set updated_at = now()
  returning id into v_shutdown;

  insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,sort_order) values
    (v_user,v_morning,'Checar energia e intenção do dia',2,10,10),
    (v_user,v_morning,'Escolher três alvos reais',3,15,20),
    (v_user,v_morning,'Abrir primeiro bloco de foco',1,10,30)
  on conflict (routine_id, title) do nothing;

  insert into public.routine_items(user_id,routine_id,title,duration_minutes,xp_reward,sort_order) values
    (v_user,v_shutdown,'Registrar principal vitória',2,10,10),
    (v_user,v_shutdown,'Reagendar conscientemente o que sobrou',3,10,20),
    (v_user,v_shutdown,'Escolher a primeira ação de amanhã',2,15,30)
  on conflict (routine_id, title) do nothing;

  if not exists (select 1 from public.seasons where user_id = v_user and status = 'Ativa') then
    insert into public.seasons(user_id,name,theme,status,starts_on,ends_on,xp_goal,boss_name,final_reward)
    values (v_user,'Ascensão do Nexus','Construir um sistema pessoal confiável.','Ativa',current_date,current_date + 41,6000,'Consolidar a revisão semanal','Experiência especial');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.bootstrap_nexus() from public;
grant execute on function public.bootstrap_nexus() to authenticated;
