# 任务管理 Web 应用设计

## 1. 总体结构

应用由 React + TypeScript + Vite 前端、Node.js + TypeScript + Fastify 单体 HTTP 服务和 Node 内置 `node:sqlite` 组成。生产运行时由 Fastify 在同一个端口提供前端静态资源和 `/api` 接口。

项目目录只保存源码、配置、测试和文档。浏览器、运行数据库、测试数据和测试报告均放在项目外。

## 2. 数据设计

默认数据库文件为 `$HOME/.local/share/wp05-task-app/app.db`，可由 `DATA_DIR` 覆盖。服务启动时创建目录、表和索引。测试使用独立临时 `DATA_DIR`。

### 2.1 `tasks` 表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 服务端生成的任务 ID |
| `title` | TEXT | NOT NULL | 去除首尾空白后不能为空 |
| `description` | TEXT | NOT NULL DEFAULT '' | 可为空字符串 |
| `completed` | INTEGER | NOT NULL DEFAULT 0 | `0` 未完成，`1` 已完成 |
| `created_at` | TEXT | NOT NULL | ISO 8601 创建时间 |
| `updated_at` | TEXT | NOT NULL | ISO 8601 最后更新时间 |

列表使用 `updated_at DESC, id DESC`。对外 JSON 将蛇形字段转换为 `createdAt`、`updatedAt`，`completed` 转换为 boolean。

## 3. HTTP 接口

API 前缀为 `/api`。错误统一为 `{ "error": { "code": string, "message": string } }`。

### 3.1 健康检查

- `GET /api/health`
- 请求：无请求体。
- 响应 200：`{ "ok": true, "db": "ok", "schemaVersion": 1 }`。
- `db` 只有在服务端真实执行 `SELECT 1` 成功后才返回 `ok`。

### 3.2 获取任务

- `GET /api/tasks`
- 请求：无请求体。
- 响应 200：`{ "tasks": Task[] }`。

### 3.3 创建任务

- `POST /api/tasks`
- 请求：`{ "title": string, "description"?: string }`。
- 规则：标题去除首尾空白后不能为空；描述缺省为 `""`。
- 响应 201：`{ "task": Task }`。
- 空标题：400，消息为 `标题不能为空`。

### 3.4 更新任务与完成状态

- `PATCH /api/tasks/:id`
- 请求字段均可选：`{ "title"?: string, "description"?: string, "completed"?: boolean }`。
- 提供的字段被更新，未提供的字段保留原值；标题仍必须非空。
- 响应 200：`{ "task": Task }`。
- 任务不存在：404。
- 空标题：400，消息为 `标题不能为空`。

### 3.5 删除任务

- `DELETE /api/tasks/:id`
- 请求：无请求体。
- 响应 204：无响应体。
- 任务不存在：404。

## 4. 前端页面与交互

页面路径为 `/`，包含新建表单、任务列表、编辑态、完成勾选、页面内删除确认、空态、加载态和错误提示。

- 新建标题必填，描述可选。
- 创建、保存、完成切换、删除请求进行中，相关输入和按钮禁用，按钮显示处理中状态，防止重复提交。
- 网络错误或 4xx/5xx 错误显示明确提示；提供“重试”按钮重新加载任务列表，失败操作不会自动重复写入。
- 编辑失败保留编辑输入；空标题保存被拒绝。
- 删除先显示“确认删除”和“取消”，确认后才调用 DELETE。
- 完成使用 checkbox 和完成样式双重表达，不只依赖颜色。
- 成功响应以服务端返回的任务对象更新前端状态。

## 5. 运行与停止

默认服务端口为 `4310`，可由 `PORT` 覆盖：

```bash
npm run build
npm start
npm run ready
```

前端构建产物位于 `dist/`，服务端构建产物位于 `dist/server/`。`npm start` 由同一个 Fastify 端口提供页面和 API。默认数据库在 `$HOME/.local/share/wp05-task-app/app.db`，可由 `DATA_DIR` 覆盖。

停止使用：

```bash
npm run stop
```

停止成功必须同时满足：PID 对应进程不存在、端口已释放、停止命令运行记录结束且退出码为 0；否则命令非零退出并打印 PID 或端口仍占用的明确信息。

## 6. 测试与 CI

`npm test` 会先运行当前源码的 `npm run build`，构建失败即停止；随后使用独立临时端口和 `DATA_DIR` 启动服务，运行 Playwright 1.49.1，最后停止并清理测试根目录。测试数据、Playwright `outputDir`、HTML 报告和 trace 均位于系统临时目录。

浏览器路径由 `PLAYWRIGHT_BROWSERS_PATH` 提供；未设置时，测试应明确报错并提示准备浏览器，例如：

```bash
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers npm test
npx playwright@1.49.1 install chromium
```

重启持久化验证使用同一份数据库目录：

```bash
npm run verify:restart
```

该命令会构建、启动服务、创建任务、停止服务、使用同一 `DATA_DIR` 重启、执行就绪检查并读取任务。

GitHub Actions 使用 Ubuntu、Node 22、npm 缓存，并在 `$RUNNER_TEMP/pw-browsers` 安装 Chromium；路径类环境变量通过 `$GITHUB_ENV` 在 runner 已分配后设置。CI 最后调用与本地相同的 `npm test`。
