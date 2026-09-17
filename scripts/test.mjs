import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
if (build.status !== 0) { console.error('测试前构建失败，已中止测试。'); process.exit(build.status || 1); }
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) { console.error('未设置 PLAYWRIGHT_BROWSERS_PATH；请先准备 Chromium，例如：npx playwright@1.49.1 install chromium，然后设置 PLAYWRIGHT_BROWSERS_PATH 指向浏览器目录。'); process.exit(1); }
const port = Number(process.env.TEST_PORT || 4311); const testRoot = process.env.TEST_ROOT || path.join(tmpdir(), `wp05-task-app-test-${port}`); const dataDir = process.env.TEST_DATA_DIR || path.join(testRoot, 'data'); const artifactDir = process.env.TEST_ARTIFACT_DIR || path.join(testRoot, 'artifacts'); const pidFile = path.join(testRoot, `app-${port}.pid`); rmSync(testRoot, { recursive: true, force: true }); mkdirSync(dataDir, { recursive: true }); mkdirSync(artifactDir, { recursive: true });
const child = spawn(process.execPath, ['dist/server/server.js'], { env: { ...process.env, NODE_ENV: 'test', PORT: String(port), DATA_DIR: dataDir, PID_FILE: pidFile }, stdio: 'inherit' }); writeFileSync(pidFile, String(child.pid)); let code = 1;
try { const ready = spawn(process.execPath, ['scripts/ready.mjs'], { env: { ...process.env, PORT: String(port), READY_TIMEOUT_MS: '30000' }, stdio: 'inherit' }); if ((await new Promise((resolve) => ready.on('exit', resolve))) !== 0) throw new Error('测试服务未就绪'); const test = spawn('npx', ['playwright', 'test'], { env: { ...process.env, PORT: String(port), TEST_ARTIFACT_DIR: artifactDir, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH }, stdio: 'inherit' }); code = await new Promise((resolve) => test.on('exit', resolve)); } finally { child.kill('SIGTERM'); await new Promise((resolve) => child.on('exit', resolve)); try { rmSync(testRoot, { recursive: true, force: true }); } catch {} }
process.exit(code);
