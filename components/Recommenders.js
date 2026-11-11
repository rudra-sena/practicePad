'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, startPolling } from './api';
import { CopyIcon } from './ui';
import RecPanel from './RecPanel';

function AddForm({ schools, onDone, onCancel }) {
  const [f, setF] = useState({ name: '', relationship: '', email: '', school_ids: [] });
  const [err, setErr] = useState('');
  const toggle = (id) => setF({ ...f, school_ids: f.school_ids.includes(id) ? f.school_ids.filter((x) => x !== id) : [...f.school_ids, id] });
  async function save() {
    setErr('');
    try { await api('/api/recommenders', 'POST', f); onDone(); } catch (e) { setErr(e.message); }
  }
  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Add a recommender</h3>
      <div className="grid3">
        <div><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label>Relationship</label><input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} placeholder="Current manager" /></div>
        <div><label>Email (optional)</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div>
        <label>Recommending you for</label>
        <div className="tabs">{schools.map((s) => <button type="button" key={s.id} className={`tab ${f.school_ids.includes(s.id) ? 'on' : ''}`} onClick={() => toggle(s.id)}>{s.name}</button>)}</div>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="row"><button className="btn primary sm" onClick={save}>Add recommender</button><button className="btn sm ghost" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

export default function Recommenders() {
  const [recs, setRecs] = useState(null);
  const [schools, setSchools] = useState([]);
  const [stories, setStories] = useState([]);
  const [open, setOpen] = useState({});
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState('');

  const load = useCallback(async () => {
    const [r, d, s] = await Promise.all([api('/api/recommenders'), api('/api/dashboard'), api('/api/stories')]);
    setRecs(r.recommenders); setSchools(d.schools); setStories(s.stories.filter((x) => x.status === 'confirmed'));
  }, []);
  useEffect(() => { setOrigin(window.location.origin); load().catch(() => {}); return startPolling(() => load().catch(() => {}), 5000); }, [load]);
  if (!recs) return <p className="muted">Loading…</p>;

  async function remove(r) { if (!confirm(`Remove ${r.name} and everything in their panel?`)) return; await api(`/api/recommenders/${r.id}`, 'DELETE'); load(); }

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Recommenders</h1>
          <p className="muted" style={{ margin: 0 }}>Each recommender gets a private link to their own panel: the questions, a shared outline and a place to draft. Only they can mark a recommendation submitted.</p>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>+ Add recommender</button>
      </div>
      {adding && <AddForm schools={schools} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
      {recs.length === 0 && !adding && <div className="card muted">No recommenders yet.</div>}
      {recs.map((r) => {
        const link = `${origin}/r/${r.link_token}`;
        const done = r.schools.filter((s) => s.submitted_at).length;
        return (
          <div key={r.id} className="card accent">
            <div className="row between expand" onClick={() => setOpen({ ...open, [r.id]: !open[r.id] })}>
              <div>
                <div className="row"><h3 style={{ margin: 0 }}>{r.name}</h3><span className="small muted">{r.relationship}</span></div>
                <div className="row small" style={{ marginTop: 4, gap: 6 }}>
                  {r.schools.map((s) => <span key={s.id} className={`pill ${s.submitted_at ? 'jade' : 'amber'}`}>{s.name}: {s.submitted_at ? 'submitted' : 'pending'}</span>)}
                </div>
              </div>
              <span className="small muted">{done}/{r.schools.length} submitted {open[r.id] ? '▴' : '▾'}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="hint-label">Share this private link with {r.name.split(' ')[0]} (by email or WhatsApp):</div>
              <div className="hint-box"><code>{link}</code><CopyIcon text={link} /></div>
            </div>
            {open[r.id] && (
              <div style={{ marginTop: 16 }}>
                <RecPanel panel={r} endpoint={`/api/rec/${r.id}`} onPanel={() => load()} stories={stories} />
                <button className="btn sm ghost danger" style={{ marginTop: 12 }} onClick={() => remove(r)}>Remove recommender</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
