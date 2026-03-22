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

## 3. 当前真实状态快照（As of 2026-03-22）
### 代码现状
1. 已完成 `TanStack Start (React)` 初始化 + `@tanstack/react-query` 集成。
2. 已实现全部 MVP 页面路由：
   - `src/routes/__root.tsx` — 根布局（含 QueryClientProvider）
   - `src/routes/index.tsx` — 广场页（Discovery Plaza）
   - `src/routes/personas/create.tsx` — 创建 Agent 页（P0）
   - `src/routes/personas/index.tsx` — 我的 Agent 列表
   - `src/routes/sessions/$id.tsx` — 聊天室（P0）
   - `src/routes/sessions/index.tsx` — 会话列表
   - `src/routes/reports/$id.tsx` — 对话报告
   - `src/routes/about.tsx` — 关于页（模板保留）
3. 已建立基础设施层：
   - `src/lib/api-client.ts` — API 请求封装（开发环境优先直连 `VITE_API_ORIGIN`/`localhost:3001`，生产默认 `/api`）
   - `src/lib/types.ts` — 前端类型定义（镜像 API 类型）
   - `src/lib/query-keys.ts` — TanStack Query key 工厂
   - `src/lib/userId.ts` — localStorage 用户 ID（auth P2 前临时方案）
4. 已建立 feature 模块：
   - `src/features/personas/` — useCreatePersona, usePersonaList, usePersonaDetail, useMyPersonas, usePersonaCreateForm, useDiscoveryPlaza, PersonaCreateForm, DiscoveryPlaza, MyPersonasList
   - `src/features/sessions/` — useSessionDetail, useSessionList, useCreateSession, useChatRoom, ChatRoom, SessionList
   - `src/features/messages/` — useMessages, useSendMessage
   - `src/features/reports/` — useReport, ReportView
5. 已建立共享组件：
   - `src/components/Header.tsx` — 已更新为 Agent Chat 品牌 + 业务导航
   - `src/components/Footer.tsx` — 已更新为 Agent Chat 品牌
   - `src/components/ThemeToggle.tsx`
   - `src/components/PersonaCard.tsx` — 可复用 persona 卡片
   - `src/components/StatusBadge.tsx` — 会话状态标签
   - `src/components/EmptyState.tsx` — 空状态组件
   - `src/components/ErrorDisplay.tsx` — 错误展示组件
   - `src/components/LoadingSkeleton.tsx` — 加载骨架屏
6. 样式系统已扩展：form-field、message-bubble、status-badge、trait-chip、btn-primary、btn-ghost、skeleton 等 CSS 类。

### 计划状态
1. P0 核心闭环（创建 Agent + 聊天室）：`Done`。
2. P1 体验补齐（广场 + 列表 + 报告）：`Done`。
3. P2 账户与设置（登录）：`Not Started`。

## 4. 目标技术栈与前端约定
1. 框架：`TanStack Start`。
2. 路由：`TanStack Router`（类型安全路由与 loader）。
3. 服务端状态：`TanStack Query`（缓存、重试、失效）。
4. 语言：`TypeScript`。
5. 样式：`Tailwind CSS`（模板已接入，可按业务演进调整）。

实现约束（必须遵守）：
1. **UI 与逻辑彻底解耦**：采用 Hook-Component 模式。复杂的逻辑、状态管理和数据获取必须封装在自定义 Hook 中（如 `useComponent.ts`），UI 组件仅负责渲染并接收 props。
2. **极简 `useEffect` 与 手动优化**：
   - 严禁滥用 `useEffect`。异步请求必须使用 TanStack Query；交互逻辑应通过事件回调处理；计算逻辑应直接派生。
   - 禁止手动使用 `useMemo` 或 `useCallback` 进行性能优化。项目依赖 **React Compiler** (React 19+) 进行自动优化。
3. **全平台适配 (Mobile First)**：所有功能必须同时适配移动端 (320px+) 和桌面端 (1440px+)，优先使用 Tailwind 的响应式前缀，关键容器使用 `page-wrap` 类。

3. **主题与暗色模式**：严禁硬编码颜色值（如 `#fff`）。必须使用 `styles.css` 中定义的 CSS 变量（如 `var(--sea-ink)`），确保在白天/黑夜模式下自动切换。
4. **类型安全与契约**：API DTO 与错误码优先复用 `packages/shared`，避免前后端类型漂移。
5. **数据请求规范**：页面级数据请求优先放在 route loader/query hooks，避免 scattered fetch。
6. **无障碍与语义化**：使用语义化 HTML 标签，为所有交互元素（如无文字按钮）提供 `aria-label`。

详见：`apps/web/FRONTEND_STANDARDS.md`。

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

## 7. 页面路线图 (MVP)
详细页面结构与开发优先级见：`apps/web/PAGES.md`。

### 核心开发顺序：
1. **Day 11 (P0)**: 重点实现 `/personas/create` (创建页) 与 `/sessions/$id` (聊天室)，跑通“创建 -> 自动聊 -> 介入”的 UI 闭环。
2. **Day 12 (P1)**: 补齐 `/` (广场)、`/sessions` (列表) 和 `/reports/$id` (总结报告)，完善用户流。
3. **Day 14 (P2)**: 实现基础登录与个人中心，确保多设备数据可访问。


## 8. 前端任务完成定义（Definition of Done）
一个 `apps/web` 任务只有满足以下条件才算 `Done`：
1. **测试先导与解释**：AI 在添加测试用例前，必须先向人类开发者简要说明：该测试覆盖什么场景、为何重要、预期结果是什么。
2. **测试少而精**：拒绝冗余测试，优先覆盖核心交互路径（如：表单提交、异步加载、主题切换），避免对基础 UI 属性的过度测试。
3. 路由和页面可访问，关键状态完整（loading/empty/error/success）。
4. API 调用有类型约束，错误码展示明确。
5. 在 `plans/progress-tracker.md` 更新对应日期状态。

## 9. 风险与注意事项
1. `apps/api` 当前仍是内存存储实现，前端联调数据不具备持久性。
2. 实时能力尚未接入，当前应先保证“轮询/刷新”可用兜底。
3. 接口契约仍在演进，前端需在 `lib` 层集中做错误映射，避免分散改动。
4. 当前 TanStack Start dev server 下不应假设 `/api` 相对路径一定会被代理；本地联调优先使用 `VITE_API_ORIGIN`。
5. 当前页面仍以模板骨架为主，不应把样式稿或页面规划文档误判为业务功能已实现。

## 10. 快速命令（当前可用）
在仓库根目录执行：
```bash
pnpm --filter @agent/web dev
pnpm --filter @agent/web build
pnpm --filter @agent/web preview
pnpm --filter @agent/web test
pnpm --filter @agent/web typecheck
```

注意：`apps/web` 当前仍是模板初始化状态，业务页面尚未替换；业务页面规划见 `PAGES.md`，实现约束见 `FRONTEND_STANDARDS.md`。

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
