# Persona Builder — 设计文档

## 概述

Persona Builder 是 Agent Chat 平台的**人设生成系统**，负责将用户提供的原始文本（自我介绍、简历、社交动态等）通过 LLM 自动提取为结构化的 AI 人设（Persona）。

核心能力：
- **自动生成**：从自由文本中提取 displayName、bio、traits、systemPrompt
- **版本迭代**：支持对已有 Persona 重新生成（版本号递增，原地更新）
- **人工编辑**：用户可手动修改 LLM 生成的任何字段
- **状态管理**：draft → active → archived 生命周期

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  API Routes (apps/api/src/modules/personas/)                │
│                                                             │
│  POST /personas/build          → PersonaBuilderService      │
│  PATCH /personas/:id           → PersonaEditorService       │
│  POST /personas/:id/archive    → PersonaEditorService       │
│  POST /personas/:id/activate   → PersonaEditorService       │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐       ┌──────────────────────────┐
│  PersonaBuilderService│       │  PersonaEditorService     │
│                       │       │                          │
│  text-processor       │       │  手动 CRUD（含审计字段）  │
│       ↓               │       └──────────────────────────┘
│  RuntimeModelClient   │
│  (来自 @agent/runtime)│
│       ↓               │
│  JSON 解析 + 写 DB    │
└───────────────────────┘
```

## 组件详解

### 1. PersonaBuilderService

**文件**: `apps/api/src/services/persona-builder.service.ts`

核心服务，接收用户原始文本，调用 LLM 生成人设。

#### 构造参数

```typescript
const builder = new PersonaBuilderService(db, {
  modelClient: RuntimeModelClient,  // 复用 @agent/runtime 的模型客户端
});
```

共享 `@agent/runtime` 的 `RuntimeModelClient` 接口，意味着：
- 可使用任何已支持的 Provider（OpenAI / Anthropic / Ollama）
- 切换模型只需改环境变量，无需改代码
- 超时控制、错误处理与 runtime 模块一致

#### buildPersona() 流程

```
1. 校验输入文本（validateSourceText）
   - 非空，≥ 10 词，≤ 10000 词

2. 清洗文本（processSourceText）
   - 合并换行、去除多余空格

3. 如有 existingPersonaId → 查询现有版本号
   - 用 eq/and/isNull 做归属 + 软删除校验

4. 调用 LLM（RuntimeModelClient.generate）
   - prompt = system prompt + 清洗后的文本
   - maxOutputTokens = 1200

5. 解析 LLM 响应
   - 容错提取 JSON（支持 markdown fence 等干扰文本）
   - 校验并截断各字段长度

6. 写入 DB
   - 新建：insert，status = "draft"
   - 更新：update 原行，version + 1
```

#### LLM Prompt 设计

```
You are a persona builder for an AI social agent platform.
Given a user's source text (self-introduction, resume, chat logs,
social media posts, etc.), extract key information to create a
persona that represents the user's authentic self.

Return a single JSON object with these fields:
{
  "displayName": "A short display name (2-4 words)",
  "bio": "A short bio (1-2 sentences)",
  "traits": ["3-5 personality traits"],
  "systemPrompt": "2-3 sentences describing communication style"
}
```

#### 错误处理

| 错误码 | HTTP | 场景 |
|--------|------|------|
| `INVALID_SOURCE_TEXT` | 400 | 文本为空、太短或太长 |
| `PERSONA_NOT_FOUND` | 404 | existingPersonaId 不存在或不属于当前用户 |
| `PERSONA_BUILD_LLM_ERROR` | 502 | LLM 调用失败（finishReason = error） |
| `PERSONA_BUILD_PARSE_ERROR` | 502 | LLM 返回内容无法解析为有效 JSON |

### 2. PersonaEditorService

**文件**: `apps/api/src/services/persona-editor.service.ts`

支持用户手动编辑 LLM 生成的人设。

#### updatePersona()

- 部分更新：只传需要修改的字段
- 所有写操作自动设置 `updatedBy` 和 `updatedAt`
- 查询包含 `isNull(deletedAt)` 软删除过滤

#### archivePersona()

- 将 status 设为 `archived`
- 归档后的 persona 不再出现在广场公开列表中

### 3. PersonaVersionService

**文件**: `apps/api/src/services/persona-version.service.ts`

查询 persona 的当前版本信息和状态管理。

#### getCurrentVersion()

返回 persona 的完整快照（包含 version、name、bio、traits、systemPrompt、status）。

#### activate()

将 persona 状态从 `draft` 切换为 `active`（出现在广场公开列表）。

### 4. TextProcessor

**文件**: `apps/api/src/lib/text-processor.ts`

纯函数工具，负责文本清洗和校验。

```typescript
// 清洗：合并换行、去除多余空格
processSourceText(rawText: string): ProcessedText

// 校验：非空、≥ 10 词、≤ 10000 词
validateSourceText(text: string): { valid: boolean; error?: string }
```

## API 端点

### POST /personas/build

通过 LLM 从原始文本生成 persona。需要认证。

**Request Body**:
```json
{
  "sourceText": "我是一个热爱旅行和摄影的软件工程师...",
  "existingPersonaId": "prs_xxx"  // 可选，传入则更新已有 persona
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "persona": {
      "id": "prs_abc123",
      "userId": "usr_xxx",
      "displayName": "旅行摄影师",
      "bio": "热爱用镜头记录世界的软件工程师",
      "traits": ["好奇", "细腻", "冒险"],
      "createdAt": "2026-03-25T10:00:00.000Z",
      "updatedAt": "2026-03-25T10:00:00.000Z"
    },
    "generatedSystemPrompt": "你是一个热爱旅行和摄影的人...",
    "version": 1
  }
}
```

### PATCH /personas/:personaId

手动编辑 persona 的任何字段。需要认证。

**Request Body**（所有字段可选）:
```json
{
  "displayName": "新名字",
  "bio": "新简介",
  "traits": ["trait1", "trait2"],
  "systemPrompt": "新的系统提示词"
}
```

### POST /personas/:personaId/archive

归档 persona。需要认证。

**Response (200)**:
```json
{
  "success": true,
  "data": { "archived": true }
}
```

### POST /personas/:personaId/activate

激活 persona（使其出现在广场）。需要认证。

## 数据模型

Persona Builder 操作的是 `agent_personas` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | `prs_{uuid_hex}` |
| `user_id` | varchar(64) | FK → users |
| `name` | varchar(100) | 显示名称 |
| `bio` | text | 简介 |
| `system_prompt` | text | AI 行为指令 |
| `traits` | jsonb | 性格标签数组 |
| `version` | integer | 每次 build 递增 |
| `status` | varchar(20) | `draft` / `active` / `archived` |
| `created_by` | varchar(64) | 审计：创建者 |
| `updated_by` | varchar(64) | 审计：最近修改者 |
| `deleted_at` | timestamptz | 软删除 |

### 版本化策略

当前采用**原地更新**方案：
- `version` 字段在同一行上递增
- 每次 `buildPersona(existingPersonaId)` 会覆盖 name/bio/traits/systemPrompt 并 version + 1
- 优点：简单，无冗余数据
- 局限：无法回退到历史版本（如需版本回退，需引入 `persona_versions` 历史表）

## 典型使用流程

```
用户填写自我介绍
       │
       ▼
POST /personas/build { sourceText: "..." }
       │
       ▼
系统生成 persona (status: draft, version: 1)
       │
       ▼
用户查看生成结果，手动微调
       │
       ▼
PATCH /personas/:id { traits: ["修改后的标签"] }
       │
       ▼
用户满意，激活 persona
       │
       ▼
POST /personas/:id/activate
       │
       ▼
persona 出现在广场，可被其他用户匹配
       │
       ▼
用户想重新生成（使用新的自我介绍）
       │
       ▼
POST /personas/build { sourceText: "新文本", existingPersonaId: "prs_xxx" }
       │
       ▼
persona 原地更新 (version: 2)
```

## 服务注册

在 `apps/api/src/services/index.ts` 中：

```typescript
const modelClient = createRuntimeModelClient(runtimeModelEnv);
const personaBuilderService = new PersonaBuilderService(db, { modelClient });
const personaEditorService = new PersonaEditorService(db);
```

Builder 和 Runtime 共享同一个 `modelClient` 实例，统一通过环境变量配置模型 provider。

## 与 Agent Runtime 的关系

| | Agent Runtime | Persona Builder |
|---|---|---|
| 用途 | 对话中生成单轮回复 | 从文本生成人设 |
| 模型客户端 | `RuntimeModelClient` | 同一个 `RuntimeModelClient` |
| 输出格式 | `RuntimeStructuredOutput`（thought + response） | 自定义 JSON（displayName + bio + traits + systemPrompt） |
| 解析方式 | Zod Schema 严格校验 | 容错 JSON 提取 + 字段截断 |
| 重试机制 | AgentRuntimeEngine 内置重试 | 无重试（单次调用） |

两者共享模型调用基础设施，但输出 schema 和解析策略各自独立。
