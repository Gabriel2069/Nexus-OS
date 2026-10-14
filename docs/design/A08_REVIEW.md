# A08 — execução conectada e autonomia local

Base: main `6bc094eb1ebdf7b8b7820c5b6a438191bb05e2af` (A07, PR #35). Branch feat/a08-connected-execution. Depende de A07; preserva fronteiras B01/B02/I01. Sem dependências, SQL, rotas de backend ou permissões Google novas.

## Comportamento entregue

Planejamento deixa de ser somente uma consulta genérica e ganha uma bancada de execução. O mesmo ExecutionWorkbench aparece em Hoje e nas janelas globais N.E.X, incluindo o plano de um projeto. Usa ranking local existente, check-in do dia, duração e agenda carregada. Escolhe até cinco missões inteiras que caibam no intervalo solicitado de 15–240 min; não divide tarefas nem agenda automaticamente. Limita ao próximo compromisso obrigatório de Calendário/Estudos e à meia-noite de São Paulo. Enquanto há compromisso em andamento, disponibilidade é zero. Estimativa ausente é explicitamente 45 min. Recalcula ao alterar controles, a cada 30 s enquanto o documento está visível e ao voltar à aba; não consulta serviços nesses ticks.

A mesma duração segue para Foco, incluindo valores como 20 min. Checkpoint e indicador aceitam inteiros 1–240, sem arredondamento silencioso. O mostrador/anéis aprovados, contagem de tempo efetivo e motor de conclusão/recompensa permanecem. A missão tem duração editável no inspector com validação, usando a coluna existente e o mesmo update autenticado filtrado por usuário/id.

Missões combina busca sem acentos, projeto, estado, prazo civil e tempo; utiliza o ranking compartilhado para a sugestão de foco. Links de projeto e pendências abrem o recorte correto. Projetos ganha busca/estados, acesso a concluídos/arquivados, recuperação pelo editor existente, direção ausente, próxima missão recomendada, histórico de missões e foco concluído carregado. Progresso manual não é sobrescrito por uma porcentagem calculada.

Entrada oferece selecionar a próxima entrada após salvar, desligado inicialmente. Só avança depois de sucesso; falha conserva item e escolhas. A próxima entrada recebe seus próprios valores, sem herdar projeto/prioridade da anterior.

N.E.X abre planos, dossiês e cinco vistas locais; pode propor início, bloqueio e retomada de uma missão pelo título exato e único. A operação existente mission.edit passa por prévia/confirmar/execute; título ambíguo, Inbox e estado já aplicado não executam. Consultas e planejamento não chamam chat nem escrevem dados. Reabrir o plano atualiza parâmetros sem duplicar janela; formulários e aprovações conservam seus drafts.

## Visual e propriedade

Atmosfera cósmica e Liquid Glass existentes; bordas, chips, tipografia e feedback canônicos. Plano com uma linha principal de decisão, sequência legível, ações contextuais e pendências secundárias. components.css possui execution-\* e filtros; pages/project possui o portfólio/dossiê. Nenhum owner, keyframe ou important adicional. Desktop modeless reutiliza a presença e movimento cancelável/reduzido de A07; não cria outra animação de geometria. Não houve medição de desempenho em aparelho físico nem alegação de interface nativa Apple.

## Verificação

`npm run check` aprovado com 55 testes, TypeScript do app/Worker e build; 21 proprietários CSS, 69 keyframes únicos e 82 important. Testes novos cobrem fronteiras de agenda/Estudos/meia-noite em São Paulo, fuso do navegador, check-in antigo, duração ausente, seleção sem divisão, máximo de cinco, filtros compostos, foco concluído, parser limitado, rotinas diárias e durações exatas. SDK Supabase fixado em 2.110.8; update reutiliza os filtros/representação existentes, sem novo contrato SQL ou Auth.

`scripts/verify-execution-ui.cjs` aprovado: 40 combinações de cinco páginas × quatro larguras (320/390/834/1440) × dois temas, sem overflow/pageerror. Exercita planejar → preparar Foco sem iniciar, editar duração 20 → planejar 25 → Foco 20:00 → pausa/retomada pelo indicador, projeto concluído → filtro → restauração, histórico vinculado, busca/filtros de missão, erro de processamento conservando escolhas e seleção seguinte com valores próprios. N.E.X atualiza a janela de plano, consulta dossiê/vistas e propõe uma mudança de missão: nenhuma execução antes da confirmação, uma execução depois, zero chamadas a chat.

`scripts/verify-nex-ui.cjs` completo aprovado: oito layouts N.E.X + 80 combinações de rotas/larguras, teclado/pointer, encaixe/grade/seletor, primeiro clique e motion normal/interrompido/reduzido; previews/drafts/modais, Google Tasks/arquivos, memória e erros/cotas. Captura/VAD/WAV reais com áudio gerado; Whisper/chat/síntese/Google e execução de operações são simulados, sem escrita em conta externa. A primeira tentativa de áudio no Chromium headless 155 expirou; a execução completa no Chromium disponível em /tmp/chromium passou. Isso não certifica áudio em todas as versões do navegador ou dispositivos. O harness registra diagnóstico em falha e não sobrescreve capturas históricas A07.

Capturas com demo explícita e endpoints simulados, inspecionadas após ajuste de contraste do título no tema claro:

- [Planejamento desktop escuro](previews/a08-planning-dark-1440.jpg).
- [Planejamento celular claro](previews/a08-planning-light-390.jpg).

O build redistribui chunks pelo compartilhamento da bancada/contexto. Não há medição de tempo de carga, FPS ou bateria; tamanho de um chunk isolado não prova ganho. Nenhum login, chamada paga, nova variável, scope Google, migration ou escrita remota foi necessário para esta QA.

## Limites e continuidade

O plano é uma sugestão momentânea sobre dados já carregados: agenda parcial, sem deslocamento/intervalos, sem sincronização Google em segundo plano ou fila persistida. Não considera eventos opcionais ou de dia inteiro, seguindo o contexto existente; isso não equivale a disponibilidade garantida. Projetos pausados/encerrados não entram no plano. Recomendações não alteram prioridade, estado ou progresso sozinhas.

Histórico/foco dos projetos cobre apenas registros carregados, não um relatório completo paginado. Janelas e drafts permanecem em memória da sessão. Checkpoint de Foco continua local à aba/usuário, sem reconciliação entre dispositivos. Voz com Whisper consome cota de áudio, mesmo quando o comando transcrito é local. Não certifica novas integrações Google ou hardware iPhone. Próximo lote recomendado: rotina → execução → revisão semanal e reconciliação dos dados, separado de sincronização bidirecional I01.
