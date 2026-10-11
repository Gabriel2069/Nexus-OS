# Direção visual do NexOS

NexOS é um sistema pessoal com identidade cósmica: profundidade discreta, luz ciano e violeta, materiais de vidro e tipografia clara. O conteúdo e o próximo passo devem dominar a tela. Tempo livre continua sendo tempo livre; progressão nunca exige ocupar todo intervalo.

Esta etapa organiza a base existente. O refinamento seguinte deve trabalhar composição, hierarquia, densidade e microinterações por tela, usando os mesmos materiais e tokens, sem acrescentar folhas de correção globais.

## Princípios

- Uma responsabilidade visual tem um arquivo proprietário. Ajustar a regra existente antes de acrescentar outra.
- `--text`, `--muted`, `--panel`, `--line` e tokens de vidro devem responder ao tema. Cores de status precisam continuar distinguíveis no tema claro.
- Usar Inter para leitura, Space Grotesk para títulos e Oxanium apenas para acentos de identidade. Fontes têm uma única declaração em `foundation.css`.
- Gradientes e atmosfera apoiam o conteúdo. Evitar vários autores animando o mesmo `transform`.
- Modais usam `ModalSurface`; o plano de fundo fica inerte, Escape fecha, Tab permanece no diálogo e o foco retorna ao acionador.
- Conferir celular a 320 e 390 px, tablet a 834 px e desktop a 1440 px. A apresentação de relógio abaixo de 240 px tem limitações próprias e não deve governar celulares.
- Movimento reduzido é uma preferência funcional. A interface precisa ficar utilizável sem animações de entrada ou atmosfera contínua.

## Ordem do refinamento

1. Shell, navegação, carregamento e estados de erro/vazio.
2. Agora e Hoje: hierarquia, espaços vazios, ações e leitura contextual.
3. Calendário e Foco: legibilidade, controles e detalhes do dia/sessão.
4. Missões, Projetos, Rotinas e Estudos: listas, formulários e inspeção.
5. Insights, Finanças e Life RPG: densidade e interpretação honesta dos dados.
6. Perfil, tutorial, revisão e acabamento PWA.

O mapa técnico está em [STYLE_SYSTEM.md](docs/STYLE_SYSTEM.md). O estado de execução e as pendências estão em [FOUNDATION_REVIEW.md](docs/FOUNDATION_REVIEW.md).
