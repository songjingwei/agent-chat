# Repository Guidelines

## Project Structure & Module Organization
This repository already contains a working `pnpm workspace` monorepo scaffold plus planning docs:
- `readme.md` defines the product goal, current status snapshot, and common commands.
- `plans/*` tracks day-by-day execution, adjustments, and daily records.
- `docs/system-architecture.md` and `docs/mvp-implementation-plan.md` define the target architecture and MVP roadmap.
- `apps/web` contains the TanStack Start frontend scaffold.
- `apps/api` contains the runnable Hono + Zod API baseline with in-memory persona/session/message/report flows.
- `apps/worker`, `packages/agent-runtime`, `packages/db`, and `packages/shared` exist but are still early-stage placeholders.

Current status as of `2026-03-22`:
- `Day 0`: `Done`
- `Day 1`: `Done`
- `Day 2`: `In Progress`

## Build, Test, and Development Commands
Contributors now validate both docs and runnable scaffolds:
- `rg --files` — list repository files quickly.
- `rg -n "TODO|FIXME" readme.md docs` — find unresolved items.
- `sed -n '1,160p' docs/system-architecture.md` — review a section without opening an editor.
- `jj st` / `jj log` / `jj diff` — check VCS status and history with Jujutsu.
- `pnpm install` — install workspace dependencies.
- `pnpm dev` — run web/api/worker in development mode.
- `pnpm test` — run workspace tests.
- `pnpm typecheck` — run workspace type checks.
- `pnpm --filter @agent/api test` — run the API regression tests directly.
- `docker compose -f infra/docker/docker-compose.yml up -d` — start Postgres/Redis/MinIO for local development.

## Coding Style & Naming Conventions
- Markdown: use clear ATX headings (`##`, `###`) and concise, actionable sections.
- Filenames: use kebab-case (for example, `mvp-implementation-plan.md`).
- TypeScript (planned stack): use 2-space indentation, `camelCase` for variables/functions, `PascalCase` for types/classes, and keep API schemas explicit with `zod`.

## Testing Guidelines (Lean & Impactful)
**Principle: Quality over Quantity. These guidelines apply to ALL modules (apps/* and packages/*). Tests must be lean, fast, and highly intentional.**

### AI Agent Testing Requirements:
1. **Explain Before You Test**: Before creating or modifying a test, the AI must briefly explain the intent to the developer:
   - What scenario is being covered?
   - Why is this test critical (e.g., preventing regression on a core flow)?
   - What are the specific expected outcomes?
2. **"Less is More"**: Focus on critical business logic, core flows (Persona/Session/Chat), and tricky edge cases. Avoid boilerplate testing of trivial getters/setters or standard library behavior.
3. **Integration-First**: Prioritize tests that prove the system works together (like the current API baseline flow) rather than thousands of isolated unit tests with heavy mocking.
4. **Test Proximity**: Keep test files close to the modules they verify (e.g., `*.test.ts` next to implementation).
5. **No Flakiness**: Any non-deterministic test is a bug. Fix it or remove it immediately.

## Commit & Pull Request Guidelines (VCS Mandate)
**CRITICAL: All AI agents and automated tools MUST use `jj` (Jujutsu) for local development, committing, and remote synchronization. Direct use of `git` for these operations is prohibited.**

### AI Agent Workflow Requirements:
1. **Local Development**: Always use `jj st`, `jj log`, and `jj diff` to track changes.
2. **Committing**: Use `jj describe -m "..."` to document changes. Do NOT use `git commit`.
3. **Branching/Changes**: Use `jj new` to start new tasks.
4. **Synchronization**: Use `jj git fetch` and `jj git push` for remote updates.
5. **History Management**: Use `jj rebase`, `jj squash`, and `jj undo` to maintain a clean history.

### Commit Standards:
- Adopt Conventional Commits (example: `feat(runtime): add human override memory merge`).
- PRs should include: purpose, scope, linked task/issue, impacted paths, and evidence (logs/screenshots/sample payloads).
- Keep PRs focused; separate architecture/doc updates from large implementation changes when possible.

## Security & Configuration Tips
- Never commit secrets; the repository already includes a checked-in `.env.example` and it must stay secret-free.
- Treat uploaded user data as sensitive and avoid real personal data in fixtures or examples.
