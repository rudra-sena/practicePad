'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, startPolling } from './api';

export default function StudentView({ token }) {
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const { plan } = await api(`/api/share/${token}`);
      setPlan(plan);
    } catch (e) {
      setErr(e.message);
    }
  }, [token]);

  useEffect(() => {
    load();
    return startPolling(load, 5000);
  }, [load]);

  async function toggle(task) {
    setPlan((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) }));
    try {
      await api(`/api/share/${token}/tasks/${task.id}`, 'POST', { done: !task.done });
    } catch (e) {
      setErr(e.message);
    }
    load();
  }

  if (err && !plan) return <div className="wrap narrow"><div className="error" style={{ marginTop: 40 }}>{err}</div></div>;
  if (!plan) return <div className="wrap narrow"><p className="muted" style={{ marginTop: 40 }}>Loading your plan…</p></div>;

  const done = plan.tasks.filter((t) => t.done).length;
  const pct = plan.tasks.length ? Math.round((done / plan.tasks.length) * 100) : 0;
  const weeks = [...new Set(plan.tasks.map((t) => t.week))].sort((a, b) => a - b);
  const firstOpenWeek = weeks.find((w) => plan.tasks.some((t) => t.week === w && !t.done));

  return (
    <div className="wrap narrow stack">
      <div className="small muted" style={{ marginTop: 10 }}>{plan.academy || plan.teacher_name} · PracticePad</div>
      <div>
        <h1 style={{ marginBottom: 4 }}>Hi {plan.student_name} 👋</h1>
        <p style={{ fontSize: 17 }}>{plan.goal}</p>
        <span className="pill">{plan.instrument}</span> <span className="pill">{plan.level}</span>{' '}
        {plan.status !== 'active' && <span className="pill brand">{plan.status}</span>}
      </div>
      <div className="card">
        <div className="row between" style={{ marginBottom: 8 }}>
          <b>{pct === 100 ? 'Plan complete! 🎉' : 'Your progress'}</b>
          <span className="small muted">{done} of {plan.tasks.length} tasks</span>
        </div>
        <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      </div>
      {weeks.map((w) => {
        const tasks = plan.tasks.filter((t) => t.week === w);
        return (
          <div className="card" key={w}>
            <div className="week-head">
              <h3 style={{ margin: 0 }}>Week {w}</h3>
              {w === firstOpenWeek && <span className="pill brand">This week</span>}
              {tasks.every((t) => t.done) && <span className="pill ok">Done</span>}
            </div>
            {tasks.map((t) => (
              <label key={t.id} className={`task ${t.done ? 'done' : ''}`} style={{ cursor: 'pointer', fontWeight: 'normal', color: 'inherit', fontSize: 15, margin: 0 }}>
                <input type="checkbox" className="check" checked={!!t.done} onChange={() => toggle(t)} />
                <div>
                  <div className="task-title" style={{ fontWeight: 600 }}>{t.title}</div>
                  {t.details && <div className="muted small">{t.details}</div>}
                  <div className="small muted">{t.minutes} min</div>
                </div>
              </label>
            ))}
          </div>
        );
      })}
      {err && <div className="error">{err}</div>}
      <p className="small muted" style={{ textAlign: 'center' }}>Tick a task when you finish practising it. Your teacher sees your progress.</p>
    </div>
  );
}
