# DSA Tracker

A full-stack web app for software engineers to track their Data Structures & Algorithms preparation — topics, questions, spaced-repetition revisions, and personal notes, all in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dsa-tracker run dev` — run the frontend (port 20149)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + wouter routing + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (bcryptjs + jsonwebtoken), stored in localStorage
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, topics, questions, revisions, notes)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, topics, questions, revisions, notes, dashboard)
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify/requireAuth middleware
- `artifacts/api-server/src/lib/revisionScheduler.ts` — spaced repetition logic (1/7/30 day reminders)
- `artifacts/dsa-tracker/src/` — React frontend (pages, components, auth context)
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — auto-generated Zod schemas (do not edit)

## Architecture decisions

- **JWT over sessions**: Stateless auth via JWT stored in localStorage; Authorization header injected by custom-fetch.ts on every request.
- **Spaced repetition**: When a question is marked Solved or a topic Completed, 3 revision records are auto-created at +1, +7, +30 days.
- **Seed data**: 16 DSA topics and 62 questions seeded at DB level; user progress is stored separately per-user so multiple users share the same question bank.
- **OpenAPI-first**: All types flow from `openapi.yaml` → Orval codegen → typed hooks + Zod schemas. Never hand-write what codegen produces.
- **Dark-first UI**: Terminal/hacker aesthetic with neon green accent. Light mode toggle supported.

## Product

- Register/login with JWT auth
- Track 16 DSA topics (Arrays, Strings, Graphs, DP, etc.) with Not Started / In Progress / Completed status
- Browse and filter 62+ seeded questions by topic, difficulty, status, and search
- Automatic spaced-repetition revision reminders (1/7/30 days after solving)
- Personal notes per topic or question
- Dashboard with stats cards, progress bars, and recent activity feed
- User profile page with completion stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- `pnpm --filter @workspace/db run push` for schema changes (dev only — Replit Publish handles prod)
- JWT secret defaults to `dsa-tracker-secret-dev`; set `JWT_SECRET` env var in production
- Do not run `pnpm dev` at workspace root — use per-artifact commands or restart_workflow

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
