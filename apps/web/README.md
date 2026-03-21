# @agent/web

`@agent/web` 是项目的前端应用层，已初始化为 `TanStack Start (React)` 工程。

## 当前状态（As of 2026-03-21）
- 已完成 TanStack Start 基础脚手架初始化。
- 当前包含基础路由与页面：
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
  - `src/routes/about.tsx`
- 样式方案为 `Tailwind CSS`（模板默认）。
- 目前仍是模板 UI，需要按业务需求替换为会话、介入、总结等页面。

## 目录结构
```txt
apps/web/
  public/
  src/
    components/
    routes/
    router.tsx
    styles.css
  package.json
  tsconfig.json
  vite.config.ts
  AGENTS.md
```

## 运行与常用命令
在仓库根目录执行：

```bash
pnpm --filter @agent/web dev
pnpm --filter @agent/web build
pnpm --filter @agent/web test
pnpm --filter @agent/web typecheck
pnpm --filter @agent/web preview
```

默认开发端口：`http://localhost:3000`

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

## 下一步建议（MVP）
- Day 11（2026-04-06）：最小演示 UI（会话列表、详情、人工介入、总结查看）。
- Day 12（2026-04-07）：广场与发起会话入口。

## 给 AI 的详细执行手册
更完整的模块边界、DoD、风险和维护规则见：`apps/web/AGENTS.md`。
