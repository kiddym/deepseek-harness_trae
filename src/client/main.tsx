import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Task = { id: number; title: string; description: string; completed: boolean; createdAt: string; updatedAt: string };
const api = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, { ...options, headers: { ...(options?.body ? { 'content-type': 'application/json' } : {}), ...(options?.headers || {}) } });
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error?.message || `请求失败（${response.status}）`); }
    return response.status === 204 ? null : response.json();
  } catch (error) { if (error instanceof TypeError) throw new Error('网络请求失败，请重试'); throw error; }
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [editing, setEditing] = useState<number | null>(null); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [draft, setDraft] = useState({ title: '', description: '' }); const [confirming, setConfirming] = useState<number | null>(null);
  const load = async () => { setLoading(true); try { setTasks((await api('/api/tasks')).tasks); setMessage(''); } catch (e) { setMessage((e as Error).message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const create = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) { setMessage('标题不能为空'); return; } setBusy(true); try { const result = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, description }) }); setTasks((old) => [result.task, ...old]); setTitle(''); setDescription(''); setMessage(''); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const update = async (id: number, data: Partial<Task>) => { setBusy(true); try { const result = await api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); setTasks((old) => old.map((task) => task.id === id ? result.task : task)); setEditing(null); setMessage(''); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const remove = async (id: number) => { setBusy(true); try { await api(`/api/tasks/${id}`, { method: 'DELETE' }); setTasks((old) => old.filter((task) => task.id !== id)); setConfirming(null); setMessage(''); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  return <main><header><h1>任务清单</h1><p>把要做的事记下来，逐项完成。</p></header><form className="new-task" onSubmit={create}><input disabled={busy} aria-label="任务标题" placeholder="任务标题（必填）" value={title} onChange={(e) => setTitle(e.target.value)} /><textarea disabled={busy} aria-label="任务描述" placeholder="描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} /><button disabled={busy} type="submit">{busy ? '处理中…' : '新增任务'}</button></form>{message && <p className="message" role="alert">{message} <button disabled={busy} className="secondary" onClick={() => void load()}>重试</button></p>}{loading ? <p>加载中…</p> : tasks.length === 0 ? <p className="empty">还没有任务，先创建一个吧。</p> : <section aria-label="任务列表">{tasks.map((task) => <article className={task.completed ? 'task done' : 'task'} key={task.id}>{editing === task.id ? <><input disabled={busy} aria-label="编辑标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><textarea disabled={busy} aria-label="编辑描述" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><button disabled={busy} onClick={() => void update(task.id, draft)}>保存</button><button disabled={busy} className="secondary" onClick={() => setEditing(null)}>取消</button></> : <><label><input disabled={busy} type="checkbox" checked={task.completed} onChange={(e) => void update(task.id, { completed: e.target.checked })} /> <strong>{task.title}</strong></label>{task.description && <p>{task.description}</p>}<div className="actions"><button disabled={busy} onClick={() => { setEditing(task.id); setDraft({ title: task.title, description: task.description }); }}>编辑</button>{confirming === task.id ? <><button disabled={busy} className="danger" onClick={() => void remove(task.id)}>确认删除</button><button disabled={busy} className="secondary" onClick={() => setConfirming(null)}>取消</button></> : <button disabled={busy} className="danger" onClick={() => setConfirming(task.id)}>删除</button>}</div></>}</article>)}</section>}</main>;
}
createRoot(document.getElementById('root')!).render(<App />);
