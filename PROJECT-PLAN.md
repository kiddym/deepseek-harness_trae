# 项目计划

## 1. 当前工作包：测试与 CI

### 目标

为最小任务管理 Web 应用建立可执行、可验证的产品、设计和交付基线，确保后续实现可以按固定接口和验收条件推进。

### 范围

- 明确用户场景、第一期范围和非目标。
- 明确任务数据表和 HTTP API 契约。
- 明确前端页面、交互状态、运行方式和 Playwright 验证方式。
- 明确交付阶段、集成顺序、关键假设和重评触发。
- 明确后续实现工作包及其验证安排。

### 产物

- `PRD.md`：产品目标、场景、范围、行为预期和验收条件。
- `DESIGN.md`：数据、API、前端、模块、运行和测试设计。
- `DELIVERY-STRATEGY.md`：交付路径、假设、质量门和重评机制。
- `PROJECT-PLAN.md`：当前状态、依赖和下一步。

### 验证安排

本工作包只做文档验证：检查四份文档均为中文、各自只维护对应类别内容、技术栈与明确非目标一致、API 与验收条件能够互相对应。

按用户要求，本工作包不写代码、不安装依赖、不运行测试。

## 2. 依赖

- 产品依赖：已确定的任务管理目标和第一期范围。
- 技术依赖：React、TypeScript、Vite、Node.js、Fastify、Node 内置 `node:sqlite`、Playwright Test、GitHub Actions Linux。
- 环境依赖：目标 Node 版本必须支持 `node:sqlite`；实现阶段需在不改变技术栈的前提下确认版本与 CI runner 兼容。
- 外部依赖：第一期不依赖登录系统、外部 API、云数据库或部署平台。

## 3. 状态

- 当前状态：返工已完成：CI 解析、服务重启持久化、设计实现一致性、前端请求状态、浏览器路径与停止判据文档均已处理。
- 范围状态：第一期范围已冻结；登录、多用户、权限、文件上传、外部 API、SSR、微服务、桌面安装包、收费与部署均明确排除。
- 风险状态：本地已使用项目外 Chromium 1148 验证；GitHub Actions 配置已修正为 runner 运行时路径，但远端 runner 尚未执行。当前本地构建、12 个 UI/API 场景和重启持久化验证均通过。

## 4. 本工作包产物与验证

- Playwright 与 `playwright` 均锁定为 1.49.1。
- `playwright.config.ts` 使用 `channel: "chromium"`，浏览器路径由 `PLAYWRIGHT_BROWSERS_PATH` 提供。
- `tests/tasks.spec.ts` 包含 10 个独立中文场景，覆盖核心流程、异常路径、接口边界和默认数据目录隔离。
- `.github/workflows/ci.yml` 在 Ubuntu、Node 22 上执行依赖安装、Chromium 安装、构建和统一测试脚本。
- 本地验证结果：`npm run build` 通过；直接执行 `npm test` 会先构建当前源码，随后 12/12 Playwright 场景通过；完成状态刷新和服务重启后仍正确保留。

## 5. 下一步工作包：CI 远端验证与交付收口

### 目标

在 GitHub Actions 的 `ubuntu-latest` runner 上验证与本地一致的 Node 22、Playwright 1.49.1、Chromium 安装、构建和隔离测试链路。

### 范围

1. 提交并观察 `.github/workflows/ci.yml` 的 push 或 pull request 运行结果。
2. 若 Linux runner 失败，依据日志修正跨平台脚本或浏览器路径问题。
3. 确认测试报告目录保持忽略，不进入提交内容。
4. 完成第一期交付收口，记录远端 CI 结果和未验证项。

### 验证安排

本地已完成构建、12/12 场景验证和重启验证；远端 Linux CI 尚未执行，因此下一步只需补充远端证据，不扩大产品范围。

## 6. 布局与资产位置修正工作包

### 状态

已完成。项目目录内不再保存浏览器资产、测试数据库、测试报告或默认预览数据库；服务端产物统一输出到 `dist/server/`。

### 约定

- 本地浏览器由必填的 `PLAYWRIGHT_BROWSERS_PATH` 定位；未设置时测试明确报错，不使用机器特定默认路径。
- CI 浏览器放在 `${{ runner.temp }}/pw-browsers`，由工作流显式安装。
- 测试数据、Playwright outputDir 和 HTML 报告放在系统临时目录的测试根目录，测试结束清理。
- 默认预览数据库位于 `$HOME/.local/share/wp05-task-app/app.db`，可由 `DATA_DIR` 覆盖。
- 当前验证：`npm run build` 通过，`npm test` 自动先构建并通过 12/12 用例。

### 下一步

观察 GitHub Actions Linux runner 的实际结果；若远端环境无误，则完成第一期交付收口。

## 7. 返工工作包：交付核对后的缺陷与一致性修正

### 状态

已完成。修正了 job 级 `runner` 上下文导致的 CI 解析失败；删除诊断 workflow；新增 `verify:restart`；同步 DESIGN.md 与实际 PATCH/数据库/运行路径；补充前端请求中禁用、网络失败、5xx 提示和重试测试；移除本地浏览器默认绝对路径。

### 验证

- `npm run build`：通过。
- `PLAYWRIGHT_BROWSERS_PATH=/Users/tom/Documents/Projects/.wp05-pw-browsers npm test`：11 passed。
- `npm run verify:restart`：两次就绪检查、停止、重启读取任务、清理均通过。

### 下一步

在 GitHub Actions 额度恢复后运行 `.github/workflows/ci.yml`，取得 Linux runner 的实际原始记录；除该远端证据外不再扩大本期范围。

## 8. 决策与假设记录

- 采用单用户、无登录的最小模型。
- 采用 SQLite 单文件持久化，任务硬删除。
- 采用服务端生成 ID 与时间，前端以服务端响应为准更新状态。
- 默认 API 端口 3000，Vite 端口 5173；均可在实现阶段通过环境变量调整。
- 默认任务按更新时间倒序显示。
- 对未明确的细节采取最简单实现，不因本项目目标而引入超出范围的基础设施。
