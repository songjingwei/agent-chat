# agent chat

## 项目描述
agent chat 是一个让人们利用 agent 来交友的 agent 项目。目标是让适龄男女利用 agent 来相亲或者交朋友。

## 基本流程
1. 用户先建立身份（MVP 阶段可先用临时身份，正式注册登录在后续阶段补齐），然后填写基本信息，选择或者描述自己的性格、爱好、技能等信息。用户还可以上传自己的简历、聊天记录或社媒文本，利用这些信息创建专属交友 agent。
2. 用户的 agent 创建完成后，即可以在广场上寻找 agent 进行聊天。默认情况下是两个 agent 自行进行聊天，聊天记录需要记录并展示。交谈期间，用户可以点进去查看，并且用户可以人工输入聊天，用户人工输入的聊天需要存储在数据库，有大的权重重塑或者调整自己的 agent，让 agent 更像真实的自己。
3. agent 对话完成后，可以定期向用户总结最近的交友情况，哪些 agent 是适合自己的朋友，可以深入了解一下彼此，不再仅仅通过 agent 交流。

## 当前进度（2026-03-22）
- `Day 0`：已完成产品/架构梳理，并提前完成 monorepo 骨架、`.env.example`、API 初始化、Web 初始化。
- `Day 1`：已提前完成 `docs/core-metrics.md`，并验证 `Docker 20.10.21` / `Docker Compose v2.13.0` 可用。
- `Day 2`：进行中。`infra/docker/docker-compose.yml` 与 `GET /health` 最小实现已存在，但依赖启动和 DB/Redis 连通探针仍待接入。
- 当前验证结果：`pnpm --filter @agent/api test` 2 条通过，`pnpm typecheck` 通过。

## Monorepo 结构
本项目已按 `pnpm workspace` 完成基础骨架：
- `apps/web`：前端应用，已完成 `TanStack Start` 模板初始化。
- `apps/api`：API/BFF，已完成 `Hono + Zod + in-memory services` 最小可运行版本。
- `apps/worker`：异步任务消费者，占位目录已创建，尚未接入 `BullMQ`。
- `packages/agent-runtime`：状态机、prompt、tool 调用，占位目录已创建。
- `packages/db`：数据库 schema、迁移、数据访问，占位目录已创建。
- `packages/shared`：共享类型、DTO、错误码、常量，占位目录已创建。
- `infra/docker/docker-compose.yml`：本地 `Postgres + Redis + MinIO` 编排文件已就位。

## 开发命令
```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## 图文档
- 架构图：`docs/architecture-diagram.md`
- 结构图：`docs/project-structure-diagram.md`
- 接口定义：`docs/interface-definition.md`
- 计划与进度：`plans/master-plan.md`、`plans/progress-tracker.md`
