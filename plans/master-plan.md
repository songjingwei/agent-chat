# Agent Chat 主计划（新手可执行版）

## 0. 基准信息
- 参考文档：`readme.md`、`docs/system-architecture.md`、`docs/mvp-implementation-plan.md`、`docs/jujutsu-workflow.md`
- 计划周期：15 个工作日（MVP）
- 实际开始日期：`2026-03-21`
- 当前状态（`2026-03-22`）：`Day 0 Done`、`Day 1 Done`（提前完成）、`Day 2 In Progress`
- 目标：在可控成本下完成可演示闭环（创建 agent -> 双 agent 对话 -> 用户介入 -> 总结推荐）

## 0.1 当前进度快照（As of 2026-03-22）
1. 已完成：monorepo 骨架、`.env.example`、`docs/core-metrics.md`、`infra/docker/docker-compose.yml`、`apps/api` 最小服务、`apps/web` 脚手架。
2. 已验证：`docker -v` = `20.10.21`、`docker compose version` = `v2.13.0`、`pnpm --filter @agent/api test` 2 条通过、`pnpm typecheck` 通过。
3. 当前缺口：本地依赖尚未实际拉起，`GET /health` 还未连到 DB/Redis，`packages/db` / `packages/agent-runtime` / `apps/worker` 仍是占位实现。

## 1. 前置知识（先学会再开工）

### 1.1 必学清单
1. 终端与 Jujutsu (`jj`) 基础：状态查看、提交整理、历史改写、撤销误操作。
2. Node.js + pnpm workspace：多包工程的安装、运行、脚本管理。
3. TypeScript + Zod：类型建模、接口校验、错误处理。
4. PostgreSQL：建表、索引、事务、基础查询优化。
5. Redis/BullMQ：队列、重试、幂等、死信处理。
6. OpenAI API 基础：结构化输出、函数调用、token 成本控制。

### 1.2 学习达标标准（必须满足）
- 能独立启动本地依赖（Postgres/Redis/MinIO）。
- 能写一个带 Zod 校验的 API 接口。
- 能写一个 BullMQ 任务并看懂执行日志。
- 能完成一次 LLM 调用并解析 JSON 结果。
- 能完成一次 `jj` 基础流转（`jj st` -> `jj describe -m` -> `jj commit -m` -> `jj undo`）。

## 2. Day-by-Day 执行计划（Day 1 - Day 15）

1. Day 1（已于 `2026-03-22` 提前完成）：定义 3 个核心指标（`persona_fidelity`、`controllability`、`summary_usefulness`），初始化 monorepo 目录，补 `.env.example`。
2. Day 2（进行中）：完成 `docker-compose`（Postgres/Redis/MinIO），实现 API 健康检查。
3. Day 3：实现核心数据表与迁移（`profiles`、`agent_personas`、`memory_items`、`chat_sessions`、`chat_messages`、`match_reports`）。
4. Day 4：实现 Agent Runtime 状态机骨架、结构化输出、失败兜底。
5. Day 5：实现 Persona Builder（资料转 persona + 版本化 + 人工编辑）。
6. Day 6：实现双 agent 自动对话（A/B 轮询 + 轮次上限 + 超时保护）。
7. Day 7：实现用户介入高权重记忆写入，并确保下一轮对话生效。
8. Day 8：建立离线评测集（20-50 条），输出 baseline 报告。
9. Day 9：实现总结与推荐 v1，提供 `GET /reports/latest`。
10. Day 10：补齐安全基础（脱敏、审核、审计日志）。
11. Day 11：实现最小演示 UI（会话列表、详情、回放、人工介入入口）。
12. Day 12：实现广场与发起会话入口，补空状态与失败重试。
13. Day 13：实现最小身份隔离（临时身份 + 用户数据隔离中间件）。
14. Day 14：实现注册登录/JWT 刷新，完成临时身份迁移。
15. Day 15：全链路回归、成本压测、演示脚本和发布说明。

## 3. 每日必做（防失控）
1. 每天只做一个主目标，不并行开新大任务。
2. 每天结束写一条复盘（完成项、阻塞点、次日第一步）。
3. 每个接口先写输入输出和错误码，再写代码。
4. 每天至少跑一次最小回归。
5. 所有模型请求记录 `tokens/latency/error_rate`。

## 4. 里程碑与止损
- M1（Day 7）：若 P0 闭环未完成，暂停 UI 与登录开发。
- M2（Day 10）：评估和安全未达标，不进入发布准备。
- M3（Day 15）：若不达标，保留本地演示，不上云。
