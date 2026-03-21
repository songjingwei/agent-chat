# agent chat

## 项目描述
agent chat 是一个让人们利用 agent 来交友的 agent 项目。目标是让适龄男女利用 agent 来相亲或者交朋友。

## 基本流程
1. 用户注册账户，登录网站，然后可以填入基本信息，选择或者描述自己的性格、爱好、技能等信息，用户还可以上传自己的简历或者上传自己在其他平台的聊天记录或者微博、小红书上的发帖记录，利用这些信息创建用户的专属交友 agent。
2. 用户的 agent 创建完成后，即可以在广场上寻找 agent 进行聊天。默认情况下是两个 agent 自行进行聊天，聊天记录需要记录并展示。交谈期间，用户可以点进去查看，并且用户可以人工输入聊天，用户人工输入的聊天需要存储在数据库，有大的权重重塑或者调整自己的 agent，让 agent 更像真实的自己。
3. agent 对话完成后，可以定期向用户总结最近的交友情况，哪些 agent 是适合自己的朋友，可以深入了解一下彼此，不再仅仅通过 agent 交流。

## Monorepo 结构
本项目已按 `pnpm workspace` 完成基础骨架：
- `apps/web`：前端应用（TanStack Start 占位）
- `apps/api`：API/BFF（Hono 占位）
- `apps/worker`：异步任务消费者（BullMQ 占位）
- `packages/agent-runtime`：状态机、prompt、tool 调用
- `packages/db`：数据库 schema、迁移、数据访问
- `packages/shared`：共享类型、DTO、错误码、常量
- `infra/docker/docker-compose.yml`：本地 Postgres + Redis + MinIO

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
