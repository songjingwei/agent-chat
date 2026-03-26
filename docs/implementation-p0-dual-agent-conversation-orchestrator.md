# P0 实现文档：双 Agent 交替对话编排（Conversation Orchestrator）

## 0. 结论（As of 2026-03-24）

你现在的判断是准确的：**“双 Agent 自动交替编排”还没有完整实现**。

当前能力边界：

1. `packages/agent-runtime`：
   1. ✅ 已实现 `runTurn`，负责**单个 Agent 的一轮推理与结构化输出解析**。
   2. ❌ 未实现 A/B 循环、调度、重试、幂等、会话状态推进。
2. `apps/api`：
   1. ✅ 已实现 `POST /sessions/:sessionId/human-message` 写入人类消息。
   2. ✅ 已接入 `RuntimeService.generateTurn`，可在该接口里触发**一次**对端 Agent 回复。
   3. ❌ 仍未实现“无人介入时自动持续多轮”的异步编排闭环。
3. `apps/worker`：
   1. ❌ 仍是占位，尚未承担对话推进任务。

因此当前状态属于：**“单轮可用 + 局部触发”，不是“完整双 Agent 自动对话系统”**。

---

## 1. 目标定义（P0 范围）

在不破坏既有边界（`@agent/runtime` 纯推理层）的前提下，补齐以下闭环：

1. 会话创建后可自动开始 A/B 对话，且**首条消息由发起方 persona（initiator）模型主动生成**。
2. 首条消息前先完成 `mutual briefing`，确保双方都拿到“对方是谁、对话目标是什么”的上下文。
3. 每轮由编排层决定下一位说话者，调用 `RuntimeService.generateTurn` 生成并落库。
4. 达到结束条件后自动 `completed`，异常可重试并最终 `failed`。
5. 人类介入消息（human override）会影响下一轮，并保持高优先级。
6. 多实例/并发下避免重复生成与乱序写入。

---

## 2. 职责边界（保持架构一致）

### 2.1 `@agent/runtime`（保持不变）

只负责：

1. Prompt 组装与裁剪。
2. 模型调用与结构化解析。
3. 返回 `RuntimeTurnResult`（消息 + memoryWrites + modelMeta）。

不负责：

1. DB 读写。
2. 会话状态机推进。
3. 任务调度与重试策略。

### 2.2 `apps/api`（入口与投递）

负责：

1. 同步写入用户请求（建会话、human message）。
2. 向队列投递 `conversation.advance` 任务。
3. 提供查询接口（messages、sessions、reports）。

### 2.3 `apps/worker`（核心编排器）

负责：

1. 消费 `conversation.advance` 队列。
2. 加锁 + 幂等校验 + 事务写入。
3. 选择 speaker/counterpart 并调用 `RuntimeService.generateTurn`。
4. 按规则继续投递下一轮，直到终止。

---

## 3. 推荐交互流（目标态）

```txt
POST /sessions
  -> create session(status=pending/current_round=0)
  -> enqueue conversation.advance(source=session_created, requestedSpeaker=initiator)

Worker consume conversation.advance
  -> lock(session)
  -> load session + recent messages + personas
  -> ensure mutual briefing is ready for both personas
  -> pick next speaker
  -> runtimeService.generateTurn(...)
  -> insert agent message + persist memories
  -> update session(current_round/status)
  -> if continue: enqueue next conversation.advance
```

人类介入：

```txt
POST /sessions/:id/human-message
  -> insert human message
  -> enqueue conversation.advance(source=human_message)

POST /sessions/:id/force-end
  -> set session status=completed (forced_by_user)
  -> stop future advance jobs
```

---

## 4. 关键数据与状态规则

### 4.1 会话状态（沿用现有表）

`chat_sessions.status`：`pending | active | paused | completed | failed`

推进规则：

1. 首次成功生成 Agent 消息：`pending -> active`
2. 满足结束条件：`active -> completed`
3. 持续失败且超过阈值：`active -> failed`
4. 人工暂停（后续扩展）：`active -> paused`

### 4.2 轮次定义（建议）

1. `chat_sessions.current_round`：记录**已完成的 Agent 轮次**（每成功生成 1 条 agent 消息 +1）。
2. `chat_messages.round`：继续保持当前“消息序号”语义（已有实现已在递增）。

### 4.3 下一发言者选择（确定性）

按最新消息 `authorPersonaId` 反推：

1. 若无历史消息：`initiatorPersonaId` 先发。
2. 若最后一条消息来自 initiator：下一位为 target。
3. 若最后一条消息来自 target：下一位为 initiator。
4. 若最后一条是 human 消息：同样按“最后发言者的对方”作为下一 speaker。

### 4.4 首条消息前的互知阶段（Mutual Briefing）

在首条 agent 消息生成前，编排器必须准备双方互知上下文：

1. 读取双方 persona 基础信息（`displayName/bio/traits/systemPrompt`）。
2. 生成双向 briefing：
   1. `briefForInitiator`：我是谁 + 对方是谁 + 本会话目标 + 开场约束。
   2. `briefForTarget`：我是谁 + 对方是谁 + 本会话目标 + 回复约束。
3. 将 briefing 作为**会话级系统上下文**注入 `runTurn` 输入（不暴露给前端消息列表）。
4. 未完成 mutual briefing 时，不允许生成首条消息。

说明：

1. `PromptManager` 已能接收双方 persona 快照，这是基础能力。
2. `mutual briefing` 的作用是把“互相了解对方信息”显式化、可审计化，而不是依赖隐式 prompt 拼接。

### 4.5 结束判定（按你的口径）

仅以下两类条件可结束：

1. **用户手动强制结束**：`POST /sessions/:id/force-end`。
2. **告别握手完成**：
   1. 任一模型本轮返回 `shouldEndSession=true`，仅表示“我准备说再见”。
   2. 系统把会话置为 `farewell_pending`（可由 session runtime-state 字段表达）。
   3. 下一轮强制由对方模型进行告别回复。
   4. 当双方都完成告别后，才真正 `completed`。

说明：单方 `shouldEndSession=true` 不能立即结束会话。

---

## 5. 队列任务设计（P0）

### 5.1 Job 名称与载荷

队列：`conversation.advance`

Payload：

```ts
interface AdvanceConversationJob {
  sessionId: string;
  trigger: "session_created" | "human_message" | "system_resume";
  requestedSpeakerPersonaId?: string;
  requestedBy?: string;
}
```

### 5.2 幂等与并发控制

1. 互斥锁：`lock:conversation:advance:${sessionId}`（Redis，TTL 15-30s）。
2. 幂等键：`conversation:${sessionId}:step:${currentRound + 1}`。
3. 写入前二次校验：
   1. session 是否仍处于可推进状态（`pending/active`）。
   2. 当前轮次是否已被其他 worker 推进。

---

## 6. Worker 编排算法（核心伪码）

```ts
async function advanceConversation(sessionId: string) {
  await withSessionLock(sessionId, async () => {
    const session = await loadSession(sessionId);
    if (!session || !["pending", "active"].includes(session.status)) return;

    if (session.currentRound >= session.maxRounds) {
      await markCompleted(sessionId, "max_rounds_reached");
      return;
    }

    const recentMessages = await loadRecentMessages(sessionId);
    const mutualBriefing = await ensureMutualBriefing(session);
    const { speaker, counterpart } = pickNextSpeaker(session, recentMessages);

    const turn = await runtimeService.generateTurn({
      sessionId,
      speakerPersona: toPromptPersona(speaker),
      counterpartPersona: toPromptPersona(counterpart),
      recentMessages: toPromptMessagesWithBriefing({
        messages: recentMessages,
        briefing: mutualBriefing,
        speakerPersonaId: speaker.id,
      }),
      memoryItems: [],
      sessionGoal: mutualBriefing.sessionGoal,
    });

    await insertAgentMessage({
      sessionId,
      authorPersonaId: speaker.id,
      content: turn.message.content,
      metadata: { runtime: turn.modelMeta, status: turn.status, attempts: turn.attempts },
    });

    await incrementCurrentRound(sessionId);

    if (turn.status === "fallback") {
      await markCompleted(sessionId, "fallback_end");
      return;
    }

    if (turn.message.shouldEndSession) {
      // 单方提出告别：进入 farewell_pending，下一轮由对方完成告别
      await markFarewellPending(sessionId, {
        proposedBy: speaker.id,
        awaitingPersonaId: counterpart.id,
      });
      await enqueueAdvance({
        sessionId,
        trigger: "system_resume",
        requestedSpeakerPersonaId: counterpart.id,
      });
      return;
    }

    if (isFarewellPending(session) && speaker.id === session.awaitingFarewellFromPersonaId) {
      // 对方完成告别，双方告别握手完成
      await markCompleted(sessionId, "farewell_handshake_done");
      return;
    }

    if (session.currentRound + 1 < session.maxRounds) {
      await enqueueAdvance({ sessionId, trigger: "system_resume" });
    } else {
      await markCompleted(sessionId, "max_rounds_reached");
    }
  });
}
```

---

## 7. API 侧改造清单

### 7.1 `POST /sessions`

创建成功后投递第一条 `conversation.advance` 任务，并指定 `requestedSpeakerPersonaId=initiatorPersonaId`，由发起方模型生成首条消息。

### 7.2 `POST /sessions/:sessionId/human-message`

保持当前同步写入逻辑，新增“投递推进任务”：

1. 写 human message。
2. enqueue `conversation.advance(trigger=human_message)`。
3. 立即返回 `201`。

说明：当前已经有“同步触发一次 agent 回复”的实现，P0 正式版建议迁移到 worker 异步路径，减少接口耗时与模型耦合。

### 7.3 `POST /sessions/:sessionId/advance`（可选但推荐）

用于手动推进/调试：

1. 只做参数校验 + enqueue。
2. 返回 `202 Accepted`。

### 7.4 `POST /sessions/:sessionId/force-end`（必需）

用于用户手动强制结束：

1. 校验会话属于当前用户可见范围。
2. 将 `status` 置为 `completed`，记录 `forced_by_user` 原因。
3. 清理/忽略后续同 session 的 `advance` 任务。

---

## 8. 失败处理与可观测性

### 8.1 失败策略

1. 模型调用失败：job 重试（指数退避，最多 3 次）。
2. 持续失败：会话标记 `failed`，记录失败原因。
3. memory 写入失败：保持 best-effort，不回滚已生成消息（沿用现有策略）。
4. 会话已 `completed/failed/paused` 时，收到旧任务直接丢弃（幂等结束保护）。

### 8.2 观测字段（日志/指标）

每轮至少记录：

1. `sessionId`
2. `currentRound`
3. `speakerPersonaId`
4. `status`（ok/fallback/failed）
5. `finishReason`
6. `latencyMs`
7. `promptTokens/completionTokens`

---

## 9. 落地顺序（建议 4 个迭代）

1. Iteration 1：API 入队 + Worker 空消费骨架 + 锁机制。
2. Iteration 2：Worker 单步推进（只生成 1 条 agent 消息，不循环）。
3. Iteration 3：自动循环推进 + 终止条件 + 失败策略。
4. Iteration 4：`/advance` 调试接口 + 指标日志 + 回归测试。

---

## 10. 验收标准（Definition of Done）

1. 创建会话后，无人工操作也会自动产出多轮 A/B 消息，直到结束条件触发。
2. 人类消息写入后，下一轮会被纳入上下文并影响回复。
3. 并发触发 `advance` 不会产生重复消息或轮次错乱。
4. Worker 重启后可继续推进未完成会话。
5. 任一会话最终都会收敛到 `completed` 或 `failed`，无无限循环任务。
6. 首条消息必须由发起方模型生成（不是前端固定文案）。
7. 单方提出“可以告别”后，不立即结束；对方完成告别后才 `completed`。
8. 用户调用 `force-end` 后，会话立即结束且不再继续推进。
9. 首条消息生成前，双方互知上下文（mutual briefing）必须准备完成并注入 prompt。
