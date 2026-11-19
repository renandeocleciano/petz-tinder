# Petz 🐾

App social e de descoberta local para pets e tutores: cadastre seus pets, descubra pets próximos, dê match, converse, combine passeios e veja quem está por perto no mapa.

MVP em **React Native + Expo (SDK 57)**, TypeScript strict, pronto para EAS Development Build, TestFlight e Google Play Internal Testing.

## Stack

| Área                   | Escolha                                               |
| ---------------------- | ----------------------------------------------------- |
| Navegação              | Expo Router (rotas em `src/app`, rotas tipadas)       |
| Server state           | TanStack Query                                        |
| Estado local           | Zustand (`src/store/appStore.ts`)                     |
| Formulários            | React Hook Form + Zod                                 |
| Auth                   | Clerk (`@clerk/expo`), atrás de uma abstração própria |
| Mapa                   | Mapbox (`@rnmapbox/maps`)                             |
| Push                   | Expo Notifications                                    |
| Fotos                  | Expo Image Picker + Expo Image                        |
| Armazenamento sensível | Expo Secure Store (token de sessão)                   |
| Gestos/animação        | Gesture Handler + Reanimated 4                        |
| Testes                 | Jest (`jest-expo`) + React Native Testing Library 14  |

## Setup

```bash
npm install
cp .env.example .env   # preencha as chaves (todas são opcionais em desenvolvimento)
```

### Variáveis de ambiente

| Variável                            | Para quê                                    | Sem ela                               |
| ----------------------------------- | ------------------------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Login real (Apple, Google, e-mail)          | Usa um login de desenvolvimento local |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`   | Token **público** (`pk.*`) do Mapbox        | A aba Mapa mostra um placeholder      |
| `EXPO_PUBLIC_API_URL`               | URL do backend REST                         | Usa os mocks em memória               |
| `EXPO_PUBLIC_MOCK_NEW_USER`         | `true` começa sem pets (testa o onboarding) | Começa com o pet "Thor" já cadastrado |

> Só variáveis `EXPO_PUBLIC_*` entram no bundle, e **tudo nelas é público**. Nunca coloque segredos (chave secreta do Clerk, token `sk.*` do Mapbox etc.) no app.

### Rodando (Development Build)

O app usa módulos nativos (Mapbox, Clerk, Reanimated), então **não roda no Expo Go**: é preciso um development build.

```bash
# Build na nuvem (não precisa de Xcode/Android Studio)
npx eas-cli@latest login
npx eas-cli@latest init                                   # vincula o projeto e grava o projectId
npx eas-cli@latest build --profile development --platform ios     # ou android
npx eas-cli@latest build --profile development-simulator --platform ios

# Depois de instalar o build no device/simulador:
npm start
```

Com Xcode ou Android Studio instalados localmente: `npm run ios` / `npm run android`.

Para inspecionar só a interface no navegador, use `npx expo start --web`. O mapa nativo não existe no web e aparece como placeholder.

### Configuração do Clerk

1. Crie uma aplicação em <https://dashboard.clerk.com> e copie a Publishable Key para `.env`.
2. Em **Native applications**, habilite a Native API e cadastre o bundle id `com.petz.app` (iOS) e o package `com.petz.app` (Android).
3. Em **SSO connections**, habilite **Apple** e **Google**. Em produção, cada provedor precisa de credenciais próprias.
4. Cadastre a redirect URL `petz://sso-callback`.

Apple e Google usam `useSSO`. "Entrar com e-mail" e "Já tenho conta" abrem o fluxo hospedado do Clerk (`useHostedAuth`). As telas nunca importam o Clerk: elas usam `useAuthSession()` de `src/services/auth`.

> Antes de publicar, troque `com.petz.app` em `app.json` pelo identificador definitivo.

### Mapbox

Crie um token público em <https://account.mapbox.com> e defina `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. O plugin `@rnmapbox/maps` já está em `app.json`; depois de mudar plugins é preciso gerar um novo build nativo.

## Scripts

| Comando             | O que faz                                |
| ------------------- | ---------------------------------------- |
| `npm start`         | Dev server para o development build      |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | ESLint (`eslint-config-expo` + Prettier) |
| `npm run format`    | Prettier                                 |
| `npm test`          | Jest                                     |
| `npm run check`     | typecheck + lint + testes                |

## Arquitetura

```
src/
  app/                 Rotas (Expo Router). Telas finas que compõem features e componentes
    (auth)/            welcome, login
    (onboarding)/      create-pet
    (tabs)/            discover, map, matches, chat, profile
    conversation/[id]  chat 1:1
    pet/[id]/          perfil público + edit
    premium.tsx        paywall (modal)
    filters.tsx        filtros avançados (premium, modal)
  components/          UI reutilizável (ui/, pet/, chat/, match/, map/, premium/, form/)
  features/            Lógica de tela agrupada por feature (pet-form, discover, safety…)
  hooks/               Hooks de dados (TanStack Query) — a única ponte entre UI e API
  lib/api/             Contrato PetzApi + cliente REST + implementação mock
  mocks/               Dados de exemplo (Rio de Janeiro)
  services/            auth, subscription, location, notifications
  store/               Zustand (pet ativo, cidade, localização aproximada, filtros)
  theme/               Design system (cores, espaçamento, raios, tipografia, sombras)
  types/               Modelo de domínio
```

### Trocar mocks pela API real

Toda comunicação passa pela interface `PetzApi` (`src/lib/api/types.ts`). `src/lib/api/index.ts` escolhe a implementação:

- `EXPO_PUBLIC_API_URL` vazio → `createMockApi()` (em memória, com latência simulada)
- `EXPO_PUBLIC_API_URL` preenchido → `createHttpApi()` (REST com `Authorization: Bearer <token do Clerk>`)

Nenhum componente muda. Endpoints esperados pelo cliente REST:

```
GET  /me                       PATCH /me
POST /pets                     GET /pets/:id       PATCH /pets/:id     POST /pets/:id/boost
GET  /discover?petId&lat&lng&species&sizes&traits&maxDistanceKm
POST /likes                    GET /matches?petId
GET  /conversations?petId      GET /conversations/:id
GET  /conversations/:id/messages               POST /conversations/:id/messages
PATCH /conversations/:id/messages/:messageId/playdate
GET  /places/suggestions?lat&lng
GET  /nearby?petId&lat&lng&radiusKm
POST /reports                  POST /blocks
```

Erros: `402` = recurso premium (`premium_required`), `401/403` = não autorizado, `404`, `422` = validação.

O mock implementa as mesmas regras que o backend deve aplicar: match só com like mútuo, gating premium no servidor, bloqueios e coordenadas ofuscadas. Os testes em `src/lib/api/mock/__tests__` servem de especificação executável para o backend.

### Premium

- `src/services/subscription` define o contrato `SubscriptionService` (planos, compra, restauração). Hoje a implementação mock só muda o tier do usuário. Uma implementação com RevenueCat, StoreKit ou Play Billing pode substituí-la sem tocar nas telas.
- `canUseFeature()` / `usePremiumGate()` fazem o gate de UX, abrindo o paywall antes da chamada. O servidor continua sendo a fonte de verdade e responde `402`.
- Recursos premium: ver pets sem match no mapa, mensagem direta sem match, filtros avançados e boost do perfil.

## Privacidade e segurança

- **Localização:** a leitura do GPS é arredondada para ~1 km (`approximate()`) logo após a leitura e nunca é armazenada nem exibida com precisão. Os pins do mapa usam `obfuscateCoordinate()` (grade de ~500 m mais um deslocamento estável por pet). O usuário aparece como uma área aproximada, nunca como um ponto. Se a permissão for negada, o app segue funcionando com a cidade escolhida manualmente.
- Nenhuma tela exibe endereço, telefone ou coordenadas. O chat mostra um lembrete para combinar passeios em locais públicos.
- **Denunciar e bloquear:** disponível no perfil do pet e no chat (`SafetySheet`), com os tipos `Report` e `Block` no domínio. Pets bloqueados somem de Descobrir, Matches, Chat e Mapa.
- Nenhum segredo fica no cliente. O token de sessão fica no Secure Store (`@clerk/expo/token-cache`).

## Testes

`npm test` cobre:

- criação de pet: validação do formulário, envio e mapeamento para a API;
- Descobrir: renderização do card, próximo pet após "não curti", paywall na mensagem direta;
- likes: like sem reciprocidade não gera match, dislike nunca gera;
- match: like mútuo e super like criam match e conversa;
- premium gating: bloqueio para free, liberação após a assinatura, pins anônimos no mapa;
- privacidade: pins nunca na posição armazenada, bloqueio remove o pet das listas.

## Fora do escopo desta versão

Backend real, compra real (RevenueCat), upload de fotos (hoje as fotos são URIs locais; o ponto de integração está em `PhotoPicker` e `pickChatImage`), voz/vídeo, playdates avançados, locais pet friendly, serviços e marketplace.
