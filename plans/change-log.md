# 计划变更日志

## 使用规则
- 每次调整计划都新增一条记录。
- 必填：变更原因、影响范围、是否影响里程碑。
- 若影响 Day 7 / Day 10 / Day 15，必须在记录中标注 `里程碑受影响`。

| 日期 | 变更项 | 变更前 | 变更后 | 原因 | 影响范围 | 里程碑受影响 |
|---|---|---|---|---|---|---|
| 2026-03-21 | 初始化计划管理目录 | 无统一计划管理文档 | 新增 `plans/` 管理体系 | 便于持续跟踪与调整 | 全项目管理流程 | 否 |
| 2026-03-21 | 增加 Day 0 预备日 | 计划从 Day 1 直接开始 | 新增 `Day 0` 用于学习、环境确认和风险梳理 | 降低新手直接开工失控风险 | 每日执行节奏与进度跟踪 | 否 |
| 2026-03-21 | 版本控制流程改为 jj 优先 | 计划与指南基于 Git 表述 | 新增 `docs/jujutsu-workflow.md`，并将相关文档改为 `jj` 优先、Git 兼容 | 统一团队工作流，降低历史整理成本 | 贡献规范、学习计划、每日执行清单 | 否 |
| 2026-03-21 | Day 0 提前完成 Day 1 大部分工作 | Day 1 计划：初始化目录 + `.env.example` + 指标定义 | 目录骨架、`.env.example`、API 初始化、Web 初始化均在 Day 0 完成；Day 1 仅剩指标定义文档 | 学习理解阶段效率较高，顺势完成工程搭建 | Day 0 状态从 `Blocked` 改为 `Done`；Day 1 状态改为 `In Progress` | 否 |
| 2026-03-22 | Day 1 提前完成并启动 Day 2 | Day 1 状态为 `In Progress`；Day 2 状态为 `Not Started` | Day 1 改为 `Done`；Day 2 改为 `In Progress`，并明确仅剩“依赖启动 + DB/Redis 健康探针 + trace 日志” | `docs/core-metrics.md` 已完成，Docker / Docker Compose 已验证可用，仓库已包含 `docker-compose` 文件和基础 `GET /health` 路由 | 主计划、进度跟踪、Day 1 日报、模块状态文档 | 否 |
| 2026-03-22 | Day 2 提前完成 | Day 2 状态为 `In Progress` | Day 2 改为 `Done`，完成依赖启动、DB/Redis 健康探针、最小 trace 日志与手动 `/health` 验证 | 本地依赖已成功启动，API 健康检查与日志链路已落地，Day 2 验收条件满足 | 主计划、进度跟踪、仓库状态快照 | 否 |
| 2026-03-24 | Day 4 提前完成 | Day 4 状态为 `Not Started`（计划日期 `2026-03-26`） | Day 4 改为 `Done`，完成 Runtime 状态机、结构化输出校验、PromptManager、fallback/retry 与 API RuntimeService 占位接入 | Day 3 提前完成后具备连续推进条件，且 Runtime 代码与回归测试已通过 | `packages/agent-runtime`、`apps/api/services`、`plans/progress-tracker.md`、`plans/daily/day-04-2026-03-26.md` | 否 |
