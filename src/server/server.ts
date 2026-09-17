import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Task = { id: number; title: string; description: string; completed: boolean; createdAt: string; updatedAt: string };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'app.db'));
db.exec(`CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at DESC, id DESC);`);

const toTask = (row: Record<string, unknown>): Task => ({ id: Number(row.id), title: String(row.title), description: String(row.description), completed: Number(row.completed) === 1, createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
const listTasks = () => (db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC, id DESC').all() as Record<string, unknown>[]).map(toTask);
const error = (reply: { code: (n: number) => { send: (v: unknown) => unknown } }, status: number, message: string) => reply.code(status).send({ error: { code: 'INVALID_TASK', message } });

const app = Fastify({ logger: false });
app.get('/api/health', async () => { try { db.prepare('SELECT 1').get(); return { ok: true, db: 'ok', schemaVersion: 1 }; } catch { return { ok: false, db: 'error', schemaVersion: 1 }; } });
app.get('/api/tasks', async () => ({ tasks: listTasks() }));
app.post<{ Body: { title?: string; description?: string } }>('/api/tasks', async (request, reply) => { const title = request.body?.title?.trim() || ''; if (!title) return error(reply, 400, '标题不能为空'); const now = new Date().toISOString(); const result = db.prepare('INSERT INTO tasks (title, description, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)').run(title, request.body?.description || '', now, now); const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid)) as Record<string, unknown>; return reply.code(201).send({ task: toTask(row) }); });
app.patch<{ Params: { id: string }; Body: { title?: string; description?: string; completed?: boolean } }>('/api/tasks/:id', async (request, reply) => { const id = Number(request.params.id); const old = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined; if (!old) return error(reply, 404, '任务不存在'); const title = request.body?.title !== undefined ? request.body.title.trim() : String(old.title); if (!title) return error(reply, 400, '标题不能为空'); const description = request.body?.description !== undefined ? request.body.description : String(old.description); const completed = request.body?.completed !== undefined ? (request.body.completed ? 1 : 0) : Number(old.completed); const now = new Date().toISOString(); db.prepare('UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = ? WHERE id = ?').run(title, description, completed, now, id); return { task: toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>) }; });
app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => { const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(request.params.id)); if (result.changes === 0) return error(reply, 404, '任务不存在'); return reply.code(204).send(); });

if (process.env.NODE_ENV !== 'test' || true) {
  app.register(fastifyStatic, { root: path.join(root, 'dist'), prefix: '/' });
  app.setNotFoundHandler((request, reply) => request.raw.url?.startsWith('/api/') ? reply.code(404).send({ error: { code: 'NOT_FOUND', message: '接口不存在' } }) : reply.sendFile('index.html'));
}
const port = Number(process.env.PORT || 4310);
writeFileSync(path.resolve(process.env.PID_FILE || path.join(root, '.task-app.pid')), String(process.pid));
const cleanup = () => { try { unlinkSync(path.resolve(process.env.PID_FILE || path.join(root, '.task-app.pid'))); } catch {} };
process.once('SIGTERM', async () => { await app.close(); cleanup(); process.exit(0); }); process.once('SIGINT', async () => { await app.close(); cleanup(); process.exit(0); }); process.once('exit', cleanup);
app.listen({ port, host: '127.0.0.1' }).catch((err) => { console.error(err); process.exit(1); });
