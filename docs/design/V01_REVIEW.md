# V01 — base compartilhada e login

Direção D01 aprovada para implementação e integrada pela PR #19, base `965c4269e750bec3ccd7e2af81eee576c888fe04`. Este lote incorpora a linguagem Observatório pessoal nos proprietários existentes; não importa CSS da prancheta.

## Resultado

| Frente       | Implementação                                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login        | Composição em dois planos, lente de vidro 3D, órbita proporcional, nave discreta, formulário de quatro dígitos, labels/ajuda/erro relacionados ao input; no toque, sem abertura automática do teclado |
| Ambiente     | Estrelas estáticas, nebulosas em dois planos e galáxia distante. Sem render loop JavaScript; atmosfera pausável, movimento reduzido prioritário, aba oculta e lente fora de tela pausam decoração     |
| Preferências | AppearanceProvider é o único dono de tema e atmosfera, disponível no login, shell e portais. Preferências persistem localmente; indisponibilidade do storage não impede uso desses controles          |
| Navegação    | Sidebar recolhível com nomes acessíveis, seleção e grupos; topbar e dock com materiais comuns e safe areas. Dock: Agora / Hoje / Agenda / Foco / Mais. Missões permanece no menu Mais                 |
| Controles    | Ação primária ciano; secundários discretos; resposta de pressão breve, foco explícito, estados selected/disabled. Conteúdo em painel estável; vidro concentrado em navegação e inspeção               |
| Diálogos     | Comandos, captura, perfil, notificações e navegação móvel seguem ModalSurface. Captura e rank expõem seleção; perfil indisponível mostra uma resposta em vez de botão sem efeito                      |
| Busca        | Digitar N/H/F/I não dispara destinos. Atalhos explícitos usam Alt; setas/Enter de busca são limitados ao input. Combobox informa opção ativa. Mobile abre busca pelo menu Mais                        |
| Carregamento | Entrada de área lazy tem uma superfície com status real de espera e estrutura estática, sem porcentagem de download inventada                                                                         |

## Responsabilidades

Tokens/aliases e políticas globais permanecem em foundation; keyframes em motion; cenário/lente em environment; controles/formulários/diálogos em components; geometria/navegação em shell; composição do acesso em auth. Mantidos os 21 proprietários e a ordem de imports. As páginas ainda conservam variantes históricas que serão refinadas nos lotes próprios.

Foram retiradas 466 entradas históricas de seletores de controles/superfícies antes de definir os novos blocos, além da reconciliação de campos e seleções. Nenhuma folha de acabamento foi acrescentada. Tokens antigos de cor agora apontam para aliases semânticos; nomes de compatibilidade continuam disponíveis para páginas não refinadas.

A dívida `!important` caiu de 243 para 103, e o guard passou a esse teto. Foram retiradas 54 definições de animação sem referência depois da substituição das camadas; agora há 100 keyframes únicos, incluindo quatro novos do observatório.

## Evidência local

- `npm run check`: proprietários/seletores/keyframes/teto, links de documentos, três testes de datas/timer, TypeScript e build.
- Chromium headless: login e shell, dois temas × quatro larguras (1440/834/390/320), 16 combinações sem overflow do documento ou pageerror.
- Smoke de navegação: 14 rotas × dois temas × quatro larguras, 112 combinações sem overflow do documento; não é auditoria visual completa de cada página.
- Captura: 18 passos de Tab dentro do diálogo, Escape fecha; comandos, perfil indisponível, notificações e menu Mais abrem/fecham. Transição menu Mais → busca mantém somente um overlay.
- Busca iniciada por “fin” mantém o diálogo; Enter abre Finanças. Atalhos não competem com texto comum.
- Pausa verificada nos planos novos e em pseudoelemento decorativo legado; preferência preservada após reload. Movimento reduzido desativa o acionador da atmosfera.
- Login com resposta 401 interceptada em ambiente isolado: campo é limpo, erro anunciado e foco retorna. Não houve tentativa com credenciais reais nem gravação em serviço externo.
- Capturas representativas inspecionadas: [login desktop](previews/v01-login-1440.jpg), [login mobile](previews/v01-login-390.jpg), [shell desktop](previews/v01-shell-1440.jpg). Dados do shell são do ambiente de demonstração; fontes externas estavam bloqueadas, com fallback local.

Build nesta revisão: CSS aproximadamente 340 kB / 57,4 kB gzip, contra 397,6 / 66,8 kB na base; JS inicial aproximadamente 471 / 136 kB gzip. Valores de bundle não certificam performance de blur/GPU em aparelhos reais.

## Limites e próxima entrega

O fluxo de sessão e o endpoint de login continuam com o protocolo anterior; esta revisão verifica apresentação e erro interceptado, não a autenticação real. B01 mantém validação autenticada, configuração e ownership; B02 mantém reconciliação externa de foco; P01 mantém testes iOS/watch e PWA real.

Contraste da paleta e estados principais orientou a incorporação, mas a revisão não certifica WCAG integral nem contraste de todas as variantes antigas das páginas. Sem certificação de VoiceOver, high contrast, GPU ou aparelhos reais. V02 refina Agora/Hoje, sua densidade, vazios e sombras de página usando esta base; V03–V06 seguem o [mapa de produção](../PRODUCTION_MAP.md).

Estado de execução é mantido no [issue #18](https://github.com/Gabriel2069/Nexus-OS/issues/18), sem checklist paralelo neste relatório.
