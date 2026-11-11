'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, startPolling } from './api';
import { Hint } from './ui';
import { P } from './prompts';

const FIELDS = [
  ['current_role', 'Current role'], ['company', 'Company'], ['years_experience', 'Years of experience'], ['industry', 'Industry'],
  ['education', 'Education'], ['test_scores', 'Test scores'], ['target_degree', 'Target degree'], ['target_intake', 'Target intake'],
];
const LONG = [['roles_timeline', 'Roles timeline (one role per line)'], ['skills', 'Skills'], ['achievements', 'Achievements and awards'], ['activities', 'Activities outside work']];

export default function Profile() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [msg, setMsg] = useState('');
  const dirty = useRef(false);

  const load = useCallback(async () => {
    const data = await api('/api/profile');
    setD(data);
    if (!dirty.current) {
      setForm(Object.fromEntries([...FIELDS, ...LONG].map(([k]) => [k, data.profile[k] || ''])));
      setAnswers(Object.fromEntries(data.gap_questions.map((g) => [g.key, g.answer])));
    }
  }, []);
  useEffect(() => { load().catch(() => {}); return startPolling(() => load().catch(() => {}), 5000); }, [load]);
  if (!d || !form) return <p className="muted">Loading…</p>;

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 1800); }
  const set = (k) => (e) => { dirty.current = true; setForm({ ...form, [k]: e.target.value }); };
  async function saveProfile() { await api('/api/profile', 'PUT', form); dirty.current = false; flash('Profile saved'); load(); }
  async function saveAnswer(g) {
    if ((answers[g.key] || '') === (g.answer || '')) return;
    await api('/api/answers', 'PUT', { question_key: g.key, question: g.question, answer: answers[g.key] || '' });
    dirty.current = false; flash('Answer saved'); load();
  }
  async function delAnswer(id) { await api(`/api/answers?id=${id}`, 'DELETE'); load(); }

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Profile</h1>
          <p className="muted" style={{ margin: 0 }}>The facts about you, kept neutral. Matching stories to essays happens later, essay by essay.</p>
        </div>
        <div style={{ minWidth: 200 }}>
          <div className="row between small"><span>Profile complete</span><b>{d.completeness}%</b></div>
          <div className="bar"><div style={{ width: `${d.completeness}%` }} /></div>
        </div>
      </div>
      {msg && <div className="notice">{msg}</div>}

      <div className="card">
        <h3>From your CV</h3>
        <Hint label="To fill this from your CV, attach your CV in Claude and" prompt={P.profileFromCv} />
        <div className="grid2" style={{ marginTop: 14 }}>
          {FIELDS.map(([k, l]) => <div key={k}><label>{l}</label><input value={form[k]} onChange={set(k)} /></div>)}
        </div>
        <div className="grid2" style={{ marginTop: 14 }}>
          {LONG.map(([k, l]) => <div key={k}><label>{l}</label><textarea rows={3} value={form[k]} onChange={set(k)} /></div>)}
        </div>
        <button className="btn primary sm" style={{ marginTop: 12 }} onClick={saveProfile}>Save profile</button>
      </div>

      <div className="card">
        <h3>What your CV doesn’t say</h3>
        <p className="small muted">A line or two each is enough. Claude uses these to plan your essays; you don’t need to write paragraphs here.</p>
        <Hint label="To have Claude ask you these in chat instead" prompt={P.fillGaps} />
        <div className="stack" style={{ marginTop: 14 }}>
          {d.gap_questions.map((g) => (
            <div key={g.key}>
              <label>{g.question}{g.source === 'chat' && <span className="faint" style={{ fontWeight: 400 }}> · from your Claude chat</span>}</label>
              <textarea rows={2} maxLength={300} value={answers[g.key] || ''} onChange={(e) => { dirty.current = true; setAnswers({ ...answers, [g.key]: e.target.value }); }} onBlur={() => saveAnswer(g)} placeholder="A short answer" />
            </div>
          ))}
        </div>
      </div>

      {d.other_answers.length > 0 && (
        <div className="card">
          <h3>Other answers from your Claude chats</h3>
          {d.other_answers.map((a) => (
            <div key={a.id} className="check-row">
              <div className="grow"><div className="small muted">{a.question}</div><div>{a.answer}</div></div>
              <button className="btn sm ghost danger" onClick={() => delAnswer(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
