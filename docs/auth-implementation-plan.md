# 注册登录功能实现计划

## Context

当前 Agent Chat 没有认证系统，所有 API 无身份验证，前端用 `getOrCreateUserId()` 随机生成 UUID 模拟用户身份。需要实现完整的 JWT 注册登录流程，同时将数据库层从 scaffold 状态激活到 PostgreSQL。

**技术选型**: JWT (access 15min + refresh 7d) + PostgreSQL + bcryptjs

---

## Phase 1: 数据库层 (`packages/db/`)

激活 Drizzle ORM，建立 users 和 refresh_tokens 表。

### 1.1 安装依赖
```bash
pnpm --filter @agent/db add drizzle-orm pg
pnpm --filter @agent/db add -D drizzle-kit @types/pg
```

### 1.2 新建文件

| 文件 | 内容 |
|------|------|
| `packages/db/src/connection.ts` | pg Pool + drizzle 连接工厂，导出 `createDbClient` 和 `DbClient` 类型 |
| `packages/db/src/schema/users.ts` | users 表：id(varchar PK), email(unique), password_hash, display_name, created_at, updated_at |
| `packages/db/src/schema/refresh-tokens.ts` | refresh_tokens 表：id, user_id(FK), token_hash, expires_at, revoked_at, created_at |
| `packages/db/src/schema/index.ts` | 导出所有 schema |
| `packages/db/drizzle.config.ts` | Drizzle Kit 配置 |

### 1.3 修改文件

- **`packages/db/src/index.ts`** — 替换 placeholder，导出 connection + schemas
- **`packages/db/package.json`** — 添加 `db:generate`, `db:migrate`, `db:push` 脚本；添加依赖

### 1.4 生成并推送 schema
```bash
pnpm --filter @agent/db db:push
```

---

## Phase 2: 共享类型 (`packages/shared/`)

### 2.1 新建文件

| 文件 | 内容 |
|------|------|
| `packages/shared/src/auth.ts` | Auth 相关 DTO 接口和错误码常量 |

**类型定义:**
- `RegisterInput { email, password, displayName }`
- `LoginInput { email, password }`
- `AuthTokens { accessToken, refreshToken, expiresIn }`
- `AuthUser { id, email, displayName, createdAt }`
- `AuthResponse { user, tokens }`
- `RefreshInput { refreshToken }`

**错误码:**
- `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_EXISTS`, `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_INVALID`, `AUTH_UNAUTHORIZED`

### 2.2 修改文件
- **`packages/shared/src/index.ts`** — re-export `./auth.js`

---

## Phase 3: API 认证模块 (`apps/api/`)

### 3.1 安装依赖
```bash
pnpm --filter @agent/api add bcryptjs jsonwebtoken @agent/db @agent/shared
pnpm --filter @agent/api add -D @types/bcryptjs @types/jsonwebtoken
```

### 3.2 新建文件

| 文件 | 内容 |
|------|------|
| `apps/api/src/schemas/auth.ts` | Zod schema: registerBody, loginBody, refreshBody |
| `apps/api/src/services/auth.service.ts` | AuthService 类：register, login, refresh, logout, getProfile |
| `apps/api/src/modules/auth/auth.routes.ts` | 路由：POST /auth/register, /auth/login, /auth/refresh, /auth/logout; GET /auth/me |
| `apps/api/src/middleware/auth.ts` | JWT 验证中间件，解析 token 设置 `c.set("userId")` |

### 3.3 修改文件

- **`apps/api/src/config.ts`** — 添加 `jwtSecret`, `jwtAccessExpiresIn`(900s), `jwtRefreshExpiresIn`(604800s)
- **`apps/api/src/services/index.ts`** — 导入 `createDbClient`，创建 `AuthService`，添加到 `AppServices`
- **`apps/api/src/routes/index.ts`** — 注册 auth 路由(公开) + 对现有路由组应用 authMiddleware

### 3.4 AuthService 关键逻辑

- `register`: 检查 email 唯一 → bcrypt hash (12 rounds) → 插入 user → 生成 tokens → 返回 AuthResponse
- `login`: 查 email → bcrypt compare → 生成 tokens → 返回 AuthResponse
- `refresh`: SHA-256 hash 传入 token → 查 refresh_tokens (未过期未撤销) → 撤销旧 token → 生成新 tokens
- `logout`: 撤销 refresh token
- `getProfile`: 按 userId 查 user，返回 AuthUser (不含 password_hash)
- refresh token 只在数据库存 SHA-256 hash，原始 token 仅下发客户端

### 3.5 Auth 中间件应用方式

```
公开路由: GET /, GET /health, POST /auth/register, POST /auth/login, POST /auth/refresh
受保护路由 (authMiddleware):
  - GET /auth/me, POST /auth/logout
  - 全部 personas, sessions, messages, reports 路由
```

### 3.6 更新现有路由使用认证 userId

- `createPersonaBodySchema` 中移除 `userId` 字段
- Persona/Session/Message/Report routes — userId 来自 JWT 而非请求参数

---

## Phase 4: 前端认证 (`apps/web/`)

### 4.1 新建文件

| 文件 | 用途 |
|------|------|
| `src/lib/auth-tokens.ts` | token 存取工具 (localStorage) |
| `src/lib/auth-context.tsx` | AuthProvider + useAuth hook |
| `src/features/auth/useLogin.ts` | 登录逻辑 hook |
| `src/features/auth/LoginForm.tsx` | 登录表单组件 |
| `src/features/auth/useRegister.ts` | 注册逻辑 hook |
| `src/features/auth/RegisterForm.tsx` | 注册表单组件 |
| `src/routes/login.tsx` | 登录页路由 |
| `src/routes/register.tsx` | 注册页路由 |

### 4.2 修改文件

- **`src/lib/api-client.ts`** — request 函数添加 Authorization header；401 时自动 refresh；新增 auth API 函数
- **`src/lib/types.ts`** — 添加 AuthUser, AuthTokens, AuthResponse 等类型
- **`src/lib/query-keys.ts`** — 添加 auth query keys
- **`src/routes/__root.tsx`** — RouterContext 添加 auth；用 AuthProvider 包裹
- **`src/components/Header.tsx`** — 已登录显示用户名+登出；未登录显示登录链接
- **`src/features/personas/usePersonaCreateForm.ts`** — useAuth() 替代 getOrCreateUserId()
- **`src/features/personas/useMyPersonas.ts`** — 同上
- **`src/features/personas/useDiscoveryPlaza.ts`** — 同上
- **`src/features/sessions/useChatRoom.ts`** — 同上

### 4.3 删除文件
- **`src/lib/userId.ts`** — 不再需要

### 4.4 页面设计

遵循 "Soulful Echo" 风格标准：居中卡片布局、暖色调、玻璃态效果、诗意中文文案。

---

## Phase 5: 收尾

- 更新 `.env.example`
- 运行 `pnpm typecheck` + `pnpm --filter @agent/api test`

## 验证方式

1. Docker compose 启动 PostgreSQL → `db:push` → `pnpm dev`
2. 注册 → 登录 → 登出 → 路由守卫 → token 刷新 → typecheck
