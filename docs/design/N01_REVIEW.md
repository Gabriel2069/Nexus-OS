# N01 — observatório conectado

Pedido de 12/10/2026: um grande upgrade funcional da organização, início, menus, hierarquia, detalhes ópticos e conexões entre áreas. Branch `feat/n01-connected-observatory`, base PR #24 (`9a9b441`). Depende da fila #20 → #21 → #22 → #23 → #24. Estado corrente no issue #18; B01/B02/P01 e integrações continuam separados.

## Resultado e responsabilidade

| Frente          | Comportamento                                                                                                                                                                                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorar        | Uma central para desktop, celular e Ctrl/⌘ K. Busca normalizada por palavras, áreas, missões, notas em missões e projetos carregados. Resultado abre o item específico; filtros por grupo, recentes e preferências. Até 40 primeiros resultados de busca, sem prometer um índice completo do servidor.                                             |
| Atalhos fixados | Faixa persistente em todas as telas, até seis áreas configuráveis. Estado ativo, limite comunicado, armazenamento validado e separado por identidade. Preferências persistem neste navegador, sem sincronização externa.                                                                                                                           |
| Menu lateral    | Busca direta e grupos recolhíveis. Grupo da rota fica disponível; modo compacto conserva todos os destinos. Sidebar continua presa à janela e rola internamente.                                                                                                                                                                                   |
| Início          | Saudação e contexto do momento → acessos/retomada/ciclo essencial → missões/projetos reais → agenda → horizonte/progresso. O essencial foi movido para a retomada, evitando um segundo card de continuidade. Atalhos, ideias, busca e itens em trabalho têm ações explícitas.                                                                      |
| Relações        | Missão → projeto correto → missão correta → Foco vinculado. Foco oferece retorno à missão/projeto. Metas, planejamento, notas e revisão levam a projetos/missões específicos. Uma faixa de áreas relacionadas orienta a continuidade em cada domínio.                                                                                              |
| Rascunhos       | Missões/Projetos mantêm o rascunho enquanto o app permanece aberto, inclusive após fechar inspeção ou trocar de área. Salvamento explícito limpa a cópia pendente; conclusão bem-sucedida também limpa o rascunho da missão. Troca de identidade limpa a memória. Reload fecha esta memória: o formulário pede salvar antes de atualizar a página. |
| Foco global     | Indicador de bloco ativo/pausado fora da tela do Foco, com retorno direto. Lê o checkpoint da aba e usa o cálculo de relógio existente. Não escreve sessões, não conclui blocos nem atribui XP/coins. Ao atingir o tempo, indica “Tempo atingido”, sem simular finalização.                                                                        |
| Teclado/estado  | ModalSurface recebe foco inicial explícito na busca/captura, sem duas rotinas disputando foco. Tab/Escape/inert/retorno permanecem centralizados. Links inválidos têm feedback; mesmo link pode reabrir um inspector fechado. Alias /guia segue o catálogo canônico.                                                                               |

## Identidade e manutenção

A composição preserva vidro, cosmos, constelações, órbita e emissão branca no escuro/tinta fria no claro. Navegação recebe profundidade óptica e borda de seleção, com controles de 44 px, hierarquia e reflow. Sem WebGL, bitmap, pacote ou paleta concorrente. O desenho e o cálculo do cronômetro não foram alterados.

21 proprietários CSS permanecem: geometria/nav/indicador em shell, central/material/relacionados em components, início em pages/now, inspeção nos respectivos pages. A implementação antiga do menu móvel e estilos privados sem uso foram retirados. NavigationContext é o proprietário de preferências e rascunhos de navegação; catálogo continua em data/navigation. Rascunhos não entram em localStorage, URLs ou backend. O indicador de Foco é um consumidor do checkpoint existente; evita atualização decorativa no Foco e em página oculta, e para o contador derivado ao chegar a zero.

Nenhuma mudança de schema, autenticação/RLS, RPC de recompensa ou API financeira. O campo de busca usa apenas o workspace carregado. O armazenamento de navegação contém rotas de áreas, não títulos privados, IDs de entidades ou rascunhos. Não acrescentar outra central de destinos ou outro proprietário do relógio.

## Verificação

`npm run check`: fundações, documentação, seis testes de contratos/datas/relógio, TypeScript e build aprovados. Permanecem 21 proprietários CSS, 67 keyframes e 82 declarações important, sem ampliar o teto. CSS aproximadamente 237 kB (41 kB gzip); entrada JS aproximadamente 471 kB (135 kB gzip), sem dependência nova.

Playwright/Chromium: 320 combinações de 20 rotas × quatro larguras (320, 390, 834, 1440) × dois temas × workspace vazio/preenchido. Sem overflow horizontal; sidebar fixa após rolagem. Oito combinações do Explorar verificaram geometria, contenção de Tab, Escape, inert restaurado e faixa aderente sob o topbar. Nenhum erro de página nas sequências finais.

Fluxos adicionais aprovados: busca com acentos/caso, reabertura do mesmo item, missão→projeto→missão→Foco, ligação de Metas, limite/persistência/troca de atalhos e limpeza de recentes. Rascunho de projeto e missão preservado ao navegar; após salvar, texto normalizado do servidor simulado substitui a cópia pendente. Troca de identidade limpa preferências/rascunhos; drafts não são serializados. Links inválidos, grupos recolhíveis, armazenamento indisponível e transparência reduzida têm comportamento verificável.

Demo nativa, sem relógio congelado ou mutações substituídas: criar/editar/salvar projeto; iniciar, pausar, retomar e reiniciar bloco de 25 minutos. Contagem real continua fora do Foco; pausa permanece estável, retorno conserva estado e reinício remove o indicador. Indicador ativo não causa overflow nas quatro larguras. Arquivos de estilo do cronômetro e cálculo do relógio têm diff vazio.

| Tela     | Desktop escuro                                 | Celular claro                                 |
| -------- | ---------------------------------------------- | --------------------------------------------- |
| Início   | [1440 px](previews/n01-agora-dark-1440.jpg)    | [390 px](previews/n01-agora-light-390.jpg)    |
| Explorar | [1440 px](previews/n01-explorer-dark-1440.jpg) | [390 px](previews/n01-explorer-light-390.jpg) |
| Missões  | [1440 px](previews/n01-missoes-dark-1440.jpg)  | [390 px](previews/n01-missoes-light-390.jpg)  |
| Projetos | [1440 px](previews/n01-projetos-dark-1440.jpg) | [390 px](previews/n01-projetos-light-390.jpg) |
| Foco     | [1440 px](previews/n01-foco-dark-1440.jpg)     | [390 px](previews/n01-foco-light-390.jpg)     |

## Limites

Dados ilustrativos, fontes externas bloqueadas e ambiente de demo isolado. Troca de identidade simulada prova a separação das preferências/rascunhos da UI, não autenticação ou RLS reais. Preferências são locais ao navegador; rascunhos só vivem na memória do app. Checkpoint de Foco permanece por usuário/aba: não sincroniza dispositivos nem resolve abandono externo (B02). Cadastros próprios de notas/livros/arquivos e integrações externas não são simulados por decoração. Não certifica acessibilidade integral, GPU, aparelhos reais ou PWA completo. Sem merge/deploy.
