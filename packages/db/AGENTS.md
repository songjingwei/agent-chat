# packages/db — AGENTS.md

> 数据库 schema、迁移、连接管理的开发规范与整体规划。

## 1. 包职责

| 层 | 职责 |
|---|------|
| `src/schema/` | Drizzle ORM 表定义（单一事实来源） |
| `src/connection.ts` | pg Pool 连接工厂 |
| `src/repositories/` | 数据访问层（封装查询逻辑，不暴露 ORM 细节） |
| `drizzle/` | 生成的 SQL 迁移文件（版本化、可审计） |
| `seeds/` | 开发/测试种子数据 |

---

## 2. Schema 设计铁律

以下规则适用于 **所有表**，无例外。

### 2.1 主键

- 使用 `varchar(64)` 类型，值为 `{prefix}_{uuid_hex}`（如 `usr_a1b2c3...`）。
- 前缀让 ID 自文档化，调试时一眼可辨来源表。
- **禁止** 自增整数主键：分布式场景无法安全生成，且暴露业务量信息。

### 2.2 必备字段（每张表都必须有）

| 字段 | 类型 | 用途 |
|------|------|------|
| `created_at` | `timestamptz NOT NULL DEFAULT NOW()` | 行创建时间 |
| `updated_at` | `timestamptz NOT NULL DEFAULT NOW()` | 最后修改时间；每次 UPDATE 必须刷新 |

### 2.3 审计字段（有写入操作的表）

符合 CLAUDE.md 约束："Write operations should include audit fields (actor, action, resource, timestamp)"。

- 方案一（推荐）：在关键表加 `created_by varchar(64)` / `updated_by varchar(64)` 字段，记录操作者 userId。
- 方案二：独立 `audit_log` 表，记录 (actor, action, resource_type, resource_id, timestamp, diff_json)。
- **MVP 阶段采用方案一 + 未来扩展方案二。**

### 2.4 软删除

- 需要数据可恢复的表（`users`, `agent_personas`, `chat_sessions`）加 `deleted_at timestamptz` 字段。
- 查询层默认过滤 `WHERE deleted_at IS NULL`。
- `refresh_tokens` 等短生命周期数据不需要软删除，用 `revoked_at` 或物理清理即可。

### 2.5 时间戳

- 一律使用 `timestamp with time zone`（`timestamptz`）。
- 应用层统一传 UTC，数据库连接设置 `timezone=UTC`。
- **禁止** 使用 `timestamp without time zone`，避免时区歧义。

### 2.6 索引策略

| 场景 | 做法 |
|------|------|
| 唯一业务键 | `UNIQUE INDEX`（如 email） |
| 外键 | 所有 FK 列 **必须** 加普通索引（PostgreSQL 不自动创建） |
| 高频查询过滤 | 按实际查询模式加索引，不预建；上线后用 `pg_stat_user_indexes` 验证 |
| 复合条件 | 优先复合索引而非多个单列索引 |
| 软删除过滤 | 对有 `deleted_at` 的表，高频查询索引加 `WHERE deleted_at IS NULL` 部分索引 |
| 全文搜索 | 使用 `tsvector` + GIN 索引，不用 LIKE |
| 向量搜索 | pgvector 的 `HNSW` 索引（后续 memory_items 表） |

### 2.7 外键约束

- 表间关系 **必须** 定义 `REFERENCES`，保证引用完整性。
- `ON DELETE` 策略：
  - 用户数据：`RESTRICT`（禁止级联删除用户数据）
  - 会话数据：`CASCADE`（删除会话时级联删除消息）
  - 审计数据：`SET NULL`（被引用资源删除后保留审计记录）

### 2.8 字段类型选择

| 需求 | 推荐类型 | 避免 |
|------|---------|------|
| 短文本（名称、标题） | `varchar(N)` 带显式长度 | `text`（无长度保护） |
| 长文本（bio、消息内容） | `text` | `varchar` 无意义大数 |
| 枚举 | `varchar` + CHECK 约束 | PostgreSQL `ENUM`（迁移困难） |
| JSON 扩展数据 | `jsonb` | `json`（不支持索引） |
| 标签/特质数组 | `text[]` 或 `jsonb` | 逗号分隔字符串 |
| 金额/精度数据 | `numeric` | `float`/`real` |
| 布尔 | `boolean` | `integer 0/1` |
| 向量嵌入 | `vector(N)` (pgvector) | `jsonb` 数组 |

---

## 3. 迁移管理规范

### 3.1 核心原则

**从现在起，禁止在非本地环境使用 `db:push`。所有 schema 变更必须通过迁移文件。**

| 环境 | 允许的操作 |
|------|-----------|
| 本地开发 | `db:push`（快速迭代）或 `db:migrate`（模拟生产） |
| CI/Staging/Production | **仅** `db:migrate`（执行版本化的 SQL 迁移文件） |

### 3.2 迁移工作流

```bash
# 1. 修改 schema 定义文件
# 2. 生成迁移 SQL
pnpm --filter @agent/db db:generate

# 3. 审查生成的 SQL 文件（drizzle/ 目录）
# 4. 本地测试迁移
pnpm --filter @agent/db db:migrate

# 5. 提交迁移文件到 git
git add packages/db/drizzle/
```

### 3.3 迁移文件规则

- 迁移文件一旦提交到 main 分支，**禁止修改**。只能追加新迁移来修正问题。
- 每个迁移应该是 **幂等安全** 的：使用 `IF NOT EXISTS`、`IF EXISTS` 等防护。
- 破坏性变更（删列、改类型）必须拆成多步迁移：
  1. 添加新列 → 部署代码兼容新旧列 → 迁移数据 → 删除旧列
- 大表变更使用 `ALTER TABLE ... ADD COLUMN ... DEFAULT` （PG 11+ 不锁表）。

### 3.4 迁移命名

Drizzle Kit 自动生成带时间戳的文件名。在 commit message 中说明迁移意图：
```
feat(db): add agent_personas table with versioning support
```

---

## 4. 连接与性能规范

### 4.1 连接池配置

```typescript
new pg.Pool({
  connectionString: databaseUrl,
  max: 20,                    // 最大连接数（根据 PG max_connections 调整）
  idleTimeoutMillis: 30_000,  // 空闲连接回收
  connectionTimeoutMillis: 5_000, // 连接获取超时
})
```

### 4.2 查询性能指导

| 原则 | 做法 |
|------|------|
| 避免 N+1 查询 | 使用 JOIN 或批量查询，禁止循环内单条查询 |
| 分页 | 使用 cursor-based 分页（`WHERE id > ?`），不用 OFFSET（大偏移性能差） |
| 写入批量 | 使用 `INSERT ... VALUES (...), (...)` 批量插入 |
| 事务 | 跨表写入必须在事务内，读操作不要开事务 |
| 查询计划 | 上线前对核心查询执行 `EXPLAIN ANALYZE`，确认走索引 |
| 热点写入 | 避免同一行高频 UPDATE（如计数器），用 `INSERT + 聚合` 模式 |

### 4.3 表分区规划（未来）

当 `chat_messages` 或 `memory_items` 行数预估超过千万时：
- 按 `created_at` 做范围分区（月度分区）
- 使用 PostgreSQL 原生声明式分区（`PARTITION BY RANGE`）

---

## 5. 整体表规划与建表顺序

### 5.1 完整数据模型

```
users (✅ 已建)
  ├── refresh_tokens (✅ 已建)
  ├── profiles (待建 - 用户画像扩展)
  └── uploaded_assets (待建 - 文件上传元数据)

agent_personas (待建 - 核心)
  ├── persona_versions (待建 - 版本快照)
  └── memory_items (待建 - 记忆/嵌入/权重)

chat_sessions (待建 - 核心)
  └── chat_messages (待建 - 消息明细)

match_reports (待建 - 分析产出)
```

### 5.2 建表优先级

| 优先级 | 表 | 理由 |
|--------|---|------|
| P0 | `agent_personas` | 替换内存存储，核心业务实体 |
| P0 | `chat_sessions` | 替换内存存储，核心业务实体 |
| P0 | `chat_messages` | 替换内存存储，核心业务实体 |
| P1 | `match_reports` | 会话分析产出 |
| P1 | `memory_items` | Agent 记忆系统，依赖 pgvector |
| P2 | `profiles` | 用户画像扩展（MVP 后） |
| P2 | `uploaded_assets` | 文件上传（MVP 后） |
| P2 | `persona_versions` | Persona 版本历史（MVP 后） |

### 5.3 现有表改造计划

**`users` 表需补充：**
- `deleted_at timestamptz` — 软删除
- `created_by varchar(64)` — 审计（注册场景为 self）

**`refresh_tokens` 表当前设计合理，无需改动。** 它是短生命周期数据，revoked_at 已满足需求。

---

## 6. 开发检查清单

创建新表前，确认以下各项：

- [ ] 主键使用 `varchar(64)`，有前缀
- [ ] 包含 `created_at` 和 `updated_at`
- [ ] 有写操作的表包含审计字段（`created_by` / `updated_by`）
- [ ] 需要数据可恢复的表包含 `deleted_at`
- [ ] 所有外键列有索引
- [ ] 枚举用 `varchar` + CHECK，不用 PG ENUM
- [ ] 时间戳用 `timestamptz`
- [ ] 通过 `db:generate` 生成迁移文件，而非 `db:push`
- [ ] 迁移文件已审查并提交到 git
- [ ] 核心查询跑过 `EXPLAIN ANALYZE`
