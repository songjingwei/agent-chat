# Agent Chat 系统架构与技术栈说明

## 1. 文档目标
本文件用于明确 `agent chat` 项目的实现方向，包含：
1. 系统架构设计（模块划分与交互关系）。
2. 技术栈选型（前后端、数据、异步、AI、部署）。
3. 各模块的基本解释（为什么这样做、如何落地）。

## 2. 项目定位与核心流程
`agent chat` 的目标是让用户创建“专属交友 agent”，并通过 agent 与其他用户 agent 进行交流，最终产出可参考的匹配建议。

核心流程：
1. 用户建立身份（MVP 阶段可先用临时身份，正式注册登录在后续阶段补齐），填写资料并上传简历/聊天记录/社媒文本。
2. 系统构建用户画像与专属 agent（性格、偏好、表达风格）。
3. agent 在广场与其他 agent 自动聊天，用户可随时介入输入。
4. 用户输入被高权重写入记忆层，用于持续修正 agent。
5. 系统定期总结交友情况并给出可深入了解对象。

## 3. 总体架构（推荐）
采用“模块化单体 + 异步任务”起步，后续可平滑拆分服务。

架构分层：
1. `Web App`：用户界面与实时会话展示。
2. `API/BFF`：统一对外接口、鉴权、业务编排。
3. `Agent Runtime`：agent 对话状态机、提示词与工具调用。
4. `Worker`：执行异步任务（聊天推进、总结生成、匹配计算）。
5. `Data Layer`：关系数据、向量记忆、缓存与队列。
6. `Safety Layer`：审核、脱敏、风控、审计日志。

这种架构适合当前阶段：
1. 开发速度快，MVP 可快速上线验证。
2. 关键链路（聊天、总结）通过队列解耦，吞吐更稳定。
3. 后续可按模块拆成独立服务，不推翻现有代码。

当前落地状态（`2026-03-22`）：
1. `apps/web` 已完成 `TanStack Start` 模板初始化。
2. `apps/api` 已完成 `Hono + Zod` 最小服务，并提供内存版 `persona/session/message/report` 接口。
3. `infra/docker/docker-compose.yml` 已存在，但 DB/Redis 连通、Worker、Runtime、持久化仍待落地。

## 4. 技术栈（按当前方向）

### 4.1 前端
1. `TanStack Start`：应用型前端框架，适合数据密集交互场景。
2. `TanStack Router`：类型安全路由与加载逻辑。
3. `TanStack Query`：服务端状态管理、缓存、重试、同步。
4. `TypeScript`：统一前后端类型表达，降低联调成本。
5. `Tailwind CSS`：快速构建可维护 UI。

基本解释：
1. 项目重点是“聊天和状态同步”，不是 SEO 内容站，TanStack Start 很契合。
2. Query 与 Router 原生协同，页面数据流更清晰。

### 4.2 后端
1. `Hono.js`：作为 API/BFF 框架，轻量、性能好、类型友好。
2. `Zod`：请求参数校验与类型推导。
3. `OpenAPI`：接口契约文档，方便前后端联调。

基本解释：
1. Hono 适合“高性能 + 小而清晰”的 API 层。
2. 需要在工程层补齐规范：错误码、审计、鉴权中间件、限流策略。

### 4.3 数据与存储
1. `PostgreSQL`：主业务库（用户、关系、会话、总结）。
2. `pgvector`：向量检索（语义记忆、相似度召回）。
3. `Redis`：缓存、会话热点、队列 Broker、限流计数。
4. `S3/OSS/MinIO`：用户上传文件对象存储。

基本解释：
1. PostgreSQL + pgvector 能在同一体系里管理结构化数据和语义检索。
2. Redis 负责高频与短生命周期数据，降低数据库压力。

### 4.4 异步与任务调度
1. `BullMQ`：聊天推进、总结生成、匹配重算等异步任务。
2. `Cron`（或 BullMQ repeatable jobs）：定期触发周报/总结。

基本解释：
1. agent 对话和总结通常耗时较长，不应阻塞同步接口。
2. 队列模型便于重试、幂等和失败恢复。

### 4.5 AI 与 Agent 编排
1. `OpenAI Responses API`：对话与结构化输出。
2. `Embeddings`：长程记忆召回与用户偏好建模。
3. `Function Calling`：将“查记忆、写记忆、状态推进”工具化。

基本解释：
1. 把 agent 能力封装成 `Agent Runtime`，避免逻辑散落在路由层。
2. 通过工具调用控制可观测性与可审计性。

### 4.6 实时通信与观测
1. `WebSocket`（或 `Socket.IO`）推送聊天事件。
2. `OpenTelemetry + Prometheus/Grafana`：链路与指标观测。
3. `Sentry`：异常上报与告警。

基本解释：
1. 聊天天然需要实时推送，轮询成本高且体验差。
2. AI 系统必须可观测，否则问题难定位。

## 5. 关键模块设计

### 5.1 用户画像与记忆层
记忆分层建议：
1. `Profile Memory`：稳定画像（性格、兴趣、关系目标）。
2. `Session Memory`：单次会话上下文。
3. `Human Override Memory`：用户手动输入，高权重、可追踪。

基本规则：
1. 用户手动输入默认高于模型自动推断。
2. 记忆写入记录来源、时间戳、置信度、可撤销标记。

### 5.2 对话引擎（Agent Runtime）
对话状态机建议：
1. 初始化上下文（双方画像、安全策略、会话目标）。
2. 轮流生成消息（A agent -> B agent）。
3. 每轮做安全审查与记忆更新。
4. 用户介入时触发“高权重重塑”。
5. 达到结束条件后生成会话总结。

### 5.3 匹配与总结
1. `短期总结`：最近会话是否积极、对方反馈质量、互动节奏。
2. `中期匹配`：兴趣重合、沟通舒适度、价值观冲突风险。
3. `可解释输出`：每条推荐必须附带依据，不只给分数。

## 6. 目录结构建议（Monorepo）
```txt
agent/
  apps/
    web/                # TanStack Start 前端
    api/                # Hono API/BFF
    worker/             # BullMQ 任务消费者
  packages/
    agent-runtime/      # 对话状态机、prompt、tool 调用
    db/                 # schema、迁移、数据访问
    shared/             # DTO、类型、常量、错误码
  docs/
    system-architecture.md
  infra/
    docker/             # 本地开发容器
    k8s/                # 生产部署清单（后续）
```

## 7. 数据模型（MVP）
核心实体建议：
1. `users`：账户信息与认证标识。
2. `profiles`：结构化画像与偏好字段。
3. `uploaded_assets`：上传文件元数据与解析状态。
4. `agent_personas`：agent 配置快照（可版本化）。
5. `chat_sessions`：会话主表。
6. `chat_messages`：消息明细（区分 agent/human/source）。
7. `memory_items`：记忆条目（含权重、来源、时效）。
8. `match_reports`：总结与匹配建议结果。

## 8. 安全、隐私与合规（必须项）
1. 上传数据默认加密存储，支持删除与导出。
2. 聊天与画像变更写审计日志。
3. 敏感信息脱敏与内容审核前置。
4. 明确告知用户“AI 推断不是事实”，并允许纠正与撤回。

## 9. 实施阶段建议
1. Phase 1（当前 MVP 主线）：本地基础设施、agent 创建、agent 聊天、用户介入、基础总结。
2. Phase 2：匹配质量评估、推荐解释增强、风控与审核、最小身份隔离。
3. Phase 3：正式注册登录、多 agent 策略、A/B 测试、可观测性与成本优化。

---
本方案优先保证“可快速上线验证 + 后续可扩展 + 数据可追溯”。在当前需求下，`TanStack Start + Hono + Postgres/pgvector + Redis + Worker` 是平衡实现效率与长期演进的组合。
