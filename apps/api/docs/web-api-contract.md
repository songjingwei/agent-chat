# Apps Web -> Apps API 契约文档

## 1. 范围与状态

本文档描述 `apps/web` 当前页面能力对应、并应由 `apps/api` 提供的 HTTP 契约，以 `apps/api` 代码实现为准。

- As of: `2026-03-22`
- Base URL: `http://localhost:3001`
- Content-Type: `application/json`
- Header: 所有响应都会回传 `x-request-id`
- 成功/失败都使用统一信封结构

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

说明：

1. `details` 仅在校验失败等需要附加上下文时出现。
2. 当前未接入分页、鉴权、WebSocket/SSE；前端通过轮询拉取会话和消息。

## 2. 页面到接口映射

| Web 页面/能力 | 对应 API | 用途 |
|---|---|---|
| `/` 广场 | `GET /personas` | 读取全部 persona 卡片 |
| `/` 广场 | `GET /personas?userId=:userId` | 找到“我的 persona” |
| `/` 广场 | `POST /sessions` | 选中目标 persona 后发起会话 |
| `/personas/create` | `POST /personas` | 创建 persona |
| `/personas` 我的 Agent | `GET /personas?userId=:userId` | 展示当前用户 persona 列表 |
| `/sessions` 会话列表 | `GET /sessions?userId=:userId` | 展示当前用户相关会话 |
| `/sessions/$id` 聊天室 | `GET /sessions/:sessionId` | 拉取会话状态与参与者 ID |
| `/sessions/$id` 聊天室 | `GET /sessions/:sessionId/messages` | 拉取消息列表 |
| `/sessions/$id` 聊天室 | `POST /sessions/:sessionId/human-message` | 发送人工介入消息 |
| `/sessions/$id` 聊天室 | `GET /personas/:personaId` | 拉取参与者 persona 详情 |
| `/reports/$id` 报告页 | `GET /reports/latest?personaId=:personaId` | 拉取该 persona 的最新报告视图 |

补充说明：

1. 前端路由 `/reports/$id` 中的 `id` 当前实际承载的是 `personaId`，不是 `reportId`。
2. `/sessions` 页面的推荐读取方式是 `GET /sessions?userId=:userId`；当前无筛选调用仍兼容，但不适合作为“我的会话”长期契约。
3. `GET /sessions?personaId=:personaId` 仍然保留，便于前端按某个 persona 做局部筛选。

## 3. 资源格式

### 3.1 Persona

```json
{
  "id": "prs_xxx",
  "userId": "user_xxx",
  "displayName": "Alice",
  "bio": "Optional bio",
  "traits": ["curious", "kind"],
  "createdAt": "2026-03-22T09:00:00.000Z",
  "updatedAt": "2026-03-22T09:00:00.000Z"
}
```

### 3.2 Session

```json
{
  "id": "ses_xxx",
  "initiatorPersonaId": "prs_a",
  "targetPersonaId": "prs_b",
  "status": "queued",
  "createdAt": "2026-03-22T09:00:00.000Z",
  "updatedAt": "2026-03-22T09:00:00.000Z"
}
```

`status` 当前只允许：

- `queued`
- `active`
- `completed`

### 3.3 ChatMessage

```json
{
  "id": "msg_xxx",
  "sessionId": "ses_xxx",
  "authorPersonaId": "prs_a",
  "role": "human",
  "content": "你好，很高兴认识你。",
  "createdAt": "2026-03-22T09:05:00.000Z"
}
```

### 3.4 LatestReport

```json
{
  "personaId": "prs_a",
  "sessionId": "ses_xxx",
  "generatedAt": "2026-03-22T09:10:00.000Z",
  "sessionStatus": "active",
  "totalMessages": 1,
  "latestMessagePreview": "你好，很高兴认识你。",
  "recommendation": "可以继续观察互动质量并安排下一轮对话。",
  "rationale": "该会话已有人工输入样本，可据此继续评估沟通节奏。"
}
```

### 3.5 ListResponse

列表接口统一返回：

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0
  }
}
```

## 4. 端点定义

### 4.1 `POST /personas`

请求体：

```json
{
  "userId": "user_xxx",
  "displayName": "Alice",
  "bio": "Optional bio",
  "traits": ["curious", "kind"]
}
```

约束：

1. `userId`: `1-128` 字符
2. `displayName`: `1-80` 字符
3. `bio`: 可选，最多 `1000` 字符
4. `traits`: 可选数组，最多 `20` 项，每项 `1-80` 字符

响应：

- `201 Created`
- `data` 为 `Persona`

### 4.2 `GET /personas`

查询参数：

- `userId` 可选

响应：

- `200 OK`
- `data` 为 `ListResponse<Persona>`

### 4.3 `GET /personas/:personaId`

响应：

- `200 OK`
- `data` 为 `Persona`

错误：

- `404 PERSONA_NOT_FOUND`

### 4.4 `POST /sessions`

请求体：

```json
{
  "initiatorPersonaId": "prs_a",
  "targetPersonaId": "prs_b"
}
```

约束：

1. 两个字段都必填
2. `initiatorPersonaId` 和 `targetPersonaId` 不能相同

响应：

- `201 Created`
- `data` 为 `Session`

错误：

- `404 PERSONA_NOT_FOUND`
- `400 VALIDATION_ERROR`

### 4.5 `GET /sessions`

查询参数：

- `personaId` 可选
- `userId` 可选

过滤规则：

1. 传 `personaId` 时，返回该 persona 参与的会话。
2. 传 `userId` 时，返回该用户任一 persona 参与的会话。
3. 两者同时传入时，按交集过滤。
4. 都不传时，返回当前内存存储中的全部会话。

响应：

- `200 OK`
- `data` 为 `ListResponse<Session>`

### 4.6 `GET /sessions/:sessionId`

响应：

- `200 OK`
- `data` 为 `Session`

错误：

- `404 SESSION_NOT_FOUND`

### 4.7 `GET /sessions/:sessionId/messages`

响应：

- `200 OK`
- `data` 为 `ListResponse<ChatMessage>`

错误：

- `404 SESSION_NOT_FOUND`

### 4.8 `POST /sessions/:sessionId/human-message`

请求体：

```json
{
  "authorPersonaId": "prs_a",
  "content": "你好，很高兴认识你。"
}
```

约束：

1. `authorPersonaId` 必须属于该会话参与者
2. `content` 去掉首尾空白后长度必须为 `1-2000`

响应：

- `201 Created`
- `data` 为 `ChatMessage`

副作用：

1. 新消息写入当前 session 的消息列表
2. 当前 session 状态更新为 `active`

错误：

- `404 SESSION_NOT_FOUND`
- `400 INVALID_AUTHOR`
- `400 VALIDATION_ERROR`

### 4.9 `GET /reports/latest?personaId=:personaId`

响应：

- `200 OK`
- `data` 为 `LatestReport`

错误：

- `404 PERSONA_NOT_FOUND`
- `404 REPORT_NOT_FOUND`

## 5. 当前前端依赖但尚未进入契约的能力

以下能力仍未纳入当前联调契约，前端不能假定已经可用：

1. `GET /reports/:reportId`
2. `POST /sessions/:sessionId/advance`
3. WebSocket / SSE 消息推送
4. 分页、排序、搜索
5. 正式鉴权与 user scope 中间件

## 6. 维护规则

1. 只要 `apps/web` 的 API 调用新增、删除、改路径或改字段，本文件必须同步更新。
2. `apps/api` 的实现、测试和本文件三者不一致时，以“修实现或修文档”为当前任务，不允许继续漂移。
3. 如果未来把 DTO 上收到 `packages/shared`，本文件仍然保留“页面 -> 接口”映射，不替代业务文档。
