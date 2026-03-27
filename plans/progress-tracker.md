# 进度跟踪表

## 使用方式
- 每天开始：更新“计划日期、今日目标”。
- 每天结束：更新“实际结果、状态、阻塞、次日第一步”。
- 状态仅用：`Not Started` / `In Progress` / `Done` / `Blocked`。

| Day | 计划日期 | 今日目标 | 实际结果 | 状态 | 阻塞问题 | 次日第一步 |
|---|---|---|---|---|---|---|
| Day 0 | 2026-03-21 | 预备日：理解产品/架构/MVP，检查工具链，整理未知问题清单 | 已完成产品理解、系统分层、Day1-7 依赖、未知问题清单（6 条）、Day 1 风险清单；完成工具链检查（jj/node/pnpm 可用，docker 缺失）；**额外完成**：pnpm monorepo 骨架搭建、`.env.example`、API 初始化（Hono + 7 接口 + 2 测试通过）、Web 初始化（TanStack Start）、各模块 AGENTS.md/README 文档、CLAUDE.md | Done | 无 | 冻结核心指标定义文档 |
| Day 1 | 2026-03-23 | 定义核心指标、初始化目录、补 `.env.example` | `docs/core-metrics.md` 已完成并冻结 3 个核心指标；目录骨架和 `.env.example` 已在 Day 0 提前完成；Docker 与 Docker Compose 已验证可用（`20.10.21` / `v2.13.0`）；`pnpm --filter @agent/api test` 2 条通过，`pnpm typecheck` 通过。Day 1 目标已于 `2026-03-22` 提前完成 | Done | 无 | 启动本地依赖并把 `GET /health` 扩展为 DB/Redis 连通检查 |
| Day 2 | 2026-03-24 | 搭建 docker 依赖与健康检查 | 已启动 `docker compose` 本地依赖（Postgres/Redis/MinIO）；`GET /health` 已接入 Postgres/Redis TCP 探针并返回 `ok`；API 已补最小 trace 日志（`requestId`、路径、状态码、耗时）；`pnpm --filter @agent/api test` 4 条通过，`pnpm --filter @agent/api typecheck` 通过；手动请求 `/health` 验证通过；**额外完成**：冻结 `apps/api/docs/web-api-contract.md`，为 `GET /sessions` 增加 `userId` 过滤，并补齐 web 联调契约回归测试 | Done | 无 | 开始 Day 3：定义核心数据模型、迁移方案与种子数据边界 |
| Day 2+ | 2026-03-23 | 前端 SSR 数据预取与认证体系加固 | 将所有 GET 请求迁移至 TanStack Start server functions，5 条路由实现 SSR 数据预取（`ensureQueryData`）；引入 AuthState 状态机（unknown/anonymous/authenticated）实现 SSR 感知的认证解析；access token 同步至 cookie 支持服务端请求认证；API 增加 CORS 中间件与 origin 白名单；补充 auth provider 初始化测试覆盖 | Done | 无 | 开始 Day 3：定义核心数据模型、迁移方案与种子数据边界 |
| Day 3 | 2026-03-25 | 完成核心数据模型与迁移 | 数据库 Schema 已同步；已注入 2 用户、4 Persona、1 会话、6 消息、4 记忆、1 报告；Alice/Bob 密码已重置为 `12345678`；`packages/db` 已安装 `tsx` 环境 | Done | 无 | 开始 Day 4：Runtime 状态机骨架与结构化输出设计 |
| Day 4 | 2026-03-26 | Runtime 状态机骨架 + 结构化输出 | `@agent/runtime` 已完成状态机、PromptManager、结构化输出 Zod Schema、解析失败重试与 fallback；新增关键回归测试 2 条（成功闭环 + 非法 JSON）；`apps/api` 已新增 `RuntimeService` 并接入服务容器；验证：`pnpm --filter @agent/runtime test` 2/2 通过，`pnpm --filter @agent/runtime typecheck` 通过，`pnpm --filter @agent/api test` 5/5 通过，`pnpm --filter @agent/api typecheck` 通过 | Done | 无 | 开始 Day 5：Persona Builder（资料到 persona 的结构化生成 + 版本化存储） |
| Day 5 | 2026-03-25 | Persona Builder v1 + 广场优化 | 广场发现优化（shuffle-batch random feed + Redis 缓存）；ChatSessionSidebar 侧边栏；双 agent 对话编排器骨架；Persona Builder 接口/资料解析/版本化存储/人工编辑入口；OpenAPI + Swagger 双语文档 | Done | 无 | Admin 后台 + 前端核心页面 |
| Day 5+ | 2026-03-26 | Admin 后台 + 前端核心页面 + Pair Insight | **Admin 后台**：新建 Next.js 15 应用（10+ 页面，Ant Design 5），9 个 Admin API 路由模块，JWT+refresh token 认证体系，admin 种子脚本；**Pair Insight**：关系洞察引擎（heuristic scoring + affinity label），广场集成展示；**前端补齐**：ChatRoom（消息气泡/无限滚动/实时轮询）、SessionList、Auth 表单、ReportView、10+ 共享组件、401 自动刷新；**DB**：5 张新表 + 2 个迁移；**其他**：Runtime CLI demo、骨架屏/卡片 UI 优化 | Done | 无 | 开始 Day 6：双 agent 自动对话 Worker |
| Day 6 | 2026-03-27 | 双 agent 自动对话 Worker | 已完成 BullMQ 编排链路（`AdvanceConversationJobData`、`BullMQConversationOrchestrator`、`apps/worker` processor），会话创建可自动入队，`@agent/api` 回归测试 `23/23` 通过且 typecheck 通过 | Done | 无 | 推进 Day 7：补齐测评解释与人格自动校准流程 |
| Day 7 | 2026-03-31 | 用户介入高权重记忆生效 | 已提前启动并完成测评域第一阶段：新增 assessment 全套 schema/迁移、会话与答题 API、前端 SoulQuiz 从 mock 切到后端、结果写入记忆；当前解释策略仍为 heuristic，专家 agent 校准未完成 | In Progress | 需要明确专家解释输出协议与自动应用阈值策略 | 实现 assessment interpretation worker（LLM）并接入 `persona_versions` 自动快照 |
| Day 8 | 2026-04-01 | 评测集 + baseline 报告 |  | Not Started |  |  |
| Day 9 | 2026-04-02 | 总结与推荐 v1 API |  | Not Started |  |  |
| Day 10 | 2026-04-03 | 脱敏/审核/审计日志 |  | Not Started |  |  |
| Day 11 | 2026-04-06 | 最小演示 UI |  | Not Started |  |  |
| Day 12 | 2026-04-07 | 广场与发起会话 |  | Not Started |  |  |
| Day 13 | 2026-04-08 | 最小身份隔离 |  | Not Started |  |  |
| Day 14 | 2026-04-09 | 注册登录 + JWT + 身份迁移 |  | Not Started |  |  |
| Day 15 | 2026-04-10 | 全链路回归与发布准备 |  | Not Started |  |  |
