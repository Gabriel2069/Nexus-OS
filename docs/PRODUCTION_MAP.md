# NexOS — mapa de produção

Acompanhamento corrente: [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18). Integrações: [issue #16](https://github.com/Gabriel2069/Nexus-OS/issues/16).

Registro canônico de trabalho. IDs não mudam ao trocar branch ou título. Status de execução corrente deve ser consultado nos issues/PRs vinculados; esta tabela registra marcos observados e dependências, sem simular um gerente de tarefas automático.

## Linha de produção e fronteiras

| ID  | Entrega                            | Evidência ou estado desta revisão                                                | Depende de                       | Proprietário técnico                                       | Critério de conclusão                                                                                                                                  |
| --- | ---------------------------------- | -------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01 | Base consolidada                   | PR #17 integrado na main (`3d1a901`), CI aprovado                                | —                                | Context, router, dates, modal, 21 CSS owners               | Merge sem conflitos; mapa/documentação consistentes; guardas e build verdes                                                                            |
| D01 | Prancheta e contrato espacial      | PR #19 integrado (`965c426`); prancheta e contrato versionados                   | F01                              | DESIGN.md e docs/design                                    | Materiais, paleta, tipografia, hierarquia, movimento, estados, desktop/mobile e mapa por tela explícitos                                               |
| V01 | Shell e login                      | Implementação e revisão em V01_REVIEW.md; PR de entrega                          | D01                              | foundation, environment, motion, shell, auth               | Topbar/sidebar/dock/login coesos; teclado, foco, contraste e movimento reduzido verificados                                                            |
| V02 | Agora e Hoje                       | Implementação/revisão V02_REVIEW.md sobre a PR #20                               | V01                              | pages/now, pages/today                                     | Hierarquia de ação, conteúdo real, loading/error/empty, composição responsiva                                                                          |
| V03 | Calendário e Foco                  | Planejado                                                                        | V01; coordenação com B02         | pages/calendar, pages/focus                                | Datas e sessão corretas; inspectors, controles, densidade e interação refinados                                                                        |
| V04 | Missões/Projetos/Rotinas/Estudos   | Planejado                                                                        | V02                              | respectivos page owners                                    | Padrões comuns de lista/formulário sem CSS global adicional                                                                                            |
| V05 | Insights/Finanças/Life RPG         | Planejado                                                                        | V04; B01 para métricas amplas    | respectivos page owners                                    | Leitura confiável, dados incompletos declarados, celebração proporcional                                                                               |
| V06 | Perfil/Revisão/Tutorial            | Planejado                                                                        | V01                              | components e pages/review/tutorial                         | Conteúdo, estados e fluxos coerentes com os mesmos materiais                                                                                           |
| B01 | Dados/autenticação/configuração    | Pendente; código e migrations inspecionados, backend autenticado não validado    | F01                              | nexus-api, Context, Calendar/Finance, AuthGate, worker/env | Configuração única; login versionado ou contrato documentado; requests seletivos; RLS/ownership/idempotência testados em staging; paginação financeira |
| B02 | Retomada de foco                   | Checkpoint por usuário/aba implementado; reconciliação externa pendente          | F01                              | FocusPage, focus-clock, API                                | Política para sessão abandonada, reload, troca de conta e múltiplos dispositivos; nenhuma contagem fictícia em produção                                |
| P01 | PWA/relógio                        | Shell offline reparado; dispositivos reais pendentes                             | V01                              | SW, manifest, assets, shell                                | Cache/update coerentes com chunks lazy; ícones apropriados; safe areas; abertura e navegação em iOS/watch verificadas                                  |
| I01 | Google Calendar                    | Contrato planejado, sem certificação de conexão ativa                            | B01                              | worker/integrations, calendar API                          | OAuth server-side revogável, ID estável, sync idempotente/bidirecional, conflito e erro visíveis                                                       |
| I02 | Notificações/integrações restantes | Planejado; core local existe                                                     | I01 para sync; B01 para execução | notification engine, worker/integrations                   | Preferências e confirmação respeitadas; não misturar plano com capacidade entregue                                                                     |
| R01 | Progressão avançada                | Motor transacional existe; talentos/bosses/combos/conquistas avançadas pendentes | B01; V05                         | domain/RPC e rpg owner                                     | Regras, ownership e idempotência verificáveis; nenhuma recompensa duplicada                                                                            |

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
