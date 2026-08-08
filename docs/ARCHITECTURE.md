# Nexus OS · Arquitetura

## Tese

O Nexus não é uma reprodução do Notion. O Notion funcionou como protótipo de comportamento e informação; o produto web transforma isso em um sistema orientado a eventos, relações e ações.

## Stack
- **UI:** React + TypeScript + Vite
- **Design:** CSS próprio, responsivo, PWA
- **Dados/Auth:** Supabase Postgres + Auth
- **Edge:** Cloudflare Workers + Static Assets
- **Automação:** GitHub Actions
- **Versionamento:** GitHub

## Camadas

### Interface
`src/pages` representa superfícies de intenção: Agora, Hoje, Missões, Rotinas, Foco, Calendário, Projetos, Insights e Life RPG.

`src/components` concentra navegação, command palette, quick capture, mobile dock, notificações, cards e visualizações.

### Domínio
Entidades deixam de ser “páginas” e passam a ter semântica própria: perfil, área, projeto, missão, jornada, temporada, atributo, talento, conquista, recompensa, hábito, rotina, foco, check-in, revisão, lembrete e evento.

### Estado e dados
`src/context/NexusContext.tsx` oferece um contrato de ações para a interface. `src/lib/nexus-api.ts` concentra o acesso ao Supabase; componentes não espalham SQL/queries pelo app.

### Ledger
`activity_events` registra acontecimentos relevantes. Ele permite construir analytics, histórico e conquistas sem depender de campos manuais espalhados.

### Transações
Ações que afetam múltiplas entidades são RPCs no Postgres. `complete_mission()` altera missão, perfil, atributo, projeto, jornada e ledger na mesma transação e é idempotente.

### Edge
O browser acessa o Supabase usando chave publishable e RLS. O Worker fica para operações de borda, endpoints controlados e integrações privadas futuras.

## Segurança
- nenhuma `service_role` no frontend ou repositório;
- RLS em tabelas públicas;
- propriedade por `auth.uid()`;
- funções sensíveis são `SECURITY INVOKER`;
- mutações relevantes também filtram `user_id` no cliente;
- segredos futuros devem usar Cloudflare Secrets.

## Keep-alive
`nexus_keepalive()` retorna apenas estado e horário do banco. A única automação de keep-alive é a GitHub Action agendada diariamente. Nenhuma linha de usuário é lida pela automação.

## Evolução
O próximo salto arquitetural é transformar o ledger em inteligência: recomendação contextual de tarefas, previsão de carga, detecção de atrito, progressão gamificada por regras e dashboards personalizáveis.
