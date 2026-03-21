# Agent Chat 项目结构图（pnpm workspace）

## 结构关系图

```mermaid
flowchart TD
  ROOT[agent/] --> APPS[apps/]
  ROOT --> PKGS[packages/]
  ROOT --> INFRA[infra/]
  ROOT --> DOCS[docs/]
  ROOT --> PLANS[plans/]

  APPS --> WEB[web]
  APPS --> API[api]
  APPS --> WORKER[worker]

  PKGS --> RT[agent-runtime]
  PKGS --> DB[db]
  PKGS --> SHARED[shared]

  INFRA --> DOCKER[docker-compose\npostgres + redis + minio]

  API --> SHARED
  WEB --> SHARED
  WORKER --> SHARED
  API --> RT
  WORKER --> RT
  API --> DB
  WORKER --> DB
```

## 目录树

```txt
agent/
  apps/
    web/
    api/
    worker/
  packages/
    agent-runtime/
    db/
    shared/
  infra/
    docker/
  docs/
  plans/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .env.example
```
