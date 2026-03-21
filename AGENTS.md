# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first:
- `readme.md` defines the product goal and core user flow.
- `docs/system-architecture.md` defines the target architecture and proposed monorepo layout.
- `docs/mvp-implementation-plan.md` defines MVP priorities and delivery milestones.

There is no application source tree yet. When scaffolding begins, follow the structure already documented in `docs/system-architecture.md`: `apps/web`, `apps/api`, `apps/worker`, `packages/agent-runtime`, `packages/db`, and `packages/shared`.

## Build, Test, and Development Commands
At the current stage, contributors mainly validate docs and plans:
- `rg --files` — list repository files quickly.
- `rg -n "TODO|FIXME" readme.md docs` — find unresolved items.
- `sed -n '1,160p' docs/system-architecture.md` — review a section without opening an editor.
- `jj st` / `jj log` — check VCS status and history with Jujutsu.

After code scaffolding is added, standardize commands in the root README and keep them consistent, e.g.:
- `pnpm install` — install workspace dependencies.
- `pnpm -r dev` — run web/api/worker in development mode.
- `pnpm -r test` — run all workspace tests.

## Coding Style & Naming Conventions
- Markdown: use clear ATX headings (`##`, `###`) and concise, actionable sections.
- Filenames: use kebab-case (for example, `mvp-implementation-plan.md`).
- TypeScript (planned stack): use 2-space indentation, `camelCase` for variables/functions, `PascalCase` for types/classes, and keep API schemas explicit with `zod`.

## Testing Guidelines
No test framework is configured yet in this snapshot. For new code:
- Add unit/integration tests in the same PR as feature work.
- Keep test files close to modules (e.g., `*.test.ts` next to implementation).
- Prioritize coverage for core flows: persona generation, memory weighting, and agent chat loop.

## Commit & Pull Request Guidelines
VCS history is not present in this workspace, so existing commit conventions cannot be inferred.
- Use `jj` as the default local workflow (`jj st`, `jj log`, `jj diff`, `jj describe -m`, `jj new`).
- Sync remote through `jj git fetch` and `jj git push`.
- Adopt Conventional Commits (example: `feat(runtime): add human override memory merge`).
- PRs should include: purpose, scope, linked task/issue, impacted paths, and evidence (logs/screenshots/sample payloads).
- Keep PRs focused; separate architecture/doc updates from large implementation changes when possible.

## Security & Configuration Tips
- Never commit secrets; maintain a checked-in `.env.example` once runtime code is added.
- Treat uploaded user data as sensitive and avoid real personal data in fixtures or examples.
