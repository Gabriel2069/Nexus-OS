# D01 — evidência de revisão

Revisão local em 11 de outubro de 2026, Chromium headless; prancheta aberta como arquivo offline, com fontes de sistema. Esta evidência pertence à proposta, não ao backend ou à interface implantada.

- Temas escuro e claro nas larguras 1440, 834, 390 e 320 px: sem overflow horizontal do documento nas oito combinações.
- Sem erros JavaScript observados. Alternância de tema e movimento, tabs por setas, abertura de diálogo e fechamento por Escape verificados.
- Movimento reduzido desativa o acionador; pausa alcança pseudoelementos das órbitas. Atmosfera para em aba oculta e elementos observados recebem estado fora de tela.
- Capturas desktop/hero/mobile inspecionadas; moldura mobile corrigida para respeitar a largura disponível.
- Contraste calculado sobre painel opaco: texto normal 15,69:1 escuro / 15,51:1 claro; texto secundário 8,46:1 / 6,21:1. Ciano, violeta e âmbar sobre o mesmo painel entre 5,81:1 e 11,60:1. Não cobre transparência, blur, fotografia, estados de produção ou todos os contornos.
- `npm run check`: guardas de 21 proprietários CSS e 150 animações, links de documentos/14 IDs, 3 testes de datas/timer, typecheck e build aprovados.

Limites: revisão não certifica WCAG completa, performance em dispositivos reais, VoiceOver, watch, autenticação, dados sincronizados ou comportamento nativo Liquid Glass. Esses critérios estão no lote V01 e nos itens B01/B02/P01.
