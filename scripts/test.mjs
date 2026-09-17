import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ERROR = 3;
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
if (build.error || build.status !== 0) { console.error(`[ERROR] 测试前构建失败，退出码 ${build.status ?? 'unknown'}`); process.exit(ERROR); }
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) { console.error('[ERROR] 未设置 PLAYWRIGHT_BROWSERS_PATH；请先准备 Chromium，例如：npx playwright@1.49.1 install chromium，然后设置 PLAYWRIGHT_BROWSERS_PATH 指向浏览器目录。'); process.exit(ERROR); }

const port = Number(process.env.TEST_PORT || 4311);
const testRoot = process.env.TEST_ROOT || path.join(tmpdir(), `wp05-task-app-test-${port}`);
const dataDir = process.env.TEST_DATA_DIR || path.join(testRoot, 'data');
const artifactDir = process.env.TEST_ARTIFACT_DIR || path.join(testRoot, 'artifacts');
const pidFile = path.join(testRoot, `app-${port}.pid`);
try { rmSync(testRoot, { recursive: true, force: true }); mkdirSync(dataDir, { recursive: true }); mkdirSync(artifactDir, { recursive: true }); }
catch (error) { console.error(`[ERROR] 准备测试目录失败：${error.message}`); process.exit(ERROR); }

let child;
let result = ERROR;
let scriptError = false;
const stopChild = async () => {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  const stopped = await new Promise((resolve) => { const timer = setTimeout(() => resolve(false), 10000); child.once('exit', () => { clearTimeout(timer); resolve(true); }); });
  if (!stopped) { console.error('[ERROR] 测试服务停止超时'); scriptError = true; }
};
try {
  child = spawn(process.execPath, ['dist/server/server.js'], { env: { ...process.env, NODE_ENV: 'test', PORT: String(port), DATA_DIR: dataDir, PID_FILE: pidFile }, stdio: 'inherit' });
  child.once('error', (error) => { console.error(`[ERROR] 测试服务启动失败：${error.message}`); scriptError = true; });
  writeFileSync(pidFile, String(child.pid));
  const ready = spawn(process.execPath, ['scripts/ready.mjs'], { env: { ...process.env, PORT: String(port), READY_TIMEOUT_MS: process.env.READY_TIMEOUT_MS || '30000' }, stdio: 'inherit' });
  const readyCode = await new Promise((resolve) => { ready.once('error', (error) => { console.error(`[ERROR] 就绪检查脚本启动失败：${error.message}`); resolve(ERROR); }); ready.once('exit', resolve); });
  if (readyCode !== 0) { console.error(`[ERROR] 测试服务未就绪，ready 退出码 ${readyCode}`); scriptError = true; }
  else {
    const test = spawn('npx', ['playwright', 'test'], { env: { ...process.env, PORT: String(port), TEST_ARTIFACT_DIR: artifactDir, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH }, stdio: 'inherit' });
    const testCode = await new Promise((resolve) => { test.once('error', (error) => { console.error(`[ERROR] Playwright 脚本启动失败：${error.message}`); resolve(ERROR); }); test.once('exit', resolve); });
    if (testCode === 0) result = 0;
    else if (testCode === 1) { console.error('[FAIL] Playwright 断言失败'); result = 1; }
    else { console.error(`[ERROR] Playwright 或测试环境错误，退出码 ${testCode}`); result = ERROR; }
  }
} catch (error) { console.error(`[ERROR] 测试脚本异常：${error.message}`); scriptError = true; }
finally {
  await stopChild();
  try { rmSync(testRoot, { recursive: true, force: true }); console.log(`cleaned: ${testRoot}`); }
  catch (error) { console.error(`[ERROR] 测试产物清理失败：${error.message}`); scriptError = true; }
}
if (scriptError) process.exit(ERROR);
process.exit(result);
