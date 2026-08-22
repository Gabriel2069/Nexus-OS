# NexOS ~ conexões externas

A identidade visual existente não deve ser alterada para implementar estas integrações.

## Ordem recomendada
1. Google Calendar
2. Notion
3. Google Drive + Gmail
4. WhatsApp
5. Deezer

## 1. Google Calendar

### No Google Cloud
1. Abra o Google Cloud Console.
2. Crie ou selecione um projeto para o NexOS.
3. Configure a tela de consentimento OAuth.
4. Cadastre o domínio `nexos.gtadeusz.workers.dev` como domínio autorizado.
5. Crie um cliente OAuth do tipo Web application.
6. Adicione como origem autorizada: `https://nexos.gtadeusz.workers.dev`.
7. Adicione a URL de callback OAuth que o backend do NexOS fornecer. Não invente uma URL de callback antes de a Edge Function OAuth ser criada.
8. Guarde Client ID e Client Secret como secrets do backend, nunca no frontend ou GitHub.
9. Ao conectar, conceda acesso somente ao calendário necessário.

### No NexOS
Depois da configuração acima, a implementação do backend deve usar OAuth Authorization Code, guardar tokens no backend e sincronizar `calendar_commitments` por `external_id`.

## 2. Notion

1. Abra as integrações do Notion.
2. Crie uma integração interna para o NexOS.
3. Copie o token apenas para o secret manager/backend.
4. Compartilhe com essa integração somente as páginas e bases que deseja que o NexOS leia.
5. Priorize as páginas de TdV, IdC e projetos que realmente serão usados.
6. Depois de autorizado, forneça a identificação do workspace/páginas ao NexOS.

Não compartilhe o token em chat, GitHub ou frontend.

## 3. Google Drive + Gmail

Reutilize o mesmo projeto OAuth do Google Calendar.

1. No Google Cloud, habilite Google Drive API e Gmail API.
2. Mantenha a mesma tela de consentimento OAuth.
3. Use OAuth Authorization Code no backend.
4. Para Drive, conceda o menor escopo possível; prefira leitura quando o objetivo for análise.
5. Para Gmail, prefira escopos somente leitura, já que o objetivo inicial é análise/busca.
6. Guarde os tokens exclusivamente no backend/secret manager.

A conexão pode ser feita junto ao Calendar, mas o NexOS deve registrar cada serviço separadamente.

## 4. WhatsApp

Para comandos pelo WhatsApp, use a API oficial da Meta, não automações não oficiais.

1. Crie/acesse uma conta Meta for Developers.
2. Crie um aplicativo para o NexOS.
3. Adicione/configure WhatsApp Business Platform.
4. Configure um número de WhatsApp Business dedicado ao NexOS.
5. Configure o webhook HTTPS do backend do NexOS.
6. Configure o token de acesso como secret do backend.
7. Configure a verificação do webhook.
8. Defina as políticas/templates exigidos pela Meta quando aplicáveis.
9. Teste primeiro com o número de desenvolvimento.

O WhatsApp deve ser tratado como canal de comandos, não como acesso irrestrito ao workspace.

## 5. Deezer

1. Acesse o portal de desenvolvedores do Deezer.
2. Crie um aplicativo para o NexOS, se a conta/portal permitir o registro necessário.
3. Configure o redirect URI exatamente igual ao endpoint OAuth do backend.
4. Guarde o identificador/secret no backend.
5. Autorize somente os recursos necessários.

## Segurança

Nunca enviar para o chat:
- Client Secret
- OAuth refresh token
- Access token
- senha
- token do Notion
- token do WhatsApp

Esses valores devem entrar exclusivamente como secrets no ambiente/backend.

## Após as autorizações

O fluxo esperado é:
`OAuth/integração → backend → Integration Registry → adapter → sync → NexOS workspace`.

A interface existente permanece intacta; novas telas de conexão devem apenas herdar o sistema visual atual.
