# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Chat — an AI-powered social/dating platform where users create personal AI agents that autonomously chat with other users' agents. Built as a pnpm monorepo with TypeScript throughout.

## Monorepo Structure

| Package | Purpose | Tech Stack |
|---------|---------|------------|
| `apps/web` | User Frontend | TanStack Start, React 19, Tailwind CSS |
| `apps/admin` | Admin Dashboard | Vite, React 19, Ant Design, Zustand |
| `apps/api` | API/BFF layer | Hono, Zod, BullMQ, Jose |
| `apps/worker` | Async task worker | BullMQ, Node.js |
| `packages/agent-runtime` | Agent engine, memory, prompts | Multi-model (OpenAI, Anthropic) |
| `packages/db` | DB schema & Repositories | Drizzle ORM + PostgreSQL 16/pgvector |
| `packages/shared` | Shared types, DTOs, job types | TypeScript |

Dependency flow: `{web, admin, api, worker} → {shared}`, `{api, worker} → {runtime, db}`.

## Current Status Snapshot (2026-03-28)

- `Core Infrastructure`: `Done`
- `Agent Engine & Runtime`: `Done`
- `Async Conversation Loop`: `In Progress`（BullMQ 编排链路已落地，仍需继续做生产化验证）
- `Admin Dashboard`: `Done`
- `Personality Assessment`: `In Progress`（测评题库/会话/结果主流程已上线，专家解释与 Persona 自动校准未完成）

## Today Plan (2026-03-28)

- Day focus: `Day 7 — Personality Assessment 深化`
- `P0`: Move assessment interpretation from synchronous `AssessmentService` logic to Worker (`assessment-interpretation` queue + processor). Answer submission should only persist state and enqueue job.
- `P0`: Implement expert interpretation structured schema (`dimension_scores`, `confidence`, `evidence`, `memory_writes`, `persona_patch`, `auto_apply`) with parse-failure fallback and diagnostic logging.
- `P1`: Implement Persona auto-calibration threshold policy. Before any auto-apply, write `persona_versions` snapshot with `change_source=assessment_calibration` and audit fields.
- `P1`: Add end-to-end regression coverage for assessment flow (session create -> answer submit -> interpretation trigger -> result query) and pass `pnpm --filter @agent/api test` + `pnpm --filter @agent/api typecheck`.

### Acceptance Criteria (2026-03-28)

- Interpretation runs asynchronously after assessment completion and supports retry with correct status transitions.
- `assessment_interpretations` persists both `error_code` and `raw_output` for observability and debugging.
- `auto_apply` must always create a `persona_versions` snapshot first, ensuring rollbackability and traceability.

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

# Database
pnpm --filter @agent/db db:generate   # Generate migration SQL from schema changes
pnpm --filter @agent/db db:migrate    # Run pending migrations (staging/production)
pnpm --filter @agent/db db:push       # Push schema directly (local dev only)
pnpm --filter @agent/db db:studio     # Open Drizzle Studio

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

## Database Conventions

**详细规范见 `packages/db/AGENTS.md`**，以下为顶层约束：

- **Schema 变更必须通过迁移**：用 `db:generate` 生成 SQL 迁移文件，提交到 git。`db:push` 仅限本地开发。
- **每张表必备字段**：`created_at`、`updated_at`（timestamptz）。
- **审计字段**：有写入操作的表须包含 `created_by` / `updated_by`（记录操作者 userId）。
- **软删除**：用户相关核心数据表须有 `deleted_at` 字段，查询默认过滤已删除记录。
- **主键**：`varchar(64)` 格式 `{prefix}_{uuid_hex}`，禁止自增整数。
- **外键索引**：所有外键列必须有索引（PostgreSQL 不自动创建）。
- **枚举**：用 `varchar` + CHECK 约束，不用 PostgreSQL ENUM（迁移困难）。
- **时间戳**：一律 `timestamptz`，应用层传 UTC。
- **性能**：分页用 cursor-based，跨表写入必须在事务内，核心查询上线前跑 `EXPLAIN ANALYZE`。

## Coding Style

- 2-space indentation
- `camelCase` for variables/functions, `PascalCase` for types/classes/components
- `kebab-case` for filenames and directories
- Components: `PascalCase.tsx`; hooks/utils: `camelCase.ts`
- **Frontend Design (Critical)**: Always reference and strictly follow **`apps/web/FRONTEND_STANDARDS.md`** for UI implementation. Use "Soulful Echo" visual tokens, poetic Chinese copy, and specific animation standards.

## Commit Conventions

- Conventional Commits: `feat(runtime): add human override memory merge`
- Jujutsu (`jj`) is configured alongside git. Use `jj` commands when the user prefers: `jj st`, `jj log`, `jj diff`, `jj describe -m`, `jj new`, `jj git push`.

## Key Documentation

- `docs/system-architecture.md` — full system design and tech choices
- `docs/architecture.md` — Mermaid architecture & flow diagrams
- `docs/conversation-orchestration.md` — implementation details for agent-to-agent chat
- `docs/mvp-implementation-plan.md` — 15-day MVP delivery plan
- `plans/progress-tracker.md` — daily status tracking
- `apps/api/AGENTS.md` — API module guide, endpoint roadmap, constraints
- `apps/web/AGENTS.md` — frontend module guide, page roadmap, constraints
- `apps/admin/package.json` — Admin dashboard info
- `packages/db/AGENTS.md` — **数据库 schema 设计规范、迁移管理、性能指导、建表检查清单**

## Debugging & Browser Tools

### Browser Automation & Debugging
- **`dev-browser` Skill**: Use for browser automation, visual testing, and Chrome DevTools debugging.
  - **Standalone mode**: Launches a fresh Chromium instance for isolated testing.
  - **Extension mode**: Connects to user's existing Chrome session for authenticated workflows.
- **Chrome DevTools**: When debugging frontend issues, leverage browser DevTools via `dev-browser` skill or manual inspection.
- **TanStack DevTools**: The frontend includes TanStack React Query and Router DevTools for inspecting state, queries, and routes.
- **Screenshot Capture**: Use `dev-browser` to capture screenshots for visual regression testing and bug reporting.

### Usage Example
```bash
# Start dev-browser server (standalone mode)
./skills/dev-browser/server.sh &

# Run a quick browser script
cd skills/dev-browser && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";
const client = await connect();
const page = await client.page("test", { viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000");
await waitForPageLoad(page);
console.log({ title: await page.title(), url: page.url() });
await client.disconnect();
EOF
```

## Important Constraints

- Human override messages always have higher priority than model-inferred data and must be traceable.
- User data queries must always include user-scope conditions to prevent unauthorized access.
- Write operations should include audit fields (actor, action, resource, timestamp).
- API DTOs and error codes should be defined in `packages/shared` to avoid frontend/backend type drift.
- Environment configuration template: `.env.example` (never commit actual secrets).
