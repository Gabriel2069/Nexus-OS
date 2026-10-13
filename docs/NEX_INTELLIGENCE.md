# N.E.X — NexOS Intelligence / A01

Implementação inicial de 13/10/2026, branch `feat/nex-intelligence`, sobre PR #25 (`ecd3b2a`). Reutiliza React/Vite, Worker `nexos`, sessão Supabase, tabelas dos módulos, navegação e materiais existentes. A fila visual #20–#25 continua aberta; esta entrega depende dela. Código implementado não equivale a serviço ativado ou consentimento real testado.

## Auditoria e decisão

O Worker anterior oferecia health e diagnóstico Supabase; não havia endpoints de IA/OAuth. `nexus-intelligence`, orchestrator, command engine e action-policy são motores locais com responsabilidades distintas, preservados. Supabase autentica o app; `nexus-login` continua externo e não é substituído. Workspace, recompensas/RPCs, mostrador e relógio de Foco não foram reescritos. A busca web não abriu a URL pública; GET direto de `/api/health` respondeu ok com runtime Cloudflare Workers. A interface autenticada e integrações de produção não foram inspecionadas. A auditoria funcional baseou-se no repo e testes locais.

N.E.X adiciona uma fronteira autenticada em `worker/nex`, um proprietário de conversa em `NexContext`, console compartilhado em `NexConsole` e rota `/nex`. Botão do topbar abre o console sobre outras páginas. Consultas têm painel de inspeção e links para o item específico. A conversa vive em memória e sobrevive à navegação; troca de identidade reinicia estado e cancela requests. Reload perde o histórico. Não há histórico de chat persistido nem memórias inferidas silenciosamente.

## Modelos e orçamento zero custo

Fontes oficiais consultadas em 13/10/2026:

- [Groq — modelos](https://console.groq.com/docs/models) e [limites](https://console.groq.com/docs/rate-limits): `openai/gpt-oss-20b`, modelo de produção, Free: 30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD na tabela pública. Os limites da organização prevalecem. Whisper `whisper-large-v3-turbo`: Free 20 RPM, 2.000 RPD, 7.200 segundos/hora e 28.800/dia na tabela consultada.
- [Gemini — preços](https://ai.google.dev/gemini-api/docs/pricing) e [limites](https://ai.google.dev/gemini-api/docs/rate-limits): `gemini-2.5-flash-lite` tem entrada/saída gratuitas no Free Tier. Cotas efetivas dependem do projeto e devem ser conferidas no AI Studio; não presumir que a tabela de outro projeto se aplica. Thinking desabilitado, saída 512, sem grounding, cache, batch ou ferramentas faturáveis.
- [Workers AI — preços](https://developers.cloudflare.com/workers-ai/platform/pricing/) e [Gemma](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/): `@cf/google/gemma-4-26b-a4b-it`, disponível no catálogo; Free oferece 10.000 neurons/dia. No Workers Paid há cobrança além da franquia. Esta opção exige binding AI já disponível e conta Workers Free; não cria binding, plano, créditos ou infraestrutura automaticamente.

Provedores permanecem **desativados por padrão**, mesmo com chaves. Os flags abaixo são declarações operacionais de que a conta foi conferida como gratuita; o código não consegue provar o estado de faturamento da conta do fornecedor. Nunca ativá-los numa organização paga. Se a conta mudar de plano, desligar o flag antes de usar. Nenhum mecanismo local substitui essa condição. Também se devem respeitar cotas já consumidas por outros apps/chaves da mesma organização e recursos existentes de Supabase/Workers.

A reserva em Postgres antecede cada chamada, com lock transacional compartilhado entre usuários/isolates, janela móvel de 60 s e dia UTC. Falha do banco/migração/cota bloqueia chamadas. Não usa contador de processo, localStorage ou KV eventualmente consistente.

| Limite preventivo                        | Valor                                         |
| ---------------------------------------- | --------------------------------------------- |
| Requisições globais / provedor / dia     | 100                                           |
| Requisições por usuário / provedor / dia | 25                                            |
| Requisições globais / provedor / 60 s    | 2                                             |
| Chat: unidades globais reservadas / dia  | 50.000                                        |
| Chat: unidades globais reservadas / 60 s | 7.000                                         |
| Saída por resposta                       | 512 tokens                                    |
| Whisper                                  | 600 segundos globais / dia; WAV até 30 s      |
| Google                                   | 100 unidades globais / dia (uma por operação) |

Chat reserva bytes UTF-8 dos messages + 1.024 unidades, uma estimativa conservadora para texto/tokenização e saída, não uma medição exata do tokenizer. Neurons de Workers AI são controlados pelo plano Free do fornecedor, não por essa estimativa. Reservas não são reembolsadas em falha incerta. Ledger retém até sete dias e não contém prompts, respostas, chaves ou áudio. 401/402/403/429 interrompem a cadeia; 5xx/falha de rede podem tentar a próxima opção gratuita habilitada, com nova reserva. Não há loop automático, upgrade, cadastro de billing ou fallback pago.

## Variáveis do Worker

| Variável                                   | Uso                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Existentes; chamadas com JWT verificado do usuário, sem service role                                                         |
| `GROQ_API_KEY`                             | Secret server-only para chat e Whisper                                                                                       |
| `GEMINI_API_KEY`                           | Secret server-only para alternativa de chat                                                                                  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente Web OAuth, usado somente no Worker                                                                                   |
| `GOOGLE_REDIRECT_URI`                      | Exatamente `https://nexos.gtadeusz.workers.dev/api/nex/google/callback`                                                      |
| `NEX_TOKEN_ENCRYPTION_KEY`                 | Secret adicional necessário: 32 bytes aleatórios em base64/base64url, chave AES-GCM independente das chaves dos fornecedores |
| `NEX_GROQ_FREE_ONLY`                       | `true` somente após conferir Groq Free; padrão `false`                                                                       |
| `NEX_GEMINI_FREE_ONLY`                     | `true` somente após conferir projeto Gemini Free, sem billing; padrão `false`                                                |
| `NEX_WORKERS_FREE_ONLY`                    | `true` somente com binding AI disponível e Workers Free; padrão `false`                                                      |
| binding `AI`                               | Opcional, para Workers AI. Nenhuma chave desta opção vai ao frontend                                                         |

Configure secrets no painel Cloudflare ou fluxo de secrets próprio, nunca em `VITE_*`, `.env` versionado ou chat. Client ID e redirect URI são identificadores públicos obrigatórios no redirecionamento OAuth, gerado pelo Worker; não são embutidos no bundle. Client Secret, chaves de IA e chave de criptografia permanecem privados. A chave de criptografia não deve ser substituída sem plano de rotação: tokens antigos deixam de ser legíveis; desconectar antes da troca e reconectar depois. Observability do Worker foi desligada para não coletar automaticamente códigos OAuth/query strings; não habilitar logs de corpo/header/URL sensível. Erros externos brutos não são retornados/logados. Diagnóstico antigo deixa de incluir body do Supabase no erro.

## Rotas e autorização

Todas as rotas, exceto callback, verificam Bearer Supabase com `/auth/v1/user`, rejeitam usuário anônimo e derivam ownership dessa identidade. Escritas exigem Origin do próprio domínio. Não há CORS aberto nem autorização por `user_id` enviado pelo cliente. Requests JSON são limitados e validados; chamadas HTTP externas têm timeout de 20 s. O binding Workers AI segue os limites do runtime/fornecedor.

| Rota                                | Contrato                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/nex/status`               | Provedores habilitados/modelos e escopos Google, sem tokens                                                                      |
| `POST /api/nex/chat`                | message, module, shareContext e até quatro falas; resposta e proposta validada, sem execução                                     |
| `POST /api/nex/context`             | Consulta limitada do módulo, sem enviar ao provedor                                                                              |
| `POST /api/nex/actions`             | confirmed + UUID estável + kind/title; criar missão ou Inbox, com RPC transacional idempotente                                   |
| `GET/POST/DELETE /api/nex/memories` | Listar/salvar/excluir memória própria; separação module/agent, geral como perfil, limite atômico 60                              |
| `POST /api/nex/transcribe`          | WAV mono PCM16/16 kHz em base64, cabeçalho/tamanho/duração validados; retorna texto para revisar, não envia chat automaticamente |
| `POST /api/nex/google/start`        | service explícito; retorna URL Google e cookie protegido                                                                         |
| `GET /api/nex/google/callback`      | state/cookie/PKCE, consumo único e troca server-side; redirect limpo para `/nex`                                                 |
| `POST /api/nex/google/read`         | service + ID de arquivo quando necessário; consultas allowlisted                                                                 |
| `POST /api/nex/google/disconnect`   | Tenta revogar, apaga conexão/state locais; comunica falha de revogação externa                                                   |

Tokens OAuth e o JWT temporário do fluxo são AES-256-GCM, com IV aleatório e dados associados ao usuário/purpose. Cookie `__Host`, HttpOnly/Secure/SameSite=Lax, dez minutos, tamanho limitado; state hash de uso único no banco, expiry e PKCE S256. Callback valida de novo o JWT que iniciou a conexão. Supabase mantém ciphertext sob RLS, jamais plaintext. Revogação Google pode falhar offline; o app ainda apaga a cópia local e orienta revisar permissões no Google.

`nex_private` não deve ser exposto no Data API. A função privada de orçamento é SECURITY DEFINER por necessidade de serializar o limite global, com auth.uid obrigatório, search_path vazio, allowlist e EXECUTE revogado de PUBLIC/anon. Wrapper público é invoker. Memórias/conexão/states/auditoria têm RLS de ownership e grants explícitos; actions RPC é invoker e usa as políticas existentes de missions. Delete de auth.users cascateia os novos dados. A auditoria de ações guarda criação/id do registro; nenhum chat ou segredo. Conclusão/recompensa/finanças não são ferramentas deste lote.

## Google: configurar e autorizar incrementalmente

1. No projeto Google existente, habilite Calendar, Tasks, Drive, Docs, Sheets e Slides APIs. Cliente OAuth de tipo Web application, origem `https://nexos.gtadeusz.workers.dev`, redirect exatamente igual à variável. Não usar localhost com o callback de produção.
2. Configure consentimento e usuários de teste; publicação/verificação de escopos sensíveis pode ser necessária. Apps externos em Testing podem ter refresh tokens com validade limitada pelo Google.
3. Configure secrets e chave de criptografia. Aplique a migração `supabase/migrations/20261013142948_nex_intelligence.sql` no projeto correto, mantendo grants/RLS; não rodar contra outro projeto por suposição. Valide advisors e duas contas de teste antes de uso real.
4. Integre os PRs dependentes e publique o Worker/cliente pelo fluxo existente, após os checks. Não provisionar recursos pagos.
5. Após publicar, confira novamente os planos gratuitos e habilite apenas os flags correspondentes no Worker (o arquivo de deploy conserva defaults false). Entre no NexOS e abra N.E.X. Clique **Autorizar** no serviço desejado; o app nunca conecta automaticamente. Repita quando precisar de escopos adicionais. Clique **Consultar** e verifique os dados retornados; esse é o teste real ainda pendente.

| Serviço  | Escopo e consulta deste lote                                             |
| -------- | ------------------------------------------------------------------------ |
| Calendar | `calendar.events.readonly`: até 20 eventos futuros do calendário primary |
| Tasks    | `tasks.readonly`: até 20 tarefas não concluídas da lista padrão          |
| Drive    | `drive.file`: até 20 arquivos já autorizados ao app                      |
| Docs     | `drive.file`: documento autorizado, por ID                               |
| Sheets   | `drive.file`: metadados/abas de planilha autorizada, por ID              |
| Slides   | `drive.file`: título/IDs de slides de apresentação autorizada, por ID    |

`drive.file` é permissão por arquivo e também permite escrita nesses arquivos, embora o backend deste lote só ofereça leitura. Informar um ID **não concede** autorização por arquivo. Picker/Open with e criação/edição de documentos ainda precisam de uma próxima entrega; uma conta recém-conectada pode retornar lista vazia. Não pedir Drive completo para encobrir essa limitação. Calendar/Tasks também não têm sync ou escrita externa neste lote. Referências: [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server), [PKCE](https://developers.google.com/identity/protocols/oauth2/native-app), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Docs scopes](https://developers.google.com/workspace/docs/api/auth), [Tasks scopes](https://developers.google.com/workspace/tasks/auth).

## Módulos e experiência

Consulta real de dados quando backend e migração estão ativados: Agora/Missões (abertas, por prazo), Hoje (check-in do dia civil São Paulo), Calendário (próximos/recorrentes), Inbox, Estudos, Projetos ativos, Rotinas ativas e sessões recentes de Foco. Até 12 registros por consulta; ausência e falha são distintas. Contexto não é uma varredura completa do workspace. Memórias geral/módulo do agente N.E.X só são enviadas com opt-in; outros agentes podem ter namespace próprio pela API, sem mistura implícita.

Propostas são texto estruturado e validadas pela allowlist. Só criar missão/Inbox está habilitado; o usuário vê título e confirma. RPC usa UUID de ação para evitar duplicação ao repetir o mesmo pedido; conflito de payload falha. Pode editar/cancelar o registro no módulo; não existe promessa de desfazer automaticamente ações externas. Conteúdo do modelo/documentos/memórias não define permissões, URLs externas arbitrárias, SQL ou comandos de sistema.

Desktop/celular usam os mesmos materiais e navegação; núcleo reage a escuta/processamento/ação/resposta falada. Inspeções sobre o console usam ModalSurface no painel principal e região integrada no overlay, evitando overlays concorrentes. Motion reduzido/pausa e material opaco são respeitados. Microfone explícito, até 29 s de captura; reencoding local WAV, revisão da transcrição antes de enviar; tracks encerrados e cleanup. Negação/indisponibilidade mantém texto disponível. Resposta falada usa apenas voz `localService` em português via speechSynthesis, iniciada por clique; sem voz local, informa indisponibilidade. Não há wake word/background listening, controle do iPhone/OS, streaming em tempo real, busca web ou automação externa irrestrita.

## Verificação e limites da entrega

- `npm run check`: fundações, documentação, 17 testes, TypeScript app **e Worker**, build. PGlite 0.5.9 é dependência apenas de desenvolvimento para testar Postgres/RLS no CI; não integra bundle ou infraestrutura de produção.
- PostgreSQL WASM isolado: migração sobre core (pgcrypto substituído pela função UUID nativa disponível), ownership/anon denial, ledger privado, cotas global/60 s/usuário, exclusão de memória, ação repetida e payload conflitante. Não substitui advisors nem RLS com sessões reais do projeto remoto.
- Mocks HTTP: Groq/Gemini e fallback 5xx, bloqueio de cota sem fallback, requisição sem auth/origem inválida, body inválido/grande, opt-in/ownership/contexto, proposta sem execução, confirmação, AES-GCM/tamper/outro usuário, OAuth incremental/state/PKCE/replay, callback errado, áudio inválido e WAV válido/reserva Whisper. Não são inferência/Whisper/consentimento reais.
- Chromium local: oito layouts do console (320/390/834/1440 × claro/escuro), sem overflow/pageerror; 80 smoke de rotas existentes (20 × quatro larguras). Chat/proposta/confirmação única, draft em erro, memória/salvar/excluir, inspeção/navegação, conversa mantida ao trocar área, overlay Tab/Escape/inert, status inicial em StrictMode e microfone negado simulado. [Desktop](design/previews/nex-console-dark-1440.jpg) · [Celular](design/previews/nex-console-light-390.jpg). Capturas usam dados demonstrativos; não há chamada externa.
- Harness de navegador versionado em `scripts/verify-nex-ui.cjs`, executado a partir da raiz com Playwright disponível (`NEX_PLAYWRIGHT_MODULE` pode apontar ao módulo instalado) e, opcionalmente, `NEX_CHROMIUM_PATH` para um Chromium local. Configuração Vite isolada em `tests/nex-browser.vite.mjs`; mocks não entram no build.
- Cronômetro/cálculo do Foco têm diff vazio. 21 owners, 67 keyframes e teto 82 important preservados. Nenhuma alteração de login, recompensa, schema dos módulos ou chave real versionada. CSS 243,47 kB/42,32 gzip; JS inicial aproximadamente 490 kB/141 gzip (PGlite não integra o cliente). Bundles do cliente conferidos sem nomes de credenciais server-only.

A revisão automática bloqueou uma tentativa de telemetria PostHog do CLI Supabase após gerar a migração. Não foi repetida; testes SQL usam banco local e não o CLI. Não houve deploy, aplicação de SQL remoto nem testes autenticados reais: secrets e acesso ao ambiente não estão disponíveis nesta sessão. Build/PR não tornam a URL de produção atualizada. Próximo passo é ativação controlada e testes reais de provedores/OAuth; depois Picker, escrita/sync Google, ações nos demais módulos e reconciliação de Foco. A01 não encerra B01/B02/P01/I01/I02/R01 nem a visão completa JARVIS.

## Atualização operacional — 13/10/2026

Esta seção substitui o estado de ativação da evidência inicial acima. PRs #20–#26 integradas ao main; CSS/JavaScript públicos comparados byte a byte com o build final de A01. Isso não certifica sessão autenticada, inferência ou OAuth.

Projeto confirmado pelo conector Supabase: **NexOS**, ref `emewxqxmgqybojibpbjt`, PostgreSQL 17.6. Tadeon Nexus não recebeu consultas SQL nem alterações. Histórico consultado antes da execução: N.E.X ainda ausente e sem objetos conflitantes. Colunas/defaults/constraints/RLS de missions compatíveis. Arquivo original conferido com GitHub main, blob `8bb74a85d03bbfc80815cd65942bd65bb87f0abb`.

- Migration aplicada uma vez via `apply_migration`: `20261013142948_nex_intelligence`. O MCP gerou inicialmente versão `20261013155747`; apenas o metadado dessa entrada foi alinhado à versão do arquivo, mantendo nome e SQL registrados. Não houve reaplicação.
- Migration complementar `20261013155850_nex_intelligence_privilege_hardening`, com versão gerada pelo sistema remoto e arquivo correspondente no repositório. Remove grants herdados TRUNCATE/REFERENCES/TRIGGER/MAINTAIN de authenticated nas quatro tabelas novas, preservando CRUD/RLS; acrescenta os índices das duas FKs apontadas pelo advisor. Não altera tabelas antigas.
- Catálogos verificados: cinco tabelas com RLS, quatro políticas own_rows com USING/WITH CHECK, quatro funções (três invoker e uma definer privada), um trigger de memória, onze índices válidos/prontos e constraints validadas. PUBLIC/anon sem execução dos RPCs ou acesso às tabelas; ledger sem acesso direto de authenticated.
- Testes remotos em `tests/nex-remote-security.sql`: identidade/role simulados diretamente na sessão PostgreSQL, proprietário versus outro subject, select/update/delete bloqueados entre usuários, insert/reassign bloqueados, anon negado, grants excessivos ausentes, ledger privado, teto 60 memórias, janela 60 s, limite diário de requests e unidades, provider inválido/zero unidades, criação mission/Inbox, idempotência e payload conflitante, sem XP/moedas. Uma identidade existente e um subject sintético; nenhuma conta Auth criada. Tudo em transação com ROLLBACK; não são testes de login/JWT via HTTP.
- Nove missões mantidas com o mesmo fingerprint de conteúdo antes/depois; Auth também com o mesmo fingerprint. Zero fixture e zero reserva de teste restante. A aplicação só criou objetos novos e ajustou privilégios/índices destes; não migrou, sobrescreveu nem excluiu dados dos módulos.
- Advisors: duas FKs sem índice corrigidas. Aviso INFO de ledger RLS sem policy é intencional: acesso direto negado; somente função privada controlada o utiliza. Aviso de proteção contra senhas vazadas já existia; configuração Auth não alterada. Índices sem uso são informativos, esperados em estruturas recentes; não foram removidos. [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) · [Senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) · [Índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Histórico das duas migrations N.E.X alinhado ao repositório. Há uma divergência **anterior** nas onze migrations de agosto: nomes correspondem, mas timestamps locais e remotos diferem; alguns arquivos também diferem do SQL registrado. Não usar um `db push` geral antes de reconciliar essa linha de base: poderia tentar reaplicar estruturas já existentes. Entradas antigas e arquivos históricos foram preservados, sem marcá-los falsamente como equivalentes nem reexecutá-los. A reconciliação dessa dívida é separada de A01.

Nenhum projeto, branch de banco, extensão paga ou serviço foi provisionado. Secrets e planos dos provedores não foram lidos nem alterados. Chat, Whisper e consentimento Google reais continuam exigindo testes pelo Worker; banco aplicado não prova integração externa funcional.

## A02 — central orbital e execução guiada

Entrega construída sobre main `08890600aa3f50b12c826d957a175b82a5407040`. Após reinicialização do ambiente temporário, o código A02 não publicado foi reconstruído sobre essa base. A migração existente foi recuperada do histórico remoto, sem reexecutar SQL; seu MD5 é `e159ec69f97e1bb074537115ceed72d3`. Estado corrente no issue #18; conexões no #16.

Núcleo no centro, instrumento de seleção à esquerda e diálogo/painéis à direita. No celular, núcleo e conversa vêm primeiro. Órbitas e estrela de quatro pontas expressam a identidade existente; escuta usa amplitude do microfone, processamento muda ritmo e ação muda emissão. Resposta falada continua usando voz local disponível. O menu inferior pode ser recolhido/expandido; só essa preferência é persistida no dispositivo. As telas e o cronômetro existentes foram preservados.

### Ferramentas e fronteiras

| Ferramenta                                                           | Resultado e limite                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Missão/Inbox (A01)                                                   | Criar registro após confirmação                                                                                          |
| `project.create`, `project.edit`                                     | Criar/editar nome, descrição, próxima ação e estado                                                                      |
| `mission.edit`, `mission.complete`                                   | Editar ou concluir pelo motor existente; sem reabrir concluídas e sem recompensa duplicada                               |
| `calendar.create`                                                    | Compromisso local com início/fim validados                                                                               |
| `routine.create`                                                     | Rotina com 1–8 etapas em transação atômica                                                                               |
| `study.create`                                                       | Bloco semanal, dia 0–6 e intervalo HH:mm                                                                                 |
| `checkin.save`, `review.save`                                        | Hoje/semana civil de São Paulo; prévia da versão atual antes de sobrescrever                                             |
| `finance.create`                                                     | Lançamento em centavos, planejado/realizado; não faz pagamentos                                                          |
| `memory.save`                                                        | Memória explícita de perfil/módulo; exclusão continua disponível com confirmação                                         |
| `google.calendar.create`, `google.task.create`                       | Evento na agenda principal ou tarefa na lista padrão; sem convidados                                                     |
| `google.docs.create`, `google.sheets.create`, `google.slides.create` | Arquivo vazio com título, sob `drive.file`; não gera conteúdo nestes arquivos                                            |
| `google.calendar.import`                                             | Até 20 eventos consultados; snapshot local por ID estável, preserva registros existentes; sem sincronização bidirecional |

`src/lib/nex-tools.ts` é o contrato único de áreas e operações. O modelo só propõe JSON validado; não executa SQL, URLs arbitrárias nem comandos do dispositivo. 17 operações novas, além das duas criações A01. O controle de Foco nesta etapa é consulta/navegação; iniciar/pausar o relógio continua no módulo existente.

### Rotas adicionais

- `POST /api/nex/operations/preview`: confere ownership, captura estado/versionamento atual, retorna proposta e aviso.
- `POST /api/nex/operations/execute`: exige confirmação explícita e UUID; operação local por RPC invoker, externa pelo conector allowlisted.
- `GET /api/nex/operations/history`: últimas 20 operações do usuário, sem corpos de mensagens/tokens.
- `POST /api/nex/weather`: cidade explícita; geocodificação e previsão Open-Meteo, coordenadas aproximadas do centro da cidade, sem GPS/IP. Usa duas unidades do orçamento de conectores já existente antes da rede. Serviço gratuito de uso pessoal não comercial, com atribuição Open-Meteo/GeoNames e CC BY 4.0.
- `/api/nex/status` autenticado: capacidades e diagnóstico booleano de presença/habilitação. Não retorna valores dos segredos.

Contexto consulta as 21 áreas existentes com limite 12. Geral combina Agora, Calendário, Projetos e Hoje; falhas parciais ficam explícitas. Painéis sugeridos pelo modelo consultam dados do próprio usuário, podem abrir sobre o núcleo e encaminhar à área correspondente. Compartilhar dados locais e compartilhar uma consulta Google com a IA têm consentimentos separados. Histórico de conversa é efêmero e isolado por identidade. Payload ao provedor continua limitado; conteúdo excessivo é reduzido com aviso, sem JSON truncado.

### Google incremental

Escrita em Calendar usa `calendar.events`; Tasks usa `tasks`. Ambos exigem ação explícita de autorização adicional. Drive/Docs/Sheets/Slides mantêm `drive.file` e acessam apenas arquivos criados/autorizados ao app: informar um ID não concede acesso. Sheets aceita um intervalo A1 opcional; Slides/Docs retornam texto disponível. Picker, escrita de conteúdo, edição/exclusão remota e sync bidirecional permanecem pendentes. PKCE/state/callback e AES-GCM continuam os mesmos de A01.

Nenhuma chave adicional é exigida por A02. Permanecem secrets `GROQ_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `NEX_TOKEN_ENCRYPTION_KEY` (32 bytes base64), mais flags `NEX_GROQ_FREE_ONLY`, `NEX_GEMINI_FREE_ONLY`, `NEX_WORKERS_FREE_ONLY` e binding AI opcional. Callback deve corresponder a `https://nexos.gtadeusz.workers.dev/api/nex/google/callback`. As APIs Google correspondentes e escopos precisam estar habilitados na conta do operador; nenhuma conta/plano pago foi configurado.

### Persistência, conflitos e cotas

`20261013170035_nex_orbital_tools.sql` já consta no histórico do NexOS `emewxqxmgqybojibpbjt`. Não reaplicar. A02 adiciona ledger privado com RLS sem grants diretos, índice usuário/data, três funções privadas definer controladas por `auth.uid()` e quatro públicas invoker; todas têm search_path vazio e anon sem EXECUTE. Não altera policies/domínios de recompensa existentes. Expande apenas a enumeração de áreas da memória.

Prévia usa versão `updated_at` exata, incluindo microsegundos; atualizações concorrentes exigem nova revisão. UUID + hash do payload impedem duplicação e reutilização com proposta diferente. Operações internas são atômicas. Operações externas ficam pendentes quando rede/resposta/registro do recibo têm resultado incerto; não há repetição automática. Histórico é recibo operacional do usuário, não auditoria forense imutável contra o próprio usuário que pode invocar RPCs autorizadas. Até 100 operações por usuário/janela de 24 h; chamadas externas ainda passam pelas cotas gratuitas globais de A01, inclusive falhas.

As operações não têm desfazer automático geral; criações podem ser administradas nos módulos/Google. Conclusão de missão informa efeito de recompensa e não pode ser reaberta pelo N.E.X. Nenhuma rotina de exclusão automática foi acrescentada.

### Verificação e limites reais

- 22 testes Node/Postgres WASM: contratos/allowlists/centavos/datas/microsegundos, ownership, anon/cross-user, ledger privado, edição obsoleta, deduplicação/conflito, rotina atômica, memória, check-in/revisão, import preservado, conclusão repetida sem XP extra, escopos Google, escrita pendente e cota do clima. Testes HTTP usam respostas simuladas explicitamente.
- Migração remota já foi testada transacionalmente com rollback na execução anterior. Nesta retomada, versão/MD5, sete funções, grants/search_path/RLS e ausência de operações persistidas foram reconferidos; nove missões existentes preservadas. Não há migração nova nem alterações no Tadeon Nexus.
- Login real passou na execução anterior, mas o chat retornou “Configure um provedor gratuito no Worker antes de conversar”. A sessão do navegador temporário não persistiu na retomada. Diagnóstico novo ajuda distinguir chave ausente de flag desabilitada. Inferência, Whisper, voz real do dispositivo e consentimento/escrita Google reais não são certificados por mocks.
- Advisors anteriores: RLS sem policy em ledgers privados é intencional; proteção Auth contra senha vazada desativada era aviso preexistente e não foi modificada. Divergência do histórico antigo de agosto permanece registrada, sem repair/reaplicação indiscriminada.

Fontes oficiais consultadas: [Calendar insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Tasks insert](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Open-Meteo](https://open-meteo.com/en/docs). Modelo/limites de IA seguem os verificados em A01; nenhum modelo pago foi acrescentado.
