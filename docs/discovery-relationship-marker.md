# 广场关系标记实现说明

## 1. 目标

在广场页上，如果当前用户的人设和某个广场人设发生过真实对话，需要直接显示一个关系标记，而不是只展示纯 persona 信息。

当前版本的关系标记包含：

- 好感标签，例如 `初有回响`、`渐生好感`
- 好感度百分比
- 一句历史互动总结
- 历史会话次数
- 历史消息总数

这套数据是后端预聚合的结果，前端只负责展示，不参与临时推导。

## 2. 产品约束和代码能力

当前产品约束是：

- 一个用户在产品层只使用一个 persona

但代码能力刻意保留为：

- 一个用户未来可以拥有多个 persona

因此这次实现采用了下面的分层：

- 产品层：广场默认使用 `myPersonas[0]` 作为当前 persona
- 能力层：后端接口显式使用 `viewerPersonaId`

这样未来如果放开多 persona，不需要重做关系模型，只需要让前端允许切换当前 persona。

## 3. 为什么不用现有 report 直接做

现有 `match_reports` 是 session 级别的数据，一条 report 对应一场会话。

广场关系标记需要的是 pair 级别的数据，也就是：

- `当前 persona A`
- `目标 persona B`
- `A 和 B 的历史累计互动关系`

如果每次进入广场都临时去扫 session、messages、reports，再在接口里动态拼关系，会有几个问题：

- 查询成本高
- 关系逻辑分散在读接口里，难维护
- 很难做稳定的“一句话总结”和分数缓存

所以这里新增了一个 pair 级别的读模型表。

## 4. 数据模型

新增表：`persona_pair_insights`

文件：

- `packages/db/src/schema/persona-pair-insights.ts`

核心字段：

- `persona_low_id`
- `persona_high_id`
- `last_session_id`
- `session_count`
- `message_count`
- `mutual_score`
- `confidence`
- `affinity_label`
- `summary_short`
- `last_interacted_at`
- `analysis_data`

设计要点：

### 4.1 规范化 pair key

同一对 persona 只存一条记录。

因此不存：

- `persona_a_id`
- `persona_b_id`

而是统一存：

- `persona_low_id`
- `persona_high_id`

规则是字典序较小的 persona id 一定放在 `low`，较大的放在 `high`。

这样可以避免：

- `A -> B` 和 `B -> A` 写出两条重复关系

### 4.2 存的是广场可直接消费的数据

这张表不是做完整分析报告，而是做广场的轻量关系摘要。

所以只保留：

- 可直接展示的标签
- 可直接展示的一句话
- 可排序和可筛选的分数、时间、次数

## 5. 写入链路

实现文件：

- `apps/api/src/services/pair-insight.service.ts`
- `apps/api/src/services/message.service.ts`

关系快照不是在创建 session 时生成，而是在写入真实消息后生成。

原因：

- 只有建 session 没有消息，不代表真正有互动
- 广场标记的意义在于“聊过”，不是“曾经点开过”

当前写入流程：

1. 用户或编排器写入一条真实消息
2. `MessageService` 在消息写入成功后调用 `PairInsightService.syncBySession(sessionId)`
3. `PairInsightService` 读取这对 persona 的所有历史 session
4. 聚合同一 pair 的全部非 system 消息
5. 合并可用的 `match_reports.compatibility_score`
6. 计算 `mutual_score`、`confidence`
7. 生成 `affinity_label` 和 `summary_short`
8. Upsert 到 `persona_pair_insights`

对应代码：

- `apps/api/src/services/message.service.ts`
- `apps/api/src/services/pair-insight.service.ts`

## 6. 读取链路

新增受保护接口：

- `GET /discovery/personas?viewerPersonaId=...`

实现文件：

- `apps/api/src/modules/personas/personas.routes.ts`

读取流程：

1. 前端传入 `viewerPersonaId`
2. 后端校验这个 persona 属于当前登录用户
3. 后端仍复用现有 `listPublic` 逻辑拿广场 persona 列表
4. 再用 `PairInsightService.listForViewer(viewerPersonaId, targetPersonaIds)` 取关系摘要
5. 把 `relationship` 附加到每个 persona 上返回

返回结构示意：

```ts
{
  id: string
  displayName: string
  bio?: string
  traits: string[]
  relationship?: {
    hasHistory: boolean
    sessionCount: number
    messageCount: number
    mutualScore: number
    confidence: number
    affinityLabel: string
    summaryShort: string
    lastInteractedAt: string
    lastSessionId: string | null
  }
}
```

## 7. 懒回填策略

为了避免必须单独跑一遍历史回填任务，`listForViewer` 做了一个简单的懒回填：

1. 先查 `persona_pair_insights`
2. 如果当前 pair 没有现成记录
3. 就按这对 persona 的历史 session 现算一次
4. 算完再写回 `persona_pair_insights`
5. 然后把结果返回给广场

这样旧数据也能逐步补齐，不需要额外运维动作。

## 8. 评分逻辑

当前版本不是纯 LLM 打分，也不是纯规则打分，而是混合策略。

### 8.1 规则信号

规则信号来自：

- 历史消息深度
- 历史 session 次数
- 双方发言平衡度

对应内部分项：

- `depthScore`
- `repeatScore`
- `balanceScore`

### 8.2 report 信号

如果这对 persona 的历史 session 已经生成过 `match_reports.compatibility_score`，就会把 report 分数混进去。

### 8.3 最终策略

如果没有 report：

- 用规则分直接作为 `mutualScore`

如果有 report：

- 用 `report score + heuristic score` 做混合

### 8.4 为什么这样做

因为当前系统里 `match_reports` 不是稳定覆盖全部 session 的主链路。

如果完全依赖 report，会导致很多 pair 没分数。

如果完全不用 report，又浪费了已有分析结果。

所以当前版本采用混合方案，优先保证：

- 任何有历史消息的 pair 都有关系标记

## 9. 文案生成逻辑

当前版本的标签和一句话总结是规则文案，不是在线调用 LLM。

原因：

- 广场是高频读场景
- 实时生成文案太贵，也不稳定
- 先把结构跑通比先做“很智能的摘要”更重要

当前文案输出大致分层：

- `messageCount <= 2` -> `初有回响`
- 高分高置信 -> `颇有默契`
- 中高分 -> `渐生好感`
- 中等分 -> `还在观察`
- 低分 -> `回响微弱`

这些文案是为了给广场卡片一个稳定、轻量、可预期的表达。

后续如果要升级，可以把 `summary_short` 的生成迁移到异步 LLM job。

## 10. 前端接入

涉及文件：

- `apps/web/src/routes/index.tsx`
- `apps/web/src/features/personas/useDiscoveryPlaza.ts`
- `apps/web/src/features/personas/usePersonaList.ts`
- `apps/web/src/lib/server-fns.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/components/PersonaCard.tsx`

### 10.1 首页 loader

首页 loader 会先预取：

- 当前用户的 persona 列表
- discovery persona 列表

如果已登录且存在 persona：

- 用 `viewerPersonaId` 请求 `/discovery/personas`

如果未登录：

- 继续走公开 `/personas`

### 10.2 广场 hook

`useDiscoveryPlaza` 当前仍然默认：

- `myPersona = myPersonas[0] ?? null`

这是为了符合当前产品约束。

### 10.3 Persona 卡片展示

当 `persona.relationship` 存在时，卡片会额外展示：

- 胶囊标签：`affinityLabel + mutualScore`
- 一句话总结：`summaryShort`
- 统计行：`已聊 N 次 · 共 M 条消息`

如果没有关系数据：

- 卡片保持原样，不显示标记

## 11. 测试与验证

新增和覆盖的验证包括：

### 11.1 API 集成测试

文件：

- `apps/api/src/app.test.ts`

新增场景：

- 创建两个人设
- 创建 session
- 写入一条人类消息
- 请求 `/discovery/personas`
- 验证目标 persona 返回了 `relationship`

验证点包括：

- `hasHistory === true`
- `sessionCount === 1`
- `messageCount === 1`
- `lastSessionId` 正确
- `affinityLabel` 和 `summaryShort` 存在

### 11.2 类型检查

已验证：

- `pnpm --filter @agent/api typecheck`
- `pnpm --filter @agent/web typecheck`
- `pnpm --filter @agent/db typecheck`

### 11.3 回归测试

已验证：

- `pnpm --filter @agent/api test`
- `pnpm --filter @agent/web test`

## 12. 当前限制

当前实现是一个可工作的 MVP，还有几个明确限制：

### 12.1 当前 viewer persona 仍默认取第一个

这是符合当前产品约束的，但未来如果产品放开多 persona，需要前端让用户显式切换 `viewerPersonaId`。

### 12.2 关系摘要是规则文案

现在强调稳定和成本，不强调“特别智能”。

### 12.3 关系分数还是偏启发式

当前已经能表达“聊过、聊得怎么样、值不值得继续”，但还不是最终版匹配模型。

## 13. 后续可演进方向

推荐的后续演进顺序：

1. 增加“当前 persona”选择器
2. 增加关系详情弹层，展示最近几次互动的摘要
3. 会话完成后异步生成更高质量的 pair summary
4. 用真正的 session report 聚合替换当前规则文案
5. 增加反向感受字段，例如未来区分：
   - 我对 TA 的好感
   - TA 对我的回应意愿
   - 双方综合默契度

## 14. 结论

这次实现的核心不是“在前端加个 badge”，而是补了一条完整的数据链：

- 有真实消息
- 就会产生 pair 级关系快照
- 广场直接读取这份快照
- 前端只做展示

这样当前功能能工作，后面产品从“单 persona”升级到“多 persona”时，也不用推翻重做。
