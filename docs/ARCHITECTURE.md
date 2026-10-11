# NexOS · Arquitetura

## Tese

O NexOS é um sistema pessoal orientado a contexto. O Notion funcionou como protótipo de comportamento e informação; o produto web transforma isso em um sistema orientado a eventos, relações e ações. Esta descrição diferencia o código presente dos contratos ainda planejados.

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

`src/context/NexusContext.tsx` oferece um contrato de ações para a interface. `src/lib/nexus-api.ts` concentra grande parte do acesso ao Supabase. Há exceções atuais: Calendário e Finanças ainda consultam diretamente o cliente. Migrar essas exceções e reduzir leituras amplas pertence a B01, em `PRODUCTION_MAP.md`.

### Ledger

`activity_events` registra acontecimentos relevantes. Ele permite construir analytics, histórico e conquistas sem depender de campos manuais espalhados.

### Transações

Ações que afetam múltiplas entidades são RPCs no Postgres. `complete_mission()` altera missão, perfil, atributo, projeto, jornada e ledger na mesma transação e é idempotente.

### Edge

O browser acessa o Supabase usando chave publishable e RLS. O Worker fica para operações de borda, endpoints controlados e integrações privadas futuras.

## Contratos de segurança no código

A presença de RLS e filtros em migrations/clientes é evidência de implementação; não certifica o banco implantado nem a função externa de login. A validação autenticada está pendente em B01.

## Regras de segurança

- nenhuma `service_role` no frontend ou repositório;
- RLS em tabelas públicas;
- propriedade por `auth.uid()`;
- funções sensíveis são `SECURITY INVOKER`;
- mutações relevantes também filtram `user_id` no cliente;
- segredos futuros devem usar Cloudflare Secrets.

## Keep-alive

`nexus_keepalive()` retorna apenas estado e horário do banco. A única automação de keep-alive é a GitHub Action agendada diariamente. Nenhuma linha de usuário é lida pela automação.

## Responsabilidades de interface

- `NexusContext`: workspace e ações de domínio; demo explicitamente separado.
- `lib/router`: pathname e query; páginas derivam estado inicial da URL.
- `ModalSurface`/`useOverlay`: modal, exclusividade, teclado e foco.
- `lib/dates`: data civil de São Paulo.
- `lib/focus-clock`: contagem ativa; FocusPage mantém checkpoint na mesma aba.
- `styles`: 21 proprietários registrados; consulte `STYLE_SYSTEM.md`.

## Evolução

O próximo salto arquitetural é transformar o ledger em inteligência: recomendação contextual de tarefas, previsão de carga, detecção de atrito, progressão gamificada por regras e dashboards personalizáveis.

O mapa corrente de entregas, dependências e limites está em [PRODUCTION_MAP.md](PRODUCTION_MAP.md).
