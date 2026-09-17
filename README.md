# 任务管理 Web 应用

## 项目布局约定

项目目录内只保留源码、配置、测试和文档。浏览器资产、运行数据库、测试数据、测试报告和临时 PID 文件均不放在项目目录内，避免被源码候选扫描和复制。

## 依赖准备

要求 Node.js 22.22.2，SQLite 使用 Node 内置 `node:sqlite`，不安装第三方 SQLite 驱动。

```bash
npm install
```

Playwright 浏览器必须通过 `PLAYWRIGHT_BROWSERS_PATH` 指定；未设置时测试会明确报错并提示准备浏览器。项目不内置浏览器资产，本地准备方式例如：

```bash
npx playwright@1.49.1 install chromium
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

`ready` 会轮询 `GET /api/health`，直到确认 SQLite 读操作成功；超时会以非零状态退出并打印最后响应。`stop` 的成功判据有三条：进程不存在、端口已释放、停止命令运行记录已结束且退出码为 0。成功输出形如 `stopped: pid 5351, port 4310 released`；失败时以非零退出，并输出 `stop failed: pid <pid> still alive or port <port> still occupied` 或无法发送信号的明确原因。PID 文件位于系统临时目录下的 `wp05-task-app/`，测试实例使用其独立临时根目录，并在停止时清理。

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
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers \
npm test
```

测试结束后，测试根目录会被清理。测试仍包含默认预览数据目录前后文件清单与内容摘要不变的隔离断言。

## 测试三态与退出码

测试基础设施统一使用三态退出码：

- `0`：全部通过。
- `1`：业务断言失败，通常是 Playwright 用例失败。
- `3`：脚本或环境错误，包括构建失败、缺少 `PLAYWRIGHT_BROWSERS_PATH`、服务未就绪、Playwright 启动错误、停止失败或临时目录清理失败。

输出前缀用于机器区分：`[FAIL]` 表示断言失败，`[ERROR]` 表示脚本或环境错误。清理在停止测试服务后执行；清理失败不会被吞掉，会输出 `[ERROR]` 并将最终退出码升级为 `3`。`ready` 和 `stop` 的超时、配置、信号、PID、端口和清理错误同样退出 `3`。

反例构造：

```bash
# 通过：使用已准备好的浏览器目录
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers npm test

# 断言失败：临时把 tests/tasks.spec.ts 的一条 expect 改为必然不成立，运行后恢复文件
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers npm test
# 预期：[FAIL] Playwright 断言失败，退出码 1

# 配置错误：不设置浏览器路径
unset PLAYWRIGHT_BROWSERS_PATH
npm test
# 预期：[ERROR] 未设置 PLAYWRIGHT_BROWSERS_PATH，退出码 3

# 服务未就绪：将 TEST_PORT 指向已被其他服务占用且无法启动测试实例的端口
PLAYWRIGHT_BROWSERS_PATH=/path/to/pw-browsers TEST_PORT=4310 npm test
# 预期：[ERROR] 测试服务未就绪，退出码 3
```

## 重启持久化验证

使用同一个外部 `DATA_DIR` 启动服务、创建任务、停止服务、重新启动、就绪检查并读取任务：

```bash
npm run verify:restart
```

该命令会输出创建结果、两次就绪结果、停止结果、重启后的任务列表和 `restart persistence: passed`，验证服务重启后 SQLite 数据仍在。验证完成后会清理临时数据目录。

## CI

`.github/workflows/ci.yml` 在 `ubuntu-latest` 上执行 checkout、Node.js 22（npm 缓存）、`npm ci`、将 `PLAYWRIGHT_BROWSERS_PATH` 指向 `${{ runner.temp }}/pw-browsers`、在该目录安装 Chromium 1.49.1、`npm run build` 和 `npm test`。CI 使用 `${{ runner.temp }}` 下的独立测试根目录、数据目录和报告目录，不向项目目录写入浏览器、数据库或测试报告。

## 假设与非目标

- 第一阶段是单用户本地应用，不做登录、多用户、权限、上传、外部 API、SSR、微服务、桌面安装包、收费和部署。
- 任务只有标题、描述、完成状态、创建时间和更新时间；删除为硬删除。
- 任务按更新时间倒序显示，服务端生成 ID 和时间。
- 标题去除首尾空白后不能为空；编辑和创建均由服务端与前端校验。
- 未明确的细节按最简单合理假设推进，不引入额外基础设施。
