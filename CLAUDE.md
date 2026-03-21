# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Chat — an AI-powered social/dating platform where users create personal AI agents that autonomously chat with other users' agents. Built as a pnpm monorepo with TypeScript throughout.

## Monorepo Structure

| Package | Purpose | Tech Stack |
|---------|---------|------------|
| `apps/web` | Frontend UI | TanStack Start, React 19, TanStack Router/Query, Tailwind CSS, Vite |
| `apps/api` | API/BFF layer | Hono, Zod, @hono/node-server |
| `apps/worker` | Async task worker | BullMQ (scaffold only) |
| `packages/agent-runtime` | Agent state machine, prompts, memory, tools | OpenAI API (scaffold only) |
| `packages/db` | DB schema, migrations, repositories | Drizzle ORM + PostgreSQL/pgvector (scaffold only) |
| `packages/shared` | Shared types, DTOs, error codes, constants | (scaffold only) |
| `infra/docker/` | Local infrastructure | PostgreSQL 16, Redis 7, MinIO |

Dependency flow: `web → api → {runtime, db, worker}` — all depend on `shared`.

## Common Commands

```bash
pnpm install                          # Install all workspace dependencies
pnpm dev                              # Run web + api + worker in parallel
pnpm build                            # Build all packages
pnpm test                             # Test all packages
pnpm lint                             # Lint all packages
pnpm typecheck                        # Type-check all packages

# Single-package commands
pnpm --filter @agent/web dev          # Web dev server (port 3000)
pnpm --filter @agent/api dev          # API dev server (port 3001)
pnpm --filter @agent/api test         # API tests (tsx --test, Node native runner)
pnpm --filter @agent/web test         # Web tests (vitest)

# Infrastructure
docker compose -f infra/docker/docker-compose.yml up -d
```

## TypeScript Configuration

- Base config: `tsconfig.base.json` — target ES2022, strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Path aliases defined at root: `@agent/shared`, `@agent/runtime`, `@agent/db` → `packages/*/src/index.ts`
- Each package extends the base config

## Architecture Conventions

- **API module pattern**: Each domain (personas, sessions, messages, reports) has its own directory under `apps/api/src/modules/` with route, service, and schema files. Routes handle orchestration only — no state machine or LLM logic in routes.
- **Validation**: Every input DTO must have a Zod schema. No implicit `any`.
- **Error handling**: Unified `ApiError` wrapper in API. All error responses share the same structure.
- **Frontend data fetching**: Use TanStack Router loaders and TanStack Query hooks. Centralize API calls in `lib/`, not scattered across components.
- **Frontend file organization**: `routes/` for pages, `features/` for domain logic, `components/` for reusable UI, `lib/` for API client and utilities.

## Coding Style

- 2-space indentation
- `camelCase` for variables/functions, `PascalCase` for types/classes/components
- `kebab-case` for filenames and directories
- Components: `PascalCase.tsx`; hooks/utils: `camelCase.ts`

## Commit Conventions

- Conventional Commits: `feat(runtime): add human override memory merge`
- Jujutsu (`jj`) is configured alongside git. Use `jj` commands when the user prefers: `jj st`, `jj log`, `jj diff`, `jj describe -m`, `jj new`, `jj git push`.

## Key Documentation

- `docs/system-architecture.md` — full system design and tech choices
- `docs/mvp-implementation-plan.md` — 15-day MVP delivery plan
- `plans/progress-tracker.md` — daily status tracking
- `apps/api/AGENTS.md` — API module guide, endpoint roadmap, constraints
- `apps/web/AGENTS.md` — frontend module guide, page roadmap, constraints

## Important Constraints

- Human override messages always have higher priority than model-inferred data and must be traceable.
- User data queries must always include user-scope conditions to prevent unauthorized access.
- Write operations should include audit fields (actor, action, resource, timestamp).
- API DTOs and error codes should be defined in `packages/shared` to avoid frontend/backend type drift.
- Environment configuration template: `.env.example` (never commit actual secrets).
