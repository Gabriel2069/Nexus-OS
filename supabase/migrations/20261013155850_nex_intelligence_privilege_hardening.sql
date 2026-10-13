-- N.E.X: remove inherited table-management grants; retain only RLS-controlled CRUD.
revoke all on table public.nex_memories, public.nex_google_connections, public.nex_oauth_states, public.nex_actions from authenticated;
grant select, insert, update, delete on table public.nex_memories, public.nex_google_connections, public.nex_oauth_states, public.nex_actions to authenticated;
-- Cover the foreign keys flagged by Supabase's database advisor.
create index nex_budget_owner on nex_private.budget(user_id, provider, created_at);
create index nex_actions_mission on public.nex_actions(mission_id);
