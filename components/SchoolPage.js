'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, peek, startPolling, fmtDate, timeAgo, ESSAY_STATUS, SCHOOL_STATUS } from './api';
import { Hint, Pill, DaysLeft } from './ui';
import { P } from './prompts';

const SEV = { must_fix: ['Must fix', 'red'], consider: ['Consider', 'amber'], looks_good: ['Looks good', 'jade'] };

function Findings({ check }) {
  return (
    <div>
      {check.summary && <p>{check.summary}</p>}
      {check.findings.map((f, i) => (
        <div key={i} className="check-row">
          <Pill map={SEV} value={f.severity} />
          <div>
            <div>{f.area ? <b>{f.area}: </b> : null}{f.finding}</div>
            {f.suggestion && <div className="small muted">{f.suggestion}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinalCheckModal({ school, openedAt, onClose, onDecision }) {
  const essays = school.essays;
  const notFinal = essays.filter((e) => e.status !== 'final');
  const overLimit = essays.filter((e) => e.word_limit && e.word_count > e.word_limit);
  const missing = school.checklist.filter((c) => !c.done);
  const recsPending = school.recommenders.filter((r) => !r.submitted_at);
  const fresh = school.latest_check && new Date(school.latest_check.created_at).getTime() >= openedAt - 5000 ? school.latest_check : null;

  return (
    <div className="modal-back">
      <div className="modal stack">
        <div>
          <h2>Before you mark {school.name} ready to submit</h2>
          <p className="muted small" style={{ margin: 0 }}>All essays for this school are final. Run a last check on this application as a whole.</p>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="section-title">Mastercraft checks</div>
          <div className="check-row"><span className={notFinal.length ? 'bad' : 'ok'}>{notFinal.length ? '✕' : '✓'}</span><span>{notFinal.length ? `${notFinal.length} essay(s) not final` : 'All essays marked final'}</span></div>
          <div className="check-row"><span className={overLimit.length ? 'bad' : 'ok'}>{overLimit.length ? '✕' : '✓'}</span><span>{overLimit.length ? `Over the word limit: ${overLimit.map((e) => e.title).join(', ')}` : 'Every essay within its word limit'}</span></div>
          <div className="check-row"><span className={missing.length ? 'bad' : 'ok'}>{missing.length ? '!' : '✓'}</span><span>{missing.length ? `Checklist items not ticked: ${missing.map((m) => m.label).join(', ')}` : 'Checklist complete'}</span></div>
          <div className="check-row"><span className={recsPending.length ? 'bad' : 'ok'}>{recsPending.length ? '!' : '✓'}</span><span>{school.recommenders.length === 0 ? 'No recommenders added for this school' : recsPending.length ? `Recommendation pending: ${recsPending.map((r) => r.name).join(', ')}` : 'All recommendations submitted'}</span></div>
          <div className="check-row"><span className="ok">i</span><span>{school.days_left === null ? 'No deadline set' : `${school.days_left} days to the deadline (${fmtDate(school.deadline)})`}</span></div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="section-title">Claude’s final check</div>
          {fresh ? (
            <Findings check={fresh} />
          ) : (
            <>
              <p className="small muted" style={{ margin: 0 }}>Claude checks this school’s application only: consistency across its essays and recommendations, facts against your profile, story repetition, and fit with what {school.name} values.</p>
              <Hint label="To run the final check" prompt={P.finalCheck(school.name)} />
              <p className="tiny faint" style={{ marginTop: 8 }}>Waiting for Claude’s findings… this window updates on its own.</p>
            </>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Go back and fix</button>
          {fresh ? (
            <button className="btn primary" onClick={() => onDecision('proceed')}>Proceed: mark ready to submit</button>
          ) : (
            <button className="btn ghost" onClick={() => onDecision('skip')}>Skip check and proceed</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchoolPage({ id }) {
  const [s, setS] = useState(() => peek(`/api/schools/${id}`)?.school || null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [newItem, setNewItem] = useState('');
  const [modalAt, setModalAt] = useState(null);
  const opened = useRef(false);

  const load = useCallback(() => api(`/api/schools/${id}`).then((d) => setS(d.school)).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); return startPolling(load, 3000); }, [load]);
  useEffect(() => {
    if (!opened.current && s && new URLSearchParams(window.location.search).get('check') === '1' && s.status === 'in_progress') {
      opened.current = true;
      setModalAt(Date.now());
      window.history.replaceState(null, '', `/schools/${id}`);
    }
  }, [s, id]);

  if (!s) return err ? <div className="error">{err}</div> : <p className="muted">Loading…</p>;

  const allFinal = s.essays.length > 0 && s.essays.every((e) => e.status === 'final');

  async function patch(body) {
    setErr('');
    try { await api(`/api/schools/${id}`, 'PATCH', body); await load(); } catch (e) { setErr(e.message); }
  }
  async function toggleItem(item) { await api(`/api/checklist/${item.id}`, 'PATCH', { done: !item.done }); load(); }
  async function removeItem(item) { await api(`/api/checklist/${item.id}`, 'PATCH', { delete: true }); load(); }
  async function addItem(e) { e.preventDefault(); if (!newItem.trim()) return; await api(`/api/schools/${id}/checklist`, 'POST', { label: newItem }); setNewItem(''); load(); }
  async function decide(decision) { await api(`/api/schools/${id}/decision`, 'POST', { decision }); setModalAt(null); load(); }
  async function removeSchool() {
    if (!confirm(`Delete ${s.name} and all its essays? This cannot be undone.`)) return;
    await api(`/api/schools/${id}`, 'DELETE');
    window.location.href = '/dashboard';
  }

  return (
    <div className="stack">
      <Link href="/dashboard" className="small">← Dashboard</Link>
      <div className="row between">
        <div>
          <div className="row"><h1 style={{ margin: 0 }}>{s.name}</h1><Pill map={SCHOOL_STATUS} value={s.status} />{s.verified ? <span className="pill jade">Verified</span> : <span className="pill amber">Unverified</span>}</div>
          <p className="muted" style={{ margin: '4px 0 0' }}>{[s.program, s.round, s.fee && `Fee ${s.fee}`].filter(Boolean).join(' · ')} · Deadline {fmtDate(s.deadline)} <DaysLeft days={s.days_left} /></p>
        </div>
        <div className="row">
          {!s.verified && <button className="btn outline sm" onClick={() => patch({ verified: true })}>Mark verified</button>}
          <button className="btn sm" onClick={() => { setForm({ program: s.program, round: s.round, deadline: s.deadline || '', fee: s.fee, notes: s.notes }); setEdit(!edit); }}>{edit ? 'Close' : 'Edit details'}</button>
          <select value={s.status} onChange={(e) => patch({ status: e.target.value })} style={{ width: 'auto' }}>
            {Object.entries(SCHOOL_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      {s.data_note && <div className="warn">{s.data_note}</div>}
      {err && <div className="error">{err}</div>}

      {edit && (
        <div className="card stack">
          <div className="grid3">
            <div><label>Programme</label><input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></div>
            <div><label>Round</label><input value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} /></div>
            <div><label>Deadline</label><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div><label>Application fee</label><input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
          </div>
          <div><label>School notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="row"><button className="btn primary sm" onClick={async () => { await patch(form); setEdit(false); }}>Save</button><button className="btn sm danger ghost" onClick={removeSchool}>Delete school</button></div>
          <Hint label="Or to update it through Claude" prompt={P.updateSchool(s.name)} />
        </div>
      )}

      {allFinal && s.status === 'in_progress' && !modalAt && (
        <div className="notice row between">
          <span>All {s.name} essays are final. Run the final check before you mark it ready to submit.</span>
          <button className="btn primary sm" onClick={() => setModalAt(Date.now())}>Run final check</button>
        </div>
      )}

      <div className="split">
        <div className="stack">
          <h2 style={{ margin: '6px 0 0' }}>Essays</h2>
          {s.essays.length === 0 && <div className="card small muted">No essay prompts saved for this school.</div>}
          {s.essays.map((e) => (
            <Link key={e.id} href={`/essays/${e.id}`} className="card link-card">
              <div className="row between"><div className="row"><b>{e.title}</b><Pill map={ESSAY_STATUS} value={e.status} /></div><span className={`small ${e.word_limit && e.word_count > e.word_limit ? 'bad' : 'muted'}`}>{e.word_count}{e.word_limit ? ` / ${e.word_limit}` : ''} words</span></div>
              <p className="small muted" style={{ margin: '6px 0 0' }}>{e.prompt}</p>
            </Link>
          ))}
          {s.latest_check && (
            <div className="card">
              <div className="row between"><h3 style={{ margin: 0 }}>Latest final check</h3><span className="small faint">{timeAgo(s.latest_check.created_at)}</span></div>
              <div style={{ marginTop: 8 }}><Findings check={s.latest_check} /></div>
            </div>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <h3>Checklist</h3>
            {s.checklist.map((c) => (
              <div key={c.id} className="row" style={{ padding: '4px 0', flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={c.done} onChange={() => toggleItem(c)} style={{ width: 18, height: 18, accentColor: 'var(--jade)' }} />
                <span className={`grow ${c.done ? 'muted' : ''}`} style={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</span>
                <button className="btn sm ghost danger" onClick={() => removeItem(c)} aria-label="Remove">✕</button>
              </div>
            ))}
            <form className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }} onSubmit={addItem}>
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item" />
              <button className="btn sm">Add</button>
            </form>
          </div>
          {s.notes && <div className="card small"><h3>School notes</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{s.notes}</p></div>}
          <div className="card small">
            <h3>Recommenders</h3>
            {s.recommenders.length === 0 ? <p className="muted" style={{ margin: 0 }}>None for this school yet. <Link href="/recommenders">Add one</Link></p> :
              s.recommenders.map((r) => <div key={r.id} className="row between" style={{ padding: '3px 0' }}><span>{r.name}</span>{r.submitted_at ? <span className="pill jade">Submitted</span> : <span className="pill amber">Pending</span>}</div>)}
          </div>
          {s.sources && <div className="card small"><h3>Sources</h3>{s.sources.split('\n').map((u) => <div key={u} style={{ wordBreak: 'break-all' }}><a href={u} target="_blank" rel="noreferrer">{u}</a></div>)}</div>}
        </div>
      </div>

      {modalAt && <FinalCheckModal school={s} openedAt={modalAt} onClose={() => setModalAt(null)} onDecision={decide} />}
    </div>
  );
}
