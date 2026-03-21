# Jujutsu (`jj`) 工作流指南

本项目采用 `jj` 作为默认版本控制工作流，`git` 仅作为远端兼容层（GitHub/GitLab/CI）。

## 1. 安装与初始化

1. 安装 `jj`（macOS 可用 `brew install jj`）。
2. 在仓库根目录初始化（当前仓库尚未初始化版本库时）：
   - `jj git init`
3. 检查是否可用：
   - `jj --version`
   - `jj st`

说明：`jj git init` 会让 `.jj` 与 `.git` 共存，方便继续使用 Git 生态工具。

## 2. 日常最小命令集

- 查看状态：`jj st`
- 查看历史图：`jj log`
- 查看改动：`jj diff`
- 给当前变更命名：`jj describe -m "feat(runtime): add memory weighting"`
- 开启下一个变更：`jj new`
- 创建提交：`jj commit -m "feat(api): add health endpoint"`
- 整理提交（向父提交压缩）：`jj squash`
- 撤销误操作：`jj undo`

## 3. 远端同步（替代 `git pull/push`）

- 拉取远端：`jj git fetch`
- 将当前工作重放到主线：`jj rebase -o main`
- 推送远端：`jj git push --remote origin`

说明：`jj` 当前没有完全等价于 `git pull` 的单命令流程，推荐固定使用 `fetch + rebase`。

## 4. 团队约定（本项目）

1. 本地变更整理和历史改写统一使用 `jj`。
2. 提交信息继续遵循 Conventional Commits（如 `feat: ...`、`fix: ...`、`docs: ...`）。
3. 只有在外部工具强依赖时才直接使用 `git` 变更历史。
4. 每天结束前至少执行一次：`jj log`、`jj st`，确认工作区干净和历史结构清晰。

## 5. 常见问题

- 看不到远端最新内容：先执行 `jj git fetch`，再执行 `jj rebase -o main`。
- 操作做错了：优先尝试 `jj undo`。
- 需要与只会 Git 的工具协作：保持 colocated 模式，不阻塞现有流程。
