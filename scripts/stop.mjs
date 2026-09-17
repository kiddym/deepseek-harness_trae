import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const port = Number(process.env.PORT || 4310);
const pidFile = process.env.PID_FILE || path.join(tmpdir(), 'wp05-task-app', `app-${port}.pid`);
let pid = 0;
try { if (existsSync(pidFile)) pid = Number(readFileSync(pidFile, 'utf8')); }
catch (error) { console.error(`[ERROR] 读取 PID 文件失败：${error.message}`); process.exit(3); }
if (pid && !Number.isInteger(pid)) { console.error(`[ERROR] PID 文件内容非法：${pid}`); process.exit(3); }
if (pid) {
  try { process.kill(pid, 'SIGTERM'); }
  catch (error) { if (error.code !== 'ESRCH') { console.error(`[ERROR] 无法停止 pid ${pid}：${error.message}`); process.exit(3); } }
}
const end = Date.now() + 10000;
while (Date.now() < end) {
  let alive = false; try { if (pid) process.kill(pid, 0); alive = Boolean(pid); } catch {}
  let portBusy = false; try { execFileSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN', '-t'], { stdio: 'ignore' }); portBusy = true; } catch {}
  if (!alive && !portBusy) {
    try { if (existsSync(pidFile)) unlinkSync(pidFile); }
    catch (error) { console.error(`[ERROR] 删除 PID 文件失败：${error.message}`); process.exit(3); }
    console.log(`stopped: pid ${pid || 'none'}, port ${port} released`); process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
console.error(`[ERROR] 停止失败：pid ${pid || 'none'} 仍存活或端口 ${port} 仍被占用`);
process.exit(3);
