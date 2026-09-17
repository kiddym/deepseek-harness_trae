# 任务管理 Web 应用

## 项目布局约定

项目目录内只保留源码、配置、测试和文档。浏览器资产、运行数据库、测试数据、测试报告和临时 PID 文件均不放在项目目录内，避免被源码候选扫描和复制。

## 依赖准备

要求 Node.js 22.22.2，SQLite 使用 Node 内置 `node:sqlite`，不安装第三方 SQLite 驱动。

```bash
npm install
```

本地 Playwright 浏览器通过 `PLAYWRIGHT_BROWSERS_PATH` 指定。默认位置是项目外的 `/Users/tom/Documents/Projects/.wp05-pw-browsers`，其中应已有与 Playwright 1.49.1 匹配的 Chromium 1148；本地测试不会下载浏览器。如需覆盖：

```bash
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers npm test
```

## 构建与启动

```bash
npm run build
npm start
```

服务默认监听 `127.0.0.1:4310`，可用 `PORT` 覆盖。服务端产物统一在 `dist/server/`，前端产物在 `dist/`：

```bash
PORT=4320 npm start
```

默认预览数据库位于项目外的 `$HOME/.local/share/wp05-task-app/app.db`，可用 `DATA_DIR` 覆盖：

```bash
DATA_DIR=/tmp/task-app-preview npm start
```

重置预览数据：先停止服务，再删除项目外的数据目录：

```bash
npm run stop
rm -rf "$HOME/.local/share/wp05-task-app"
```

生产式运行时由同一个 Node/Fastify 端口同时提供页面和 `/api` 接口。

## 就绪检查与停止

```bash
npm run ready
npm run stop
```

`ready` 会轮询 `GET /api/health`，直到确认 SQLite 读操作成功；超时会以非零状态退出并打印最后响应。`stop` 会终止 PID 文件指向的服务，并确认进程不存在且端口已释放；PID 文件位于系统临时目录下的 `wp05-task-app/`，测试实例使用其独立临时根目录，并在停止时清理。

## 测试

```bash
npm test
```

`npm test` 会先执行当前源码的 `npm run build`，构建失败立即中止，然后使用独立端口和独立 `DATA_DIR` 启动测试实例，运行 Playwright 1.49.1，最后停止服务并清理测试数据、trace、截图和 HTML 报告。默认测试根目录为系统临时目录 `/tmp/wp05-task-app-test-4311/`（macOS 通常位于系统临时目录实际路径），不会读写默认预览数据库。

可覆盖测试参数：

```bash
TEST_PORT=4321 \
TEST_ROOT=/tmp/wp05-task-app-test-4321 \
DATA_DIR=/tmp/unused-preview-data \
PLAYWRIGHT_BROWSERS_PATH=/Users/tom/Documents/Projects/.wp05-pw-browsers \
npm test
```

测试结束后，测试根目录会被清理。测试仍包含默认预览数据目录前后文件清单与内容摘要不变的隔离断言。

## CI

`.github/workflows/ci.yml` 在 `ubuntu-latest` 上执行 checkout、Node.js 22（npm 缓存）、`npm ci`、将 `PLAYWRIGHT_BROWSERS_PATH` 指向 `${{ runner.temp }}/pw-browsers`、在该目录安装 Chromium 1.49.1、`npm run build` 和 `npm test`。CI 使用 `${{ runner.temp }}` 下的独立测试根目录、数据目录和报告目录，不向项目目录写入浏览器、数据库或测试报告。

## 假设与非目标

- 第一阶段是单用户本地应用，不做登录、多用户、权限、上传、外部 API、SSR、微服务、桌面安装包、收费和部署。
- 任务只有标题、描述、完成状态、创建时间和更新时间；删除为硬删除。
- 任务按更新时间倒序显示，服务端生成 ID 和时间。
- 标题去除首尾空白后不能为空；编辑和创建均由服务端与前端校验。
- 未明确的细节按最简单合理假设推进，不引入额外基础设施。
