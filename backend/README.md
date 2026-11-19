# Petz API

Backend do Petz: monólito modular em **Fastify + TypeScript**, com **Drizzle/Postgres (Supabase + PostGIS)** e autenticação **Clerk**.

- Arquitetura e stack: [`initial_prompt.md`](initial_prompt.md)
- Decisões tomadas a partir dela: [`doc/INITIAL_DECISIONS.md`](doc/INITIAL_DECISIONS.md)

## Setup

Requer Node 22.12+.

```bash
npm install
cp .env.example .env   # preencha (ver comentários no arquivo)
npm run db:migrate     # aplica as migrations no Supabase
npm run dev            # http://localhost:3000 — docs em /docs
```

## Scripts

| Comando               | O que faz                                        |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | API com reload (`tsx watch`)                     |
| `npm run build/start` | Compila para `dist/` e roda                      |
| `npm run check`       | typecheck + lint + testes                        |
| `npm run db:generate` | Gera migration a partir de `src/database/schema` |
| `npm run db:migrate`  | Aplica migrations pendentes                      |

## Estrutura

```
src/
  app.ts / server.ts   bootstrap (buildApp é usado também nos testes)
  config/              env (Zod), logger, constantes
  plugins/             config, error-handler, cors+helmet, database, supabase, auth, rate-limit, swagger
  database/            schema Drizzle e migrations
  modules/<módulo>/    routes → controller → service → repository (+ schemas, types, errors)
  shared/              erros de domínio e schemas comuns
test/                  helpers e fakes dos testes
```

Rotas públicas: `GET /health`, `GET /ready`, `POST /webhooks/clerk`, `/docs` (fora de produção). Tudo sob `/v1` exige `Authorization: Bearer <token do Clerk>`.

| Rota                                  | O que faz                                  |
| ------------------------------------- | ------------------------------------------ |
| `GET /v1/users/me`                    | Usuário + pets                             |
| `PATCH /v1/users/me`                  | `name`, `avatarPath`, `pushToken`          |
| `DELETE /v1/users/me`                 | Exclui a conta (Clerk, banco e arquivos)   |
| `GET /v1/users/me/pets`               | Pets do usuário                            |
| `POST /v1/media/upload-url`           | URL assinada para upload direto ao Storage |
| `POST /v1/pets`                       | Cria pet (aceita `photoPaths`)             |
| `GET/PATCH/DELETE /v1/pets/:id`       | Lê, edita, exclui                          |
| `POST /v1/pets/:id/photos`            | Vincula foto enviada                       |
| `DELETE /v1/pets/:id/photos/:photoId` | Remove foto                                |

### Upload de fotos

1. `POST /v1/media/upload-url` com `{ purpose: 'pet_photo' | 'user_avatar' | 'chat_media', contentType }`.
2. `PUT` do arquivo em `uploadUrl` (ou `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)`).
3. Envie o `path` para o recurso (`photoPaths`, `/pets/:id/photos` ou `avatarPath`).

## Webhook do Clerk em desenvolvimento

O Clerk precisa de uma URL pública. Exponha a API com um túnel (ex.: `cloudflared tunnel --url http://localhost:3000` ou `ngrok http 3000`), cadastre `https://<túnel>/webhooks/clerk` em **Clerk → Webhooks** com os eventos `user.created`, `user.updated` e `user.deleted`, e copie o **Signing Secret** (`whsec_…`) para `CLERK_WEBHOOK_SIGNING_SECRET`. Sem ele a rota responde 503 e o usuário é criado só com o `clerk_user_id` na primeira requisição.

## Testes

`npm test` roda os testes HTTP com `app.inject`, usando repositórios em memória (`test/fakes.ts`). Testes de integração com Postgres aguardam um banco de teste separado (ver decisões em aberto).
