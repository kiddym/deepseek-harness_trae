# 任务管理 Web 应用

## 安装

要求 Node.js 22.22.2。项目使用内置 `node:sqlite`，不安装第三方 SQLite 驱动。安装依赖：

```bash
npm install
```

## 构建与启动

```bash
npm run build
npm start
```

服务默认监听 `127.0.0.1:4310`，可用 `PORT` 覆盖：

```bash
PORT=4320 npm start
```

数据库默认保存到 `./data/app.db`，可用 `DATA_DIR` 指定目录：

```bash
DATA_DIR=/tmp/task-app-data npm start
```

生产式运行时由同一个 Node/Fastify 端口同时提供页面和 `/api` 接口。`npm run ready` 会轮询健康检查，确认数据库读操作成功后才返回成功。

## 测试

```bash
PLAYWRIGHT_BROWSERS_PATH=.pw-browsers npm test
```

测试脚本会先构建，使用独立的 `TEST_PORT`（默认 4311）和独立的 `TEST_DATA_DIR`（默认 `.test-data-4311`）启动测试实例，再运行 Playwright，最后停止实例。它绝不会读写默认的 `./data/app.db`。项目不会下载浏览器；如果环境变量未设置，脚本默认使用项目内 `.pw-browsers`。

也可以指定隔离参数：

```bash
TEST_PORT=4321 TEST_DATA_DIR=/tmp/task-app-test PLAYWRIGHT_BROWSERS_PATH=.pw-browsers npm test
```

## 停止

如果使用带 PID 文件的启动流程，可执行：

```bash
npm run stop
```

`stop` 会检查进程已不存在且端口已释放；任一条件不满足都会以非零状态退出并打印原因。手动执行 `npm start` 时不会自动创建 PID 文件，因此可用 `PORT` 配合系统进程工具停止，或通过 `npm test` 让测试脚本负责测试实例生命周期。

## 就绪检查与停止

`npm run ready` 会轮询 `GET /api/health`，直到服务确认 SQLite 读操作成功；超时会以非零状态退出并打印最后响应。`npm run stop` 会终止 `.task-app.pid` 指向的服务，并同时确认进程不存在且端口已释放。

## 主要假设与未做事项

- 第一阶段是单用户本地应用，不做登录、多用户、权限、上传、外部 API、SSR、微服务、桌面安装包、收费和部署。
- 任务只有标题、描述、完成状态、创建时间和更新时间；删除为硬删除。
- 任务按更新时间倒序显示，服务端生成 ID 和时间。
- 标题去除首尾空白后不能为空；编辑和创建均由服务端与前端校验。
- 默认使用 Chromium 作为 Playwright 基线。
- 当前未实现账号、搜索、标签、优先级、截止日期、提醒、附件或多端同步。

## CI

`.github/workflows/ci.yml` 在 `ubuntu-latest` 上执行 checkout、Node.js 22（npm 缓存）、`npm ci`、使用 `PLAYWRIGHT_BROWSERS_PATH` 指向工作区 `.pw-browsers` 安装 Chromium、`npm run build` 和 `npm test`。CI 与本地共用同一套 npm 脚本，只通过环境变量区分浏览器目录、端口和测试数据库目录。

Playwright 与浏览器基线固定为 `1.49.1`。本地测试要求使用项目内 `.pw-browsers`，CI 使用 runner 工作区内的同名目录。
