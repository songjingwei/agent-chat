# Apps Web Guide (AI-First)

## 1. 这个目录的目标
`apps/web` 是 `agent chat` 的前端应用层。核心职责是：
1. 为用户提供可操作的产品界面：persona 管理、会话浏览、人工介入、总结查看。
2. 与 `apps/api` 建立稳定的数据交互（请求、缓存、重试、错误展示）。
3. 提供实时会话体验（后续接入 `WebSocket` 推送）。
4. 把复杂系统能力（runtime/worker/db）映射成可理解、可追踪、可回放的 UI。

简化理解：`apps/web` 负责“体验与状态呈现”，不负责“业务真相落库与异步执行”。

## 2. 职责边界（必须遵守）
### 属于 `apps/web` 的事
1. 路由、页面、组件、交互状态管理。
2. 接口调用、缓存策略、加载态与错误态处理。
3. 用户输入校验（前端层）与友好提示。
4. 会话消息展示、历史回放、人工介入入口。

### 不属于 `apps/web` 的事
1. 直接实现 agent 状态机、多轮编排、模型调用。
2. 直接连接数据库/队列并写业务数据。
3. 在前端固化后端鉴权与权限规则（只消费后端契约）。

## 3. 当前真实状态快照（As of 2026-03-21）
### 代码现状
1. 已完成 `TanStack Start (React)` 初始化。
2. 已有基础路由与页面：
   - `src/routes/__root.tsx`
   - `src/routes/index.tsx`
   - `src/routes/about.tsx`
3. 已有基础组件与样式：
   - `src/components/Header.tsx`
   - `src/components/Footer.tsx`
   - `src/styles.css`
4. `apps/web/package.json` 已提供可执行脚本：`dev/build/preview/test/typecheck`。
5. 已引入模板依赖：`@tanstack/react-start`、`@tanstack/react-router`、`tailwindcss`、`vite` 等。

### 计划状态（来源：`plans/`）
1. Day 11（2026-04-06）“最小演示 UI”状态：`Not Started`。
2. Day 12（2026-04-07）“广场与发起会话”状态：`Not Started`。
3. 前端开发依赖 P0 闭环（Day 7）完成后再重点推进。

## 4. 目标技术栈与前端约定
1. 框架：`TanStack Start`。
2. 路由：`TanStack Router`（类型安全路由与 loader）。
3. 服务端状态：`TanStack Query`（缓存、重试、失效）。
4. 语言：`TypeScript`。
5. 样式：`Tailwind CSS`（模板已接入，可按业务演进调整）。

实现约束：
1. API DTO 与错误码优先复用 `packages/shared`，避免前后端类型漂移。
2. 页面级数据请求优先放在 route loader/query hooks，避免 scattered fetch。
3. UI 不直接拼接后端内部字段，必须通过前端 view model 映射。

## 5. 目录约定（落地时按此组织）
建议结构（在 `src/` 下）：
1. `routes/`：页面级路由定义与 loader/action。
2. `features/`：按业务域拆分（`personas`、`sessions`、`messages`、`reports`）。
3. `components/`：跨 feature 可复用组件（展示组件优先，无业务副作用）。
4. `lib/`：通用能力（API client、query keys、时间格式化、错误映射）。

命名建议：
1. 组件：`PascalCase.tsx`。
2. hooks/util：`camelCase.ts`。
3. 路由/文件夹：`kebab-case`。

## 6. 与其他模块的协作面
### 上游输入
1. `docs/*` 与 `plans/*`：定义 MVP 能力范围和时间节点。
2. `packages/shared`：共享 DTO、错误码、常量（后续接入）。

### 下游依赖
1. `apps/api`：唯一业务数据入口。
2. `WebSocket` 服务（未来）：实时消息推送与会话状态更新。

### 当前可联调 API（以代码实现为准）
1. `GET /health`
2. `POST /personas`
3. `GET /personas`
4. `GET /personas/:personaId`
5. `POST /sessions`
6. `GET /sessions`
7. `GET /sessions/:sessionId`
8. `POST /sessions/:sessionId/human-message`
9. `GET /sessions/:sessionId/messages`
10. `GET /reports/latest?personaId=...`

## 7. 页面路线图（MVP）
### Day 11：最小可演示 UI（P1）
1. 会话列表页。
2. 会话详情页（历史回放 + 实时消息占位）。
3. 人工介入输入框与提交反馈。
4. 总结查看入口（最近报告）。

### Day 12：广场与发起会话（P1）
1. 广场列表与基础筛选/排序。
2. 发起会话入口与状态提示。
3. 空状态、失败重试、加载骨架屏。

## 8. 前端任务完成定义（Definition of Done）
一个 `apps/web` 任务只有满足以下条件才算 `Done`：
1. 路由和页面可访问，关键状态完整（loading/empty/error/success）。
2. API 调用有类型约束，错误码展示明确。
3. 至少包含一种测试（组件测试或页面流程测试）。
4. 无硬编码 mock 残留（除非明确标注并记录移除计划）。
5. 在 `plans/progress-tracker.md` 更新对应日期状态。
6. 若里程碑变更，补写 `plans/change-log.md`。

## 9. 风险与注意事项
1. `apps/api` 当前仍是内存存储实现，前端联调数据不具备持久性。
2. 实时能力尚未接入，当前应先保证“轮询/刷新”可用兜底。
3. 接口契约仍在演进，前端需在 `lib` 层集中做错误映射，避免分散改动。

## 10. 快速命令（当前可用）
在仓库根目录执行：
```bash
pnpm --filter @agent/web dev
pnpm --filter @agent/web build
pnpm --filter @agent/web preview
pnpm --filter @agent/web test
pnpm --filter @agent/web typecheck
```

注意：`apps/web` 当前是模板初始化状态，业务页面尚未替换。

## 11. 文档维护规则（非常重要）
每次改动 `apps/web` 时，同步检查是否需要更新本文件：
1. `第 3 节`：真实状态快照（尤其“as of 日期”和脚本/依赖变化）。
2. `第 6 节`：联调接口与协作边界。
3. `第 7 节`：页面里程碑状态。
4. `第 9 节`：当前风险与临时策略。

维护规则：
1. 日期必须使用绝对日期（`YYYY-MM-DD`）。
2. 状态只用：`Not Started` / `In Progress` / `Done` / `Blocked`。
3. 只记录事实，不写模糊进度描述。

## 12. 参考文档（源头）
1. `readme.md`
2. `docs/system-architecture.md`
3. `docs/mvp-implementation-plan.md`
4. `docs/architecture-diagram.md`
5. `docs/project-structure-diagram.md`
6. `plans/master-plan.md`
7. `plans/progress-tracker.md`
8. `plans/change-log.md`
