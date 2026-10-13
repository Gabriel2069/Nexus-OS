# V04: luz estelar, missões, rotinas, foco e projetos

Base: PR #22, `aa94121d274dab050d1802eaef915329179f5bb0`. Branch: `feat/v04-stellar-actions`. Escopo: recortes restantes de V03/V04 e reforço de identidade em V01/V02/V07. Depende da cadeia de PRs #20 → #21 → #22. Sem merge/deploy.

## Direção aplicada

Constelações e nebulosas mais presentes no ambiente; mapa estelar estático nos cards; luz branca em bordas/reflexos e seleção no escuro, com equivalente azul frio no claro. Marca, tipografia, fluxo e movimento aprovados são preservados. CosmicTexture/StellarSpark são compartilhados por cards, shell, títulos, Agora e login. As camadas decorativas são aria-hidden, não capturam interação e mantêm luminosidade reduzida sob a leitura.

## Recortes

- Missões conserva Quadro/Lista/Foco, busca e filtros, com composição e densidade próprias. Inspector usa um draft explícito de status/prioridade/rank/projeto/prazo, bloqueia ações durante envio e mostra falha sem apagar escolhas. Concluir permanece pela operação existente, sem marcar Feita através de edição de status.
- Projetos combina portfólio, próxima ação e missões ligadas. Alterações de slider/select/textarea ficam locais até salvar; não há request a cada mudança de progresso. Criação/edição/conclusão têm pending e erro. Demo local é explícita; produção sem usuário recusa gravação.
- Rotinas considera apenas conclusões do dia civil de São Paulo e períodos nesse fuso. Rotinas inativas não aparecem; as previstas para outros dias não podem ser concluídas como hoje. Ordenação clona a lista. Bulk envia sequencialmente, interrompe na falha e conserva etapas já registradas. Demo simula somente registro local, sem inventar recompensas.
- Foco conserva todas as regras CSS de mostrador/anéis, com tempos, números e animações existentes. O entorno adota o material comum e controles legíveis; missão vinculada tem label e exclui opções encerradas/Inbox. Erro de leitura não elimina um relógio ativo; início em falha não dispara contagem. Política de checkpoint continua local à aba, não sincronizada.

## Verificação

- `npm run check` aprovado: três testes de datas/timer, TypeScript, build, registro CSS e links/IDs.
- 144 combinações: nove telas × quatro larguras (320/390/834/1440) × dois temas × vazio/preenchido. Sem pageerror ou excesso horizontal de body/documento; sidebar permanece no topo durante rolagem real.
- Mais 24 combinações dos inspectors de Missões/Projetos/Rotinas, nos dois temas e quatro larguras. Drafts conservados em falha; campos bloqueados enquanto a operação está pendente; fechar detalhes retorna foco à seleção.
- Projetos: slider não faz requests; salvar faz uma operação. Fluxo nativo da demo cria/edita/salva um projeto sem mock de mutação. Guards reais de produção recusam criação/edição de projeto e marcação de rotina sem usuário, em QA que contorna apenas AuthGate.
- Rotinas/Agora/Hoje: ontem não conta como hoje; manhã em São Paulo é identificada mesmo em navegador configurado para Auckland. Bulk conserva a primeira etapa registrada e interrompe com erro na segunda.
- Foco: comparação de todos os seletores/condições/declarações de `focus-clock` com a base confirma preservação integral. Relógio real inicia, conta, pausa sem acumular, mantém checkpoint na navegação, continua e reinicia removendo o checkpoint. Falha simulada de início não dispara contagem. Revisão visual encontrou controles móveis cortados por regras concorrentes de largura; a geometria dos botões foi consolidada e conferida em todas as larguras/temas, sem alterar o mostrador.
- Mais 20 combinações de smoke dos cinco domínios restantes, nos dois temas e larguras 390/1440; sem excesso de documento ou pageerror.
- Login: desktop escuro e celular claro revisados, sem envio de senha. Capturas das nove telas e dos inspectors inspecionadas; luz branca em bordas/estrelas no escuro e tinta fria no claro preservam leitura.
- 21 proprietários; `!important` 94 → 87; onze keyframes sem uso retirados (87 → 76), preservando os de Foco. CSS compilado aproximadamente 269 kB / 46,7 gzip; JS inicial 474,2 kB / 137,0 gzip. Nenhuma dependência nova.

Não houve mudança de schema/RPC/recompensa/idempotência nem de dependências. B01/B02/P01 continuam pendentes. Capturas usam dados ilustrativos, demo explícita, fontes externas bloqueadas e Chromium; não certificam backend autenticado, GPU, WCAG integral, dispositivos reais ou PWA completo. O bloqueio anterior do dry-run Cloudflare permanece registrado em V03; essa verificação não foi repetida por outra via.

## Capturas

- [Agora e luz estelar](previews/v04-agora-dark-1440.jpg).
- [Login](previews/v04-login-dark-1440.jpg).
- [Missões](previews/v04-missoes-dark-1440.jpg) e [decisão](previews/v04-missoes-inspector-dark-1440.jpg).
- [Rotinas](previews/v04-rotinas-dark-1440.jpg) e [etapas no celular](previews/v04-rotinas-inspector-light-390.jpg).
- [Foco preservado](previews/v04-foco-dark-1440.jpg) e [tema claro no celular](previews/v04-foco-light-390.jpg).
- [Projetos](previews/v04-projetos-dark-1440.jpg) e [próxima ação](previews/v04-projetos-inspector-dark-1440.jpg).
