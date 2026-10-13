# A05 — central compacta e diálogo por voz

Base: main 2913202, PRs #30/#31 integradas. Continuação do pedido de menu/cabeçalhos menores, menos fantasia ostensiva e N.E.X próximo às três referências fornecidas. Usa a arquitetura atual, sem nova API paga, binding, migration ou alteração de autenticação.

## Resultado e proprietários

| Região      | Alteração                                                                                                                       | Proprietário                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Navegação   | Sidebar 64 px recolhida / 200 px expandida, grupos/rota atual, atalhos na única barra de 56 px; preferência anterior preservada | AppShell, Sidebar, Topbar, WorkspaceRail, shell.css        |
| Ambiente    | Gutter/padding/cards/heróis mais compactos, ícones mais sóbrios e galáxia/nebulosa com menos intensidade                        | foundation, components, environment                        |
| N.E.X       | Centro livre com malha projetada de 240 pontos, dados reais à esquerda, conversa à direita; resultados abrem sobre o núcleo     | NexConsole, NexHologram, NexInstruments, components/motion |
| Ajustes     | Conexões, memória, privacidade e diagnóstico reunidos em superfície própria; sem catálogo de vinte atalhos na tela inicial      | NexConsole, ModalSurface, UI_EVENTS                        |
| Voz         | Um proprietário para MediaRecorder, análise local de silêncio, Whisper existente, fala local e ciclos de conversa               | use-nex-voice, voice-boundary, NexContext                  |
| Integrações | Painéis Google somente calendar/tasks/drive, no máximo um por resposta; arquivos autorizados abrem leitores Docs/Sheets/Slides  | nex-tools, NexInstruments, NexReadout, Worker existente    |

## Fluxos e limites

Conversar por voz exige ação explícita e voz local em português. O app pede permissão de microfone, detecta fala sustentada, encerra após 1,5 s de silêncio e usa a rota Whisper já existente. Áudio termina antes de iniciar resposta falada. Ao terminar a leitura, escuta novamente. Máximo de 29 s por captura, 12 s de silêncio inicial sem envio, oito falas/cinco minutos por sessão; cotas reais do Worker podem pausar antes. Pausa manual, mudança de visibilidade, abertura de outra superfície, unmount, falha ou cota liberam tracks/contexto e impedem repetição automática. Reconhecimento de “parar conversa” evita nova inferência; comandos exatos de abrir áreas usam catálogo local, sem chamada de IA. Ditado continua separado e preenche o campo antes do envio. O controle Respostas faladas lê automaticamente respostas digitadas, usando somente voz local.

Sem SpeechRecognition remoto oculto, chaves no frontend, gravação em storage, hotword permanente ou controle do sistema operacional do dispositivo. Desktop/iPhone dependem dos recursos de áudio, permissão e vozes instaladas. O teste automatizado não prova som no aparelho do usuário, Siri/PWA em background ou inferência Whisper real.

Painel Google desconectado mostra solicitação de conexão e não chama google/read/google/start. Conta autorizada usa a rota existente com JWT verificado, RLS, tokens criptografados e escopo mínimo. Nenhum novo grant automático. Dados consultados para exibição não são enviados ao modelo sem o opt-in Google. Drive continua restrito a drive.file; selecionar ID não concede acesso. Leitores, import snapshot e criação confirmada já existentes são preservados; Picker/sync bidirecional e edição de conteúdo seguem pendentes.

## Verificação

- npm run check: 33 testes, TypeScript app/Worker e build. SQL/RLS/idempotência/cotas existentes continuam exercitados; contrato dos painéis e roteamento local são validados.
- Chromium: oito layouts N.E.X (320/390/834/1440, claro/escuro), 80 smoke das 20 rotas, ausência de overflow/pageerror; teclas, Escape/inert, preferências, dock/reload, ações confirmadas, memória, draft em erro e inspector.
- Captura real de áudio gerado com oscillator/MediaRecorder/AudioContext/WAV: dois ciclos automáticos, microfone encerrado antes da leitura, pausa manual, comando falado de parada e interrupção por cota. Whisper/chat/síntese são mocks; não houve áudio pessoal ou chamada paga.
- Google em QA: painel desconectado não autoriza nem consulta; painel conectado recebe fixture Drive e abre leitura de documento pelo ID retornado. Não certifica consentimento ou acesso Google remoto.
- Movimento: canvas pausa por atmosfera/movimento reduzido e visibilidade; janelas têm entrada curta, fallback estático. 21 proprietários CSS, 69 keyframes únicos, 82 important.
- Foco: nenhum diff em FocusPage, pages/focus.css ou focus-clock; motor SQL/login/configuração de secrets preservados.

[Desktop escuro](previews/nex-compact-dark-1440.jpg) e [celular claro](previews/nex-compact-light-390.jpg) são capturas QA com dados simulados, não do workspace pessoal. Publicação e sessão real serão verificadas após integração; estado corrente no issue #18, conexões no #16.

Fontes de comportamento: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). A última pode usar um serviço remoto do navegador; não foi adotada como fallback silencioso. As páginas HIG de sidebar/materiais retornaram somente a exigência de JavaScript na consulta; decisões de densidade/composição aqui são julgamento de projeto, sem certificação HIG.
