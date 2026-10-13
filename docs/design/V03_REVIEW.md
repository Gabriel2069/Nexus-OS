# Visor compartilhado, Calendário, Caixa de entrada e Estudos

Base: PR #21, `01129e4b90f7bf4f2e144d1243191cfdc42940d2`, dependente da PR #20. Branch: `feat/v03-orbital-workspace`. Escopo: V07; Calendário de V03; Estudos de V04; correções de composição em V02. Foco e outros domínios de V04 continuam na fila.

## Resultado

- Sidebar fixa à janela com largura compartilhada com a coluna do conteúdo, menu interno rolável e recolhimento sem sobreposição. A fixação anterior dependia de sticky sob ancestrais com overflow; a nova geometria não depende desse contexto.
- Vidro denso translúcido nos cards, rims ópticos e textura estática de estrelas/nebulosa numa camada própria. Tokens respondem ao tema; fallback sólido e preferência de transparência reduzida. Esta é uma revisão explícita da direção opaca anterior, solicitada pelo usuário.
- Agora mantém agenda e continuidade numa linha e leva o horizonte à linha de apoio, eliminando o card de agenda excessivamente alto. Hoje alinha os pares de cards e posiciona ações na base. Headers das novas áreas compartilham ritmo e hierarquia.
- Calendário consolida grid e detalhes no proprietário, preserva datas civis, mostra dia selecionado, agenda, janelas e adiante. Setas/Home/End navegam dias; troca de mês mantém acesso pelo teclado. Falhas de ação ficam visíveis e ações concorrentes são bloqueadas. Missões concluídas/canceladas/Inbox ficam fora do planejamento ativo. Quantidade excedente do dia usa o total realmente não exibido.
- Caixa de entrada reúne detalhes, prioridade/rank/projeto/prazo e decisão num único painel. Pending impede troca/edição simultâneas; erro conserva escolhas; datas usam São Paulo; descartar muda o status, sem apagar definitivamente. Processar em demo é local e explícito; fora de demo, ausência de usuário gera erro em vez de falso sucesso.
- Estudos usa blocos cadastrados, inclui domingo, ordena horários e oferece tabs com seleção/teclado. Eventos de data civil permanecem no dia atual independentemente do fuso do navegador. Métrica de histórico descreve eventos concluídos, sem rotulá-los como simulados de 2026. Relações inferidas pelo título são identificadas como sugestões, sem fingir vínculo persistido.

## Fronteiras

Não há schema, migração SQL, dependência ou nova folha de acabamento. Preservados 21 proprietários. Guardas de leitura compartilham PageLoading/WorkspaceFeedback; snapshots indisponíveis não viram vazios confirmados. Nenhum dado real foi alterado. Sem merge ou deploy nesta entrega; integração deve respeitar a cadeia de PRs.

## Verificação

- `npm run check`: aprovado, com três testes de datas/timer, TypeScript, build e links/IDs da documentação.
- Matriz principal: 80 combinações (Agora/Hoje/Calendário/Inbox/Estudos × 320/390/834/1440 × claro/escuro × vazio/preenchido), mais 18 combinações de smoke de outros domínios. Sem `pageerror`; nas cinco telas, limites de body e documento conferidos para não esconder excesso sob overflow.
- Sidebar: topo 0 antes e depois de rolagem real de 315–425 px nas páginas longas; coluna recolhida de 88 px; destinos rolam internamente sem deslocar a página ou perder o controle de recolhimento.
- Caixa: timestamp em UTC convertido corretamente ao prazo de São Paulo; pending bloqueia edição; falha simulada conserva data escolhida. Fluxo real da demo captura → entrada → promoção → missão visível, sem mocks de mutação.
- Calendário: setas mudam seleção e URL; mês seguinte mantém uma data acessível por Tab; alteração condicional sem conta mostra erro. Estudos: End chega a domingo; grade real é exibida; evento civil de hoje permanece em navegador configurado para Auckland; concluídos saem do horizonte; fechar detalhes retorna foco ao evento.
- Painéis de detalhes: 16 combinações adicionais de Inbox/Estudos × quatro larguras × dois temas, sem excesso horizontal. Textura permanece estática com movimento normal; controle de pausa do ambiente exercitado.
- Loading/erro nas três novas áreas ocultam conteúdo ainda não confirmado. Guards de produção, em QA que contorna apenas AuthGate, recusam processar/concluir sem usuário; nenhum request de escrita ao backend é feito.
- 21 proprietários mantidos; seis keyframes agora sem uso removidos (93 → 87); teto de `!important` reduzido de 101 para 94. CSS compilado aproximadamente 300 kB / 51,4 gzip; JS inicial aproximadamente 472,6 kB / 136,5 gzip. Redução observada decorre da retirada de regras antigas nos proprietários, sem nova camada.
- O dry-run local de Cloudflare foi bloqueado pela revisão automática por tentar enviar metadados a um destino não autorizado neste escopo. Não foi repetido por outra via; build local e verificações do repositório permanecem a evidência disponível. Não houve deploy.

Capturas usam demonstração explícita com dados ilustrativos e fontes externas bloqueadas. Não certificam autenticação/persistência Supabase, fontes definitivas, WCAG integral, GPU, dispositivos reais, PWA iOS/watch ou reconciliação de foco (B01/B02/P01).

## Capturas representativas

- [Agora, escuro](previews/v03-agora-dark-1440.jpg) e [Hoje, escuro](previews/v03-hoje-dark-1440.jpg): material e encaixe revistos.
- [Calendário, desktop](previews/v03-calendario-dark-1440.jpg) e [Calendário, celular claro](previews/v03-calendario-light-390.jpg).
- [Caixa de entrada, desktop](previews/v03-inbox-dark-1440.jpg) e [processamento](previews/v03-inbox-inspector-dark-1440.jpg).
- [Estudos, desktop](previews/v03-estudos-dark-1440.jpg) e [detalhes](previews/v03-estudos-inspector-dark-1440.jpg).
