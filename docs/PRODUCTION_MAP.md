# NexOS — mapa de produção

Acompanhamento corrente: [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18). Integrações: [issue #16](https://github.com/Gabriel2069/Nexus-OS/issues/16).

Registro canônico de trabalho. IDs não mudam ao trocar branch ou título. Status de execução corrente deve ser consultado nos issues/PRs vinculados; esta tabela registra marcos observados e dependências, sem simular um gerente de tarefas automático.

## Linha de produção e fronteiras

| ID  | Entrega                                | Evidência ou estado desta revisão                                                       | Depende de                         | Proprietário técnico                                                   | Critério de conclusão                                                                                                                                  |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01 | Base consolidada                       | PR #17 integrado na main (`3d1a901`), CI aprovado                                       | —                                  | Context, router, dates, modal, 21 CSS owners                           | Merge sem conflitos; mapa/documentação consistentes; guardas e build verdes                                                                            |
| D01 | Prancheta e contrato espacial          | PR #19 integrado (`965c426`); prancheta e contrato versionados                          | F01                                | DESIGN.md e docs/design                                                | Materiais, paleta, tipografia, hierarquia, movimento, estados, desktop/mobile e mapa por tela explícitos                                               |
| V01 | Shell e login                          | Implementação e revisão em V01_REVIEW.md; PR de entrega                                 | D01                                | foundation, environment, motion, shell, auth                           | Topbar/sidebar/dock/login coesos; teclado, foco, contraste e movimento reduzido verificados                                                            |
| V02 | Agora e Hoje                           | Implementação/revisão V02_REVIEW.md sobre a PR #20                                      | V01                                | pages/now, pages/today                                                 | Hierarquia de ação, conteúdo real, loading/error/empty, composição responsiva                                                                          |
| V03 | Calendário e Foco                      | Calendário revisado em V03_REVIEW.md; Foco revisado em V04_REVIEW.md                    | V01; coordenação com B02           | pages/calendar, pages/focus                                            | Datas e sessão corretas; inspectors, controles, densidade e interação refinados                                                                        |
| V04 | Missões/Projetos/Rotinas/Estudos       | Estudos em V03_REVIEW.md; Missões/Projetos/Rotinas em V04_REVIEW.md                     | V02                                | respectivos page owners                                                | Padrões comuns de lista/formulário sem CSS global adicional                                                                                            |
| V05 | Insights/Finanças/Life RPG             | Implementação/revisão em V05_REVIEW.md                                                  | V04; B01 para métricas amplas      | respectivos page owners                                                | Leitura confiável, dados incompletos declarados, celebração proporcional                                                                               |
| V06 | Perfil/Revisão/Tutorial e contexto     | Implementação/revisão em V05_REVIEW.md                                                  | V01                                | components e pages/review/tutorial                                     | Conteúdo, estados e fluxos coerentes com os mesmos materiais                                                                                           |
| V07 | Caixa de entrada e visor compartilhado | Implementação/revisão V03_REVIEW.md sobre a PR #21                                      | V02                                | components, shell, foundation, pages/inbox                             | Menu fixo; vidro/textura com tema e contraste; processar com pending/erro preservando escolhas                                                         |
| N01 | Navegação e início conectados          | Implementação/revisão em N01_REVIEW.md sobre PR #24                                     | V01–V07; B02 para retomada externa | NavigationContext, catálogo, shell/components/now e links de entidades | Busca/atalhos/recentes/contexto/drafts funcionais, identidade isolada, teclado/reflow, contador preservado                                             |
| A01 | N.E.X: IA/chat/voz/OAuth/memória       | Main integrado; migrations/RLS/cotas testadas no NexOS remoto; IA/OAuth reais pendentes | N01; B01 para validação remota     | worker/nex, NexContext/NexConsole, migração N.E.X                      | Cotas atômicas, RLS, confirmação, callback/segredos; testes locais e depois provedores/OAuth reais                                                     |
| B01 | Dados/autenticação/configuração        | Pendente; código e migrations inspecionados, backend autenticado não validado           | F01                                | nexus-api, Context, Calendar/Finance, AuthGate, worker/env             | Configuração única; login versionado ou contrato documentado; requests seletivos; RLS/ownership/idempotência testados em staging; paginação financeira |
| B02 | Retomada de foco                       | Checkpoint por usuário/aba implementado; reconciliação externa pendente                 | F01                                | FocusPage, focus-clock, API                                            | Política para sessão abandonada, reload, troca de conta e múltiplos dispositivos; nenhuma contagem fictícia em produção                                |
| P01 | PWA/relógio                            | Shell offline reparado; dispositivos reais pendentes                                    | V01                                | SW, manifest, assets, shell                                            | Cache/update coerentes com chunks lazy; ícones apropriados; safe areas; abertura e navegação em iOS/watch verificadas                                  |
| I01 | Google Calendar                        | Contrato planejado, sem certificação de conexão ativa                                   | B01                                | worker/integrations, calendar API                                      | OAuth server-side revogável, ID estável, sync idempotente/bidirecional, conflito e erro visíveis                                                       |
| I02 | Notificações/integrações restantes     | Planejado; core local existe                                                            | I01 para sync; B01 para execução   | notification engine, worker/integrations                               | Preferências e confirmação respeitadas; não misturar plano com capacidade entregue                                                                     |
| R01 | Progressão avançada                    | Motor transacional existe; talentos/bosses/combos/conquistas avançadas pendentes        | B01; V05                           | domain/RPC e rpg owner                                                 | Regras, ownership e idempotência verificáveis; nenhuma recompensa duplicada                                                                            |

## Ordem recomendada

Começar por D01 → V01 → V02. Em paralelo de planejamento, preparar os contratos de B01; não declarar os fluxos autenticados validados por causa de screenshots. B02 e P01 entram antes de prometer foco entre dispositivos ou disponibilidade offline completa. I01 vem depois da fronteira de dados; recursos avançados dependem de dados confiáveis.

## Contrato de um PR

1. Informar ID, resultado observável, arquivos proprietários e base SHA.
2. Declarar dependências: se a base não foi integrada, não abrir outro PR que reescreva os mesmos proprietários independentemente.
3. Trabalhar em um lote vertical: exemplo V01 deve incluir tokens → material → navegação → estados → testes relevantes.
4. Atualizar as regras existentes; reduzir dívida no proprietário. Não adicionar folhas de acabamento `vN`.
5. Registrar evidência real, limites e novos itens com ID. Check verde não substitui backend autenticado ou revisão visual.
6. Revisar o head e CI antes de merge com lease. Após merge, atualizar links de execução sem manter checklists duplicados.

## Decisões registradas

| Decisão                                       | Motivo                                                                         | Reavaliar quando                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 21 proprietários CSS                          | Retirar o histórico de correções por camadas                                   | Um domínio novo exigir fronteira própria, com mudança explícita do registro |
| PRs #14/#15 supersedidos; preservar histórico | A base mudou, e o merge integral reintroduziria estilos concorrentes           | Recuperação seletiva em V01/V04/V05 com evidência                           |
| Cosmos e Liquid Glass pertencem ao NexOS      | Identidade solicitada; sistema pessoal, sem misturar estética de outro projeto | Direção explícita do usuário                                                |
| Uma ação principal por região                 | Profundidade e atmosfera não podem esconder o próximo passo                    | Fluxo exigir decisões realmente equivalentes                                |
| Texto e material respondem ao tema            | Fundos translúcidos exigem contraste com o que passa atrás                     | Auditoria real identificar combinações inadequadas                          |
| Movimento tem um autor por propriedade        | Evitar disputa de transform/opacity/CSS/JS                                     | Introduzir movimento composto com elementos aninhados e testes              |
| Checkpoint de foco é local à aba              | Limite presente; não fingir sincronização                                      | B02 entregar reconciliação autenticada                                      |

O inventário antigo está preservado em `archive/ROADMAP_2026-10-11.md`. Intenções não cobertas acima devem gerar um novo item antes de entrar no desenvolvimento; nunca sumir num PR de “polimento”.

## Ajuste de sequência — 12/10/2026

O usuário priorizou corrigir menu/material/encaixe e seguir com Calendário, Caixa de entrada e Estudos. Esta entrega reúne V07 + a parte Calendário de V03 + a parte Estudos de V04, com reparos de composição em V02. A branch depende de `feat/v02-daily-observatory` (PR #21, `01129e4`), que depende da PR #20. Não concluir V03/V04 integralmente: Foco, Missões, Projetos e Rotinas ainda precisam de refinamento. Próximo lote sugerido: Foco, reaproveitando o material comum; depois Missões/Projetos/Rotinas. Estados e integração autenticada seguem B01/B02, sem certificação por screenshot.

## Continuidade de V04

A branch `feat/v04-stellar-actions` parte da PR #22 (`aa94121`), preservando a cadeia #20 → #21 → #22. Reforça a assinatura de V01/V02/V07 e implementa os recortes restantes de V03/V04, sem certificar B01/B02. Missões e Projetos usam decisões salvas explicitamente; Rotinas considera o dia civil; Foco preserva o cronômetro. Próximo lote visual sugerido: V05 (Insights/Finanças/Life RPG), mantendo B01 separado para métricas completas e persistência autenticada.

## Encerramento visual solicitado — V05/V06

O usuário ampliou o lote final para Life, Metas, Insights, Revisão, Saúde, Finanças, Conhecimento, Tutorial, Planejamento, Histórico e Biblioteca, com revisão compartilhada de menus/pop-ups/seleção. Branch `feat/v05-complete-observatory` depende da PR #23 (`fdd9cbe`). V05 cobre progressão/dados; V06 inclui as áreas contextuais e o acabamento solicitado. Os cadastros próprios ausentes e a validação real permanecem em B01/R01; não tratar consultas do workspace como novos serviços. Evidência em V05_REVIEW.md; estado/PR corrente no issue #18. Próximo passo: integração sequencial e validação autenticada antes de promessas adicionais.

## Upgrade funcional — N01

O usuário priorizou início, seleção de áreas e conexões. N01 é uma entrega vertical sobre a PR #24 (`9a9b441`): central única, áreas fixadas/recentes, links de entidades, memória de rascunhos e retomada local de Foco. Não é outra camada independente de acabamento. Preferências/drafts pertencem a NavigationContext; relógio/checkpoint mantém o proprietário existente. Critérios e limites em N01_REVIEW.md; PR/CI corrente no issue #18. B01/B02/P01/I01/I02/R01 continuam com suas fronteiras.

## N.E.X — prioridade de 13/10/2026

A01 constrói a base de IA gratuita, chat/voz, OAuth incremental e memória sobre a PR #25, sem substituir os motores locais. Não declara integrações remotas verificadas por mocks. Critérios, configuração e limites em [NEX_INTELLIGENCE.md](NEX_INTELLIGENCE.md); execução corrente no #18. Próxima fase: ativação real, Picker e ferramentas externas/internas adicionais, mantendo B01/B02 e I01/I02 separados.
