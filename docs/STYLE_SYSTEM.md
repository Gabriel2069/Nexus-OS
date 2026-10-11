# Sistema de estilos: proprietários e cascata

`src/styles.css` é o único ponto de entrada. Os 59 imports antigos foram substituídos por 21 proprietários. Os nomes expressam responsabilidade, não a ordem histórica de ajustes.

| Proprietário                              | Responsabilidade                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `foundation.css`                          | Tokens, fontes, tema, documento, foco visível e política de movimento reduzido |
| `motion.css`                              | Definições únicas de keyframes                                                 |
| `environment.css`                         | Estrelas, nebulosas, órbitas e pseudo-elementos de atmosfera                   |
| `components.css`                          | Cards, botões, inputs, modais, materiais e padrões compartilhados              |
| `shell.css`                               | Sidebar, topbar, dock, geometria e navegação móvel                             |
| `auth.css`                                | Login e boot                                                                   |
| `pages/now.css`, `pages/today.css`        | Agora e Hoje                                                                   |
| `pages/calendar.css`, `pages/focus.css`   | Calendário e Foco                                                              |
| `pages/mission.css`, `pages/project.css`  | Missões e Projetos                                                             |
| `pages/routine.css`, `pages/studies.css`  | Rotinas e Estudos                                                              |
| `pages/insight.css`, `pages/finance.css`  | Insights e Finanças                                                            |
| `pages/rpg.css`                           | Life RPG, atributos, temporada, conquistas e recompensas                       |
| `pages/inbox.css`, `pages/review.css`     | Inbox e revisão semanal                                                        |
| `pages/section.css`, `pages/tutorial.css` | Seções auxiliares e tutorial                                                   |

## Como alterar

Localize o seletor no proprietário. Corrija o bloco existente e suas variantes de breakpoint. Um seletor pode reaparecer em condições diferentes; isso não autoriza uma nova camada global ao fim do ponto de entrada. Quando houver conflito, confira especificidade, condição e ordem, incluindo shorthands como `background`, `animation` e `transform`.

Materiais comuns ficam antes das variantes de página. Para um ajuste exclusivo de tela, use o namespace da tela. A atmosfera não deve ocupar o pseudo-elemento usado para foco ou interação do componente.

A consolidação retirou 1.373 declarações que eram sobrescritas por regras posteriores equivalentes, mantendo barreiras conservadoras para shorthands. Listas de seletores foram distribuídas entre proprietários; isso pode aumentar o número textual de declarações sem acrescentar um comportamento. Não confundir contagem de bytes com quantidade de sistemas visuais.

Há ainda regras históricas e exceções responsivas dentro dos proprietários. A reorganização não promete uma cascata inteiramente minimalista: a simplificação restante deve acompanhar o refinamento de cada tela, com comparação visual. O teto inicial de 243 declarações `!important` congela a dívida existente; a meta é reduzi-lo, não usá-lo como espaço para novas exceções.

## Verificação automática

`npm run check:foundations` verifica registro e ordem dos imports, arquivos não registrados, seletores com dois proprietários, nomes duplicados de animação, keyframes fora do proprietário, imports internos indevidos, `:global` inválido, conflitos de merge e teto de `!important`. `npm run check` também executa testes de datas/timer, TypeScript e build.

A verificação não prova ausência de todo conflito de especificidade nem valida contraste de todas as telas. Revisão visual e teste de fluxo continuam necessários.
