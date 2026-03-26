# @agent/runtime — Agent 推理运行时

## 概述

`@agent/runtime` 是 Agent Chat 平台的**单轮推理引擎**。它负责：给定一个 persona 的身份、对方的身份、历史对话和记忆，调用 LLM 生成一条结构化回复。

它是一个**无状态**的纯函数式模块——不持有数据库连接、不管理对话循环、不决定"谁下一个说话"。这些编排职责由上层的 `ConversationOrchestrator`（`apps/api`）承担。

```
┌─────────────────────────────────────────────────────────┐
│  ConversationOrchestrator (apps/api)                    │
│   ↕ 选 speaker · 加载消息/记忆 · 存消息 · 轮次控制       │
└───────────────────────┬─────────────────────────────────┘
                        │ runTurn(input)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  @agent/runtime                                         │
│                                                         │
│  PromptManager ──→ ModelClient ──→ StructuredOutput     │
│   (拼 prompt)       (调 LLM)       (解析 + 校验)        │
│                                                         │
│  AgentStateMachine (idle→thinking→speaking→archiving)   │
└─────────────────────────────────────────────────────────┘
```

## 目录结构

```
src/
├── index.ts                        # 公共导出（barrel）
├── runtime/
│   ├── agent-runtime.ts            # AgentRuntimeEngine — 核心入口
│   └── agent-runtime.test.ts       # 单元测试
├── state-machine/
│   └── agent-state-machine.ts      # 有限状态机
├── prompts/
│   └── prompt-manager.ts           # Prompt 构建器
├── schemas/
│   └── structured-output.ts        # LLM 输出的 Zod Schema + 解析器
├── model-clients/
│   ├── types.ts                    # Provider 类型 + 环境变量接口
│   ├── factory.ts                  # 工厂函数，按环境变量创建 client
│   ├── openai-responses-client.ts  # OpenAI Responses API（支持 SSE 流式）
│   ├── anthropic-client.ts         # Anthropic Messages API
│   ├── ollama-client.ts            # Ollama 本地推理
│   ├── index.ts                    # Model clients barrel
│   └── model-clients.test.ts       # 集成测试
├── evaluators/                     # [待实现] 输出质量评估
├── memory/                         # [待实现] 记忆检索/存储
└── tools/                          # [待实现] Agent 工具调用
```

## 核心组件

### 1. AgentRuntimeEngine

**文件**: `src/runtime/agent-runtime.ts`

核心类，对外暴露唯一方法 `runTurn()`。每次调用执行一轮完整的推理循环：

```
buildPrompt → callModel → parseOutput → (retry?) → return result
```

#### 构造参数

```typescript
interface AgentRuntimeEngineOptions {
  modelClient: RuntimeModelClient;   // 必选：LLM 调用客户端
  promptManager?: PromptManager;     // 可选：默认 new PromptManager()
  maxAttempts?: number;              // 可选：最大重试次数，默认 2
  maxOutputTokens?: number;          // 可选：LLM 输出 token 上限，默认 450
  fallbackReply?: string;            // 可选：所有重试失败后的兜底回复
}
```

#### runTurn() 输入

```typescript
interface RuntimeTurnInput {
  sessionId: string;                           // 会话 ID
  speakerPersona: PromptPersonaSnapshot;       // 说话方人设
  counterpartPersona: PromptPersonaSnapshot;   // 对方人设
  recentMessages: PromptMessage[];             // 近期消息历史
  memoryItems: PromptMemoryItem[];             // 说话方的记忆
  sessionGoal?: string;                        // 会话目标描述
  maxAttempts?: number;                        // 覆盖默认重试次数
  maxOutputTokens?: number;                    // 覆盖默认 token 上限
}
```

其中 Persona 快照：

```typescript
interface PromptPersonaSnapshot {
  id: string;
  name: string;
  bio?: string;
  traits: string[];
  systemPrompt?: string;  // 仅 speaker 使用
}
```

#### runTurn() 输出

```typescript
interface RuntimeTurnResult {
  sessionId: string;
  status: "ok" | "fallback";           // ok=正常解析，fallback=所有重试失败
  attempts: number;                    // 实际调用模型次数
  usedFallback: boolean;
  message: {
    role: "agent";
    content: string;                   // Agent 说的话
    intent: ThoughtIntent;             // 意图
    tone: ThoughtTone;                 // 语气
    shouldEndSession: boolean;         // 是否想结束对话
  };
  memoryWrites: RuntimeMemoryWrite[];  // 需要持久化的新记忆
  failureCode?: RuntimeFailureCode;    // 失败原因码（仅 fallback 时）
  promptMeta: {
    tokenEstimate: number;
    includedMessages: number;
    includedMemories: number;
  };
  modelMeta?: {
    model?: string;
    latencyMs?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  transitions: StateTransition[];      // 状态机流转记录
}
```

#### 重试机制

1. 调用 LLM 获取文本
2. 若 `finishReason === "length"` → 视为 `token_limit`，重试
3. 尝试从文本中解析 JSON → Zod Schema 校验
4. 解析失败 → 重试（直到 `maxAttempts`）
5. 所有重试失败 → 返回 `status: "fallback"`，使用兜底回复

失败码类型：`json_parse_error` | `schema_validation_error` | `token_limit` | `model_error`

### 2. AgentStateMachine

**文件**: `src/state-machine/agent-state-machine.ts`

每轮推理使用一个全新的状态机实例，追踪单轮的生命周期。

```
         START_TURN           MODEL_OUTPUT_PARSED     MEMORY_PREPARED      TURN_COMPLETED
  idle ──────────→ thinking ─────────────────→ speaking ──────────────→ archiving ──────→ idle
                     │  ↑                         │                        │
                     │  └── RETRY_GENERATION ─────┘                        │
                     │                                                     │
                     └──── TURN_FAILED ────────────────────────────────────┘
                                          ↓
                                       failed ──→ thinking (START_TURN)
```

状态说明：
- **idle**: 等待新轮次
- **thinking**: LLM 正在生成 / 解析输出
- **speaking**: 输出解析成功，准备记忆
- **archiving**: 记忆已就绪，准备完成
- **failed**: 本轮失败

所有状态都可通过 `RESET` 事件回到 `idle`。

### 3. PromptManager

**文件**: `src/prompts/prompt-manager.ts`

将结构化输入拼装为纯文本 prompt，发送给 LLM。

#### 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxPromptTokens` | 2400 | prompt 总 token 估算上限 |
| `maxHistoryMessages` | 16 | 最多包含的历史消息条数 |
| `maxMemoryItems` | 8 | 最多包含的记忆条目数 |

#### 构建逻辑

1. **选择记忆**：按 `weight` 降序排列，取前 N 条
2. **选择消息**：取最近 N 条，若超出 token 预算则从最早的开始裁剪
3. **渲染 prompt**：拼装为结构化文本，包含：
   - Speaker 人设（id, name, bio, traits, systemPrompt）
   - Counterpart 人设（id, name, bio, traits）
   - 会话目标
   - 高权重记忆列表
   - 近期对话历史
   - JSON 输出格式要求

#### Token 估算

使用 `Math.ceil(text.length / 4)` 的粗略估算（4 字符 ≈ 1 token）。

### 4. 结构化输出 Schema

**文件**: `src/schemas/structured-output.ts`

LLM 必须返回符合以下 JSON 结构的文本：

```json
{
  "thought": {
    "intent": "ask_question|share_experience|empathize|clarify|close_session",
    "tone": "warm|curious|calm|playful|serious",
    "rationale": "为什么选择这个意图和语气（≤600 字符）"
  },
  "response": {
    "content": "Agent 说的话（≤2000 字符）",
    "shouldEndSession": false,
    "extractMemories": false,
    "memoryCandidates": []
  }
}
```

#### 枚举值说明

**ThoughtIntent（意图）**:
- `ask_question` — 提问以推进对话
- `share_experience` — 分享个人经历
- `empathize` — 表达共情
- `clarify` — 澄清或确认
- `close_session` — 结束会话

**ThoughtTone（语气）**:
- `warm` — 温暖
- `curious` — 好奇
- `calm` — 平静
- `playful` — 活泼
- `serious` — 严肃

**MemoryCategory（记忆类别）**:
- `fact` — 事实信息
- `preference` — 偏好
- `experience` — 经历
- `instruction` — 指令

**MemorySource（记忆来源）**:
- `agent_inferred` — Agent 自动提取
- `human_override` — 用户人工标注（最高优先级）
- `system` — 系统注入

#### 解析器 `parseRuntimeStructuredOutput(rawText)`

从 LLM 原始文本中提取 JSON 的容错解析器：

1. 尝试整个文本作为 JSON 解析
2. 提取第一个 `{...}` 括号匹配的子串（处理 markdown fence 等干扰）
3. 对每个候选 JSON 执行 Zod Schema 校验
4. 返回 `{ success: true, data, rawJson }` 或 `{ success: false, error: { code, message } }`

### 5. Model Clients

所有 client 实现统一接口：

```typescript
interface RuntimeModelClient {
  generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse>;
}

interface RuntimeModelRequest {
  prompt: string;
  maxOutputTokens: number;
}

interface RuntimeModelResponse {
  text: string;
  finishReason?: "stop" | "length" | "error";
  model?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
}
```

#### 支持的 Provider

| Provider | Client 类 | API 端点 | 默认模型 | 特性 |
|----------|----------|---------|---------|------|
| OpenAI | `OpenAIResponsesModelClient` | `{baseUrl}/responses` | `gpt-5.4` | 支持 SSE 流式、`json_object` 格式约束 |
| Anthropic | `AnthropicModelClient` | `{baseUrl}/messages` | `claude-sonnet-4-5` | `x-api-key` 认证 |
| Ollama | `OllamaModelClient` | `{baseUrl}/api/generate` | `qwen2.5:14b` | 本地推理、无需 API Key |

所有 client 均使用 `fetch` + `AbortController` 实现超时控制（默认 30s）。

#### 工厂函数

```typescript
import { createRuntimeModelClient } from "@agent/runtime";

// 根据环境变量自动选择 provider
const client = createRuntimeModelClient(process.env);
```

#### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RUNTIME_MODEL_PROVIDER` | 选择 provider | `openai` |
| `RUNTIME_MODEL_TIMEOUT_MS` | 超时毫秒 | `30000` |
| `OPENAI_API_KEY` | OpenAI API Key | — |
| `OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL_CHAT` | OpenAI 模型名 | `gpt-5.4` |
| `OPENAI_RESPONSES_STREAM` | 是否启用流式 | `false` |
| `ANTHROPIC_API_KEY` | Anthropic API Key | — |
| `ANTHROPIC_BASE_URL` | Anthropic API 地址 | `https://api.anthropic.com/v1` |
| `ANTHROPIC_MODEL_CHAT` | Anthropic 模型名 | `claude-sonnet-4-5` |
| `OLLAMA_BASE_URL` | Ollama 服务地址 | `http://localhost:11434` |
| `OLLAMA_MODEL_CHAT` | Ollama 模型名 | `qwen2.5:14b` |

#### 测试辅助

```typescript
import { createStaticRuntimeModelClient } from "@agent/runtime";

// 创建返回固定文本的 mock client，用于测试
const mockClient = createStaticRuntimeModelClient(JSON.stringify({
  thought: { intent: "ask_question", tone: "warm", rationale: "test" },
  response: { content: "Hello!", shouldEndSession: false, extractMemories: false, memoryCandidates: [] },
}));
```

## 使用方式

### 最简调用（单元测试 / 独立脚本）

```typescript
import {
  AgentRuntimeEngine,
  createStaticRuntimeModelClient,
} from "@agent/runtime";

const engine = new AgentRuntimeEngine({
  modelClient: createStaticRuntimeModelClient(/* mock JSON */),
});

const result = await engine.runTurn({
  sessionId: "ses_test",
  speakerPersona: { id: "p1", name: "Alice", traits: ["friendly"] },
  counterpartPersona: { id: "p2", name: "Bob", traits: ["calm"] },
  recentMessages: [],
  memoryItems: [],
});

console.log(result.message.content);
```

### 接入真实 LLM

```typescript
import {
  AgentRuntimeEngine,
  createRuntimeModelClient,
} from "@agent/runtime";

const modelClient = createRuntimeModelClient({
  RUNTIME_MODEL_PROVIDER: "openai",
  OPENAI_API_KEY: "sk-...",
  OPENAI_MODEL_CHAT: "gpt-5.4",
});

const engine = new AgentRuntimeEngine({ modelClient });
const result = await engine.runTurn({ /* ... */ });
```

### 使用 Ollama 本地推理

```typescript
import {
  AgentRuntimeEngine,
  createRuntimeModelClient,
} from "@agent/runtime";

const engine = new AgentRuntimeEngine({
  modelClient: createRuntimeModelClient({
    RUNTIME_MODEL_PROVIDER: "ollama",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_MODEL_CHAT: "qwen2.5:14b",
  }),
});
```

## 对接方式（API 层集成）

`@agent/runtime` 不直接操作数据库。API 层通过两个服务完成完整的对话编排：

### RuntimeService（单轮封装）

**文件**: `apps/api/src/services/runtime.service.ts`

在 `runTurn()` 的基础上增加了记忆的读写：

```typescript
class RuntimeService {
  async generateTurn(input: GenerateRuntimeTurnInput): Promise<RuntimeTurnResult> {
    // 1. 从 DB 读取 speaker persona 的记忆
    const dbMemories = await memoryService.readForTurn({ personaId: speaker.id });

    // 2. 合并 DB 记忆和调用方传入的记忆（同 key 取高权重）
    const merged = mergeMemoryItems(dbMemories, input.memoryItems);

    // 3. 调用 engine.runTurn()
    const result = await engine.runTurn({ ...input, memoryItems: merged });

    // 4. 将模型提取的新记忆写回 DB
    if (result.memoryWrites.length > 0) {
      await memoryService.persistWrites({ ... });
    }

    return result;
  }
}
```

### ConversationOrchestrator（对话循环）

**文件**: `apps/api/src/services/conversation-orchestrator.service.ts`

负责驱动两个 Agent 的交替对话：

```
enqueueAdvance({ sessionId, trigger: "session_created" })
       │
       ▼
  ┌── advanceConversation ──────────────────────────────────┐
  │  1. 查询 session 状态，检查轮次上限                       │
  │  2. 加载双方 persona                                     │
  │  3. 加载历史消息，检查告别状态                             │
  │  4. 选择 speaker（交替 / 指定 / 告别方）                  │
  │  5. 调用 RuntimeService.generateTurn()                   │
  │  6. 写入 agent message                                   │
  │  7. 检查结束条件：                                        │
  │     - shouldEndSession → 告别握手流程                     │
  │     - 双方都告别 → session completed                      │
  │     - currentRound >= maxRounds → session completed       │
  │  8. 重新 enqueueAdvance({ trigger: "system_resume" })    │
  └──────────────────────────────────────────────────────────┘
```

#### 触发方式

| Trigger | 说明 | 典型场景 |
|---------|------|---------|
| `session_created` | 会话创建时 | 用户在广场发起匹配 |
| `human_message` | 用户发送人类消息后 | 人工介入对话 |
| `system_resume` | 系统自动继续 | 一轮结束后编排器自动入队下一轮 |

#### 告别握手协议

1. Agent A 输出 `shouldEndSession: true` → 插入 `farewell_proposed` 系统消息
2. 编排器指定 Agent B 为下一个 speaker
3. Agent B 回复后若也 `shouldEndSession: true` → 插入 `farewell_completed` → session 标记 `completed`
4. 若 Agent B 不想结束 → 对话继续

## 运行与测试

```bash
# 运行测试
pnpm --filter @agent/runtime test

# 类型检查
pnpm --filter @agent/runtime typecheck

# 构建
pnpm --filter @agent/runtime build
```

## 依赖关系

- **运行时依赖**: 仅 `zod`（用于结构化输出校验）
- **运行环境**: Node.js（使用原生 `fetch`、`AbortController`、`TextDecoder`）
- **被依赖**: `apps/api` 通过 `@agent/runtime` 路径别名引用

## 扩展点（待实现）

| 目录 | 计划用途 |
|------|---------|
| `src/evaluators/` | 输出质量评估（如回复是否自然、是否符合人设） |
| `src/memory/` | 独立的记忆检索和存储逻辑（当前由 API 层 MemoryService 承担） |
| `src/tools/` | Agent 工具调用能力（如搜索、计算等） |
