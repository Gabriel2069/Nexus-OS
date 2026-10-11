# NexOS: regras de manutenção

Leia `docs/INDEX.md`, `docs/PRODUCTION_MAP.md`, `DESIGN.md`, `docs/STYLE_SYSTEM.md` e `docs/FOUNDATION_REVIEW.md` antes de alterar interface ou fluxo de dados.

- Preserve identidade, conteúdo e trabalho não relacionado. Não substitua telas inteiras para corrigir uma regra.
- CSS tem proprietários registrados em `scripts/check-foundations.mjs`. Edite o proprietário existente. Não crie arquivos `refinement`, `polish`, `final`, versões `vN` ou uma segunda implementação global do mesmo material.
- Variantes de página pertencem a `src/styles/pages`; componentes comuns pertencem a `components.css`; geometria de navegação pertence a `shell.css`; atmosfera pertence a `environment.css`.
- Keyframes pertencem exclusivamente a `motion.css`, com nome único. Resolva disputa de propriedade usando elementos diferentes ou uma animação composta.
- Use tokens semânticos de texto e material, preserve tema claro e movimento reduzido. Não aumente o orçamento de `!important` para encobrir conflitos.
- Novos modais usam `ModalSurface` e `useOverlay`; datas civis usam `lib/dates.ts`. Não misture meia-noite do navegador com a zona da aplicação.
- Dados de demonstração exigem `VITE_NEXOS_DEMO=true`. Não apresente fixtures como dados reais nem transforme falha de leitura em lista vazia silenciosa.
- APIs respeitam o usuário autenticado e RLS. Não altere contratos SQL de recompensa, idempotência e ownership sem revisão e testes específicos.
- Não integre integralmente PRs de movimento anteriores à reorganização. Reaplique somente comportamentos úteis no proprietário atual e teste a cascata.
- Execute `npm ci` quando necessário e `npm run check`. Para mudanças de UI, confira estados representativos em desktop e celular; para comportamento, teste o fluxo e o erro relevante.
- Formate arquivos tocados com `npm exec -- prettier --write <arquivos>`. Não minifique arquivos-fonte.
- Entregue alterações em branch e PR com escopo, verificações e limitações. Merge e publicação precisam seguir a autorização da sessão.

- Todo PR declara ID do mapa, fronteira, dependências e evidência. Atualize o proprietário e o mapa corrente; documentos em archive são históricos. Não reintroduza PR supersedido por merge integral.
