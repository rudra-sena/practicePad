'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, startPolling, STORY_STATUS } from './api';
import { Hint, Pill } from './ui';
import { P } from './prompts';

const THEMES = ['leadership', 'teamwork', 'impact', 'failure', 'initiative', 'personal'];
const blank = { title: '', situation: '', action: '', result: '', themes: [], role_context: '', period: '' };

function StoryForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...blank, ...initial });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (t) => setF({ ...f, themes: f.themes.includes(t) ? f.themes.filter((x) => x !== t) : [...f.themes, t] });
  return (
    <div className="stack small">
      <div><label>Title</label><input value={f.title} onChange={set('title')} /></div>
      <div className="grid2">
        <div><label>Role and company</label><input value={f.role_context} onChange={set('role_context')} /></div>
        <div><label>When</label><input value={f.period} onChange={set('period')} /></div>
      </div>
      <div><label>Situation</label><textarea rows={2} value={f.situation} onChange={set('situation')} /></div>
      <div><label>What you did</label><textarea rows={2} value={f.action} onChange={set('action')} /></div>
      <div><label>Result</label><textarea rows={2} value={f.result} onChange={set('result')} /></div>
      <div><label>Themes</label><div className="tabs">{THEMES.map((t) => <button type="button" key={t} className={`tab ${f.themes.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)}>{t}</button>)}</div></div>
      {err && <div className="error">{err}</div>}
      <div className="row">
        <button className="btn primary sm" onClick={async () => { try { await onSave(f); } catch (e) { setErr(e.message); } }}>Save</button>
        <button className="btn sm ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Stories() {
  const [d, setD] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const load = useCallback(() => api('/api/profile').then(setD).catch(() => {}), []);
  useEffect(() => { load(); return startPolling(() => { if (!editing) load(); }, 5000); }, [load, editing]);
  if (!d) return <p className="muted">Loading…</p>;

  const stories = d.stories.filter((s) => filter === 'all' || s.status === filter || (filter === 'todo' && s.status !== 'confirmed'));
  async function confirmStory(s) { await api(`/api/stories/${s.id}`, 'PATCH', { status: 'confirmed' }); load(); }
  async function remove(s) { if (!confirm(`Delete "${s.title}"?`)) return; await api(`/api/stories/${s.id}`, 'DELETE'); load(); }

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Story bank</h1>
          <p className="muted" style={{ margin: 0 }}>{d.stories.filter((s) => s.status === 'confirmed').length} of {d.stories.length} stories confirmed. Only confirmed stories are used to plan essays.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing('new')}>+ Add a story</button>
      </div>

      <div className="card">
        <div className="section-title">Theme coverage</div>
        <div className="coverage">
          {d.coverage.map((c) => <span key={c.theme} className={`pill ${c.count ? 'jade' : 'red'}`}>{c.theme} · {c.count}</span>)}
        </div>
        {d.coverage.some((c) => !c.count) && <Hint label="To fill the missing themes" prompt={P.fillGaps} />}
      </div>

      {editing === 'new' && (
        <div className="card"><h3>New story</h3><StoryForm onCancel={() => setEditing(null)} onSave={async (f) => { await api('/api/stories', 'POST', f); setEditing(null); load(); }} /></div>
      )}

      <div className="tabs">
        {[['all', 'All'], ['todo', 'To review'], ['confirmed', 'Confirmed']].map(([k, l]) => <button key={k} className={`tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
      </div>

      {d.stories.length === 0 && (
        <div className="card">
          <p className="muted">No stories yet. Claude can pull them out of your CV.</p>
          <Hint label="To build your story bank, attach your CV in Claude and" prompt={P.profileFromCv} />
        </div>
      )}

      <div className="grid2">
        {stories.map((s) => (
          <div key={s.id} className="card">
            {editing === s.id ? (
              <StoryForm initial={s} onCancel={() => setEditing(null)} onSave={async (f) => { await api(`/api/stories/${s.id}`, 'PATCH', f); setEditing(null); load(); }} />
            ) : (
              <div className="stack" style={{ gap: 0 }}>
                <div className="row between"><h3 style={{ margin: 0 }}>{s.title}</h3><Pill map={STORY_STATUS} value={s.status} /></div>
                <div className="small muted">{[s.role_context, s.period].filter(Boolean).join(' · ')}</div>
                {s.situation && <p className="small" style={{ margin: '8px 0 0' }}><b>Situation:</b> {s.situation}</p>}
                {s.action && <p className="small" style={{ margin: '4px 0 0' }}><b>What you did:</b> {s.action}</p>}
                {s.result && <p className="small" style={{ margin: '4px 0 0' }}><b>Result:</b> {s.result}</p>}
                <div className="row" style={{ gap: 6, marginTop: 8 }}>{s.themes.map((t) => <span key={t} className="pill">{t}</span>)}</div>
                {s.used_in.length > 0 && <div className="tiny muted" style={{ marginTop: 8 }}>Used in: {s.used_in.join(', ')}</div>}
                {s.status === 'needs_detail' && <Hint label="To add the missing detail" prompt={P.storyDetail(s.title)} />}
                <div className="row" style={{ marginTop: 10 }}>
                  {s.status !== 'confirmed' && <button className="btn outline sm" onClick={() => confirmStory(s)}>Confirm</button>}
                  <button className="btn sm" onClick={() => setEditing(s.id)}>Edit</button>
                  <button className="btn sm ghost danger" onClick={() => remove(s)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
