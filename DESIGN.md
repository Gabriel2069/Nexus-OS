# Direção visual do NexOS

NexOS é um sistema pessoal com identidade cósmica: profundidade discreta, luz ciano e violeta, materiais de vidro e tipografia clara. O conteúdo e o próximo passo devem dominar a tela. Tempo livre continua sendo tempo livre; progressão nunca exige ocupar todo intervalo.

A base foi integrada pela PR #17. A direção proposta é **Observatório pessoal**: ambiente cósmico, conteúdo estável e navegação em vidro lenticular. A [prancheta D01](docs/design/visual-board.html) demonstra desktop, mobile, login, materiais, paleta, estados e movimento. O [plano de implementação](docs/design/IMPLEMENTATION_PLAN.md) define a incorporação por lote; as [referências](docs/design/REFERENCES.md) distinguem evidência e tradução autoral. V01 incorpora a paleta e os materiais principais no runtime; o JSON da prancheta permanece um registro de proposta, não uma segunda fonte de tokens. A [revisão V01](docs/design/V01_REVIEW.md) registra escopo e evidências.

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

O mapa técnico está em [STYLE_SYSTEM.md](docs/STYLE_SYSTEM.md). O estado de execução está no [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18), com dependências em [PRODUCTION_MAP.md](docs/PRODUCTION_MAP.md). [FOUNDATION_REVIEW.md](docs/FOUNDATION_REVIEW.md) preserva evidência histórica.

## Contrato de composição e materiais

- Ambiente: vazio profundo, nebulosa assimétrica, estrelas rarefeitas; o efeito não atravessa regiões de leitura.
- Conteúdo: grafite mineral no escuro e painel claro estável no claro; tabelas, gráficos, campos e números não recebem vidro transparente.
- Controles: vidro lenticular na navegação, dock e inspeção, com rim superior e sombra coerente; fallback sólido mantém identificação.
- Marca: lente 3D e estrela existente. Naves são detalhes narrativos de login/progressão, sem substituir instruções por jargão espacial.
- Uma ação principal por região, com títulos, contexto e métricas em ordem explícita. Tema claro tem acentos escuros próprios.
- Movimento: resposta curta nos controles, órbita serena no foco, ambiente opcional e pausável. Movimento reduzido prevalece. Pausar ambiente não pausa o relógio funcional.
- Layout: alvos táteis propostos de 44 px; leitura normal em 16 px e compacto em 14 px. Valores iniciais de ritmo, raio e movimento estão em [tokens.json](docs/design/tokens.json), sem segunda fonte de runtime.

## Aceitação visual

Texto normal ≥ 4,5:1 e grande ≥ 3:1; medir contraste composto em material translúcido e conferir foco/ícones/contornos. Validar os dois temas, teclado, reflow, movimento reduzido, estados loading/error/empty e aparelhos reais. A paleta isolada não certifica conformidade ou desempenho. A prancheta é referência visual, não substitui dados reais nem os contratos de autenticação.

## V01 — estado incorporado

Login e base compartilhada adotam Observatório pessoal. `AppearanceProvider` centraliza tema e atmosfera, com controle disponível antes e depois do acesso. Atmosfera inclui a pausa dos loops decorativos legados; spinners funcionais e relógio não são paralisados. Vidro tem fallback opaco e campo de acesso conserva label, ajuda, foco e erro. Dock usa Agora/Hoje/Agenda/Foco/Mais; a busca também está disponível no menu móvel. A composição das páginas segue os lotes V02–V06.

## V02 — menu e dia

Agora organiza próximo passo → trajetória → continuidade; Hoje organiza contexto/check-in → compromissos/estudo → rotinas/espaço livre. A órbita é um instrumento decorativo fora do texto, com os mesmos controles de movimento de V01. Menu móvel usa grupos e o catálogo único de navegação. Estados desconhecidos não viram vazios confirmados; rascunhos e falhas de escrita permanecem explícitos. A [revisão V02](docs/design/V02_REVIEW.md) registra escopo, evidências e dependência da PR #20.
