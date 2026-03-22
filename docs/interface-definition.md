# Agent Chat 模块通信与接口定义规范

## 1. 当前状态（As of 2026-03-22）

本项目已经具备最小可运行的前后端骨架，但“异步任务、实时推送、持久化存储”仍处于规划或占位阶段。

当前已落地的通信方式如下：

| 通信类型 | 协议/技术栈 | 当前状态 | 说明 |
| :--- | :--- | :--- | :--- |
| 同步通信 | REST API (`Hono.js`) | 已实现 | `apps/web` 与其他调用方可通过 HTTP 访问 `apps/api`。 |
| 前端服务端逻辑 | `TanStack Start` | 已初始化 | 前端工程已就位，业务级 server functions 仍未开始使用。 |
| 异步通信 | `Redis + BullMQ` | 规划中 | `apps/worker` 目录已存在，但尚未接入真实队列。 |
| 实时通信 | `WebSocket / SSE` | 规划中 | 当前没有实时消息推送。 |
| 代码共享 | `pnpm workspace` | 已实现 | monorepo、包边界和统一脚本已建立。 |

---

## 2. 数据交换格式标准

所有已实现接口都采用 **JSON** 格式，并使用统一响应信封结构。

### 2.1 成功响应

```json
{
  "success": true,
  "data": {}
}
```

### 2.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### 2.3 校验与 Schema 约定

1. 当前所有已实现请求校验都在 `apps/api/src/schemas/*.ts` 中维护。
2. 当前尚未把 DTO 和 Zod Schema 上收至 `packages/shared`；这仍是后续整理项，不应假定已完成。
3. API 的统一错误封装和校验入口位于 `apps/api/src/lib/http.ts`、`apps/api/src/lib/validation.ts`。

---

## 3. 当前已实现的 REST 接口

以下内容以 `apps/api` 当前代码为准。

### 3.1 服务元数据与健康检查

- `GET /`
  - 返回服务元数据：`service`、`status`、`version`
  - 当前返回的是应用级就绪状态，不包含 DB/Redis 探针
- `GET /health`
  - 返回最小健康状态
  - 当前仅能证明 API 进程可响应，请勿误判为“依赖连通已完成”

### 3.2 Personas

- `POST /personas`
  - 创建一条 in-memory persona
  - 当前不会触发 worker，也不会生成版本快照
- `GET /personas`
  - 列表查询
  - 支持可选 `userId` 过滤
- `GET /personas/:personaId`
  - 查询单个 persona 详情

### 3.3 Sessions

- `POST /sessions`
  - 发起一条 in-memory 会话
  - 会校验 initiator/target persona 是否存在
- `GET /sessions`
  - 列表查询
  - 支持可选 `personaId` 过滤
- `GET /sessions/:sessionId`
  - 查询单个会话详情

### 3.4 Messages

- `POST /sessions/:sessionId/human-message`
  - 记录用户介入消息
  - 当前行为：
    - 校验 session 是否存在
    - 校验 `authorPersonaId` 是否属于该 session
    - 将消息写入内存存储
    - 把 session 状态更新为 `active`
- `GET /sessions/:sessionId/messages`
  - 获取该会话的消息列表

### 3.5 Reports

- `GET /reports/latest?personaId=...`
  - 基于最新会话和最新消息生成一份 in-memory 报告视图
  - 当前推荐理由为启发式文案，不是 LLM 总结结果

---

## 4. 已规划但尚未实现的接口

以下接口或能力仍处于规划状态，不应在当前联调中使用：

- `POST /sessions/:sessionId/advance`
  - 目标：显式触发下一轮 agent 对话
  - 当前：未实现
- `GET /reports/:id`
  - 目标：查看特定报告详情
  - 当前：未实现
- `GET /health` 的 DB/Redis 细粒度探针
  - 目标：返回依赖连通状态
  - 当前：未实现
- Worker 入队、出队、重试、幂等状态查询
  - 当前：未实现
- WebSocket / SSE 推送消息事件
  - 当前：未实现

---

## 5. 模块职责映射（按当前真实状态）

| 模块名 | 当前已落地职责 | 当前状态 | 后续目标 |
| :--- | :--- | :--- | :--- |
| `apps/web` | 前端工程、基础路由、布局组件、样式基线 | 已初始化 | 承接 persona 创建、会话回放、人工介入、总结查看 |
| `apps/api` | REST 接口、校验、统一错误响应、内存版业务服务 | 已实现最小版本 | 对接 DB、runtime、worker 和鉴权 |
| `apps/worker` | 目录与脚本占位 | 未开始 | 执行 BullMQ 队列任务 |
| `packages/db` | 目录与脚本占位 | 未开始 | 提供 schema、迁移和数据访问 |
| `packages/agent-runtime` | 目录与脚本占位 | 未开始 | 承接状态机、prompt 和工具调用 |
| `packages/shared` | 目录与脚本占位 | 未开始 | 沉淀共享 DTO、错误码、常量 |

---

## 6. 交互流程示例：用户发送消息

### 6.1 当前真实流程

1. `apps/web` 或其他客户端调用 `POST /sessions/:sessionId/human-message`。
2. `apps/api` 使用 Zod 校验请求体。
3. `apps/api` 将消息写入内存存储，并把 session 状态更新为 `active`。
4. 接口立即返回 `201` 响应。
5. 如需查看结果，再通过 `GET /sessions/:sessionId/messages` 或 `GET /reports/latest` 轮询读取。

### 6.2 目标流程（后续版本）

1. API 写入数据库与高权重记忆层。
2. API 投递 `advance-conversation` 队列任务。
3. Worker 调用 `packages/agent-runtime` 生成下一轮回复。
4. Worker 写回数据库，并通过实时通道推送新消息。

---

## 7. 文档维护规则

1. 任何接口新增、删除或改名，都必须同步更新本文件。
2. 任何“规划中”能力一旦落地，都必须从“未实现”列表移到“已实现”列表。
3. 文档必须区分“当前真实状态”和“未来目标状态”，不要混写。
