# NOVIX — AI Business Manager

A pnpm monorepo containing a full-stack AI business management platform: an Express API server (`artifacts/api-server`) and an Expo mobile app (`artifacts/mobile`) ready for EAS production Android builds.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routed at `/api`)
- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server (port 18115)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (for DB package, optional for mobile-only flow)
- Optional env: `OPENAI_API_KEY` — required for AI chat and agent features
- Optional env: `SESSION_SECRET` — JWT secret for auth (defaults to dev secret)

## EAS Build (Android Production AAB)

```bash
# From the mobile artifact directory
cd artifacts/mobile

# Login to Expo account
npx eas-cli login

# Run production Android build (generates .aab for Google Play)
npx eas-cli build --platform android --profile production
```

The `production` profile in `eas.json` is configured with:
- `buildType: "app-bundle"` (generates `.aab`)
- `autoIncrement: true`
- `node: "20.19.0"`, `pnpm: "10.32.1"`, `corepack: true`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API**: Express 5, OpenAI SDK, pino logging
- **Mobile**: Expo SDK 54, React Native 0.81, Expo Router 6 (file-based routing)
- **DB**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (API server CJS bundle), EAS Build (mobile AAB)

## Where things live

- `artifacts/mobile/` — Expo React Native app
  - `app/` — Expo Router file-based screens (tabs: Dashboard, AI, Emails, CRM, Tasks, Alerts, Settings)
  - `components/` — shared UI components
  - `context/` — AppContext (AsyncStorage state), LanguageContext (EN/AR)
  - `hooks/` — `useAI`, `useColors`
  - `constants/` — colors, translations
  - `app.json` — Expo config (EAS projectId, Android package `com.novix`)
  - `eas.json` — EAS Build profiles
  - `metro.config.js` — Metro bundler config with monorepo support
  - `babel.config.js` — Babel config with reanimated plugin
- `artifacts/api-server/` — Express API server
  - `src/routes/` — health, ai (chat + streaming), agents, auth
  - `src/agents/` — AI agent implementations (supervisor, opportunity, etc.)
  - `src/lib/` — auth-store, scheduler, store, logger
  - `agents-data/store.json` — persistent agent state (JSON file store)
- `lib/api-client-react/` — React Query hooks generated from OpenAPI spec (used by mobile)
- `lib/api-spec/` — OpenAPI spec + Orval codegen config
- `lib/api-zod/` — Zod schemas generated from OpenAPI spec
- `lib/db/` — Drizzle ORM schema and DB client

## Architecture decisions

- **Mobile uses AsyncStorage for persistence** — no database required for the mobile app; all client state (clients, tasks, deals, emails, meetings, notifications) is persisted via AsyncStorage
- **Metro monorepo config** — `metro.config.js` sets `watchFolders: [workspaceRoot]` and `resolver.nodeModulesPaths` to allow Metro to resolve `@workspace/api-client-react` from the lib package
- **`unstable_enablePackageExports: true`** in Metro config so packages with `exports` field (like `@workspace/api-client-react`) resolve correctly
- **`react-native-reanimated/plugin` must be last** in Babel plugins array (official requirement)
- **Android package**: `com.novix` (reverse DNS — was `novix.com` which is invalid for Google Play)
- **Agent auth**: JWT-based with bcrypt password hashing; the local `validatePassword(user, pw)` import from auth-store is used for login; a separate `validatePasswordStrength(pw)` function handles registration validation

## Product

NOVIX is an AI-powered autonomous business manager with:
- **Dashboard**: live activity feed, stats, AI-generated daily briefing
- **AI Agent**: streaming chat with business context injection and memory
- **Email Center**: inbox management with AI reply generation
- **CRM**: client management with AI deal analysis
- **Tasks**: AI task generation with priority management
- **Agents**: autonomous AI agents (opportunity discovery, email drafting, calendar management, etc.) with approval workflow
- **Notifications**: urgent alerts, deal updates, email digests
- **Settings**: language switcher (EN/AR with RTL support), AI behavior toggles
- Bilingual support: English and Arabic with RTL layout

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Always run `pnpm install` from the workspace root**, not from inside `artifacts/mobile/`
- **`react-native-reanimated/plugin` must be last** in `babel.config.js` plugins array
- **iOS bundle identifier** (`com.novix`) must match Android package in `app.json` for EAS consistency
- **`expo-glass-effect`** (`isLiquidGlassAvailable()`) — iOS 26+ liquid glass; gracefully falls back to classic tab layout on older iOS and all Android versions
- **`expo-router/unstable-native-tabs`** — only rendered when `isLiquidGlassAvailable()` returns true (iOS 26+); stable `<Tabs>` is used everywhere else
- **Agent scheduler** runs every 15 minutes when the API server is live; requires `OPENAI_API_KEY`
- **pnpm `minimumReleaseAge: 1440`** — expo/react-native packages are excluded from this check to allow fast CI installs
- **The mockup-sandbox artifact** has pre-existing `@types/react` version conflict TypeScript errors — these are unrelated to the mobile build and do not affect EAS

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Expo Router docs: https://docs.expo.dev/router/introduction/
