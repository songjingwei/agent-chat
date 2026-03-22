# @agent/api

`@agent/api` 是项目的 API/BFF 层，当前提供一个可运行的最小服务实现（Hono + Zod + in-memory services）。

## 当前状态（As of 2026-03-22）
- 最小 API 已可运行。
- `pnpm --filter @agent/api test` 现有 4 条用例通过。
- `pnpm --filter @agent/api typecheck` 已通过。
- `GET /health` 已连到 Postgres / Redis TCP 探针。
- `apps/api/docs/web-api-contract.md` 已冻结 `apps/web` 当前联调契约。

## 已实现能力（MVP 初始化）
- 服务健康检查：`GET /health`
- Persona 基础接口：
  - `POST /personas`
  - `GET /personas`
  - `GET /personas/:personaId`
- Session 基础接口：
  - `POST /sessions`
  - `GET /sessions`
  - `GET /sessions/:sessionId`
- Human message 介入接口：
  - `POST /sessions/:sessionId/human-message`
  - `GET /sessions/:sessionId/messages`
- 报告查询接口：`GET /reports/latest?personaId=...`

其中 `GET /sessions` 现支持 `personaId` 和 `userId` 两种过滤方式，优先服务 `apps/web` 的“我的会话”页面。

说明：当前存储为内存实现，重启进程后数据会丢失。后续将接入 `@agent/db`、`Redis/BullMQ` 与 `@agent/runtime`。

详细前端联调契约见：[`docs/web-api-contract.md`](./docs/web-api-contract.md)。

## 运行
在仓库根目录执行：

```bash
pnpm --filter @agent/api dev
```

默认监听：`http://localhost:3001`

## 常用命令
```bash
pnpm --filter @agent/api dev
pnpm --filter @agent/api build
pnpm --filter @agent/api start
pnpm --filter @agent/api typecheck
pnpm --filter @agent/api test
```

## 示例请求
```bash
curl -X POST http://localhost:3001/personas \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","displayName":"Alice","traits":["curious"]}'

curl http://localhost:3001/health
```
