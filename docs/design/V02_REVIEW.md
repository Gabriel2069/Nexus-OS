# V02 — menu, Agora e Hoje

Base: V01, commit `77412152ba42e2c949b215d905856569d37255f7`, entregue na [PR #20](https://github.com/Gabriel2069/Nexus-OS/pull/20). V02 é uma continuação dependente dessa branch; não reimplementa a fundação independentemente. Estado e ordem de integração: [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18).

## Resultado e fronteiras

| Área        | Resultado                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menu        | Catálogo único para sidebar, dock e menu móvel; labels curtos registrados junto do destino; grupos visíveis, item atual e alias Tutorial/Guia consistentes; busca acessível; título/fechamento do sheet permanecem à mão durante a rolagem             |
| Agora       | Próximo passo é o centro; órbita 3D fora da coluna de texto; data/relógio contextual, agenda sem altura vazia imposta, continuidade e progressão secundárias. Perfil ausente não vira nível/XP fictício                                                |
| Hoje        | Cabeçalho compacto, contexto e check-in primeiro; trajetória e estudo depois; abertura/fechamento e espaço livre ao fim. Check-in não exibe um score neutro inventado antes de existir registro                                                        |
| Estados     | Leitura inicial mostra espera; erro de leitura tem mensagem/retry e não se transforma em agenda vazia. Check-in mostra salvando/salvo/alterado/erro; inputs ficam estáveis durante o envio. Rotinas bloqueiam repetição do mesmo item e mostram falhas |
| Integridade | Foco diário usa data civil de São Paulo; check-in antigo não aparece como salvo hoje. Ordenação de rotina copia a lista. Escritas de check-in/rotina sem usuário têm falha explícita; demo de check-in é restrito ao modo demonstrativo                |
| Fundação    | Documento deixa de ficar limitado à altura inicial do bootstrap; rolagem/renderização de páginas longas corrigidas. Acentos de rosa/âmbar respondem ao tema. Sidebar funciona mesmo sem acesso a localStorage                                          |

Preservados o motor de sugestões, descanso livre, destinos, schema, endpoints e políticas de recompensa. Não houve migração SQL, gravação em dados reais, merge ou deploy deste lote.

## Organização

- Agora e Hoje substituem suas camadas históricas nos respectivos page owners. Foram retiradas 95 entradas de seletores privados dessas páginas de components, além de retirar Hoje da decoração genérica de hero.
- Instrumento orbital pertence a environment e reutiliza o keyframe de V01; texto não recebe camada transparente móvel. Movimento reduzido, pausa global e visibilidade controlam a decoração.
- Removidos sete keyframes sem referência: 93 animações únicas. `!important` caiu de 103 para 101; o guard acompanha o novo teto.
- CI de PR passa a aceitar qualquer branch base, permitindo verificar PRs dependentes. Mantidos `contents: read`, limite de tempo, check e Wrangler dry-run; nenhum deploy automático foi adicionado. Referência: [GitHub — eventos de workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

## Evidência

- `npm run check`: propriedade CSS, keyframes/teto, documentos, três testes de datas/timer, typecheck e build aprovados.
- 32 combinações de Agora/Hoje: dados vazios e preenchidos × dois temas × quatro larguras (1440/834/390/320), sem overflow do documento.
- 28 combinações de smoke de navegação: 14 rotas × desktop/mobile, sem overflow do documento. Nenhum pageerror observado. Isso não é auditoria integral das outras páginas.
- Check-in: salvar em demo, editar, envio pendente, erro injetado e preservação do draft. Rotina: erro injetado, feedback visível e lista fonte sem ordenação por mutação.
- Menu: grupos, 22 passos de Tab contidos, transição para busca com um único overlay, recolher/expandir. Tema e menu continuam utilizáveis com storage bloqueado.
- Loading, erro de leitura e retry verificados; dados desconhecidos não aparecem como agenda vazia. Órbita pausada e preferência reduzida verificadas.
- Guard de produção sem usuário exercitado no componente real com bridge de acesso somente no ambiente de QA: o check-in falha antes de gravar ou simular sucesso. O bypass e os fixtures não fazem parte do repositório.
- Rolagem real do documento até as rotinas e capturas completas de páginas longas verificadas.
- CSS compilado aproximadamente 322 kB / 54,9 kB gzip; JS inicial aproximadamente 472,5 / 136,4 kB gzip. Bundles não medem GPU ou fluidez em aparelhos reais.

## Capturas

São exemplos de teste, com data congelada, dados ilustrativos e fontes externas bloqueadas (fallback local); não representam agenda sincronizada ou sessão de produção.

- [Agora — desktop escuro](previews/v02-agora-dark-1440.jpg)
- [Hoje — desktop escuro](previews/v02-hoje-dark-1440.jpg)
- [Agora — mobile claro](previews/v02-agora-light-390.jpg)
- [Hoje — mobile escuro](previews/v02-hoje-dark-390.jpg)
- [Menu móvel](previews/v02-menu-mobile.jpg)

## Limites e sequência

B01 conserva autenticação real, configuração, ownership e persistência em staging; B02 conserva reconciliação de foco entre dispositivos; P01 conserva aparelhos iOS/watch e offline. Sem certificação integral WCAG, VoiceOver ou desempenho em hardware real.

Após integrar V01 e V02 nessa ordem, seguir V03: Calendário e Foco. Reutilizar navegação, inspeção, materiais e tempo civil existentes, sem acrescentar folhas de acabamento.
