# V05/V06 — completar o observatório

Pedido de 12/10/2026: concluir Life, Metas, Insights, Revisão, Saúde, Finanças, Conhecimento, Tutorial, Planejamento, Histórico e Biblioteca; revisar menus, pop-ups, botões, encaixe, hover e movimento em todo o conjunto.

Branch `feat/v05-complete-observatory`, base PR #23 (`fdd9cbe`). IDs V05 e V06, com acabamento compartilhado de V01–V04/V07. Integração depende da cadeia #20 → #21 → #22 → #23; depois desta entrega, retarget e novo head/merge/CI devem ser conferidos. B01/B02/P01/R01 continuam separados. O estado corrente fica no issue #18.

## Composição entregue

| Área         | Organização e resultado                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Life RPG     | Perfil estelar com vidro e emissão branca, atributos legíveis, temporada, recompensas e conquistas; inspeção com seleção explícita, retorno de foco e resgate protegido contra concorrência. Ausência de temporada/recompensa não inventa cadastro.                      |
| Metas        | Direção dos projetos carregados, próximas ações e prazos; não apresenta um cadastro independente de metas que ainda não existe.                                                                                                                                          |
| Insights     | Período de 7/30 dias, tendências, calendário de atividade em reflow; leitura e registros do dia ficam juntos abaixo do mapa, evitando o vão lateral. Datas e rótulos seguem São Paulo. Energia ausente não vira zero; correlação é descrita com limite de interpretação. |
| Revisão      | Resumo, um rascunho editável e diagnóstico lateral. Semana civil, hidratação tardia respeita edição, erros preservam notas e as ações ficam pendentes durante envio. Demo salva localmente; produção sem perfil não confirma gravação.                                   |
| Saúde        | Check-in do dia, carga registrada e compromissos de saúde. Check-in antigo não orienta a energia de hoje; registros recentes ordenados sem mutar a fonte.                                                                                                                |
| Finanças     | Resumo cadastrado, plano, reserva, registro e consulta de movimentações. Valores conservam centavos; resumo ausente aparece como desconhecido. Projeção inclui lançamentos planejados de hoje e declara suas hipóteses/limite de leitura.                                |
| Conhecimento | Capturas aguardando decisão e notas ligadas a ações.                                                                                                                                                                                                                     |
| Biblioteca   | Consulta distinta: notas preservadas e aprendizados de revisões. Cadastro próprio de livros/arquivos permanece futuro, sem inventar acervo ou upload.                                                                                                                    |
| Planejamento | Compromissos e decisões que destravam projetos/missões. Atraso considera o dia civil e missões ativas.                                                                                                                                                                   |
| Histórico    | Atividade real e revisões; eventos sem ação são artigos, não botões desabilitados.                                                                                                                                                                                       |
| Tutorial     | Fluxo diário e consulta de todos os outros destinos do catálogo único, sem segunda navegação concorrente.                                                                                                                                                                |

As seções auxiliares preservam o modelo de contexto existente e recebem composição legível. Não introduzem tabelas nem fluxos fictícios. Loading/erro são explícitos antes de apresentar métricas confirmadas.

## Acabamento compartilhado

- Pop-ups de captura, perfil, comandos, notificações e navegação usam o mesmo vidro, textura estelar estática, borda óptica e `ModalSurface`. Teclado/fundo inerte continuam no proprietário existente. Uma preferência por transparência reduzida torna os materiais opacos por tokens compartilhados.
- Seletores de período/visualização foram consolidados num componente de estilo: emissão branca no escuro, tinta fria no claro, alvos de 44 px, estados coerentes e reflow. Retiradas as antigas camadas de pseudo-elementos que apagavam a seleção.
- Navegação ativa ganha rim/reflexo branco; sidebar permanece fixa. Busca oferece os 20 destinos, aceita consulta sem acento e mantém o resultado selecionado visível na rolagem.
- Captura/perfil bloqueiam envios simultâneos e edição durante envio. Erros conservam o formulário. Sem nova API de autenticação ou alteração de contrato SQL.
- Gráficos não exibem barra mínima positiva para zero; chaves React não repetem dias da semana. Descrição acessível do gráfico inclui valores.
- Cronômetro de Foco: código e proprietário CSS intactos em relação à base. A órbita/atmosfera aprovadas permanecem; movimento reduzido e pausa global continuam centrais. Nove keyframes sem referência de domínios retirados, sem retirar animações do cronômetro.

## Proprietários e dívida

21 proprietários CSS mantidos. Insights, Finanças, Life e Revisão consolidam seus estilos; detalhes das seções saem de components e vão para pages/section. Material e controles continuam em components, navegação em shell, animações em motion. Nenhum pacote ou stylesheet adicional.

`!important`: 87 → 82. Keyframes: 76 → 67. CSS compilado aproximadamente 232 kB / 40,4 kB gzip; JS inicial aproximadamente 475 kB / 137 kB gzip. Redução de CSS é consequência da reconciliação, não prova de desempenho em GPU/aparelho.

## Verificação

- `npm run check`: proprietários, documentos, três testes de datas/timer, TypeScript e build aprovados. `git diff --check` aprovado.
- 320 combinações: 20 rotas × quatro larguras (320/390/834/1440) × dois temas × vazio/preenchido. Sem excesso horizontal de documento/body ou `pageerror`; sidebar presa à janela após rolagem. As nove telas anteriores entram na mesma matriz.
- 24 combinações de inspeção de Life (atributo/recompensa/conquista) e 38 de pop-ups, nos dois temas/quatro larguras: limites horizontais, Tab contido, Escape, fundo inerte e retorno de foco. Busca sem acento + Enter navega. Tutorial lista 19 outros destinos do catálogo.
- Revisão: erro preserva notas, envio pendente, hidratação tardia não sobrescreve edição; formulário intocado hidrata dados. Semana/dia conferidos com navegador Pacific/Auckland e domínio America/Sao_Paulo. Reagendamento em falha não confirma sucesso.
- Life: resgate pendente único, falha visível, foco retorna ao card. Captura/perfil: dois envios no mesmo turno enviam apenas uma vez; campos ficam pendentes e o texto permanece em erro.
- Finanças: oito combinações com REST simulado; leitura/mutações filtradas por usuário, centavos, rótulos de data civil em São Paulo mesmo com navegador Auckland, planejados de hoje no horizonte, valor inválido, pending, erro conserva formulário, adicionar/excluir e falha de leitura sem saldo zero fictício.
- Demo nativa, sem mocks de mutação: salvar revisão → navegar → recuperar formulário; perfil ausente mostra estado indisponível, guards reais recusam salvamento de perfil e resgate sem autenticação. Demo não atribui coins fictícias.
- Movimento normal: alternância rápida, hover e abrir/fechar mantêm o estado final; movimento reduzido nas matrizes. Transparência reduzida em claro/escuro: Life e comando opacos, textura escondida. Controles do Foco dentro da região nas quatro larguras; mostrador 45:00 e arquivos do cronômetro intactos em relação à base.
- 35 capturas JPEG versionadas, com exemplos abaixo. Fontes externas bloqueadas; dados ilustrativos. Não equivalem a sessão autenticada ou auditoria integral de acessibilidade.

| Referência      | Escuro desktop                                                    | Claro celular                                                     |
| --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Life            | [Perfil](previews/v05-life-rpg-dark-1440.jpg)                     | [Perfil](previews/v05-life-rpg-light-390.jpg)                     |
| Metas           | [Tela](previews/v05-metas-dark-1440.jpg)                          | [Tela](previews/v05-metas-light-390.jpg)                          |
| Insights        | [Tela](previews/v05-insights-dark-1440.jpg)                       | [Tela](previews/v05-insights-light-390.jpg)                       |
| Revisão         | [Tela](previews/v05-revisao-dark-1440.jpg)                        | [Tela](previews/v05-revisao-light-390.jpg)                        |
| Saúde           | [Tela](previews/v05-saude-dark-1440.jpg)                          | [Tela](previews/v05-saude-light-390.jpg)                          |
| Finanças        | [Registros simulados](previews/v05-financas-ledger-dark-1440.jpg) | [Registros simulados](previews/v05-financas-ledger-light-390.jpg) |
| Conhecimento    | [Tela](previews/v05-conhecimento-dark-1440.jpg)                   | [Tela](previews/v05-conhecimento-light-390.jpg)                   |
| Tutorial        | [Tela](previews/v05-tutorial-dark-1440.jpg)                       | [Tela](previews/v05-tutorial-light-390.jpg)                       |
| Planejamento    | [Tela](previews/v05-planejamento-dark-1440.jpg)                   | [Tela](previews/v05-planejamento-light-390.jpg)                   |
| Histórico       | [Tela](previews/v05-historico-dark-1440.jpg)                      | [Tela](previews/v05-historico-light-390.jpg)                      |
| Biblioteca      | [Tela](previews/v05-biblioteca-dark-1440.jpg)                     | [Tela](previews/v05-biblioteca-light-390.jpg)                     |
| Comandos        | [Pop-up](previews/v05-command-dark-1440.jpg)                      | [Pop-up](previews/v05-command-light-390.jpg)                      |
| Navegação móvel | —                                                                 | [Menu](previews/v05-navigation-light-390.jpg)                     |

## Limites

Capturas usam dados ilustrativos e fontes externas bloqueadas; não representam o acervo pessoal nem atividade de produção. REST financeiro é simulado para testar o frontend, sem escrita real. Não certifica RLS, função de login, sessão autenticada, consulta financeira além de 120 lançamentos, retomada entre dispositivos, contraste composto de todas as superfícies, GPU, leitor de tela ou PWA em aparelhos reais.

Não houve merge ou deploy. O bloqueio anterior de dry-run Cloudflare não foi contornado nem reapresentado como verificação local aprovada. O build local e o CI da entrega são evidências distintas.
