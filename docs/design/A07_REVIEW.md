# A07 — espaço de trabalho e continuidade

Base: `main` em `856f3d3f705035be4aa43223769357b5d3449cb4` (A06 / PR #34). Proprietários: NexDesktop coordena instrumentos; NexWindowFrame é o único dono de geometria/transform; nex-windows fornece geometria pura; NexContext mantém identidade/estado; nex-local consulta os dados já carregados. Material no components.css existente. Nenhuma dependência adicionada.

## Resultado

O espaço de trabalho permite encaixe à esquerda/direita, expansão e retorno ao tamanho livre, organização das janelas visíveis em grade e recolhimento/restauração coletiva. A grade usa espaço disponível, com no máximo seis instrumentos; se a altura não comportar células de 220 px, usa cascata sem expulsar registros ou aprovações. No celular, continua a janela adaptada à tela e a alternância pelo dock; controles de geometria sem utilidade no toque ficam ocultos.

O seletor do dock filtra títulos, informa se a janela está recolhida/em primeiro plano e restaura diretamente. Ordem do dock, elementos DOM e percurso de teclado permanecem estáveis quando o empilhamento muda; elevar uma janela não remove/reinsere seus controles durante o clique. Alt+PageUp/PageDown alterna janelas visíveis; Alt+M, dentro de uma janela, recolhe; setas no cabeçalho movem e no controle de tamanho redimensionam. Duplo clique no cabeçalho alterna expansão. Ctrl/⌘+Enter envia a mensagem sem transformar Enter simples em envio nem interferir na composição de texto. Todos os comandos de layout também têm controles visíveis; Escape fecha o seletor antes de atingir uma janela. Modais verdadeiros continuam isolando o desktop.

A busca determinística aceita `Buscar: física` e `Buscar projetos: NexOS`, além dos setores missões/rotinas/estudos. Compara termos sem distinção de caixa/acentos nos títulos, nomes, disciplina, notas, descrição e próxima ação carregados. Não consulta campos desconhecidos nem interpreta o texto buscado como ação. Conta os resultados do conjunto carregado e limita a exibição total a 40. Uma janela de resultados é atualizada sem criar duplicatas. Missões atrasadas usa o dia civil em São Paulo, excluindo hoje, Inbox, canceladas, concluídas e datas inválidas. `Recolher janelas` e `Restaurar janelas` também funcionam no chat local.

## Direção visual e movimento

A referência é precisão operacional: profundidade distingue a janela ativa, luz branca marca a borda principal, título e ações permanecem compactos, o núcleo cósmico aprovado continua no entorno. Escolhas de produto para uma aplicação web, sem alegar componentes nativos ou certificação Apple.

Referência consultada em 14/10/2026: [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion). A orientação sobre propósito, brevidade, cancelamento e movimento opcional fundamenta o comportamento; medidas abaixo são decisões próprias do NexOS, não valores exigidos pela Apple.

| Gatilho                     | Propriedade e duração                                       | Interrupção e alternativa                                                                |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Abrir/restaurar             | Opacidade + escala/deslocamento, 220 ms                     | Nova intenção cancela a anterior; movimento reduzido imediato                            |
| Recolher                    | Opacidade + deslocamento em direção ao item do dock, 180 ms | Instrumento fica inerte no início; restauração cancela a saída sem perder conteúdo       |
| Encaixar/organizar/expandir | FLIP com transform, 260 ms                                  | Captura a posição visual atual antes de cancelar; arraste/resize não recebe interpolação |
| Ativar janela               | Borda/sombra, 140 ms                                        | Sem transição CSS de geometria ou transform                                              |
| Abrir seletor               | Keyframe existente nex-window-enter, 180 ms                 | Política global de movimento reduzido                                                    |

A regra histórica `[role=dialog]` foi restringida para não animar os instrumentos modeless. Transições da moldura têm propriedades explícitas para não introduzir uma segunda interpolação de largura sob a política global de duração reduzida. WAAPI é limpo no cancelamento, término e desmontagem; mudança da preferência do sistema assenta a janela no estado atual. Nenhum loop, biblioteca de animação, blur animado ou novo keyframe.

## Verificação

`npm run check` aprovado: 45 testes, TypeScript app/Worker, build, 27 documentos/23 IDs, 21 proprietários CSS, 69 keyframes únicos e 82 important. Build mantém o aviso de chunk inicial acima de 500 kB (aproximadamente 513 kB minificado); não há medição de ganho de desempenho em aparelho físico.

`scripts/verify-nex-ui.cjs` completo aprovado: oito composições N.E.X (320/390/834/1440, temas claro/escuro), 80 combinações de rota/largura sem overflow ou pageerror, encaixe/grade, fechamento de janela inativa no primeiro clique, ordem estável, teclado e pointer para resize, recolher/restaurar, busca positiva/vazia e atualização de título. Motion normal foi exercitado com transições sucessivas, restauração durante saída e evento real de mudança de prefers-reduced-motion. Consultas e gestão de janelas não chamaram chat.

Regressões de modais, prévias/formulários através de rotas, Google Tasks copiado após confirmação, leitura de arquivo Google simulada, memória, cotas e pausa de voz passaram. Áudio gerado foi capturado/processado por MediaRecorder/VAD/WAV reais no navegador; transcrição/chat/fala do dispositivo e endpoints N.E.X foram simulados. Nenhuma escrita externa real foi feita pela QA.

Capturas com demo explícita e APIs simuladas:

- [Desktop escuro](previews/a07-workspace-dark-1440.jpg).
- [Seletor no celular claro](previews/a07-switcher-light-390.jpg).

## Limites

Busca abrange somente dados já carregados, sem índice global, Google ou documentos não consultados. Janelas, dimensões e rascunhos permanecem apenas na sessão em memória; não há persistência após reload. Expansão/encaixe são recursos web, não gestão das janelas do sistema operacional. Atalhos podem disputar com combinações do navegador/SO; os controles de tela continuam disponíveis.

Login, Worker, migrações, RLS, cotas gratuitas, autorizações Google e cronômetro de Foco não foram alterados. QA local não prova novas chamadas a Google/Groq nem comportamento de microfone/VoiceOver em iPhone físico. Não há integração externa nova nesta entrega.
