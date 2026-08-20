# NexOS

Um sistema operacional pessoal web para rotina, execução, foco, projetos, conhecimento e progressão gamificada. O NexOS nasceu no Notion; esta versão deixa de imitar páginas e passa a operar como um app próprio.

## O que já funciona

### App
- Home adaptativa com estado do jogador, momentum e próximos alvos;
- Hoje com check-in, missões e rotinas contextualizadas;
- Central de Missões com ranks e conclusão transacional;
- Inbox operacional para capturar e processar entradas;
- Projetos com portfólio, progresso, XP e próxima ação;
- Rotinas de manhã/noite com etapas persistentes;
- Focus Studio com sessões 25/45/60/90 min registradas;
- Calendário mensal e agenda;
- Insights de XP, foco e energia com correlações;
- motor de decisão contextual por readiness, prazo, prioridade e duração;
- Revisão Semanal guiada por dados e diagnóstico;
- Life RPG com atributos, temporada, moedas e recompensas;
- Command Palette, Quick Capture e central de notificações;
- tema claro/escuro persistente;
- PWA instalável, service worker e navegação mobile própria;
- identidade visual NexOS com Liquid Glass e ambiente cósmico responsivo.

### Backend
- Supabase Auth + Postgres;
- RLS por usuário em todas as tabelas expostas;
- motor de rotina: check-ins, foco, rotinas, revisões, lembretes e eventos;
- `complete_mission()` transacional e idempotente;
- rotinas concedem XP via transação e alimentam streak automaticamente;
- `redeem_reward()` transacional;
- `bootstrap_nexus()` idempotente para criar a estrutura inicial de cada conta;
- `nexus_keepalive()` sem leitura de dados pessoais.

### Infra
- Cloudflare Worker + Static Assets;
- SPA fallback para rotas do app;
- `/api/health` e `/api/system/supabase`;
- GitHub Action diária como única automação de keep-alive do Supabase.

## Stack

- React 19 + TypeScript + Vite
- Supabase
- Cloudflare Workers
- Lucide
- CSS próprio responsivo, sem dependência de design system externo

## Desenvolvimento local

```bash
cp .env.example .env.local
npm install
npm run dev
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Sem as variáveis do Supabase, algumas superfícies ainda podem usar os mocks de `src/data/mock.ts` para manter o frontend navegável.

## Cloudflare

O `wrangler.jsonc` publica o frontend como Static Assets e executa o Worker primeiro apenas para `/api/*`.

```bash
npm run deploy
```

## Supabase

As migrações versionadas estão em `supabase/migrations/`:

1. `nexus_core` — entidades principais, índices e RLS;
2. `nexus_core_fk_indexes` — índices de relações;
3. `nexus_routine_engine` — rotina, foco, check-ins, eventos, lembretes e RPCs transacionais;
4. `nexus_bootstrap` — estrutura inicial idempotente por usuário;
5. `nexus_progression_automations` — XP de rotina e streak automático.

## Arquitetura

```text
.github/workflows/   automações de infraestrutura
public/              PWA / service worker / identidade NexOS
src/
  components/        shell, navegação e UI reutilizável
  context/           estado e ações do NexOS
  data/              mocks temporários
  lib/               Supabase, API de domínio e eventos
  pages/             superfícies do produto
  types/             contratos de domínio
supabase/migrations/ schema versionado
worker/               edge/API Cloudflare
docs/                 decisões e evolução do produto
```

## Princípio

> O Notion é a origem da arquitetura mental, não o limite técnico do NexOS.

No NexOS, dados passam a ser relacionais, ações podem ser transacionais, gráficos são calculados a partir de eventos reais e a interface pode responder ao dispositivo, contexto, tempo e estado do usuário.
