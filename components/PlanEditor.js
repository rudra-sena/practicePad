'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppNav from './AppNav';
import { api, startPolling, timeAgo } from './api';

function TaskRow({ task, onChanged, onError }) {
  const [t, setT] = useState(task);
  const [saved, setSaved] = useState(false);

  async function save(patch) {
    try {
      await api(`/api/tasks/${task.id}`, 'PATCH', patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      onChanged();
    } catch (e) {
      onError(e.message);
    }
  }
  function blurSave(field) {
    if (String(t[field]) !== String(task[field])) save({ [field]: t[field] });
  }
  async function remove() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api(`/api/tasks/${task.id}`, 'DELETE');
      onChanged();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className={`task ${task.done ? 'done' : ''}`}>
      <input type="checkbox" className="check" checked={!!task.done} onChange={(e) => save({ done: e.target.checked })} title="Done" />
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="task-title grow" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} onBlur={() => blurSave('title')} />
          <input type="number" min="1" max="240" value={t.minutes} onChange={(e) => setT({ ...t, minutes: e.target.value })} onBlur={() => blurSave('minutes')} style={{ width: 70 }} title="Minutes" />
          <span className="small muted">min</span>
          <select value={t.week} onChange={(e) => { setT({ ...t, week: e.target.value }); save({ week: e.target.value }); }} style={{ width: 104 }} title="Move to week">
            {Array.from({ length: Math.max(task.week, 12) }, (_, i) => i + 1).map((w) => <option key={w} value={w}>Week {w}</option>)}
          </select>
          <button className="btn small ghost danger" onClick={remove} title="Delete task">✕</button>
        </div>
        <textarea rows={1} placeholder="How to practise it (optional)" value={t.details || ''} onChange={(e) => setT({ ...t, details: e.target.value })} onBlur={() => blurSave('details')} />
        <div className="small muted">
          {task.done ? `Done ${timeAgo(task.done_at)}` : 'Not done yet'} {saved && <span className="saved"> · Saved</span>}
        </div>
      </div>
    </div>
  );
}

function AddTask({ planId, week, onAdded, onError }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(10);
  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api(`/api/plans/${planId}/tasks`, 'POST', { tasks: [{ week, title, minutes }] });
      setTitle('');
      onAdded();
    } catch (e) {
      onError(e.message);
    }
  }
  return (
    <form className="row" onSubmit={add} style={{ flexWrap: 'nowrap', marginTop: 8 }}>
      <input className="grow" placeholder={`Add a task to week ${week}`} value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="number" min="1" max="240" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: 70 }} />
      <span className="small muted">min</span>
      <button className="btn small">Add</button>
    </form>
  );
}

const FIELDS = ['student_name', 'instrument', 'level', 'goal', 'weeks', 'notes', 'status'];

export default function PlanEditor({ planId, teacherName }) {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const dirty = useRef(false);

  const load = useCallback(async () => {
    try {
      const { plan } = await api(`/api/plans/${planId}`);
      setPlan(plan);
      if (!dirty.current) setForm(Object.fromEntries(FIELDS.map((f) => [f, plan[f] ?? ''])));
    } catch (e) {
      setErr(e.message);
    }
  }, [planId]);

  useEffect(() => {
    load();
    return startPolling(load, 4000);
  }, [load]);

  const set = (k) => (e) => { dirty.current = true; setForm({ ...form, [k]: e.target.value }); };

  async function saveDetails(e) {
    e?.preventDefault();
    setErr('');
    try {
      const { plan } = await api(`/api/plans/${planId}`, 'PATCH', form);
      dirty.current = false;
      setPlan(plan);
      setForm(Object.fromEntries(FIELDS.map((f) => [f, plan[f] ?? ''])));
      flash('Plan details saved');
    } catch (e) {
      setErr(e.message);
    }
  }

  function flash(m) {
    setMsg(m);
    setTimeout(() => setMsg(''), 1800);
  }

  async function addWeek() {
    try {
      await api(`/api/plans/${planId}`, 'PATCH', { weeks: (plan.weeks || 1) + 1 });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function removePlan() {
    if (!confirm(`Delete ${plan.student_name}'s plan and all its tasks? This cannot be undone.`)) return;
    await api(`/api/plans/${planId}`, 'DELETE');
    window.location.href = '/dashboard';
  }

  if (!plan || !form) {
    return (<><AppNav name={teacherName} /><div className="wrap">{err ? <div className="error">{err}</div> : <p className="muted">Loading…</p>}</div></>);
  }

  const studentLink = typeof window !== 'undefined' ? `${window.location.origin}/p/${plan.share_token}` : '';
  const weeks = Array.from({ length: Math.max(plan.weeks, ...plan.tasks.map((t) => t.week), 1) }, (_, i) => i + 1);

  return (
    <>
      <AppNav name={teacherName} />
      <div className="wrap stack">
        <a href="/dashboard" className="small">← All plans</a>
        <div className="row between">
          <div>
            <h1 style={{ margin: 0 }}>{plan.student_name}&rsquo;s plan</h1>
            <p className="muted" style={{ margin: 0 }}>
              {plan.progress.done}/{plan.progress.total} tasks done · {plan.created_via === 'claude' ? 'Created by Claude' : 'Created in app'} · updated {timeAgo(plan.updated_at)}
            </p>
          </div>
          <div className="row">
            <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(studentLink); } catch {} flash('Student link copied'); }}>Copy student link</button>
            <a className="btn" href={`/p/${plan.share_token}`} target="_blank">Open student view</a>
          </div>
        </div>
        <div className="bar"><div style={{ width: `${plan.progress.percent}%` }} /></div>
        {msg && <div className="notice small">{msg}</div>}
        {err && <div className="error">{err}</div>}

        <form className="card stack" onSubmit={saveDetails}>
          <h3 style={{ margin: 0 }}>Plan details</h3>
          <div className="grid3">
            <div><label>Student</label><input value={form.student_name} onChange={set('student_name')} /></div>
            <div><label>Instrument</label><input value={form.instrument} onChange={set('instrument')} /></div>
            <div><label>Level</label><input value={form.level} onChange={set('level')} /></div>
          </div>
          <div><label>Goal</label><input value={form.goal} onChange={set('goal')} /></div>
          <div className="grid2" style={{ gridTemplateColumns: '3fr 1fr 1fr' }}>
            <div><label>Teacher notes</label><input value={form.notes} onChange={set('notes')} placeholder="Anything to remember about this student" /></div>
            <div><label>Weeks</label><input type="number" min="1" max="52" value={form.weeks} onChange={set('weeks')} /></div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={set('status')}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select>
            </div>
          </div>
          <div className="row">
            <button className="btn primary">Save details</button>
            {dirty.current && <span className="small muted">Unsaved changes</span>}
          </div>
        </form>

        {weeks.map((w) => {
          const tasks = plan.tasks.filter((t) => t.week === w);
          const mins = tasks.reduce((a, t) => a + (t.minutes || 0), 0);
          return (
            <div key={w} className="card">
              <div className="week-head">
                <h3 style={{ margin: 0 }}>Week {w}</h3>
                <span className="small muted">{tasks.filter((t) => t.done).length}/{tasks.length} done · {mins} min per session</span>
              </div>
              {tasks.length === 0 && <p className="small muted">No tasks yet.</p>}
              {tasks.map((t) => (
                <TaskRow key={`${t.id}:${t.title}:${t.details}:${t.minutes}:${t.week}:${t.done}`} task={t} onChanged={load} onError={setErr} />
              ))}
              <AddTask planId={planId} week={w} onAdded={load} onError={setErr} />
            </div>
          );
        })}

        <div className="row between">
          <button className="btn" onClick={addWeek}>+ Add week</button>
          <button className="btn danger" onClick={removePlan}>Delete plan</button>
        </div>
      </div>
    </>
  );
}
