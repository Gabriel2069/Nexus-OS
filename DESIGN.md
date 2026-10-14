# Sistema de estilos: proprietários e cascata

`src/styles.css` é o único ponto de entrada. Os 59 imports antigos foram substituídos por 21 proprietários. Os nomes expressam responsabilidade, não a ordem histórica de ajustes.

| Proprietário                              | Responsabilidade                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `foundation.css`                          | Tokens, fontes, tema, documento, foco visível e política de movimento reduzido |
| `motion.css`                              | Definições únicas de keyframes                                                 |
| `environment.css`                         | Estrelas, nebulosas, órbitas e pseudo-elementos de atmosfera                   |
| `components.css`                          | Cards, botões, inputs, modais, materiais e padrões compartilhados              |
| `shell.css`                               | Sidebar, topbar, dock, geometria e navegação móvel                             |
| `auth.css`                                | Login e boot                                                                   |
| `pages/now.css`, `pages/today.css`        | Agora e Hoje                                                                   |
| `pages/calendar.css`, `pages/focus.css`   | Calendário e Foco                                                              |
| `pages/mission.css`, `pages/project.css`  | Missões e Projetos                                                             |
| `pages/routine.css`, `pages/studies.css`  | Rotinas e Estudos                                                              |
| `pages/insight.css`, `pages/finance.css`  | Insights e Finanças                                                            |
| `pages/rpg.css`                           | Life RPG, atributos, temporada, conquistas e recompensas                       |
| `pages/inbox.css`, `pages/review.css`     | Inbox e revisão semanal                                                        |
| `pages/section.css`, `pages/tutorial.css` | Seções auxiliares e tutorial                                                   |

## Como alterar

Localize o seletor no proprietário. Corrija o bloco existente e suas variantes de breakpoint. Um seletor pode reaparecer em condições diferentes; isso não autoriza uma nova camada global ao fim do ponto de entrada. Quando houver conflito, confira especificidade, condição e ordem, incluindo shorthands como `background`, `animation` e `transform`.

Materiais comuns ficam antes das variantes de página. Para um ajuste exclusivo de tela, use o namespace da tela. A atmosfera não deve ocupar o pseudo-elemento usado para foco ou interação do componente.

A consolidação retirou 1.373 declarações que eram sobrescritas por regras posteriores equivalentes, mantendo barreiras conservadoras para shorthands. Listas de seletores foram distribuídas entre proprietários; isso pode aumentar o número textual de declarações sem acrescentar um comportamento. Não confundir contagem de bytes com quantidade de sistemas visuais.

Há ainda regras históricas e exceções responsivas dentro dos proprietários. A reorganização não promete uma cascata inteiramente minimalista: a simplificação restante deve acompanhar o refinamento de cada tela, com comparação visual. O teto atual de 82 declarações `!important` (243 → 103 em V01 → 101 em V02 → 94 no visor → 87 em V04 → 82 em V05/V06) congela a dívida existente; a meta é reduzi-lo, não usá-lo como espaço para novas exceções.

## Verificação automática

`npm run check:foundations` verifica registro e ordem dos imports, arquivos não registrados, seletores com dois proprietários, nomes duplicados de animação, keyframes fora do proprietário, imports internos indevidos, `:global` inválido, conflitos de merge e teto de `!important`. `npm run check` também executa testes de datas/timer, TypeScript e build.

A verificação não prova ausência de todo conflito de especificidade nem valida contraste de todas as telas. Revisão visual e teste de fluxo continuam necessários.

Em V02, `day-route`, `essential-loop` e `exam-glance` pertencem a pages/now; check-in, `routine-mini`, `single-study-target` e `life-space-note` pertencem a pages/today. Foram retiradas 87 entradas desses seletores de components. Navegação desktop/dock/menu usa o catálogo único em data/navigation.

Neste lote, detalhes privados do Calendário foram retirados de components e consolidados em pages/calendar; inbox e studies simplificam as respectivas cascatas. `visor-texture` é uma camada estática de components usada por SurfaceCard, Sidebar e Agora, com `aria-hidden`/pointer-events none. O gradiente de densidade de vidro é único em foundation. Foram retirados os halos genéricos de page-stack que duplicavam CosmicEnvironment e excediam os limites do documento. Geometria desktop reserva a mesma variável de largura usada pela sidebar fixed; listas de destinos rolam internamente.

V04 centraliza CosmicTexture/StellarSpark e o mapa estelar de ambiente; cores de emissão pertencem a foundation. Missões/Projetos/Rotinas consolidam seus proprietários e deixam componentes comuns de formulário em components. As regras do cronômetro permanecem iguais; o entorno foi reconciliado no proprietário focus. Não reintroduzir halos independentes em cada página para reforçar a identidade.

V05/V06 consolida os proprietários de Insights, Finanças, Life e Revisão; context-signal/live pertence agora a pages/section. Heatmap/consulta de dia pertence a pages/insight. View-switcher e materiais de pop-up têm uma implementação compartilhada em components; a antiga seleção com camadas luminosas concorrentes foi retirada. Nove keyframes de domínios sem referência foram retirados. Não alterar mostrador/anéis de Foco para propagar material de modal.

## V05/V06 — completar a consulta e o acabamento

As onze áreas restantes adotam a assinatura estelar aprovada, com hierarquia própria para progressão, dados, revisões e contexto. Biblioteca e Conhecimento têm consultas distintas sobre os registros existentes; nenhum cadastro ausente é sugerido por decoração. Pop-ups usam a textura e o material compartilhados, e seletores têm uma fonte de estilo para emissão/seleção. Rótulos de dias seguem São Paulo mesmo em outro fuso do navegador. Cronômetro de Foco preservado. Evidências e limites em [V05_REVIEW.md](docs/design/V05_REVIEW.md).

## N01 — navegação como instrumento

Início concentra direção, acesso, retomada e trabalho real. A central é única no desktop e celular, com busca por itens e áreas; atalhos ficam disponíveis sem reabrir a lista inteira. Menus têm agrupamento e seleção óptica legível, com os materiais e preferências existentes. Conexões abrem o item certo, e rascunhos sobrevivem à troca de área enquanto o app permanece aberto. O indicador de Foco apenas consulta a sessão local, sem outro cronômetro ou recompensa automática. Evidências em [N01_REVIEW.md](docs/design/N01_REVIEW.md).

## N.E.X — núcleo e diálogo

Painel de vidro cósmico com núcleo orbital, estados verificáveis de escuta/processamento/ação/resposta, conversa e instrumentos de contexto. Consultas abrem sobre o painel; links conduzem ao registro certo. Controles e permissões são explícitos, com opt-in para compartilhar dados. Não usar decoração para sugerir integração ativa, ferramenta executada ou escuta permanente. [Contrato A01](docs/NEX_INTELLIGENCE.md).

## A02 — instrumentos ao redor do núcleo

N.E.X ocupa uma central orbital com a estrela NexOS refratada, mapa de órbitas e emissão branca sem trocar a identidade. Seleção de setores tem rolagem própria; conexão/memória ficam recolhidas até serem necessárias. Núcleo, lente e órbitas têm camadas distintas para não disputar transform. components mantém todo o material; shell mantém dock/toggle; motion mantém a nova animação nex-core-orbit (68 nomes únicos). Redução de movimento e pausa de atmosfera continuam aplicadas. ModalSurface inclui summary na contenção de foco; inspector único impede modais simultâneos. Nenhuma folha nova ou aumento de important. Cronômetro aprovado de Foco preservado.

## A03 — cockpit holográfico N.E.X

Em 13/10/2026 o usuário forneceu image(4).png, image(5).png e image(6).png como referências de organização: núcleo dominante, instrumentos nas bordas, conversa lateral e holograma formado por partículas. Adaptação no proprietário components, preservando cosmos, vidro, estrela NexOS, temas e hierarquia. Sem copiar marcas/cores ou simular acesso ao dispositivo. Contadores representam missões abertas/projetos do workspace carregado, com loading/erro explícitos; relógio mostra São Paulo.

NexHologram projeta uma constelação de 180 pontos no centro. rAF limitado a cerca de 30 fps, DPR até 1,5, conexões pré-calculadas; pausa com atmosfera, movimento reduzido, aba oculta e saída de viewport, com cleanup de observers/loop. Lente de vidro e estrela ocupam o centro da malha e preservam identidade. Eventos, consultas e confirmação continuam nos instrumentos e no inspector compartilhado. No celular, núcleo → conversa → instrumentos; dock segue recolhível. Não declarar acesso a câmera/tela, CPU/RAM ou automação externa a partir do visual.

## A05 — densidade, hierarquia e N.E.X em uso

Direção revista pelo usuário: menos espaço ocupado pelo chrome, menos fantasia ostensiva, mais elegância e conexões funcionais. A barra superior passa a ser única, com atalhos dentro dela: 56 px; menu expandido 200 px ou trilho recolhido 64 px. Recolhido é o padrão para preferências ainda ausentes; escolhas persistidas continuam respeitadas. Controles mantêm 44 px no toque; navegação pode usar 36 px apenas com ponteiro preciso. Tema/movimento ficam em uma superfície acessível de preferências, sem remover funções.

No N.E.X, reproduzir a hierarquia das referências fornecidas, sem copiar telemetria de CPU/RAM: núcleo reativo ao centro, dados reais discretos na esquerda, conversa legível na direita. Retirar o catálogo de vinte botões. Respostas podem abrir janelas de dados no centro; consultas e ações continuam verificáveis e confirmadas. O núcleo tem malha projetada e deformação por fase/energia, estrela oficial pequena e órbitas finas; não é uma esfera decorativa volumosa. Galáxia/nebulosa de fundo têm intensidade reduzida, vidro e luz branca permanecem na identidade.

Voz deve ser uma interação completa: ativação explícita, indicação de escuta, pausa por silêncio, transcrição, resposta falada local e retomada. Pausar, sair, abrir outra superfície ou atingir uma cota libera o microfone; nunca escutar durante a fala do dispositivo. Sem hotword permanente, escuta oculta ou promessa de comportamento nativo em segundo plano. Critérios e evidências em [A05_REVIEW.md](docs/design/A05_REVIEW.md).

## A06 — instrumentos flutuantes e autonomia local

N.E.X mantém o núcleo aprovado e passa a abrir dados e aprovações em janelas modeless globais. Desktop: mover pelo cabeçalho ou setas, redimensionar, maximizar, minimizar e restaurar pelo dock. Celular: janela ajustada à viewport/safe areas e alternância no dock. Máximo de seis sem expulsar outra janela; sem cópia do material em nova folha. Modais de permissão/configuração continuam com ModalSurface e tornam todo o desktop inerte.

O modo local é o padrão. Consultar dados, obter o próximo passo pelas regras existentes e preparar ações não deve disparar IA. Perguntas não reconhecidas explicam a limitação e apresentam comandos; inferência exige ativar Usar IA. Fonte local/API/modelo deve ficar clara; autorização Google não é deduzida de decoração. Janelas e drafts duram na memória desta sessão; não prometer persistência após reload ou sincronização. [Evidências e limites](docs/design/A06_REVIEW.md).
