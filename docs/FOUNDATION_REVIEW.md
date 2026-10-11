# Organização da base — 11 de outubro de 2026

Base revisada: `main` em `94d1c1f61e522ed76c09a6598ba79ee75b3aeb00`. Branch de implementação: `refactor/nexos-foundations`.

## Concluído nesta etapa

- Consolidar 59 imports CSS em 21 proprietários, retirar a folha RPG não importada e 1.373 declarações sobrescritas equivalentes. Retirar keyframes sem referência e nomes duplicados; manter fontes em um único lugar.
- Corrigir `:global` inválido, definir `--primary`, separar animações concorrentes de `transform` na atmosfera, usar tokens de texto/material em regras que quebravam o tema claro e preservar navegação móvel a 320 px.
- Centralizar diálogos, Escape, Tab, fundo inerte, retorno de foco e exclusividade entre overlays; capturas e perfil mostram falhas sem apagar o formulário.
- Corrigir calendário com datas civis em São Paulo, rotas com query e períodos reais de Insights. Não contar dias antigos como se fossem os últimos sete check-ins.
- Corrigir timer: medição por relógio, pausa excluída, prevenção de início/finalização simultâneos, checkpoint por usuário durante navegação/reload na mesma aba e cancelamento explícito ao reiniciar.
- Produção começa sem missões/projetos fictícios. Demo é explícito. Bootstrap e jornada deixam de repetir em cada mutação; leituras antigas não sobrescrevem a última solicitação. Orientação contextual se atualiza por minuto.
- Tornar criação de perfil tolerante à corrida de cadastro sem sobrescrever perfil existente; retirar chamada Supabase síncrona do callback de autenticação e corrigir uso do estado inicial de loading.
- Hidratar check-in assíncrono sem apagar edição em andamento; mostrar erros financeiros e notificações baseadas no estado real.
- Reparar fallback offline do shell e cache de navegação, sem cachear API/dados privados pelo service worker. Carregar páginas JS sob demanda.
- Adicionar lockfile, instalação determinística em CI, verificações de base e testes de datas/timer. Ignorar artefatos de compilação incremental.
- Criar direção visual, mapa de propriedade e regras de manutenção versionadas.

## Fronteiras e pendências explícitas

| Item                                   | Próxima intervenção                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS histórico dentro dos proprietários | Simplificar blocos e especificidade por tela durante o refinamento. O registro impede novas folhas sobrepostas, mas não elimina todo conflito possível.                                           |
| Dados reais e autenticação             | Validar contratos com ambiente de teste autenticado. Esta etapa não escreve dados de produção nem certifica o endpoint `nexus-login`, cuja implementação não está versionada aqui.                |
| Configuração Supabase                  | O fallback público atual continua apontando ao projeto existente para preservar o deployment. Padronizar envs de build/worker/CI e versionar o contrato da função de login em uma etapa dedicada. |
| Carregamento e mutações                | Workspace ainda usa leitura ampla. Próxima etapa: serviços por domínio, atualizações seletivas e feedback consistente em todos os formulários.                                                    |
| Demo                                   | Fixtures explícitas, captura local, check-in e timer; nem todos os cadastros possuem simulação completa. Não tratar como ambiente de validação do backend.                                        |
| Timer                                  | Checkpoint é da aba e usuário; não sincroniza várias abas/dispositivos. Sessões abandonadas fora dessa aba precisam de política de retomada e reconciliação com servidor.                         |
| Finanças                               | Erros visíveis; histórico conserva limite existente de 120 itens. Paginação e agregados completos precisam de serviço próprio antes de conclusões financeiras extensas.                           |
| Tema claro                             | Texto e materiais principais corrigidos. Contraste de todos os acentos, gráficos e estados ainda exige auditoria por tela com fontes definitivas.                                                 |
| PWA/relógio                            | Shell offline reparado; ícones raster, atualização dos chunks lazy e navegação em relógios merecem validação em dispositivos reais. Páginas nunca abertas podem não estar disponíveis offline.    |
| Comandos e inteligência                | Preservar motores com funções distintas. Central atual é de destinos/atalhos; integração do parser deve incluir prévia e confirmação, sem inventar execução de texto livre.                       |
| PRs antigos #14 e #15                  | Não fazer merge integral: foram construídos sobre estrutura anterior e têm conflitos. Recuperar seletivamente mudanças úteis depois de comparar com a base atual.                                 |
| Refinamento visual                     | Seguir ordem de DESIGN.md: shell → Agora/Hoje → Calendário/Foco → listas/formulários → dados/progressão → acabamento.                                                                             |

## Critérios de encerramento

`npm run check`, dry-run de Wrangler, revisão de desktop/celular, matriz de 14 rotas em cinco larguras, fluxo de modal por teclado, navegação durante pausa de foco e leitura do calendário em UTC. Evidências finais devem ser registradas no PR. Capturas usam ambiente isolado com demo explícito; fontes externas bloqueadas podem usar fallback. Esses testes não equivalem a validação autenticada de Supabase.

## Evidências da execução

- `npm run check`: registro de 21 proprietários, 150 animações únicas, teto reduzido a 243 `!important`, três testes funcionais, TypeScript e build aprovados.
- 70 combinações de rota/largura (14 × 5): sem overflow horizontal de documento e sem `pageerror`. Ambiente de demonstração isolado com fontes externas bloqueadas.
- Modais: Escape fecha; 18 passos de Tab permaneceram no diálogo; fundo inerte restaurado ao fechar.
- Calendário UTC: outubro de 2026 aparece corretamente para 11/10.
- Foco: pausa não acumula tempo, navegação mantém checkpoint e reinício remove sessão local.
- Wrangler dry-run aprovado; nenhum deploy realizado.
- JS inicial caiu de 602,16 kB para aproximadamente 465 kB com páginas sob demanda. CSS foi reorganizado e recebeu tokens; não houve redução expressiva de bytes e ela não é apresentada como objetivo cumprido.
