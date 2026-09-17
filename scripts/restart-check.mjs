import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
if (build.status !== 0) process.exit(build.status || 1);
const port = Number(process.env.RESTART_TEST_PORT || 4312);
const root = path.join(tmpdir(), `wp05-task-app-restart-${port}`);
const dataDir = path.join(root, 'data');
const pidFile = path.join(root, 'app.pid');
rmSync(root, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const start = () => spawn(process.execPath, ['dist/server/server.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, PID_FILE: pidFile }, stdio: 'inherit' });
const waitReady = async () => { const end = Date.now() + 30000; let last = '无响应'; while (Date.now() < end) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); last = await response.text(); if (response.ok && JSON.parse(last).ok) { console.log(`ready: ${last}`); return; } } catch (error) { last = error.message; } await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error(`就绪检查超时：${last}`); };
const stop = async (child) => { child.kill('SIGTERM'); const code = await new Promise((resolve) => child.once('exit', resolve)); console.log(`stopped: exit code ${code}`); };
let child;
try {
  child = start();
  await waitReady();
  const created = await fetch(`http://127.0.0.1:${port}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '重启持久化验证' }) });
  const createdBody = await created.json();
  if (!created.ok) throw new Error(`创建失败：${JSON.stringify(createdBody)}`);
  console.log(`created: ${JSON.stringify(createdBody)}`);
  await stop(child);
  child = start();
  await waitReady();
  const listed = await fetch(`http://127.0.0.1:${port}/api/tasks`);
  const listedBody = await listed.json();
  console.log(`after-restart: ${JSON.stringify(listedBody)}`);
  if (!listedBody.tasks.some((task) => task.title === '重启持久化验证')) throw new Error('重启后任务不存在');
  console.log('restart persistence: passed');
} finally {
  if (child && child.exitCode === null) await stop(child);
  rmSync(root, { recursive: true, force: true });
}
