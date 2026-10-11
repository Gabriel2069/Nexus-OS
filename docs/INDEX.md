# NexOS — documentos e fontes de decisão

| Documento                                                        | Autoridade e uso                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [PRODUCTION_MAP.md](PRODUCTION_MAP.md)                           | Registro canônico de itens, ordem, dependências, proprietário e critérios de entrega. Cada item mantém o mesmo ID nos PRs e issues. |
| [ROADMAP.md](ROADMAP.md)                                         | Visão de sequência; não mantém uma segunda lista de conclusão.                                                                      |
| [PR_REGISTER.md](PR_REGISTER.md)                                 | Destino dos PRs e mapa de recuperação das propostas antigas.                                                                        |
| [ARCHITECTURE.md](ARCHITECTURE.md)                               | Código presente e limites das camadas.                                                                                              |
| [STYLE_SYSTEM.md](STYLE_SYSTEM.md)                               | Proprietários CSS e regras de cascata.                                                                                              |
| [DESIGN.md](../DESIGN.md)                                        | Contrato visual corrente e entrada para a prancheta.                                                                                |
| [FOUNDATION_REVIEW.md](FOUNDATION_REVIEW.md)                     | Evidência histórica da reestruturação, não backlog paralelo.                                                                        |
| [nexos-integrations-v1.md](nexos-integrations-v1.md)             | Contrato planejado de integrações e preferências pessoais. Não prova conexão ativa.                                                 |
| [EXTERNAL_INTEGRATIONS_SETUP.md](EXTERNAL_INTEGRATIONS_SETUP.md) | Procedimento de configuração, sem status de entrega próprio.                                                                        |
| [archive/ROADMAP_2026-10-11.md](archive/ROADMAP_2026-10-11.md)   | Snapshot histórico das intenções e declarações anteriores, sem certificação de implementação.                                       |

## Resolver divergências

Código/teste observado decide o que existe; GitHub issue/PR decide o estado de execução; `PRODUCTION_MAP.md` decide responsabilidade e dependências; `DESIGN.md` decide identidade. Documentação histórica serve de contexto. Uma especificação planejada não pode ser tratada como comportamento implantado.

Ao alterar uma decisão, atualize o proprietário e registre motivo, impacto e critério de verificação no PR. Não replique o mesmo checklist em vários mapas. Nenhum mecanismo garante ausência de todos os conflitos futuros: a disciplina torna responsabilidade, divergência e dívida detectáveis.

A execução é acompanhada no [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18); a frente de integrações permanece no [issue #16](https://github.com/Gabriel2069/Nexus-OS/issues/16).
