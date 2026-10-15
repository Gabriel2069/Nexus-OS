# NexOS ~ identidade e interação

O NexOS é um observatório pessoal: linguagem espacial, nebulosas, estrelas, constelações e instrumentos de nave, com conteúdo legível e ações precisas. Esta é a autoridade visual corrente. Responsabilidade técnica e cascata ficam em [STYLE_SYSTEM.md](docs/STYLE_SYSTEM.md); execução em [PRODUCTION_MAP.md](docs/PRODUCTION_MAP.md) e no issue #18.

## Contrato compartilhado

- Preserve a estrela NexOS e a composição cósmica aprovada. Ambiente é profundidade; nunca um requisito para entender o conteúdo. Não misture a identidade de Tadeon ou Glifo.
- Use os tokens semânticos de foundation: vazio azul escuro, texto claro e acentos ciano/violeta/azul; tema claro com texto escuro. Luz branca marca bordas e ações; cor não é o único sinal de estado.
- Inter sustenta leitura; Space Grotesk organiza títulos; Oxanium mantém a assinatura técnica nos lugares já aprovados. Não espalhar outra fonte nem alterar o mostrador/anéis de Foco para propagar acabamento.
- Vidro denso, textura espacial e refração discreta nos cards permanecem uma escolha própria do NexOS para web. Controles, navegação e janelas têm separação de profundidade. Não prometer material nativo Apple; usar fallback opaco quando transparência ou blur não estiver disponível.
- Uma ação principal por região. Dados, filtros e detalhes aparecem no contexto; informações incompletas, permissões, erros e estimativas são explícitos. Não sugerir conexões ou ações executadas pela decoração.
- Cada propriedade animada tem um dono. Respostas de interação são breves e interrompíveis, sem bloquear o uso; preferências de movimento/transparência e pausa de atmosfera prevalecem. Conteúdo legível sem hover ou movimento.
- Manter desktop e celular utilizáveis, safe areas, foco/teclado e controles de toque de 44 px nos padrões comuns. Medir a composição real; nenhuma captura certifica todos os contrastes ou aparelhos.

A [prancheta D01](docs/design/README.md) explica a proposta inicial; as revisões abaixo registram sua evolução aprovada. Tokens propostos da prancheta não são importados em produção. Alterações usam os 21 proprietários existentes, sem folhas de acabamento paralelas. O contrato anterior repetia o mapa de CSS; essa duplicação foi substituída pelo vínculo acima, preservando o histórico de implementação.

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

## A07 — continuidade e espaço de trabalho

A moldura dos instrumentos usa hierarquia de profundidade e luz branca contida para distinguir o foco. Dock estável, seletor filtrável e organização da área visível fazem parte do mesmo desktop. Encaixes preservam o tamanho livre; celular mantém controles próprios da tela disponível. Geometria tem um único proprietário em NexWindowFrame; movimento tem propósito, é interrompível e assenta imediatamente com a preferência de redução. Não simular componentes nativos ou substituir a identidade pelo visual de outra marca. [Revisão e limites](docs/design/A07_REVIEW.md).

## A08 — da consulta à execução

Planejamento, Hoje e o desktop N.E.X usam a mesma bancada: tempo disponível, limite da agenda carregada, ações sugeridas e preparação de Foco. Hierarquia compacta, superfície e textura compartilhadas; filtros e detalhes aparecem no contexto da tarefa. Estados vazios explicam o próximo ajuste. Nenhum novo halo, keyframe ou cronômetro paralelo. [Evidências e limites](docs/design/A08_REVIEW.md).

## A09 — acabamento e descoberta

Menu móvel separa captura e recolhimento, com presença interrompível e estados de acesso imediatos. A biblioteca de comandos N.E.X é pesquisável e pede o conteúdo pessoal antes de preparar ações; não executa exemplos de criação. Rotinas abre o registro exato e informa a próxima etapa. Refração de luz fica em uma camada própria do card, acionada por ponteiro de mouse e limitada a um frame pendente, sem transformar texto ou animar blur. Temas e alternativas estáticas preservados. [Revisão e limites](docs/design/A09_REVIEW.md).
