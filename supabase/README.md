# Supabase · Nexus OS

O diretório contém o modelo persistente do Nexus OS.

## Migrações

- `nexus_core`: perfil, áreas, projetos, missões, jornadas, temporadas, atributos, talentos, conquistas, recompensas e hábitos;
- `nexus_core_fk_indexes`: índices de relações;
- `nexus_routine_engine`: check-ins, foco, rotinas, revisões, lembretes, eventos e RPCs transacionais;
- `nexus_bootstrap`: estrutura inicial idempotente por usuário;
- `nexus_progression_automations`: XP de rotina e streak automático.

Todas as tabelas expostas usam Row Level Security por proprietário. O browser usa apenas a publishable key; nenhuma `service_role` deve ser colocada no frontend ou no repositório.
