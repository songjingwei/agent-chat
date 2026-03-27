# Agent Chat 系统架构与技术栈说明

## 1. 文档目标
本文件用于明确 `agent chat` 项目的整体架构实现，包含：
1. 系统架构设计（模块划分与交互关系）。
2. 技术栈选型（前后端、数据、异步、AI、部署）。
3. 各核心模块的详细设计与落地现状。

## 2. 项目定位与核心流程
`agent chat` 的目标是让用户创建“专属交友 agent”，并通过 agent 与其他用户 agent 进行交流，最终产出可参考的匹配建议。

核心流程：
1. **画像构建**：用户填写资料、进行性格测试（Soul Quiz）或上传参考文本，系统构建用户画像与专属 agent。
2. **异步对话**：Agent 在广场与其他 Agent 自动开启聊天，由 Worker 异步推进，通过 LLM 模拟真实对话。
3. **用户介入**：用户可随时介入对话（Human Override），介入信息具有最高优先级，并用于修正 Agent 行为。
4. **评估与匹配**：系统通过评估系统（Assessment System）分析对话质量，产出匹配报告与深入了解建议。
5. **管理后台**：管理员可监控对话、管理画像、审计日志及调整系统配置。

## 3. 总体架构
采用 **Monorepo** 结构，分为多个应用和服务，通过共享包实现类型安全与逻辑复用。

### 3.1 模块划分
1. **`apps/web` (Client App)**：用户端界面，采用 TanStack Start，负责画像创建、广场展示、实时聊天与报告查看。
2. **`apps/admin` (Admin App)**：管理后台，采用 Vite + React + Ant Design，负责全站数据监控、人工介入与配置管理。
3. **`apps/api` (API/BFF)**：核心后端服务，基于 Hono，负责业务编排、权限校验、数据读写及异步任务下发。
4. **`apps/worker` (Task Worker)**：异步任务执行器，基于 BullMQ，负责长耗时的对话循环、报告生成与数据处理。
5. **`packages/agent-runtime`**：Agent 执行引擎，支持多模型驱动（OpenAI, Anthropic, Ollama），负责状态机管理与 Prompt 编排。
6. **`packages/db`**：统一数据层，基于 Drizzle ORM，封装了 PostgreSQL 16 (pgvector) 的 Schema 与 Repositories。
7. **`packages/shared`**：共享类型与常量定义，确保全栈类型一致性。

### 3.2 落地状态 (`2026-03-27`)
- **基础框架**：全栈 TypeScript Monorepo 环境完全成熟，`pnpm workspace` 运行顺畅。
- **数据层**：数据库 Schema 已覆盖用户、画像、会话、消息、记忆、评估、审计等 20+ 张表。
- **Agent 引擎**：已实现支持多厂商的模型工厂、Agent 状态机及长程记忆管理。
- **异步链路**：BullMQ 队列已打通，支持自动对话推进与异步任务处理。
- **后台系统**：Admin 系统已上线，支持对全站核心实体的 CRUD 与监控。

## 4. 技术栈

### 4.1 前端
- **用户端**：TanStack Start + Router + Query (React 19), Tailwind CSS, Lucide Icons.
- **管理端**：Vite + React + Ant Design + Zustand + Recharts.
- **设计标准**：遵循 "Soulful Echo" 设计系统，强调情感化交互。

### 4.2 后端
- **API 层**：Hono.js (Node 运行环境), Zod (验证), Jose (JWT).
- **任务队列**：BullMQ + Redis.
- **通信**：HTTP (RESTful) + SSE (计划中)。

### 4.3 数据与存储
- **主数据库**：PostgreSQL 16 + pgvector (向量检索)。
- **持久层**：Drizzle ORM。
- **缓存/队列**：Redis 7.
- **对象存储**：MinIO / AWS S3。

### 4.4 AI 与编排
- **模型驱动**：OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), Ollama (本地测试)。
- **编排框架**：自研 `Agent Runtime` 状态机。
- **向量化**：OpenAI Embeddings。

## 5. 核心系统设计

### 5.1 评估系统 (Assessment System)
用于将非结构化的对话内容转化为结构化的匹配建议。
- **Templates**: 预定义的评估维度与问题集。
- **Ingest**: 批量摄入对话内容。
- **Interpretations**: AI 对用户回答或对话的深度解读。

### 5.2 记忆系统 (Memory Layer)
- **Profile Memory**: 固化的性格特征与基础背景。
- **Session Memory**: 当前对话的上下文。
- **Item Memory**: 碎片化的关键信息，带有时效、来源与权重。
- **Human Override**: 用户手动介入的信息，用于纠偏。

### 5.3 异步对话循环
1. `API` 接收介入或初始化会话，向 `BullMQ` 投放任务。
2. `Worker` 监听队列，调用 `Agent Runtime`。
3. `Runtime` 根据当前状态、画像与记忆生成回复。
4. `Worker` 持久化消息并触发下一轮或结束判定。

## 6. 安全与合规
- **Admin Audit Logs**: 记录所有管理员操作，确保敏感数据访问可追溯。
- **Soft Deletion**: 核心业务数据支持逻辑删除。
- **Data Isolation**: 严格的 User-Scope 查询隔离。
- **Moderation**: 前置内容审核（集成 OpenAI Moderation）。

---
*本文档为项目的权威架构指南，随系统演进持续更新。*
