# P0 实现文档：Memory 持久化 + 真实 Model Client

## 概述

本文档定义两个 P0 优先级的实现：

1. **Memory 持久化**：将 runtime 产出的 `memoryWrites` 写入数据库，并在每次 `runTurn` 前读取历史记忆。
2. **真实 Model Client**：模型接入对齐 `OpenAI Responses API`，并将 `Anthropic/Ollama` 兼容能力纳入 P0。

本文档采用的核心边界：

1. `@agent/runtime` 保持纯推理层，不直接依赖 `@agent/db`。
2. 持久化读写在 API/Worker 编排层完成。
3. 模型调用失败与记忆写库失败解耦，避免“生成成功但因写库失败而整体失败”。

---

## 1. Memory 持久化

### 1.1 现状

| 已有 | 缺失 |
|------|------|
| `memory_items` 表及 repository CRUD | runtime 结果未落库 |
| `AgentRuntimeEngine` 已返回 `memoryWrites` | 调用前未自动读取历史记忆 |
| `PromptManager` 已支持按权重裁剪记忆 | API/Worker 缺少统一 memory 编排服务 |

### 1.2 设计决策

1. 不在 `runTurn` 内直接写库。
2. `runTurn` 只做模型生成和结构化解析，返回 `memoryWrites`。
3. API/Worker 在外层执行：`read memories -> runTurn -> persist memoryWrites`。
4. Memory 写库采用 `best-effort`：
   1. 对话生成成功后，即使写库失败也不回滚本轮回复。
   2. 写库失败记录日志并上报指标，后续由重试/补偿机制处理。

### 1.3 数据流

```txt
RuntimeService.generateTurn
  -> memoryService.readForTurn(personaId)
  -> runtimeEngine.runTurn(input + memoryItems)
  -> memoryService.persistWrites(result.memoryWrites)   # best-effort
  -> return RuntimeTurnResult
```

### 1.4 接口设计（API 层）

新增 `apps/api/src/services/memory.service.ts`：

```ts
import type { DbClient } from "@agent/db";
import {
  createMemoryItem,
  findMemoryItemsByPersonaId,
  type MemoryItem,
} from "@agent/db";
import type { PromptMemoryItem, RuntimeMemoryWrite } from "@agent/runtime";

export interface ReadForTurnInput {
  personaId: string;
  limit?: number;
}

export interface PersistWritesInput {
  personaId: string;
  sessionId: string;
  writes: RuntimeMemoryWrite[];
  createdBy?: string;
}

export interface PersistWritesResult {
  inserted: number;
  skipped: number;
}

export class MemoryService {
  constructor(private readonly db: DbClient) {}

  async readForTurn(input: ReadForTurnInput): Promise<PromptMemoryItem[]> {
    const limit = Math.max(1, input.limit ?? 20);
    const rows = await findMemoryItemsByPersonaId(this.db, input.personaId);
    return rows.slice(0, limit).map(toPromptMemoryItem);
  }

  async persistWrites(input: PersistWritesInput): Promise<PersistWritesResult> {
    if (input.writes.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    let inserted = 0;
    let skipped = 0;
    const deduped = dedupeWrites(input.writes);

    for (const write of deduped) {
      if (write.content.trim().length === 0) {
        skipped += 1;
        continue;
      }

      await createMemoryItem(this.db, {
        personaId: input.personaId,
        sessionId: input.sessionId,
        category: write.category,
        content: write.content,
        weight: write.weight,
        source: write.source,
        createdBy: input.createdBy,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  }
}

const toPromptMemoryItem = (row: MemoryItem): PromptMemoryItem => ({
  category: row.category,
  content: row.content,
  weight: row.weight,
  source: row.source,
});

const dedupeWrites = (writes: RuntimeMemoryWrite[]): RuntimeMemoryWrite[] => {
  const seen = new Set<string>();
  const result: RuntimeMemoryWrite[] = [];

  for (const item of writes) {
    const key = `${item.source}:${item.category}:${item.content.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
};
```

说明：

1. `readForTurn` 只按 persona 读取，优先满足 P0 主流程。
2. 权重排序由 `findMemoryItemsByPersonaId` 保证；最终注入数量仍由 `PromptManager` 控制。
3. 去重放在 API 层，防止同轮重复记忆写入。

### 1.5 RuntimeService 集成

修改 `apps/api/src/services/runtime.service.ts`：

```ts
import type { DbClient } from "@agent/db";
import {
  AgentRuntimeEngine,
  PromptManager,
  createRuntimeModelClient,
  type RuntimeModelClient,
  type RuntimeTurnResult,
} from "@agent/runtime";
import { MemoryService } from "./memory.service.js";

export interface RuntimeServiceOptions {
  db: DbClient;
  modelClient?: RuntimeModelClient;
  runtimeEngine?: AgentRuntimeEngine;
  memoryService?: MemoryService;
  env?: Record<string, string | undefined>;
}

export class RuntimeService {
  private readonly runtimeEngine: AgentRuntimeEngine;
  private readonly memoryService: MemoryService;

  constructor(options: RuntimeServiceOptions) {
    const modelClient =
      options.modelClient ?? createRuntimeModelClient(options.env ?? process.env);

    this.memoryService = options.memoryService ?? new MemoryService(options.db);
    this.runtimeEngine =
      options.runtimeEngine ??
      new AgentRuntimeEngine({
        modelClient,
        promptManager: new PromptManager(),
      });
  }

  async generateTurn(input: GenerateRuntimeTurnInput): Promise<RuntimeTurnResult> {
    const dbMemories = await this.memoryService.readForTurn({
      personaId: input.speakerPersona.id,
    });

    const result = await this.runtimeEngine.runTurn({
      ...input,
      memoryItems: dbMemories,
    });

    if (result.status === "ok" && result.memoryWrites.length > 0) {
      this.memoryService
        .persistWrites({
          personaId: input.speakerPersona.id,
          sessionId: input.sessionId,
          writes: result.memoryWrites,
          createdBy: input.speakerPersona.id,
        })
        .catch((error) => {
          console.error("[runtime] memory_persist_failed", {
            sessionId: input.sessionId,
            personaId: input.speakerPersona.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    return result;
  }
}
```

注意：

1. `RuntimeService` 复用外层注入的共享 `db`，不在内部 `createDbClient`。
2. 记忆写入为 `best-effort`，不影响本轮消息返回。

### 1.6 依赖关系

```txt
apps/api
  ├── depends on @agent/runtime
  ├── depends on @agent/db
  └── owns MemoryService orchestration

packages/agent-runtime
  └── no dependency on @agent/db

packages/db
  └── repository + schema
```

---

## 2. 真实 Model Client（Responses API 对齐 + 多提供方兼容）

### 2.1 P0 目标

1. OpenAI 路径对齐 `Responses API`（与架构文档一致）。
2. `Anthropic` 与 `Ollama` 兼容作为 P0 范围。
3. 三类 provider 统一收敛到 `RuntimeModelClient` 接口。

### 2.2 兼容策略

1. 在 `@agent/runtime` 内提供 provider adapter 层，不泄露 provider 细节到 API 业务层。
2. 通过工厂函数 `createRuntimeModelClient(env)` 按 `RUNTIME_MODEL_PROVIDER` 选择实现。
3. 各 provider 响应统一映射到：
   1. `text`
   2. `finishReason`（`stop|length|error`）
   3. `model/latency/promptTokens/completionTokens`
4. 所有 provider 都实现超时（`AbortController`）。

### 2.3 文件结构

```txt
packages/agent-runtime/src/
├── model-clients/
│   ├── types.ts
│   ├── factory.ts
│   ├── openai-responses-client.ts
│   ├── anthropic-client.ts
│   ├── ollama-client.ts
│   └── index.ts
```

### 2.4 关键类型

```ts
export type RuntimeModelProvider = "openai" | "anthropic" | "ollama";

export interface RuntimeModelClientFactoryEnv {
  RUNTIME_MODEL_PROVIDER?: string;
  RUNTIME_MODEL_TIMEOUT_MS?: string;

  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL_CHAT?: string;

  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_MODEL_CHAT?: string;

  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL_CHAT?: string;
}
```

### 2.5 OpenAI（Responses API）实现要求

1. 请求端点：`POST /responses`。
2. 输入字段：`model`、`input`、`max_output_tokens`。
3. 结构化输出：优先通过 `text.format`（JSON）约束 + prompt 约束双保险。
4. 输出解析：提取首个文本输出，映射 `finishReason`。

示例：

```ts
const response = await fetch(`${baseUrl}/responses`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model,
    input: request.prompt,
    max_output_tokens: request.maxOutputTokens,
    text: { format: { type: "json_object" } },
  }),
  signal: controller.signal,
});
```

### 2.6 Anthropic 实现要求

1. 请求端点：`POST /v1/messages`。
2. 必填 header：`x-api-key`、`anthropic-version`。
3. 输出解析：将 content block 拼接成 `text`。
4. `stop_reason` 映射：
   1. `end_turn|stop_sequence` -> `stop`
   2. `max_tokens` -> `length`
   3. 其他 -> `error`

### 2.7 Ollama 实现要求

1. 请求端点：`POST /api/generate`（`stream: false`）。
2. 输出解析：读取 `response` 字段。
3. `done_reason` 映射：
   1. `stop` -> `stop`
   2. `length` -> `length`
   3. 其他 -> `error`

### 2.8 工厂函数

```ts
export const createRuntimeModelClient = (
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient => {
  const provider = (env.RUNTIME_MODEL_PROVIDER ?? "openai") as RuntimeModelProvider;

  if (provider === "openai") return createOpenAIResponsesModelClient(env);
  if (provider === "anthropic") return createAnthropicModelClient(env);
  if (provider === "ollama") return createOllamaModelClient(env);

  throw new Error(`Unsupported RUNTIME_MODEL_PROVIDER: ${provider}`);
};
```

---

## 3. API 层配置与装配

### 3.1 配置

在 `apps/api/src/config.ts` 中扩展 `apiConfig`：

```ts
export const apiConfig = {
  // ...existing fields
  runtimeModelProvider: process.env.RUNTIME_MODEL_PROVIDER ?? "openai",
  runtimeModelTimeoutMs: parsePositiveInt(process.env.RUNTIME_MODEL_TIMEOUT_MS, 30_000),

  openAIApiKey: process.env.OPENAI_API_KEY,
  openAIBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openAIModelChat: process.env.OPENAI_MODEL_CHAT ?? "gpt-5.4",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1",
  anthropicModelChat: process.env.ANTHROPIC_MODEL_CHAT ?? "claude-sonnet-4-5",

  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaModelChat: process.env.OLLAMA_MODEL_CHAT ?? "qwen2.5:14b",
} as const;
```

并在 `.env.example` 补充：

```env
RUNTIME_MODEL_PROVIDER=openai
RUNTIME_MODEL_TIMEOUT_MS=30000

ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
ANTHROPIC_MODEL_CHAT=claude-sonnet-4-5

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_CHAT=qwen2.5:14b
```

### 3.2 服务装配

在 `apps/api/src/services/index.ts` 中保持单一 `db`，并把全部 provider 配置传给 runtime：

```ts
const runtimeService =
  options.runtimeService ??
  new RuntimeService({
    db,
    env: {
      RUNTIME_MODEL_PROVIDER: apiConfig.runtimeModelProvider,
      RUNTIME_MODEL_TIMEOUT_MS: String(apiConfig.runtimeModelTimeoutMs),

      OPENAI_API_KEY: apiConfig.openAIApiKey,
      OPENAI_BASE_URL: apiConfig.openAIBaseUrl,
      OPENAI_MODEL_CHAT: apiConfig.openAIModelChat,

      ANTHROPIC_API_KEY: apiConfig.anthropicApiKey,
      ANTHROPIC_BASE_URL: apiConfig.anthropicBaseUrl,
      ANTHROPIC_MODEL_CHAT: apiConfig.anthropicModelChat,

      OLLAMA_BASE_URL: apiConfig.ollamaBaseUrl,
      OLLAMA_MODEL_CHAT: apiConfig.ollamaModelChat,
    },
  });
```

---

## 4. 文件清单

### 新增文件

| 文件路径 | 描述 |
|----------|------|
| `apps/api/src/services/memory.service.ts` | 记忆读取/落库编排服务 |
| `packages/agent-runtime/src/model-clients/types.ts` | provider 通用类型 |
| `packages/agent-runtime/src/model-clients/factory.ts` | provider 工厂函数 |
| `packages/agent-runtime/src/model-clients/openai-responses-client.ts` | OpenAI Responses API 客户端 |
| `packages/agent-runtime/src/model-clients/anthropic-client.ts` | Anthropic 客户端 |
| `packages/agent-runtime/src/model-clients/ollama-client.ts` | Ollama 客户端 |
| `packages/agent-runtime/src/model-clients/index.ts` | model clients 导出 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `apps/api/src/services/runtime.service.ts` | 接入 memory 编排与 provider 工厂 |
| `apps/api/src/services/index.ts` | 注入共享 `db` 与多 provider 配置 |
| `apps/api/src/config.ts` | 增加 runtime provider 配置 |
| `.env.example` | 增加 provider 与 timeout 配置 |
| `packages/agent-runtime/src/index.ts` | 导出 `createRuntimeModelClient` |

---

## 5. 测试计划（Lean & Impactful）

### 5.1 Memory Service

1. 场景：`readForTurn` 返回按权重排序的记忆。
   1. 关键性：影响 prompt 注入质量和可控性。
   2. 期望：高权重优先，limit 生效。
2. 场景：`persistWrites` 正常写入并去重。
   1. 关键性：防止记忆爆炸和脏数据。
   2. 期望：重复项只写一次，空内容跳过。
3. 场景：写库失败不影响 `generateTurn` 返回。
   1. 关键性：保证核心对话链路可用。
   2. 期望：消息正常返回，错误有日志。

### 5.2 Model Clients

1. 场景：OpenAI Responses 正常调用与解析。
   1. 关键性：与架构对齐的主路径。
   2. 期望：文本、token、latency、finishReason 正确。
2. 场景：Anthropic 正常调用与 `stop_reason` 映射。
   1. 关键性：兼容能力属于 P0。
   2. 期望：`end_turn/stop_sequence/max_tokens` 映射正确。
3. 场景：Ollama 正常调用与 `done_reason` 映射。
   1. 关键性：本地低成本链路属于 P0。
   2. 期望：`stop/length` 映射正确。
4. 场景：三 provider 的超时处理。
   1. 关键性：避免长时间阻塞。
   2. 期望：`timeoutMs` 到期后返回可诊断错误。
5. 场景：工厂函数按 `RUNTIME_MODEL_PROVIDER` 选择实现。
   1. 关键性：保证部署可切换。
   2. 期望：openai/anthropic/ollama 都可实例化，非法值报错。

### 5.3 集成测试

1. 场景：`API -> RuntimeService -> ModelClient(mock) -> MemoryService` 完整链路。
   1. 关键性：验证 P0 闭环。
   2. 期望：返回消息成功、memoryWrites 入库。
2. 场景：切换 `RUNTIME_MODEL_PROVIDER`（openai/anthropic/ollama）回归。
   1. 关键性：验证兼容能力不是“只在文档层”。
   2. 期望：三种 provider 路径均可跑通（mock transport 即可）。

---

## 6. 验收标准

- [ ] `@agent/runtime` 保持纯推理层，不直接依赖 `@agent/db`。
- [ ] `RuntimeService.generateTurn` 调用前能读取历史记忆并注入 runtime。
- [ ] runtime 产出的 `memoryWrites` 可持久化到 PostgreSQL。
- [ ] 记忆写库失败不会导致本轮消息失败（best-effort 生效）。
- [ ] OpenAI 路径使用 `Responses API`。
- [ ] `RUNTIME_MODEL_PROVIDER` 支持 `openai|anthropic|ollama`，三者均有可运行客户端。
- [ ] 三 provider 的 finish reason/超时/错误归一化行为已被测试覆盖。
- [ ] 配置全部来自环境变量，无硬编码密钥。
- [ ] `pnpm --filter @agent/api test`、`pnpm --filter @agent/runtime test`、`pnpm typecheck` 通过。

---

## 7. 非目标（P0 不做）

1. 不在 P0 实现向量召回（`embedding` 写入/检索）。
2. 不在 P0 实现自动模型路由策略优化（只做 provider 显式切换）。
3. 不在 P0 引入复杂语义去重（仅做轻量文本去重）。
