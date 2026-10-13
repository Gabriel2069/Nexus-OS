# Implementação visual — D01 → V01–V06

Base estrutural integrada em [PR #17](https://github.com/Gabriel2069/Nexus-OS/pull/17), commit `3d1a901e6b23533d3782ec08a089a649b5f15c98`. Proposta: [prancheta](visual-board.html). Responsabilidades e dependências: [mapa canônico](../PRODUCTION_MAP.md). Status: [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18). Este documento detalha lotes, sem uma segunda lista de conclusão.

## Primeiro lote recomendado: V01 / shell e login

**Resultado:** identidade reconhecível antes de abrir qualquer página; topbar, sidebar, dock, login, botões e inspeção pertencem ao mesmo sistema. O conteúdo continua legível e o próximo passo não depende de movimento.

| Ordem dentro do lote    | Proprietário                                            | Mudança e evidência exigida                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tokens e temas       | `foundation.css`                                        | Reconciliar tokens existentes com a paleta proposta. Não acrescentar tokens equivalentes com nomes diferentes. Conferir texto, status, foco, seleção e fundos reais nos dois temas |
| 2. Materiais e ambiente | `environment.css`, `components.css`                     | Separar ambiente, conteúdo e controles. Uma nebulosa ampla, estrelas estáticas e lente de marca; superfície densa sob texto. Fallback sem backdrop-filter                          |
| 3. Movimento            | `motion.css`                                            | Um dono por propriedade; press no wrapper, reflexo em camada interna. Preferências globais e controle de atmosfera; cancelar listeners/RAF e parar em aba oculta e fora de tela    |
| 4. Navegação            | `shell.css`, componentes de shell, `data/navigation`    | Mesmos destinos e acentos em desktop e mobile, aria-current, rótulos, focus-visible, safe areas e drawer. Não criar uma segunda tabela de rotas                                    |
| 5. Entrada              | `auth.css`, AuthGate sem mudar contrato de autenticação | Logo existente, contexto espacial, uma ação clara; estados esperando/erro, mensagem real e abertura utilizável sem efeitos                                                         |
| 6. Inspeção e controles | `components.css`, ModalSurface                          | Material coerente; exclusividade de overlays, root inerte, Tab/Escape/retorno de foco preservados; botões primário/secundário/disabled/destrutivo e mensagens legíveis             |

Branch sugerida: `feat/v01-cosmic-shell`, criada da main atual após incorporar os documentos de direção. PR deve informar ID V01, base SHA, proprietários, screenshots antes/depois e limites. Não abrir outro PR que reescreva os mesmos proprietários sem dependência explícita. Recuperar intenções dos PRs #14/#15 pelo [registro](../PR_REGISTER.md), sem cherry-pick integral das folhas antigas.

### Critérios verificáveis de V01

- Conferir larguras 320, 390, 834 e 1440 px, temas claro/escuro, reflow com zoom, teclado e texto ampliado. Relógio abaixo de 240 px segue P01 e não governa o layout mobile.
- Medir contraste composto onde houver transparência. Os ratios do JSON valem somente para cores opacas sobre o painel indicado. Ícones, gráficos, contornos e focus ring também entram na revisão.
- Acionamento tátil proposto de 44 px; nenhum destino essencial depende de hover. Sem scroll horizontal do documento.
- Testar ausência de blur, movimento reduzido, atmosfera pausada, aba oculta e retomada. Resultado final deve permanecer completo e utilizável.
- Profilar no aparelho real antes de aumentar partículas ou blur. Ponto inicial: sem WebGL, sem render loop contínuo para cartões; atmosfera CSS limitada e no máximo um elemento 3D focal por região. Esses são limites de projeto, não uma medição de desempenho já obtida.
- `npm run check`; revisar modal, query navigation e autenticação quando os arquivos correspondentes mudarem. CI verde e screenshot não validam backend autenticado.

## Lotes seguintes

| ID  | Escopo                               | Condição de entrega                                                                                                                                                                |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V02 | Agora e Hoje                         | Reutilizar V01; próximo passo evidente, agenda secundária, descanso livre, texto contextual; dados vazios/erro/carregando identificáveis; draft de Hoje preservado                 |
| V03 | Calendário e Foco                    | Grade densa, inspector consistente; órbita focal única; datas civis e timer continuam corretos. B02 define reconciliação externa antes de prometer continuidade entre dispositivos |
| V04 | Missões, Projetos, Rotinas e Estudos | Padrões de lista, filtro, formulário e inspector comuns; feedback de conclusão breve. Aplicar nos page owners, sem nova folha global                                               |
| V05 | Insights, Finanças e Life RPG        | Gráficos/valores sobre fundo estável, origem e período explícitos; paginação B01 antes de métricas globais. Progressão e celebração proporcionais às regras reais                  |
| V06 | Perfil, Revisão, Tutorial e Section  | Preferências, conteúdo e estados consistentes; respeitar movimento/tema; áreas adicionais usam padrões existentes                                                                  |
| P01 | PWA e relógio                        | Safe areas, atualização do cache, ícones/splash e teste real iOS/watch. Não inferir entrega pelo desktop                                                                           |

B01 prepara dados/autenticação/configuração e validação de ownership em staging. I01/I02 seguem no issue #16. Recursos funcionais não devem ser acrescentados silenciosamente a um PR visual; alterações necessárias devem ter ID e evidência próprios.

## Manter a linha de produção

1. Antes de começar, consultar main, issue #18 e PRs abertos. Declarar ID e arquivos proprietários.
2. Mudança de decisão atualiza DESIGN.md ou mapa técnico correspondente; histórico explica contexto e não mantém status paralelo.
3. Entrega inclui estado real e limites. Novo problema entra com ID; não fica apenas em comentário, screenshot ou nota local.
4. Depois do merge, registrar o PR no issue canônico, fechar entregas supersedidas e preservar links de recuperação.
5. Tokens propostos só passam a ser autoridade de runtime depois da incorporação e verificação. A prancheta permanece referência, nunca import global de CSS.

## Sequência revista em 12/10/2026

A prioridade solicitada passou a ser menu fixo, cards em vidro/textura e encaixe, seguidos de Calendário, Caixa de entrada e Estudos. O recorte corrente está em [V03_REVIEW.md](V03_REVIEW.md), com V07 e fases de V03/V04 no mapa canônico. Cards adotam vidro denso; o contrato atual em DESIGN.md prevalece sobre a proposta opaca original da prancheta. Foco permanece o próximo domínio sugerido, seguido de Missões/Projetos/Rotinas.
