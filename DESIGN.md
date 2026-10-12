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

Há ainda regras históricas e exceções responsivas dentro dos proprietários. A reorganização não promete uma cascata inteiramente minimalista: a simplificação restante deve acompanhar o refinamento de cada tela, com comparação visual. O teto atual de 82 declarações `!important` (243 → 103 em V01 → 101 em V02 → 94 no visor → 87 em V04 → 82 em V05/V06) congela a dívida existente; a meta é reduzi-lo, não usá-lo como espaço para novas exceções.

## Verificação automática

`npm run check:foundations` verifica registro e ordem dos imports, arquivos não registrados, seletores com dois proprietários, nomes duplicados de animação, keyframes fora do proprietário, imports internos indevidos, `:global` inválido, conflitos de merge e teto de `!important`. `npm run check` também executa testes de datas/timer, TypeScript e build.

A verificação não prova ausência de todo conflito de especificidade nem valida contraste de todas as telas. Revisão visual e teste de fluxo continuam necessários.

Em V02, `day-route`, `essential-loop` e `exam-glance` pertencem a pages/now; check-in, `routine-mini`, `single-study-target` e `life-space-note` pertencem a pages/today. Foram retiradas 87 entradas desses seletores de components. Navegação desktop/dock/menu usa o catálogo único em data/navigation.

Neste lote, detalhes privados do Calendário foram retirados de components e consolidados em pages/calendar; inbox e studies simplificam as respectivas cascatas. `visor-texture` é uma camada estática de components usada por SurfaceCard, Sidebar e Agora, com `aria-hidden`/pointer-events none. O gradiente de densidade de vidro é único em foundation. Foram retirados os halos genéricos de page-stack que duplicavam CosmicEnvironment e excediam os limites do documento. Geometria desktop reserva a mesma variável de largura usada pela sidebar fixed; listas de destinos rolam internamente.

V04 centraliza CosmicTexture/StellarSpark e o mapa estelar de ambiente; cores de emissão pertencem a foundation. Missões/Projetos/Rotinas consolidam seus proprietários e deixam componentes comuns de formulário em components. As regras do cronômetro permanecem iguais; o entorno foi reconciliado no proprietário focus. Não reintroduzir halos independentes em cada página para reforçar a identidade.

V05/V06 consolida os proprietários de Insights, Finanças, Life e Revisão; context-signal/live pertence agora a pages/section. Heatmap/consulta de dia pertence a pages/insight. View-switcher e materiais de pop-up têm uma implementação compartilhada em components; a antiga seleção com camadas luminosas concorrentes foi retirada. Nove keyframes de domínios sem referência foram retirados. Não alterar mostrador/anéis de Foco para propagar material de modal.

## V05/V06 — completar a consulta e o acabamento

As onze áreas restantes adotam a assinatura estelar aprovada, com hierarquia própria para progressão, dados, revisões e contexto. Biblioteca e Conhecimento têm consultas distintas sobre os registros existentes; nenhum cadastro ausente é sugerido por decoração. Pop-ups usam a textura e o material compartilhados, e seletores têm uma fonte de estilo para emissão/seleção. Rótulos de dias seguem São Paulo mesmo em outro fuso do navegador. Cronômetro de Foco preservado. Evidências e limites em [V05_REVIEW.md](docs/design/V05_REVIEW.md).
