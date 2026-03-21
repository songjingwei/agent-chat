# @agent/web

`@agent/web` 是项目的前端应用层（目标栈：TanStack Start）。它负责提供 persona 管理、会话浏览、人工介入、总结查看等用户界面，并通过 `apps/api` 获取和提交业务数据。

## 当前状态（As of 2026-03-21）
- 当前为骨架阶段，尚未接入 TanStack Start 路由与页面。
- `src/index.ts` 仅包含占位导出：`webAppName = "agent-web"`。
- `dev/build/test/lint/typecheck` 仍是占位脚本（仅输出提示）。

## 目录结构
```txt
apps/web/
  src/
    routes/       # 页面路由（预留）
    features/     # 业务域模块（预留）
    components/   # 复用 UI 组件（预留）
    lib/          # API client、query keys、utils（预留）
    index.ts
```

## 联调 API（当前可用）
- `GET /health`
- `POST /personas`
- `GET /personas`
- `GET /personas/:personaId`
- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:sessionId`
- `POST /sessions/:sessionId/human-message`
- `GET /sessions/:sessionId/messages`
- `GET /reports/latest?personaId=...`

说明：`apps/api` 当前是内存存储实现，服务重启后数据会丢失。

## 运行与常用命令
在仓库根目录执行：

```bash
pnpm --filter @agent/web dev
pnpm --filter @agent/web build
pnpm --filter @agent/web test
pnpm --filter @agent/web lint
pnpm --filter @agent/web typecheck
```

注意：以上命令目前为占位输出，不代表 Web 应用已可运行。

## MVP 前端目标（计划）
- Day 11（2026-04-06）：最小演示 UI（会话列表、详情、人工介入、总结查看）。
- Day 12（2026-04-07）：广场与发起会话入口。

## 协作约束
- `apps/web` 只做前端交互与状态呈现，不实现后端状态机/持久化逻辑。
- DTO/错误码优先复用 `packages/shared`，避免前后端类型漂移。

## 给 AI 的详细执行手册
更完整的模块边界、DoD、风险和维护规则见：`apps/web/AGENTS.md`。
