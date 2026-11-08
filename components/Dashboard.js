'use client';
import { useCallback, useEffect, useState } from 'react';
import AppNav from './AppNav';
import { api, startPolling, timeAgo } from './api';

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn small"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function ConnectClaude({ me, open, setOpen }) {
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>Connect your Claude</h3>
          <p className="small muted" style={{ margin: 0 }}>Do this once. After that, plans you ask Claude for appear here automatically.</p>
        </div>
        <button className="btn small" onClick={() => setOpen(!open)}>{open ? 'Hide steps' : 'Show steps'}</button>
      </div>
      {open && (
        <>
          <div>
            <label>Your private MCP link</label>
            <div className="row">
              <div className="code grow">{me?.mcp_url || 'Loading…'}</div>
              {me && <CopyButton text={me.mcp_url} label="Copy link" />}
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>Treat this like a password: anyone with it can edit your plans.</p>
          </div>
          <ol className="steps">
            <li>Open <b>claude.ai</b> (or the Claude desktop app) and go to <b>Settings</b>, then <b>Connectors</b>.</li>
            <li>Click <b>Add custom connector</b>. Name it <b>PracticePad</b> and paste the link above. Click <b>Add</b>.</li>
            <li>Start a new chat. In the tools menu (the + or sliders icon), make sure <b>PracticePad</b> is switched on.</li>
            <li>Ask: <i>&ldquo;Using PracticePad, create a 3-week guitar plan for Kabir to play his first song.&rdquo;</i> Allow the tool when Claude asks.</li>
          </ol>
          <div className="notice small">
            <b>Things to try with Claude:</b> &ldquo;Show my PracticePad plans and who is falling behind.&rdquo; · &ldquo;Ananya finished
            week 1 early, add two harder tasks to week 2.&rdquo; · &ldquo;Mark Meera&rsquo;s plan as paused.&rdquo;
          </div>
        </>
      )}
    </div>
  );
}

function NewPlanForm({ onCreated, onCancel }) {
  const [f, setF] = useState({ student_name: '', instrument: '', level: 'Beginner', goal: '', weeks: 2 });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const { plan } = await api('/api/plans', 'POST', f);
      onCreated(plan);
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h3 style={{ margin: 0 }}>New plan (by hand)</h3>
      <div className="grid3">
        <div><label>Student name</label><input value={f.student_name} onChange={set('student_name')} placeholder="Kabir" /></div>
        <div><label>Instrument</label><input value={f.instrument} onChange={set('instrument')} placeholder="Guitar" /></div>
        <div>
          <label>Level</label>
          <select value={f.level} onChange={set('level')}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
        </div>
      </div>
      <div className="grid2" style={{ gridTemplateColumns: '3fr 1fr' }}>
        <div><label>Goal</label><input value={f.goal} onChange={set('goal')} placeholder="Play his first song in 3 weeks" /></div>
        <div><label>Weeks</label><input type="number" min="1" max="52" value={f.weeks} onChange={set('weeks')} /></div>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="row">
        <button className="btn primary">Create and add tasks</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState(null);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [openConnect, setOpenConnect] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const { plans } = await api('/api/plans');
      setPlans(plans);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    api('/api/me').then(setMe).catch(() => {});
    load();
    return startPolling(load, 4000);
  }, [load]);

  useEffect(() => {
    if (plans && plans.length === 0) setOpenConnect(true);
  }, [plans]);

  const shown = (plans || []).filter((p) => filter === 'all' || p.status === filter);
  const active = (plans || []).filter((p) => p.status === 'active');
  const totals = (plans || []).reduce((a, p) => ({ done: a.done + p.done_tasks, total: a.total + p.total_tasks }), { done: 0, total: 0 });

  return (
    <>
      <AppNav name={me?.academy || me?.name} />
      <div className="wrap stack">
        <div className="row between">
          <div>
            <h1 style={{ margin: 0 }}>Practice plans</h1>
            <p className="muted" style={{ margin: 0 }}>
              {plans ? `${active.length} active · ${totals.done} of ${totals.total} tasks practised` : 'Loading…'}
              <span className="small"> · updates live</span>
            </p>
          </div>
          <button className="btn primary" onClick={() => setShowNew(true)}>+ New plan</button>
        </div>

        <ConnectClaude me={me} open={openConnect} setOpen={setOpenConnect} />

        {showNew && <NewPlanForm onCancel={() => setShowNew(false)} onCreated={(p) => (window.location.href = `/plans/${p.id}`)} />}

        {err && <div className="error">{err}</div>}

        <div className="row">
          {['all', 'active', 'paused', 'completed'].map((s) => (
            <button key={s} className={`btn small ${filter === s ? 'primary' : ''}`} onClick={() => setFilter(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {plans && shown.length === 0 && (
          <div className="card muted">No plans here yet. Ask your Claude to create one, or click <b>+ New plan</b>.</div>
        )}

        <div className="grid2">
          {shown.map((p) => {
            const pct = p.total_tasks ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
            return (
              <a key={p.id} className="card plan-card stack" href={`/plans/${p.id}`}>
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{p.student_name}</h3>
                  <div className="row" style={{ gap: 6 }}>
                    {p.created_via === 'claude' && <span className="pill brand">by Claude</span>}
                    <span className={`pill ${p.status === 'completed' ? 'ok' : ''}`}>{p.status}</span>
                  </div>
                </div>
                <div className="small muted">{p.instrument} · {p.weeks} week{p.weeks === 1 ? '' : 's'}</div>
                <div>{p.goal}</div>
                <div>
                  <div className="bar"><div style={{ width: `${pct}%` }} /></div>
                  <div className="row between small muted" style={{ marginTop: 6 }}>
                    <span>{p.done_tasks}/{p.total_tasks} tasks done</span>
                    <span>Last practice: {timeAgo(p.last_practice)}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}
