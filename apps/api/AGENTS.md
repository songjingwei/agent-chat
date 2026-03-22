# Apps API Guide (AI-First)

## 1. 这个目录的目标
`apps/api` 是 `agent chat` 的 `API/BFF` 层。它的核心职责是：
1. 对 `apps/web` 提供统一、稳定、可校验的 HTTP 接口。
2. 承接鉴权、用户隔离、输入校验、错误码标准化、审计日志等横切能力。
3. 编排业务流程：读写 `@agent/db`、调用 `@agent/runtime`、投递异步任务给 `apps/worker`。
4. 把项目核心价值映射成可调用接口：persona、会话、人工介入、总结推荐。

简化理解：`apps/api` 负责“入口与编排”，不负责“长耗时执行引擎”。

## 2. 职责边界（必须遵守）
### 属于 `apps/api` 的事
1. 路由与参数校验（`Hono + Zod` 目标栈）。
2. 鉴权中间件、用户作用域隔离、限流、基础风控入口。
3. 事务性业务编排（例如：创建会话 + 入队启动对话任务）。
4. 响应契约稳定性（给前端和其他调用方稳定 schema）。

### 不属于 `apps/api` 的事
1. 双 agent 多轮对话推进（放在 `apps/worker`）。
2. 对话状态机细节与 LLM tool 调用编排（放在 `packages/agent-runtime`）。
3. 数据库迁移与 schema 主实现（放在 `packages/db`）。

## 3. 当前真实状态快照（As of 2026-03-22）
### 代码现状
1. 已完成最小可运行 API 初始化：`Hono + Zod + @hono/node-server + TypeScript + tsx`。
2. 已实现 `app/server` 入口、模块化路由、统一错误响应和基础校验工具。
3. 已接入本地开发 CORS，允许来自 `APP_ORIGIN` 和本地 `localhost/127.0.0.1` 端口的前端联调请求。
4. 已实现内存版服务层（`persona/session/message/report`），用于本地联调和 API 行为验证。
5. 已落地基础接口：
   - `GET /`
   - `GET /health`
   - `POST/GET /personas`、`GET /personas/:personaId`
   - `POST/GET /sessions`、`GET /sessions/:sessionId`（`GET /sessions` 支持 `personaId` / `userId` 过滤）
   - `POST /sessions/:sessionId/human-message`
   - `GET /sessions/:sessionId/messages`
   - `GET /reports/latest?personaId=...`
6. `apps/api` 已具备真实脚本：`dev/build/start/test/typecheck`。
7. 测试现状：`src/app.test.ts` 有 4 条通过用例（健康检查、主链路、`GET /sessions?userId=...` 契约、缺失资源 `404` 契约）；`pnpm typecheck` 已通过。
8. 已新增 `apps/api/docs/web-api-contract.md`，作为 `apps/web` 联调契约源文件。

### 计划状态（来源：`plans/`）
1. Day 0（2026-03-21）状态：`Done`。
2. Day 1（2026-03-23）状态：`Done`，已于 `2026-03-22` 提前完成。
3. Day 2（2026-03-24）状态：`Done`，本地依赖已启动，`GET /health` 已接入 Postgres/Redis 探针，最小 trace 日志已落地。
4. 结论：`apps/api` 已完成“最小可运行服务 + Day 2 基础设施验收”阶段，但异步能力、持久化、鉴权和审计仍未落地。

## 4. 依赖关系与协作面
### 上游输入
1. `apps/web`：发起 HTTP 请求，消费 API 响应。
2. `plans/*` 与 `docs/*`：定义功能优先级、阶段目标和边界。

### 下游依赖
1. `packages/db`：持久化访问（用户、画像、会话、消息、记忆、报告）。
2. `packages/agent-runtime`：状态机和模型调用能力。
3. `apps/worker`：异步任务处理（聊天推进、总结生成、匹配重算）。
4. `Redis/BullMQ`：队列、缓存、幂等与重试基座。

### 环境配置（来自根目录 `.env.example`）
1. API/应用：`APP_ORIGIN`、`API_ORIGIN`、`WS_ORIGIN`。
2. 数据层：`DATABASE_URL`、`PGVECTOR_ENABLED`、`REDIS_URL`、`QUEUE_PREFIX`。
3. 对象存储：`S3_*`。
4. AI：`OPENAI_*`。
5. 安全：`JWT_SECRET`、`CONTENT_MODERATION_ENABLED`。

## 5. API 模块路线图（目标模块已预建目录）
| 模块 | 目标职责 | 当前接口（已实现） | 来源里程碑 | 当前状态 |
|---|---|---|---|---|
| `health` | 服务/依赖健康检查 | `GET /health` | Day 2 | Done |
| `personas` | persona 生成、版本化、人工编辑 | `POST /personas` `GET /personas` `GET /personas/:personaId` | Day 5 | In Progress |
| `sessions` | 发起会话、查询会话、会话编排入口 | `POST /sessions` `GET /sessions` `GET /sessions/:sessionId` | Day 6 | In Progress |
| `messages` | 用户介入消息与高权重记忆写入入口 | `POST /sessions/:sessionId/human-message` `GET /sessions/:sessionId/messages` | Day 7 | In Progress |
| `reports` | 总结与推荐查询 | `GET /reports/latest?personaId=...` | Day 9 | In Progress |

说明：当前接口均为“内存存储版最小实现”。`Done` 仅表示该里程碑的最小验收条件已满足，不代表后续持久化、异步、鉴权或审计也已完成。

## 6. Day-by-Day（只列 API 相关关键项）
1. Day 1：已完成错误码和响应结构约定、API 启动骨架。
2. Day 2：已完成 DB/Redis 健康检查与基础 trace 日志。
3. Day 3：对接核心表（`profiles`、`agent_personas`、`memory_items`、`chat_sessions`、`chat_messages`、`match_reports`）的 API 访问层。
4. Day 5：交付 persona 生成/编辑 API（含版本化与审计）。
5. Day 6：交付会话创建入口并投递 worker 任务，支持消息落表查询。
6. Day 7：交付 `human-message` 介入接口，确保触发高权重记忆写入。
7. Day 9：交付 `GET /reports/latest`。
8. Day 10：在全部核心路由接入脱敏/审核/审计中间件。
9. Day 13：用户作用域隔离中间件落地。
10. Day 14：注册登录/JWT 刷新接口（仅在 P0/P1 稳定后推进）。

## 7. 实现约束（AI 执行时默认遵循）
1. 路由层只做编排，不把状态机/模型提示词逻辑写进路由。
2. 每个输入 DTO 都要有 `zod` schema 和类型导出（避免隐式 `any`）。
3. 所有写操作记录审计字段（至少：`actor`、`action`、`resource`、`timestamp`）。
4. 人工输入（human override）优先级高于模型推断，且必须可追溯来源。
5. 错误返回结构统一，不允许模块各自定义不兼容格式。
6. 涉及用户数据查询必须带 user scope 条件，避免越权。

## 8. 接口完成定义（Definition of Done）
一个 API 任务只有满足以下条件才算 `Done`：
1. **测试先导与解释**：AI 在添加测试用例前，必须向人类开发者简要说明：该测试覆盖什么场景、为何重要、预期结果是什么。
2. **测试少而精**：拒绝冗余测试，优先覆盖核心契约、关键业务逻辑和异常边界处理（如非法输入、权限越权），避免对平凡逻辑的过度测试。
3. 有明确接口契约（方法、路径、请求/响应 schema、错误码）。
4. 有参数校验与异常处理（含非法输入测试）。
5. 有权限/作用域校验（若接口涉及用户数据）。
6. 在 `plans/progress-tracker.md` 更新状态，并在本文件更新“模块状态”。

## 9. 当前阻塞与风险
1. 当前为内存存储：服务重启即丢数据，不可用于真实环境验证。
2. 安全链路未接入：审核、脱敏、审计仅在文档层定义，尚无完整代码实现。
3. 鉴权和 user scope 未接入：当前接口默认无身份隔离，存在越权风险。
4. API 契约仍需继续冻结：目前仅完成最小响应结构，错误码与 DTO 仍需在 `packages/shared` 固化。
5. `pnpm --filter @agent/api start` 目前仍有独立的 ESM 启动问题；本次 Day 2 验证使用 `tsx src/server.ts` 完成，不影响健康检查结果，但后续需要单独修复。

## 10. 快速命令（当前可用）
在仓库根目录执行：
```bash
pnpm --filter @agent/api dev
pnpm --filter @agent/api build
pnpm --filter @agent/api start
pnpm --filter @agent/api test
pnpm --filter @agent/api lint
pnpm --filter @agent/api typecheck
docker compose -f infra/docker/docker-compose.yml up -d
```

说明：这些脚本已可执行；`dev` 默认监听 `http://localhost:3001`。`docker compose` 命令需在仓库根目录执行。

## 11. 文档维护规则（非常重要）
每次改动 `apps/api` 时，同步检查是否需要更新本文件以下内容：
1. `第 3 节`：真实状态快照（尤其“as of 日期”和脚本/依赖变化）。
2. `第 5 节`：模块与接口状态。
3. `第 6 节`：里程碑进度偏移。
4. `第 9 节`：阻塞与风险。

维护规则：
1. 日期必须使用绝对日期（`YYYY-MM-DD`）。
2. 状态只用：`Not Started` / `In Progress` / `Done` / `Blocked`。
3. 只记录事实，不写“预计很快”“差不多完成”这类模糊表述。

## 12. 参考文档（源头）
1. `readme.md`
2. `docs/system-architecture.md`
3. `docs/mvp-implementation-plan.md`
4. `docs/architecture-diagram.md`
5. `docs/project-structure-diagram.md`
6. `plans/master-plan.md`
7. `plans/progress-tracker.md`
8. `plans/change-log.md`
9. `apps/api/docs/web-api-contract.md`
