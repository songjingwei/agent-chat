# 实现文档：题库采集、心灵测评与 Persona 校准

## 1. 概述

本文档定义“镜像页面心灵测试”的目标实现方案，覆盖以下四层能力：

1. **题库采集**：从人工整理或 crawler 获取候选心理题，进入可审核的题库。
2. **测评会话**：为用户镜像创建一次可追溯的答题会话，并按模板抽题。
3. **专家解释**：由“心理专家 agent”基于用户答案输出结构化解释结果，而不是自由文本改人格。
4. **人格校准**：将解释结果写入记忆层，并在满足阈值时更新 `agent_personas`。

核心目标：

1. 让“心灵测试”从前端 mock 数据升级为可运营、可扩展、可追溯的后端能力。
2. 保证随机抽题与结果解释仍然有一致的方法论，不做“全题库完全随机混抽”。
3. 让 persona 调整过程可解释、可回滚、可审计。

非目标：

1. 不把该功能定义为医学或临床心理诊断系统。
2. 不允许 crawler 直接将抓取题目上线到生产题库。
3. 不允许 LLM 直接输出完整 persona 并无约束覆盖现有人格。

---

## 2. 当前状态

当前 `apps/web` 中的心灵测试仍是本地 mock：

1. 题目定义在 `apps/web/src/features/personas/useSoulQuiz.ts` 的 `MOCK_QUESTIONS`。
2. 页面路由为 `/personas/quiz`，仅负责展示和本地计算。
3. 没有真实题库、没有答题持久化、没有专家解释、也没有人格回写。

这意味着当前版本仅是视觉交互占位，不具备真实业务价值。

---

## 3. 关键设计决策

### 3.1 命名边界

前端仍可保留“心灵测试”这一文案，但后端和数据层统一使用 `assessment` 命名。

原因：

1. `quiz` 更像 UI 互动名词。
2. `assessment` 更适合作为题库、会话、解释和校准的业务域名。

### 3.2 采题策略

crawler 只负责拉取**候选题目**，不直接写入生产题库。

生产题目必须满足：

1. 有来源信息：`source_url`、`source_title`、`author`、`license_note`。
2. 有结构化标签：`framework`、`dimension`、`tags`、`difficulty`。
3. 有审核状态：`pending` / `approved` / `rejected`。
4. 有文本快照和入库版本，避免上游网页变化后不可追溯。

### 3.3 抽题策略

系统不从“所有已批准题目”里完全随机抽题，而是：

1. 先定义一个测评模板 `assessment_templates`。
2. 模板下定义多个 slot，每个 slot 限定 `framework`、`dimension`、`tag` 或 `difficulty`。
3. 每个 slot 再从符合条件的题目中随机抽 1 题。

这样可以同时保留：

1. 足够的随机性，避免每个用户都看到同一套题。
2. 足够的一致性，避免不同人格维度被随机漏掉。

### 3.4 专家 agent 输出边界

“心理专家 agent”不能直接输出一个新的完整 persona 覆盖现有数据，而应输出结构化解释：

1. `dimension_scores`
2. `confidence`
3. `evidence`
4. `memory_writes`
5. `persona_patch`
6. `auto_apply`

也就是说，专家 agent 的职责是“解释和建议”，不是“直接改库”。

### 3.5 人格校准边界

人格校准分两层：

1. **稳定层**：写入 `memory_items`，供 runtime 后续对话参考。
2. **配置层**：必要时更新 `agent_personas` 的 `traits`、`bio`、`system_prompt`，并递增 `version`。

为了支持自动更新，`agent_personas` 仅有当前 `version` 还不够，必须补充不可变快照表 `persona_versions`。

---

## 4. 总体架构

```txt
┌─────────────────────────────────────────────────────────────┐
│ apps/web                                                    │
│  /personas/quiz                                             │
│   └─ 创建测评会话 / 提交答案 / 查看结果                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/api                                                    │
│                                                             │
│ AssessmentSessionService                                    │
│  ├─ 读取模板                                                │
│  ├─ 按 slot 抽题                                            │
│  ├─ 持久化会话与答案                                        │
│  └─ 会话完成后投递解释任务                                  │
│                                                             │
│ PersonaCalibrationService                                   │
│  ├─ 校验专家输出                                            │
│  ├─ 写 memory_items                                         │
│  ├─ 写 persona_versions 快照                                │
│  └─ 更新 agent_personas                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/worker                                                 │
│  ├─ assessment-interpretation job                           │
│  ├─ persona-calibration job                                 │
│  └─ question-crawl-import job (P2)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ packages/agent-runtime                                      │
│  └─ 心理专家 agent prompt + structured output               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 数据模型

本节只描述新增或需要扩展的表。既有 `agent_personas`、`memory_items`、`users` 不重复展开。

### 5.1 `assessment_ingest_batches`

用途：记录一次题库导入动作，来源可以是 crawler、人工录入或脚本导入。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `aib_{uuid}` |
| `source_type` | varchar(30) | `crawler` / `manual` / `seed` |
| `source_label` | text | 来源说明，如站点名或脚本名 |
| `status` | varchar(20) | `pending` / `completed` / `failed` |
| `raw_payload` | jsonb | 原始抓取结果摘要 |
| `created_by` | varchar(64) | 操作人或系统 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

索引建议：

1. `status`
2. `created_at`

### 5.2 `assessment_item_candidates`

用途：存放 crawler 或人工导入的候选题，尚未进入生产题库。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `aic_{uuid}` |
| `ingest_batch_id` | varchar(64) | FK → `assessment_ingest_batches.id` |
| `source_url` | text | 原始来源链接 |
| `source_title` | text | 来源标题 |
| `copyright_note` | text | 授权/版权备注 |
| `framework` | varchar(50) | 量表或理论体系 |
| `dimension` | varchar(50) | 题目主要测量维度 |
| `question_text` | text | 题干 |
| `options_json` | jsonb | 选项快照 |
| `explanation_json` | jsonb | 额外解释或站点解析 |
| `language` | varchar(20) | 语言 |
| `status` | varchar(20) | `pending` / `approved` / `rejected` |
| `review_note` | text | 审核备注 |
| `reviewed_by` | varchar(64) | 审核人 |
| `reviewed_at` | timestamptz | 审核时间 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

约束建议：

1. `status IN ('pending', 'approved', 'rejected')`
2. `options_json` 必须是数组。

索引建议：

1. `ingest_batch_id`
2. `(status, framework, dimension)`
3. `reviewed_at`

### 5.3 `assessment_items`

用途：正式题库。只允许由已审核候选题或人工录入生成。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `asi_{uuid}` |
| `candidate_id` | varchar(64) | 可空，FK → `assessment_item_candidates.id` |
| `slug` | text | 题目标识，用于内部引用 |
| `framework` | varchar(50) | 量表体系 |
| `dimension` | varchar(50) | 测量维度 |
| `subdimension` | varchar(50) | 可空，细分维度 |
| `question_text` | text | 题干 |
| `options_json` | jsonb | 结构化选项 |
| `answer_type` | varchar(20) | `single_choice` / `likert` / `free_text` |
| `difficulty` | varchar(20) | `low` / `medium` / `high` |
| `tags` | jsonb | 标签数组 |
| `language` | varchar(20) | 语言 |
| `source_url` | text | 来源链接 |
| `source_title` | text | 来源标题 |
| `license_note` | text | 使用备注 |
| `status` | varchar(20) | `draft` / `active` / `archived` |
| `created_by` | varchar(64) | 审计 |
| `updated_by` | varchar(64) | 审计 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

约束建议：

1. `status IN ('draft', 'active', 'archived')`
2. `answer_type IN ('single_choice', 'likert', 'free_text')`
3. `difficulty IN ('low', 'medium', 'high')`
4. `options_json` 对于非 `free_text` 题型必须非空。

索引建议：

1. `(status, framework, dimension)`
2. `candidate_id`
3. `created_at`

说明：

1. `options_json` 建议直接存题目选项完整结构，避免为早期版本拆成 `assessment_item_options` 增加复杂度。
2. 若后续需要选项级统计，再拆表。

### 5.4 `assessment_templates`

用途：定义一套可重复使用的测评模板。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `ast_{uuid}` |
| `slug` | text | 模板标识，如 `mirror-core-v1` |
| `name` | text | 模板名称 |
| `description` | text | 模板说明 |
| `framework` | varchar(50) | 该模板依赖的主体系 |
| `language` | varchar(20) | 语言 |
| `status` | varchar(20) | `draft` / `active` / `archived` |
| `selection_rules` | jsonb | 通用规则，如去重窗口、难度配比 |
| `created_by` | varchar(64) | 审计 |
| `updated_by` | varchar(64) | 审计 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

唯一约束建议：

1. `slug` 唯一。

### 5.5 `assessment_template_slots`

用途：定义模板的抽题槽位。每个 slot 抽 1 题。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `ass_{uuid}` |
| `template_id` | varchar(64) | FK → `assessment_templates.id` |
| `slot_index` | integer | 展示顺序 |
| `dimension` | varchar(50) | 该 slot 的目标维度 |
| `required_tags` | jsonb | 可空，标签过滤 |
| `excluded_tags` | jsonb | 可空，标签排除 |
| `difficulty` | varchar(20) | 可空，指定难度 |
| `answer_type` | varchar(20) | 指定题型 |
| `random_pool_limit` | integer | 选池上限，可空 |
| `created_at` | timestamptz | 创建时间 |

唯一约束建议：

1. `(template_id, slot_index)` 唯一。

索引建议：

1. `template_id`
2. `(template_id, dimension)`

### 5.6 `assessment_sessions`

用途：记录某个用户的某次测评。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `asn_{uuid}` |
| `user_id` | varchar(64) | FK → `users.id` |
| `persona_id` | varchar(64) | FK → `agent_personas.id` |
| `template_id` | varchar(64) | FK → `assessment_templates.id` |
| `status` | varchar(20) | `pending` / `in_progress` / `submitted` / `interpreting` / `completed` / `failed` |
| `current_index` | integer | 当前进度 |
| `seed` | varchar(64) | 抽题随机种子，保证可复现 |
| `started_at` | timestamptz | 开始时间 |
| `submitted_at` | timestamptz | 提交时间 |
| `completed_at` | timestamptz | 完成时间 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

索引建议：

1. `user_id`
2. `persona_id`
3. `(status, created_at)`

### 5.7 `assessment_session_items`

用途：固化一次测评实际抽到的题，保证会话可回放、可复现、可解释。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `asii_{uuid}` |
| `session_id` | varchar(64) | FK → `assessment_sessions.id` |
| `slot_id` | varchar(64) | FK → `assessment_template_slots.id` |
| `item_id` | varchar(64) | FK → `assessment_items.id` |
| `display_order` | integer | 展示顺序 |
| `question_snapshot` | text | 题干快照 |
| `options_snapshot` | jsonb | 选项快照 |
| `answered_at` | timestamptz | 回答时间 |
| `created_at` | timestamptz | 创建时间 |

唯一约束建议：

1. `(session_id, display_order)` 唯一。
2. `(session_id, slot_id)` 唯一。

### 5.8 `assessment_answers`

用途：保存用户实际答案。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `asa_{uuid}` |
| `session_item_id` | varchar(64) | FK → `assessment_session_items.id` |
| `selected_option_value` | text | 单选或量表值 |
| `free_text_answer` | text | 文本题答案 |
| `normalized_score` | double precision | 归一化分值，可空 |
| `metadata` | jsonb | 客户端耗时、版本等 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

唯一约束建议：

1. `session_item_id` 唯一，一题只保留当前最终答案。

### 5.9 `assessment_interpretations`

用途：存放专家 agent 对测评结果的结构化解释输出。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `air_{uuid}` |
| `session_id` | varchar(64) | FK → `assessment_sessions.id` |
| `status` | varchar(20) | `pending` / `completed` / `failed` / `applied` |
| `model_provider` | varchar(30) | `openai` / `anthropic` / `ollama` |
| `model_name` | text | 使用模型名 |
| `prompt_version` | varchar(30) | prompt 版本 |
| `summary` | text | 人类可读摘要 |
| `confidence` | double precision | 0.0 ~ 1.0 |
| `dimension_scores` | jsonb | 维度得分数组 |
| `memory_writes` | jsonb | 建议写入的记忆 |
| `persona_patch` | jsonb | 建议写入的人格补丁 |
| `evidence` | jsonb | 引用的题目与答案证据 |
| `raw_output` | jsonb | 完整原始结构化输出 |
| `error_code` | text | 失败时错误码 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

约束建议：

1. `confidence IS NULL OR (confidence >= 0 AND confidence <= 1)`
2. `status IN ('pending', 'completed', 'failed', 'applied')`

### 5.10 `persona_versions`

用途：在自动人格校准前保存不可变快照，支持回滚和审计。

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | varchar(64) | 主键，格式 `prv_{uuid}` |
| `persona_id` | varchar(64) | FK → `agent_personas.id` |
| `version` | integer | 与 `agent_personas.version` 对齐 |
| `snapshot` | jsonb | name、bio、traits、systemPrompt 等完整快照 |
| `change_source` | varchar(30) | `persona_build` / `manual_edit` / `assessment_calibration` |
| `source_ref_id` | varchar(64) | 来源记录，如 `assessment_interpretations.id` |
| `created_by` | varchar(64) | 操作人或系统 |
| `created_at` | timestamptz | 创建时间 |

唯一约束建议：

1. `(persona_id, version)` 唯一。

### 5.11 既有表扩展

#### 扩展 `memory_items.source`

当前仅有：

1. `agent_inferred`
2. `human_override`
3. `system`

本功能建议新增：

1. `assessment_self_report`
2. `assessment_inferred`

含义：

1. `assessment_self_report`：用户在测评中的原始自我陈述或高置信度答案结论。
2. `assessment_inferred`：专家 agent 对多题结果归纳后的结构化推断。

#### 扩展 `agent_personas.version` 使用规则

当前 `agent_personas.version` 为原地递增。

本功能要求：

1. 每次人格自动校准前，先写 `persona_versions` 快照。
2. 再更新 `agent_personas`。
3. 最后将 `version + 1`。

---

## 6. 抽题与答题流程

### 6.1 创建测评会话

流程：

1. 前端点击镜像页“心灵测试”。
2. API 选择当前激活模板，如 `mirror-core-v1`。
3. 服务端为该用户和 persona 创建 `assessment_sessions`。
4. 根据模板 slot 规则抽题，并把题目快照落到 `assessment_session_items`。

说明：

1. 抽题必须在服务端完成，不能让前端自己随机。
2. 题目快照必须在创建会话时冻结，不能边答边重新抽。

### 6.2 抽题规则

每个 slot 的候选池需满足：

1. `assessment_items.status = 'active'`
2. 维度匹配 `slot.dimension`
3. 标签满足 `required_tags` 与 `excluded_tags`
4. 与用户近期已答题目去重
5. 同一会话内不能重复

建议算法：

1. 先按 slot 过滤候选题目。
2. 使用 `session.seed + slot_index` 作为稳定随机源。
3. 从候选池选 1 题。
4. 立即落表到 `assessment_session_items`。

### 6.3 提交答案

流程：

1. 前端提交当前题答案。
2. API 写 `assessment_answers`。
3. 更新 `assessment_session_items.answered_at`。
4. 推进 `assessment_sessions.current_index`。
5. 最后一题提交后，将 `assessment_sessions.status` 改为 `submitted` 并投递解释任务。

---

## 7. 专家 agent 设计

### 7.1 角色定义

专家 agent 是一个解释器，不是诊断器，也不是自由写作者。

输入：

1. 当前 persona 快照
2. 本次测评模板
3. 实际抽到的题
4. 用户答案
5. 可选的历史高权重记忆

输出必须是结构化 JSON。

### 7.2 输出 Schema

建议输出结构：

```json
{
  "summary": "本次测评显示用户在亲密关系中更偏向谨慎表达，重视稳定与理解。",
  "confidence": 0.82,
  "dimensionScores": [
    {
      "dimension": "introspection",
      "score": 0.84,
      "confidence": 0.88,
      "evidenceQuestionIds": ["asii_1", "asii_4"]
    }
  ],
  "memoryWrites": [
    {
      "category": "preference",
      "content": "用户倾向于先观察和理解对方，再逐步建立情感连接。",
      "weight": 0.82,
      "source": "assessment_inferred"
    }
  ],
  "personaPatch": {
    "addTraits": ["细腻观察", "谨慎表达"],
    "removeTraits": [],
    "bioAppend": "在建立关系时更重视安全感与稳定感。",
    "systemPromptAdditions": [
      "当涉及亲密关系表达时，优先体现克制、观察和渐进式建立信任。"
    ]
  },
  "autoApply": true,
  "applyReason": "结果一致性较高，且与现有人格无明显冲突。"
}
```

### 7.3 Prompt 约束

必须写入 prompt 的约束：

1. 不能做医学诊断或病理标签判断。
2. 不能输出“你患有”“你一定是”这类绝对结论。
3. 只能基于本次答案与已有 persona 给出保守解释。
4. 必须引用证据题号，不允许无依据扩写。
5. `personaPatch` 只能输出增量，不输出完整 persona。

---

## 8. 人格校准策略

### 8.1 两阶段落地

解释结果落地分为两个阶段：

1. **记忆写入阶段**
2. **人格配置更新阶段**

### 8.2 记忆写入规则

默认规则：

1. `memoryWrites` 全部经过服务端校验。
2. 非法类别、越界权重、空内容直接丢弃。
3. 合法项写入 `memory_items`。

建议权重策略：

1. `assessment_self_report`：`0.70 ~ 0.90`
2. `assessment_inferred`：`0.60 ~ 0.85`

### 8.3 persona 自动更新规则

建议阈值：

1. `confidence < 0.65`：只写 `assessment_interpretations`，不写记忆，不改 persona。
2. `0.65 <= confidence < 0.80`：写记忆，不改 persona。
3. `confidence >= 0.80`：写记忆，并尝试应用 `personaPatch`。

### 8.4 patch 应用规则

`personaPatch` 应用时：

1. `addTraits` 与现有 `traits` 去重合并。
2. `removeTraits` 默认不自动执行，除非已有明确冲突策略。
3. `bioAppend` 只允许追加短句，不允许覆盖整段 bio。
4. `systemPromptAdditions` 只允许追加到校准区块，不允许覆盖用户手工编辑部分。

### 8.5 回滚要求

每次自动更新 persona 前：

1. 先写 `persona_versions` 快照。
2. 再更新 `agent_personas`。
3. 将 `assessment_interpretations.status` 标记为 `applied`。

若后续发现解释不合理：

1. 可通过 `persona_versions` 回滚。
2. 同时保留原始 `assessment_interpretations` 与 `assessment_answers`。

---

## 9. API 设计

以下接口按目标状态设计。

### 9.1 用户侧接口

#### `POST /assessment-sessions`

用途：为当前用户镜像发起一次测评。

请求体：

```json
{
  "personaId": "prs_xxx",
  "templateSlug": "mirror-core-v1"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "sessionId": "asn_xxx",
    "status": "in_progress",
    "currentIndex": 0,
    "totalItems": 8
  }
}
```

#### `GET /assessment-sessions/:sessionId`

用途：读取会话状态和当前题目。

返回：

1. session 元信息
2. 当前题
3. 已完成进度

#### `POST /assessment-sessions/:sessionId/answers`

用途：提交单题答案。

请求体：

```json
{
  "sessionItemId": "asii_xxx",
  "selectedOptionValue": "b",
  "freeTextAnswer": null
}
```

#### `POST /assessment-sessions/:sessionId/complete`

用途：显式提交测评，进入解释阶段。

说明：

1. 如果所有题都已回答，该接口可自动触发 worker 任务。
2. 若已自动提交，可返回当前状态。

#### `GET /assessment-sessions/:sessionId/result`

用途：读取解释结果。

返回：

1. `summary`
2. `dimensionScores`
3. `applied`
4. `appliedVersion`

### 9.2 管理侧接口

#### `POST /admin/assessment-item-candidates/import`

用途：导入一批候选题，可由 crawler 或人工脚本调用。

#### `GET /admin/assessment-item-candidates`

用途：分页查看待审核候选题。

#### `POST /admin/assessment-item-candidates/:id/approve`

用途：审核通过并生成 `assessment_items`。

#### `POST /admin/assessment-item-candidates/:id/reject`

用途：拒绝候选题。

#### `POST /admin/assessment-templates`

用途：创建模板和 slot 规则。

---

## 10. Worker 任务设计

### 10.1 `assessment-interpretation`

触发时机：

1. `assessment_sessions.status = submitted`

执行步骤：

1. 读取会话、题目、答案、persona 快照。
2. 调用专家 agent。
3. 校验结构化输出。
4. 写入 `assessment_interpretations`。
5. 若满足阈值，则继续投递 `persona-calibration`。

### 10.2 `persona-calibration`

触发时机：

1. 解释完成且 `autoApply = true`

执行步骤：

1. 写 `memory_items`
2. 写 `persona_versions`
3. 更新 `agent_personas`
4. 更新 `assessment_interpretations.status = applied`

### 10.3 `question-crawl-import`

该任务属于 P2。

执行步骤：

1. 抓取目标站点
2. 标准化题目结构
3. 写入 `assessment_ingest_batches`
4. 写入 `assessment_item_candidates`

注意：

1. 该任务只写候选层，不写生产题库。

---

## 11. 前端集成建议

现有 `/personas/quiz` 页面可保留，但数据流改为：

1. 页面进入时调用 `POST /assessment-sessions`
2. 每次点击选项调用 `POST /assessment-sessions/:id/answers`
3. 完成后跳转到结果态，轮询或订阅 `GET /assessment-sessions/:id/result`

前端不再负责：

1. 题目定义
2. 分数计算
3. 特质聚合

这些逻辑统一迁移到后端与 worker。

---

## 12. 分阶段实施建议

### Phase 1：去 mock，先做固定模板

目标：

1. 用人工整理的 30-50 道题代替前端 mock。
2. 实现 `assessment_items`、`assessment_templates`、`assessment_sessions`、`assessment_answers`。
3. 前端真实走接口。

此阶段不做：

1. crawler
2. 自动 persona 更新

### Phase 2：专家解释 + 写记忆

目标：

1. 增加 `assessment_interpretations`
2. 接入专家 agent
3. 将结果写入 `memory_items`

此阶段价值：

1. 已能影响后续对话表现
2. 风险低于直接改 persona

### Phase 3：自动人格校准

目标：

1. 引入 `persona_versions`
2. 按阈值自动更新 `agent_personas`
3. 支持回滚和审计

### Phase 4：crawler + 审核后台

目标：

1. 新增候选题采集能力
2. 建立审核流
3. 扩大题库覆盖面

---

## 13. 风险与约束

### 13.1 版权风险

风险：

1. 心理题目可能受版权保护。

要求：

1. crawler 结果只进候选层。
2. 上线前必须经过人工审核与来源标注。

### 13.2 方法论漂移

风险：

1. 不同量表混抽会导致结果不稳定。

要求：

1. 以模板为边界做平衡抽题。
2. 一个模板必须声明主 `framework`。

### 13.3 persona 漂移过快

风险：

1. 每次测评都直接改人格，会导致 persona 震荡。

要求：

1. 先写记忆，再按阈值更新 persona。
2. 更新前必须写版本快照。

### 13.4 过度解释风险

风险：

1. 专家 agent 可能输出过强判断。

要求：

1. 结构化输出 + evidence 约束。
2. 禁止临床化、病理化标签。

---

## 14. 推荐结论

推荐采用以下落地顺序：

1. **先把前端 mock 替换为后端固定模板题库**
2. **再接入专家解释并写记忆**
3. **最后再做 persona 自动校准与 crawler**

这是当前仓库最稳的实现路径，原因如下：

1. 与现有 `agent_personas.version` 和 `memory_items` 设计兼容。
2. 能最早验证“心灵测试是否真的能改善镜像质量”。
3. 不会在 crawler、版权、审核流尚未建立前把复杂度一次拉满。

如果后续开始实施，建议第一批代码落点如下：

1. `packages/db/src/schema/assessment-*.ts`
2. `apps/api/src/modules/assessments/`
3. `apps/api/src/services/assessment-session.service.ts`
4. `apps/api/src/services/persona-calibration.service.ts`
5. `apps/worker/src/jobs/assessment-interpretation.ts`

