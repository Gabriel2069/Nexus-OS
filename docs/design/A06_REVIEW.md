# A06 — desktop N.E.X e operação local

Base main `4b489f2`, PRs #32/#33 integradas. Implementação sobre a arquitetura aprovada, sem SQL, credenciais, novos scopes, billing ou mudanças no cronômetro/login.

## Comportamento

| Frente | Resultado | Proprietário |
| --- | --- | --- |
| Janelas | Desktop modeless global, arraste por ponteiro/setas, resize, maximizar/minimizar/restaurar; consulta/rascunho preservados na navegação | NexDesktop, nex-windows, NexContext |
| Camadas | Modais continuam ModalSurface/useOverlay, com root inerte e Escape próprio; janela não bloqueia o app | AppShell, UI_EVENTS |
| Comandos | Gramática exata e limitada; modo local padrão; perguntas livres exigem opção Usar IA | nex-local, NexContext |
| Aprovação | Proposta → prévia → confirmação → recibo; estado por UUID compartilhado entre chat/janela | NexInstruments, NexContext, Worker existente |
| Dados | Leitor único de dados e arquivos autorizados; abrir entidade, preparar foco, concluir após revisão, adicionar missão ao projeto | NexReadout |
| Módulos | Instrumentos contextuais para consultar dados/Google e preparar ações sem inferência | NexModuleBridge |

## Comandos disponíveis

| Exemplo | Execução |
| --- | --- |
| Oi; que horas são?; comandos | Resposta/ajuda local |
| O que tenho hoje?; agenda de amanhã | Datas civis São Paulo, agenda recorrente e prazos dos registros carregados |
| Qual é meu próximo passo? | Regras existentes de prioridade/prazo/carga; sem recomendação inventada pelo modelo |
| Mostre projetos; missões; rotinas; estudos | Dados carregados ou endpoint de contexto autenticado; consulta limitada |
| Abra Hoje; ir para Calendário | Rota registrada, sem inferência |
| Agenda Google; tarefas Google; arquivos Google | API autorizada, sem IA nem grant implícito |
| Criar missão: Revisar física; capturar: Ideia | Proposta de criação, confirmação obrigatória |
| Criar projeto: Órbita; criar tarefa Google: Redação | Proposta de operação, prévia e confirmação |
| Criar documento/planilha/apresentação Google: Título | Criação de arquivo vazio, confirmação e escopo existente |
| Concluir missão: Título exato | Só resolve uma correspondência; ambiguidade abre seleção, nunca conclui em lote |

Formulários nos instrumentos de Calendário, Projetos, Estudos, Rotinas, Hoje, Revisão, Finanças, Biblioteca e Inbox preparam operações existentes. Finanças cria apenas despesa planejada no app; não movimenta dinheiro. Foco é preparado na página existente, sem iniciar ou recompensar automaticamente.

## Cotas, privacidade e segurança

- Local significa sem inferência, não necessariamente offline: dados em memória não chamam API; consultas de contexto/Google e escritas continuam usando backend e cotas próprias.
- O modo local não encaminha texto desconhecido ao modelo. Ativar IA só autoriza perguntas livres; comandos reconhecidos continuam determinísticos.
- Mensagens/respostas locais são excluídas do histórico de IA. Consultar Google não compartilha os resultados com o modelo automaticamente.
- Ditado continua dependendo de Whisper/Groq e sua cota; resposta falada usa voz local. Não se declara voz offline, hotword permanente ou controle do dispositivo.
- Janelas não armazenam dados em localStorage e são reiniciadas na troca de usuário. Navegar/minimizar preserva o conteúdo; fechar descarta o rascunho de formulário e reload encerra o desktop. Histórico operacional persistido continua no backend existente.
- Limite de seis janelas não remove outra silenciosamente. Prévia/recibo mantêm UUID; voltar/reabrir não deve criar nova execução. RLS, origem, ownership, CAS, cotas e confirmação continuam no Worker/SQL existente.
- Google: import é snapshot de até 20 eventos, Tasks→Inbox é cópia confirmada, Drive só arquivos autorizados ao app. Sem Picker, edição de conteúdo ou sincronização bidirecional neste recorte.

## Verificação

Testes e capturas usam QA com dados simulados; o resultado final de CI/publicação/sessão real é registrado nos issues #18/#16. A existência da interface não certifica todos os serviços Google, Whisper real ou dispositivos físicos.

- `npm run check` aprovado: 40 testes, TypeScript app/Worker, build e 26 documentos/22 IDs. 21 owners CSS, 69 animações únicas, 82 important.
- Testes locais de gramática: títulos preservados como dados, ambiguidade, limites, consultas civis/recorrentes em três fusos, exclusão de concluídas, dados parciais e limite/deduplicação de janelas.
- Testes já existentes de cotas, RLS, criptografia, OAuth/PKCE/replay, prévia/confirmação/idempotência e transcrição permanecem obrigatórios.
- Chromium aprovado: oito layouts + 80 smoke das 20 rotas, sem overflow/pageerror. QA de UI: consultas/comandos sem chat, janela modeless, teclado/movimento, minimizar/restaurar, prévia na troca de rota e mobile; regressões de voz, memória, Google opt-in, confirmação, drafts em erro e rotas.

CSS permanece em components; animação reaproveita motion. Fontes de API consultadas: [Pointer Capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture). A consulta de changelog.md do Supabase retornou conteúdo Markdown não aceito pela ferramenta; não há mudança de API Supabase/SQL nesta entrega.

Capturas QA com dados simulados: [desktop com agenda e aprovação](previews/a06-windows-dark-1440.jpg) · [aprovação no celular claro](previews/a06-window-light-390.jpg). Voz usa áudio gerado e captura/VAD/WAV reais; Whisper, chat e síntese são simulados. Cópia Tasks→Inbox foi confirmada uma vez em QA; nenhum dado pessoal foi criado para esse teste.

Dois conflitos de interação encontrados e corrigidos: cleanup de foco durante reconexão de effects não restaura o abridor antes da remoção real da janela; resposta assíncrona abre instrumentos sem fechar um modal que o usuário abriu enquanto esperava. A revisão não certifica som em iPhone, permissões Google adicionais, gravações externas reais ou sync bidirecional. O bundle inicial fica em cerca de 510 kB minificado; desktop/carregamento de instrumentos é lazy, mas não se declara ganho de performance medido em aparelho físico.
