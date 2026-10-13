# NexOS — registro e recuperação de PRs

Revisão: 11 de outubro de 2026. Só três PRs estavam abertos: #14, #15 e #17. Branches preservadas; fechamento de PR supersedido não apaga código nem histórico.

| PR                                                     | Head auditado                              | Destino                                                | Razão                                                                                  |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [#17](https://github.com/Gabriel2069/Nexus-OS/pull/17) | `refactor/nexos-foundations`               | F01 integrado na main; squash `3d1a901`                | Propriedade, correções funcionais, lockfile, testes e mapa de produção                 |
| [#14](https://github.com/Gabriel2069/Nexus-OS/pull/14) | `d2f4fdbe1312de12acd7057b5baed5d2e5bb7fc2` | Encerrado como supersedido por F01; recuperação abaixo | 6 commits exclusivos; import global antigo e conflito com navegação/estilos atuais     |
| [#15](https://github.com/Gabriel2069/Nexus-OS/pull/15) | `e0bb2455b0dcb19a2c16a70c01c74249cafa0312` | Encerrado como supersedido por F01; recuperação abaixo | 3 commits exclusivos; duas folhas globais concorrentes e conflito com ponto de entrada |

## Mapa de recuperação — não é cherry-pick integral

| Origem                     | Proposta preservada                              | Situação atual ou destino                                                                    |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| #14 Sidebar `aria-current` | Semântica da rota ativa                          | Já presente no Sidebar atual; manter                                                         |
| #14 tons de navegação      | Acentos por seção consistentes no desktop e dock | V01; usar os tons de `data/navigation`, sem uma segunda paleta                               |
| #14 estados de sheet       | Material, press, safe areas e scroll de diálogo  | ModalSurface/shell já organizados; V01 revisa o material nos proprietários atuais            |
| #14 superfícies/hero       | Borda especular, sombra, halo e órbita           | D01/V01 definem contrato; distribuir entre components/environment/page owner                 |
| #15 botões/ícones/tabs     | Feedback de pressão, seleção e resposta local    | V01/V04; reconciliar com estados existentes; não animar ícone/formulário indiscriminadamente |
| #15 continuidade/menus     | Entrada de página e inspector/drawer             | V01/V03; um autor de transform e foco preservado                                             |
| #15 atmosfera/tipografia   | Campos de fundo e identidade de seção            | D01; manter Inter/Space Grotesk/Oxanium até decisão formal e prova de legibilidade           |
| #15 motion reduzido        | Estados estáticos utilizáveis                    | Política global já presente; cada lote visual valida o resultado                             |

Os diffs exclusivos foram confrontados com a base atual. “Já presente” refere-se à capacidade observada, não à equivalência de cada valor CSS. A recuperação futura reimplementa a intenção no proprietário atual e registra comparação antes/depois. Não reabrir os PRs antigos para fundi-los à nova cascata.

## Direção e implementação atual

A [PR #19](https://github.com/Gabriel2069/Nexus-OS/pull/19) integrou D01 na main (`965c426`). V01 parte dessa base e recupera seletivamente materiais e feedback dos PRs supersedidos, mantendo os proprietários atuais. Evidência e fronteira estão em [V01_REVIEW.md](design/V01_REVIEW.md); o link da entrega corrente fica no issue #18.

V02 (`feat/v02-daily-observatory`) é dependente de V01 (`feat/v01-cosmic-shell`, PR #20); seu PR aponta para essa branch até a integração de V01. Não mesclar V02 antes da base. Após integrar V01, retarget para main e verificar novo merge/head/CI. Registro corrente no issue #18.

A próxima entrega (`feat/v03-orbital-workspace`) depende da PR #21 (`01129e4`). Contém V07 e fases de V03/V04, conforme a prioridade do usuário; não representa conclusão de Foco ou dos demais domínios. Ordem de integração: #20 → #21 → entrega de visor/Calendário/Inbox/Estudos. Retarget e CI devem ser revistos após cada integração. Revisão em [V03_REVIEW.md](design/V03_REVIEW.md); links correntes ficam no issue #18.

V04 (`feat/v04-stellar-actions`) depende da [PR #22](https://github.com/Gabriel2069/Nexus-OS/pull/22), head `aa94121`. Integra a assinatura estelar e os recortes restantes de Missões/Rotinas/Foco/Projetos; não incorpora validação autenticada nem reconciliação entre dispositivos. Evidências em [V04_REVIEW.md](design/V04_REVIEW.md).
