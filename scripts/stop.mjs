import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const port = Number(process.env.PORT || 4310); const pidFile = process.env.PID_FILE || path.join(tmpdir(), 'wp05-task-app', `app-${port}.pid`); let pid = existsSync(pidFile) ? Number(readFileSync(pidFile, 'utf8')) : 0;
if (pid) { try { process.kill(pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') { console.error(`stop failed: cannot signal pid ${pid}`); process.exit(1); } } }
const end = Date.now() + 10000; while (Date.now() < end) { let alive = false; try { process.kill(pid, 0); alive = true; } catch {} let portBusy = false; try { execFileSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN', '-t'], { stdio: 'ignore' }); portBusy = true; } catch {} if (!alive && !portBusy) { if (existsSync(pidFile)) unlinkSync(pidFile); console.log(`stopped: pid ${pid || 'none'}, port ${port} released`); process.exit(0); } await new Promise((resolve) => setTimeout(resolve, 250)); }
console.error(`stop failed: pid ${pid || 'none'} still alive or port ${port} still occupied`); process.exit(1);
