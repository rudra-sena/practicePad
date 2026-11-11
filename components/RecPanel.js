'use client';
import { useState } from 'react';
import { api, countWords, fmtDate, timeAgo, QUESTION_STATUS } from './api';
import { Hint, Pill, DaysLeft } from './ui';
import { OutlineEditor } from './Outline';
import { P } from './prompts';

function RecOutline({ outline }) {
  return (
    <div className="small">
      {outline.story_title && <p><b>Example to use:</b> {outline.story_title}{outline.story_reason ? <span className="muted"> · {outline.story_reason}</span> : null}</p>}
      {outline.angle && <p><b>Angle:</b> {outline.angle}</p>}
      {outline.sections.map((s, i) => (
        <div key={i} className="outline-sec">
          <div className="row between"><b>{s.heading}</b>{s.words ? <span className="faint tiny">~{s.words} words</span> : null}</div>
          {s.points?.length > 0 && <ul>{s.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
          {s.facts?.length > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>Use: {s.facts.join(' · ')}</div>}
        </div>
      ))}
      {outline.ending && <p style={{ marginTop: 10 }}><b>Ending:</b> {outline.ending}</p>}
    </div>
  );
}

function Question({ q, panel, endpoint, onChange, stories, school }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(q.latest?.body || '');
  const [dirty, setDirty] = useState(false);
  const [editOutline, setEditOutline] = useState(false);
  const [err, setErr] = useState('');
  const isApplicant = panel.role === 'applicant';

  async function act(body) {
    setErr('');
    try { await onChange(body); } catch (e) { setErr(e.message); }
  }
  const wc = countWords(text);
  const over = q.word_limit && wc > q.word_limit;

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="row between expand" onClick={() => setOpen(!open)}>
        <div className="row" style={{ flexWrap: 'nowrap' }}><Pill map={QUESTION_STATUS} value={q.status} /><b className="small">{q.question}</b></div>
        <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{q.word_limit ? `${q.word_limit} words` : ''} {open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="stack" style={{ marginTop: 12 }}>
          <div>
            <div className="section-title">Outline</div>
            {editOutline ? (
              <OutlineEditor outline={q.outline} stories={stories} ownerType="rec_question" ownerId={q.id} onSaved={() => { setEditOutline(false); onChange(null); }} onCancel={() => setEditOutline(false)} />
            ) : q.outline ? (
              <>
                <RecOutline outline={q.outline} />
                <div className="row" style={{ marginTop: 8 }}>
                  {!q.outline_final && <button className="btn outline sm" onClick={() => act({ action: 'update_question', question_id: q.id, outline_final: true })}>Mark outline final</button>}
                  {q.outline_final && !q.final && <span className="pill violet">Outline final</span>}
                  {isApplicant && !q.final && <button className="btn sm" onClick={() => setEditOutline(true)}>Edit outline</button>}
                  {q.outline_final && !q.final && !q.latest && <button className="btn sm ghost" onClick={() => act({ action: 'update_question', question_id: q.id, outline_final: false })}>Reopen outline</button>}
                </div>
              </>
            ) : isApplicant ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>No outline yet.</p>
                <Hint label="To plan this answer" prompt={P.planRec(panel.name, school.name)} />
                <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setEditOutline(true)}>Or write the outline yourself</button>
              </>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>{panel.applicant_name} hasn’t added an outline for this question yet.</p>
            )}
          </div>

          {q.outline_final && (
            <div>
              <div className="row between"><div className="section-title" style={{ margin: 0 }}>Draft</div>{q.latest && <span className="tiny faint">v{q.latest.version} by {q.latest.edited_by === 'applicant' ? panel.applicant_name : q.latest.edited_by}, {timeAgo(q.latest.created_at)}</span>}</div>
              <textarea rows={8} value={text} readOnly={q.final} onChange={(e) => { setText(e.target.value); setDirty(true); }} placeholder="Write the answer here, following the outline." style={{ marginTop: 6, lineHeight: 1.65 }} />
              <div className="row between" style={{ marginTop: 6 }}>
                <span className={`small ${over ? 'bad' : 'muted'}`}>{wc}{q.word_limit ? ` / ${q.word_limit}` : ''} words</span>
                <div className="row">
                  {!q.final && <button className="btn primary sm" disabled={!text.trim() || !dirty} onClick={async () => { await act({ action: 'save_draft', question_id: q.id, text }); setDirty(false); }}>Save draft</button>}
                  {!q.final && q.latest && <button className="btn outline sm" onClick={() => act({ action: 'update_question', question_id: q.id, final: true })}>Mark final</button>}
                  {q.final && <button className="btn sm" onClick={() => act({ action: 'update_question', question_id: q.id, final: false })}>Reopen</button>}
                </div>
              </div>
              {q.versions.length > 1 && <details className="small" style={{ marginTop: 8 }}><summary className="muted">Version history ({q.versions.length})</summary>{q.versions.map((v) => <div key={v.id} className="check-row"><span className="pill">v{v.version}</span><span className="muted">{v.edited_by === 'applicant' ? panel.applicant_name : v.edited_by} · {v.word_count} words · {timeAgo(v.created_at)}</span></div>)}</details>}
            </div>
          )}
          {err && <div className="error">{err}</div>}
          {isApplicant && <button className="btn sm ghost danger" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Delete this question?')) act({ action: 'update_question', question_id: q.id, delete: true }); }}>Delete question</button>}
        </div>
      )}
    </div>
  );
}

export default function RecPanel({ panel, endpoint, onPanel, stories = [] }) {
  const [form, setForm] = useState({ school_id: panel.schools[0]?.id || '', question: '', word_limit: '' });
  const [err, setErr] = useState('');
  const isRec = panel.role === 'recommender';

  async function post(body) {
    if (!body || body.action === 'noop') { const d = await api(endpoint); onPanel(d.panel); return; }
    const d = await api(endpoint, 'POST', body);
    onPanel(d.panel);
  }
  async function addQuestion(e) {
    e.preventDefault(); setErr('');
    try { await post({ action: 'add_question', ...form }); setForm({ ...form, question: '', word_limit: '' }); } catch (e2) { setErr(e2.message); }
  }

  return (
    <div className="stack">
      {panel.schools.map((s) => {
        const qs = panel.questions.filter((q) => q.school_id === s.id);
        return (
          <div key={s.id}>
            <div className="row between" style={{ marginTop: 6 }}>
              <div className="row"><h3 style={{ margin: 0 }}>{s.name}</h3><span className="small muted">{s.round} · due {fmtDate(s.deadline)}</span><DaysLeft days={s.days_left} /></div>
              <div className="row">
                {s.submitted_at ? <span className="pill jade">Submitted {timeAgo(s.submitted_at)}</span> : <span className="pill amber">Not submitted</span>}
                {isRec && <button className={`btn sm ${s.submitted_at ? '' : 'primary'}`} onClick={() => post({ action: 'submitted', school_id: s.id, submitted: !s.submitted_at })}>{s.submitted_at ? 'Undo submitted' : 'Mark submitted'}</button>}
              </div>
            </div>
            {qs.length === 0 && <p className="small muted" style={{ margin: '6px 0 0' }}>No questions added for {s.name} yet.</p>}
            {qs.map((q) => <Question key={q.id + ':' + (q.latest?.version || 0) + ':' + q.final} q={q} panel={panel} endpoint={endpoint} onChange={post} stories={stories} school={s} />)}
          </div>
        );
      })}
      {panel.schools.length > 0 && (
        <form className="card stack" onSubmit={addQuestion} style={{ background: '#FAFCFB' }}>
          <div className="section-title" style={{ margin: 0 }}>Add a question from the school’s form</div>
          <div className="grid3">
            <div><label>School</label><select value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>{panel.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label>Word limit</label><input value={form.word_limit} onChange={(e) => setForm({ ...form, word_limit: e.target.value })} placeholder="e.g. 300" /></div>
          </div>
          <div><label>Question</label><textarea rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Paste the question exactly as the school asks it" /></div>
          {err && <div className="error">{err}</div>}
          <button className="btn sm primary" style={{ alignSelf: 'flex-start' }}>Add question</button>
        </form>
      )}
    </div>
  );
}
