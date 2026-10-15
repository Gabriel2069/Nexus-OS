# A09 ~ acabamento e continuidade

Base: main `492411125d6a981d256c7130deffcf9b0b84feca` (A08 / PR #36). Branch feat/a09-final-craft. Depende de A08. Última rodada solicitada pelo usuário; sem novo provedor, serviço, SQL, SDK, scope ou secret.

## Resultado e decisões

O menu móvel tinha captura rápida e recolhimento na mesma posição quando expandido. A captura passa à esquerda, com Menu/Recolher à direita; os dois acompanham a altura da barra sem sobrepor controles. Uma única captura permanece em MobileDock, removida do AppShell. Entrada de 210 ms e saída de 150 ms usam WAAPI para opacity/transform; inversão parte do estado visual atual, cancelar remove a anterior. Inert e aria-expanded mudam imediatamente; hidden assenta no fim. Movimento reduzido é imediato, inclusive quando ativado durante a transição. Escape recolhe e devolve foco, respeitando modais e janelas N.E.X.

A ajuda N.E.X deixa de ser uma sequência de botões iguais: busca sem acentos, três grupos, instrução curta e campo pessoal vazio para comandos com título/termo. Exemplos ilustrativos não são enviados por clique. A consulta direta usa a gramática determinística existente; criação, alteração e conclusão passam pela aprovação existente. Biblioteca em NexCommandHelp, metadados/validação em nex-command-catalog, sem inferência implícita ou novas ferramentas externas.

Rotinas de hoje mostra a próxima etapa pendente em ordem e abre o inspector certo por uma URL interna codificada. O módulo também aceita reabertura explícita no mesmo endereço. Próxima etapa não marca nada; ação continua nos controles autenticados existentes. A preparação de Foco em NexReadout usa a duração da missão, substituindo os 25 min fixos anteriores; ausência/inválido recebe 45 min como no plano, sem começar a sessão.

O vidro conserva textura/constelações e recebe refração discreta em uma camada decorativa, sem inclinar texto ou animar blur. Pointer de mouse atualiza coordenadas com um único rAF pendente por card; sem loop ocioso. Limpa frame/listeners ao desmontar e estado ao sair/ocultar aba/mudar preferências. Desligado em toque, movimento/transparência reduzidos e atmosfera pausada. Botões secundários recebem material levemente translúcido no owner existente. Corrigido valor inválido de color-mix 4800% em campos para 94%.

DESIGN.md repetia o início de STYLE_SYSTEM.md. O contrato visual agora concentra identidade/decisões e aponta ao único mapa técnico, mantendo as revisões posteriores. Não surge uma folha ou plano concorrente.

## Referência e evidência

Referências oficiais consultadas em 15/10/2026: [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) e [Materials](https://developer.apple.com/design/human-interface-guidelines/materials). Orientam propósito, brevidade, interrupção e hierarquia do material. Esta implementação é web com decisões próprias do NexOS; não replica componentes nativos nem certifica HIG. Durações e camadas acima são escolhas do projeto.

`npm run check` aprovado: 57 testes, TypeScript app/Worker, build, 29 documentos/25 IDs, 21 CSS owners, 69 keyframes e 82 important. Testes novos exercitam biblioteca reconhecível pelo parser, limites/campos vazios, títulos como dados, busca sem acentos, links codificados e próxima etapa por dia civil sem mutação.

`scripts/verify-final-ui.cjs` passou os fluxos e 24 composições (Planejamento/Rotinas/N.E.X × 320/390/834/1440 × claro/escuro). Conferiu não sobreposição dos controles móveis, Escape sem fechar o menu sob modal, saída ainda visível porém inerte, reversão rápida e preferência de redução durante a transição. Refração foi exercitada com mouse, movimento/transparência reduzidos e fallback do vidro; mudança de preferência limpa o estado e o frame revalida a política antes de escrever coordenadas.

Biblioteca: busca positiva/vazia, campos pessoais inicialmente vazios, nenhuma escrita ao selecionar exemplo/preparar/revisar. Rotinas: próxima etapa, link exato, marcação pelo módulo existente e nova consulta refletindo a etapa seguinte. Foco preparado pela consulta local usa 20 min exatos. Zero chamadas a chat e zero execução de operações no roteiro novo. Endpoints, permissões Google e dados são simulados; marcação de rotina usa o caminho demo explícito.

Regressão A08 completa passou: 40 composições, planner/Foco/retomada, projetos/filtros/histórico, erro e seleção seguinte da Entrada, comandos e confirmação única. Regressão N.E.X completa passou: oito layouts + 80 rotas/larguras, motion normal/interrompido/reduzido, mouse/teclado, modais/drafts/aprovações, Google e memória/cotas. Captura/VAD/WAV são reais com áudio gerado; Whisper/chat/síntese/Google são mocks. Nenhuma operação externa real foi feita. Capturas A07/A08 preservadas.

As primeiras capturas atingiam a entrada das animações e não serviam como prova visual. O roteiro foi corrigido para aguardar a ajuda montada e capturar a matriz estática com movimento reduzido; motion normal continua testado separadamente. Capturas finais inspecionadas com demo explícita e APIs simuladas:

- [Comandos no desktop escuro](previews/a09-commands-dark-1440.jpg).
- [Menu expandido no celular claro](previews/a09-menu-light-390.jpg).

Sem medição em dispositivo físico, não há alegação de FPS ou bateria melhorados. Cronômetro, autenticação, Worker, cotas e SQL permanecem preservados.

## Limites

Dados de rotina e comandos são os carregados e autorizados pelo fluxo existente. Próxima etapa é sugestão, não execução autônoma, planejamento persistido ou sincronização Google. Exemplos com endpoint usam mocks em QA; conta autenticada e iPhone físico continuam fora da evidência local. Sem medição de FPS, bateria ou ganho de desempenho físico. Preferências de transparência dependem do suporte do navegador; fallback sem blur permanece. Histórico A07/A08 não deve ser sobrescrito por novas capturas.
