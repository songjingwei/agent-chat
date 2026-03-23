# 数据库 Schema 文档

> 自动生成于 2026-03-23，基于 `packages/db/src/schema/` 中的 Drizzle ORM 定义。

## 表关系总览

```
┌──────────┐
│  users   │
└────┬─────┘
     │ 1:N
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌────────────┐   ┌───────────────┐
│refresh_    │   │agent_personas │
│tokens      │   └───┬───┬───┬──┘
└────────────┘       │   │   │
                     │   │   │ 1:N
          ┌──────────┘   │   └──────────────┐
          │              │                  │
          │   ┌──────────┘                  │
          │   │  (initiator & target)       │
          ▼   ▼                             ▼
     ┌──────────────┐               ┌──────────────┐
     │chat_sessions │               │memory_items  │
     └──┬───┬───┬───┘               └──────────────┘
        │   │   │
        │   │   │ 1:N
        │   │   └───────────┐
        │   │               │
        ▼   ▼               ▼
  ┌──────────────┐   ┌──────────────┐
  │match_reports │   │chat_messages │
  └──────────────┘   └──────────────┘
```

---

## 1. users — 用户表

**用途**：存储平台注册用户的基本信息，是所有业务数据的顶层归属实体。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键，格式 `usr_{uuid_hex}` |
| `email` | varchar(255) | NOT NULL | 用户邮箱，用于登录 |
| `password_hash` | varchar(255) | NOT NULL | 密码哈希值 |
| `display_name` | varchar(80) | NOT NULL | 显示名称 |
| `created_by` | varchar(64) | — | 审计字段：创建者 |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | 更新时间 |
| `deleted_at` | timestamptz | — | 软删除标记 |

**索引**：
- `users_email_idx` — `email` 唯一索引

**被引用**：`refresh_tokens.user_id`, `agent_personas.user_id`

---

## 2. refresh_tokens — 刷新令牌表

**用途**：管理用户登录会话的 JWT 刷新令牌，支持令牌轮换和主动吊销。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `user_id` | varchar(64) | NOT NULL, FK → users.id | 所属用户 |
| `token_hash` | varchar(255) | NOT NULL | 令牌哈希（不存明文） |
| `expires_at` | timestamptz | NOT NULL | 过期时间 |
| `revoked_at` | timestamptz | — | 吊销时间（非空则已失效） |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |

**索引**：
- `refresh_tokens_token_hash_idx` — `token_hash`
- `refresh_tokens_user_id_idx` — `user_id`

**外键**：`user_id` → `users.id`

---

## 3. agent_personas — AI 人格表

**用途**：定义用户创建的 AI Agent 人格档案。每个用户可以创建多个人格，每个人格拥有独立的名称、简介、系统提示词和性格特质，用于在匹配聊天中代表用户进行自主对话。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `user_id` | varchar(64) | NOT NULL, FK → users.id | 所属用户 |
| `name` | varchar(100) | NOT NULL | 人格名称 |
| `bio` | text | — | 人格简介/自我描述 |
| `system_prompt` | text | — | 系统提示词，定义 AI 行为风格 |
| `traits` | jsonb (string[]) | NOT NULL, DEFAULT '[]' | 性格特质标签列表 |
| `version` | integer | NOT NULL, DEFAULT 1 | 版本号（支持迭代） |
| `status` | varchar(20) | NOT NULL, DEFAULT 'draft' | 状态：draft / active / archived |
| `created_by` | varchar(64) | — | 审计：创建者 |
| `updated_by` | varchar(64) | — | 审计：最后修改者 |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | 更新时间 |
| `deleted_at` | timestamptz | — | 软删除标记 |

**索引**：
- `agent_personas_user_id_idx` — `user_id`

**外键**：`user_id` → `users.id`

**CHECK 约束**：
- `status IN ('draft', 'active', 'archived')`

**被引用**：`chat_sessions`, `chat_messages`, `memory_items`

---

## 4. chat_sessions — 聊天会话表

**用途**：记录两个 AI 人格之间的一次匹配聊天会话。会话有发起方和接收方，通过轮次（round）控制对话进程，到达最大轮次后自动结束并触发匹配报告生成。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `initiator_persona_id` | varchar(64) | NOT NULL, FK → agent_personas.id | 发起方人格 |
| `target_persona_id` | varchar(64) | NOT NULL, FK → agent_personas.id | 接收方人格 |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending' | 会话状态 |
| `current_round` | integer | NOT NULL, DEFAULT 0 | 当前已完成轮次 |
| `max_rounds` | integer | NOT NULL, DEFAULT 20 | 最大允许轮次 |
| `created_by` | varchar(64) | — | 审计：创建者 |
| `updated_by` | varchar(64) | — | 审计：最后修改者 |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | 更新时间 |
| `deleted_at` | timestamptz | — | 软删除标记 |

**状态流转**：`pending` → `active` → `paused` / `completed` / `failed`

**索引**：
- `chat_sessions_initiator_persona_id_idx` — `initiator_persona_id`
- `chat_sessions_target_persona_id_idx` — `target_persona_id`

**外键**：
- `initiator_persona_id` → `agent_personas.id`
- `target_persona_id` → `agent_personas.id`

**CHECK 约束**：
- `status IN ('pending', 'active', 'paused', 'completed', 'failed')`

**被引用**：`chat_messages`, `memory_items`, `match_reports`

---

## 5. chat_messages — 聊天消息表

**用途**：存储聊天会话中的每一条消息。支持三种角色：AI Agent 自动生成的消息、用户手动介入的消息（human override）、以及系统消息。消息按轮次和时间排序。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `session_id` | varchar(64) | NOT NULL, FK → chat_sessions.id (CASCADE) | 所属会话 |
| `sender_persona_id` | varchar(64) | NOT NULL, FK → agent_personas.id | 发送方人格 |
| `role` | varchar(20) | NOT NULL | 消息角色：agent / human / system |
| `content` | text | NOT NULL | 消息正文 |
| `round` | integer | NOT NULL, DEFAULT 0 | 所属对话轮次 |
| `metadata` | jsonb | — | 扩展元数据（token 数、延迟、模型名等） |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |

**索引**：
- `chat_messages_session_id_created_at_idx` — `(session_id, created_at)` 复合索引，支持按时间分页
- `chat_messages_sender_persona_id_idx` — `sender_persona_id`

**外键**：
- `session_id` → `chat_sessions.id`（**CASCADE DELETE**：会话删除时消息一并删除）
- `sender_persona_id` → `agent_personas.id`

**CHECK 约束**：
- `role IN ('agent', 'human', 'system')`

---

## 6. memory_items — Agent 记忆条目表

**用途**：存储 AI Agent 人格在对话过程中积累的记忆。记忆分为事实、偏好、经历和指令四类，支持权重排序和向量嵌入（为将来语义检索预留）。用户可通过 human_override 手动添加/修正记忆，优先级高于 AI 推断。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `persona_id` | varchar(64) | NOT NULL, FK → agent_personas.id | 所属人格 |
| `session_id` | varchar(64) | FK → chat_sessions.id (SET NULL) | 来源会话（可空） |
| `category` | varchar(30) | NOT NULL | 类别：fact / preference / experience / instruction |
| `content` | text | NOT NULL | 记忆内容描述 |
| `weight` | real | NOT NULL, DEFAULT 0.5 | 权重 0.0–1.0，控制检索优先级 |
| `source` | varchar(30) | NOT NULL | 来源：agent_inferred / human_override / system |
| `embedding` | jsonb (number[]) | — | 向量嵌入（未来语义搜索用） |
| `metadata` | jsonb | — | 扩展元数据 |
| `created_by` | varchar(64) | — | 审计：创建者 |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | 更新时间 |

**索引**：
- `memory_items_persona_id_idx` — `persona_id`
- `memory_items_session_id_idx` — `session_id`
- `memory_items_source_idx` — `source`

**外键**：
- `persona_id` → `agent_personas.id`
- `session_id` → `chat_sessions.id`（**SET NULL**：会话删除时保留记忆但清空关联）

**CHECK 约束**：
- `category IN ('fact', 'preference', 'experience', 'instruction')`
- `source IN ('agent_inferred', 'human_override', 'system')`
- `weight >= 0 AND weight <= 1`

---

## 7. match_reports — 匹配报告表

**用途**：在聊天会话结束后，由 AI 分析对话内容生成的匹配度评估报告。包含兼容性评分、自然语言总结、推荐建议和结构化分析数据，帮助用户了解两个人格之间的契合程度。

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | varchar(64) | PK | 主键 |
| `session_id` | varchar(64) | NOT NULL, FK → chat_sessions.id | 所属会话 |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending' | 报告状态 |
| `compatibility_score` | real | — | 兼容性评分 0.0–1.0 |
| `summary` | text | — | 自然语言对话总结 |
| `recommendation` | text | — | AI 推荐建议（继续/不继续交往） |
| `analysis_data` | jsonb | — | 结构化分析（兴趣重叠、冲突点、对话质量等） |
| `created_by` | varchar(64) | — | 审计：创建者 |
| `created_at` | timestamptz | NOT NULL, DEFAULT NOW() | 创建时间 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT NOW() | 更新时间 |

**状态流转**：`pending` → `generating` → `completed` / `failed`

**索引**：
- `match_reports_session_id_idx` — `session_id`

**外键**：`session_id` → `chat_sessions.id`

**CHECK 约束**：
- `status IN ('pending', 'generating', 'completed', 'failed')`
- `compatibility_score IS NULL OR (compatibility_score >= 0 AND compatibility_score <= 1)`

---

## 表统计

| 表名 | 列数 | 外键数 | 索引数 | CHECK 约束数 |
|------|------|--------|--------|-------------|
| users | 8 | 0 | 1 | 0 |
| refresh_tokens | 6 | 1 | 2 | 0 |
| agent_personas | 13 | 1 | 1 | 1 |
| chat_sessions | 11 | 2 | 2 | 1 |
| chat_messages | 8 | 2 | 2 | 1 |
| memory_items | 12 | 2 | 3 | 3 |
| match_reports | 10 | 1 | 1 | 2 |
| **合计** | **68** | **9** | **12** | **8** |

## 核心业务流程中的数据流

```
用户注册 → [users]
    ↓
创建 AI 人格 → [agent_personas] (draft → active)
    ↓
系统匹配两个 active 人格 → [chat_sessions] (pending → active)
    ↓
Agent 轮流对话 → [chat_messages] (按 round 递增)
    ↓                    ↓
记忆提取 → [memory_items]    到达 max_rounds
                              ↓
                    生成匹配报告 → [match_reports] (pending → completed)
                              ↓
                    用户查看报告，决定是否继续
```
