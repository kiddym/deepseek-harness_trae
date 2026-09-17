# 任务管理 Web 应用设计

## 1. 总体结构

项目采用前后端分离的开发结构，但交付为一个轻量单体应用：React + TypeScript + Vite 负责页面，Node.js + TypeScript + Fastify 提供 HTTP API，SQLite 负责持久化。生产运行时由 Node 服务提供 API，并按实现方案提供构建后的前端静态资源；开发时使用 Vite 开发服务器和 API 服务分别运行。

SQLite 驱动必须使用 Node 内置 `node:sqlite`，不得引入第三方 SQLite 包。

## 2. 数据设计

数据库文件默认放在项目运行目录的 `data/tasks.sqlite`，该路径可通过环境变量覆盖。服务启动时创建数据库目录、表和必要索引。

### 2.1 `tasks` 表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 服务端生成的任务 ID |
| `title` | TEXT | NOT NULL | 任务标题，去除首尾空白后不能为空 |
| `description` | TEXT | NOT NULL DEFAULT '' | 任务描述，可为空字符串 |
| `completed` | INTEGER | NOT NULL DEFAULT 0 | SQLite 布尔约定，`0` 未完成，`1` 已完成 |
| `created_at` | TEXT | NOT NULL | ISO 8601 创建时间 |
| `updated_at` | TEXT | NOT NULL | ISO 8601 最后更新时间 |

建议建立 `updated_at` 与 `id` 的组合索引，以支持列表查询。

### 2.2 API JSON 表示

对外统一返回：`id` 为 number，`title` 与 `description` 为 string，`completed` 为 boolean，`createdAt` 与 `updatedAt` 为 ISO 8601 string。数据库蛇形字段只存在于服务端内部。

错误响应统一为：`{ "error": { "code": string, "message": string } }`。

## 3. HTTP 接口清单

API 前缀为 `/api`。成功响应使用 JSON；删除成功返回 204，无响应体。

### 3.1 获取任务列表

- 方法：`GET`
- 路径：`/api/tasks`
- 请求：无请求体；可选查询参数暂不支持。
- 响应 200：`{ "tasks": Task[] }`
- 顺序：`updatedAt` 倒序，ID 作为稳定次序。

### 3.2 创建任务

- 方法：`POST`
- 路径：`/api/tasks`
- 请求字段：`{ "title": string, "description"?: string }`
- 规则：标题首尾空白会被去除；描述缺省按空字符串处理。
- 响应 201：`{ "task": Task }`
- 非法请求：400，错误码建议为 `INVALID_TASK`。

### 3.3 更新任务

- 方法：`PUT`
- 路径：`/api/tasks/:id`
- 请求字段：`{ "title": string, "description": string }`
- 规则：第一期编辑接口只更新标题和描述，不通过此接口修改完成状态。
- 响应 200：`{ "task": Task }`
- ID 不存在：404，错误码建议为 `TASK_NOT_FOUND`。
- 标题为空：400。

### 3.4 切换完成状态

- 方法：`PATCH`
- 路径：`/api/tasks/:id/completion`
- 请求字段：`{ "completed": boolean }`
- 响应 200：`{ "task": Task }`
- ID 不存在：404。

### 3.5 删除任务

- 方法：`DELETE`
- 路径：`/api/tasks/:id`
- 请求：无请求体。
- 响应 204：无响应体。
- ID 不存在：404。

## 4. 前端页面与交互

第一期只有一个页面，路由为 `/`。

页面区域：

1. 页面标题和简短说明。
2. 新建任务表单：标题输入、描述输入、创建按钮。
3. 任务列表：每项显示标题、描述、完成状态、更新时间，以及编辑、完成切换、删除操作。
4. 编辑态：将当前任务的标题和描述替换为输入控件，提供保存和取消。
5. 空列表状态、加载状态和错误状态。

交互规则：

- 标题输入使用客户端即时校验，并在提交时再次校验。
- 列表初次加载显示加载状态；加载失败显示错误和重试按钮。
- 创建、保存、切换、删除请求进行中，相关控件禁用。
- 完成任务使用明显但不唯一的视觉变化，例如勾选状态和标题删除线；不能只依赖颜色表达。
- 删除使用浏览器确认对话框或页面内确认区域；本轮优先采用页面内简单确认或 `window.confirm`。
- 请求成功后以服务端返回对象更新前端状态，避免客户端自行猜测时间或 ID。

## 5. 模块设计

- `server`：Fastify 启动、配置、错误处理、静态资源接入。
- `db`：`node:sqlite` 连接、建表、查询和事务边界。
- `tasks`：任务领域校验、数据转换和 API 路由处理。
- `client`：React 页面、表单、列表项、编辑态和请求客户端。
- `shared`：前后端共享的任务与错误类型；若共享类型引入复杂构建耦合，则保持为简单重复 DTO，并在实现阶段记录决定。
- `tests`：Playwright Test 测试夹具、数据隔离和端到端用例。

## 6. 运行设计

约定默认端口：前端 Vite 为 `5173`，Fastify API 为 `3000`。Vite 开发服务器将 `/api` 代理到 `http://localhost:3000`。端口和 SQLite 文件路径可通过环境变量覆盖。

计划中的启动方式：

```text
npm install
npm run dev
```

具体脚本名称和并行启动方案在实现阶段落地，但必须提供一个面向开发者的统一启动入口，并能单独启动 API 服务。

生产式本地验证应先构建前端，再启动 Fastify 服务提供 API 与静态资源；具体脚本以实现后的 `package.json` 为准。

## 7. 测试与验证设计

使用 Playwright Test，优先通过真实浏览器和 HTTP API 验证用户可见行为。每个测试运行应使用隔离的临时 SQLite 数据库或明确清理数据，避免测试间相互影响。

最小测试场景：

1. 空列表显示；创建任务后列表出现。
2. 刷新页面后任务仍存在。
3. 编辑标题和描述后保存，刷新后内容仍正确。
4. 标记完成，刷新后仍为完成；再切回未完成。
5. 确认删除后任务消失，刷新后不再出现。
6. 空标题创建和保存被拒绝。

CI 在 Linux 上执行依赖安装、前端构建、服务启动和 Playwright Test；失败时保留 Playwright HTML 报告、截图或 trace（如配置启用）。
