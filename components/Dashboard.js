'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, startPolling, fmtDate, SCHOOL_STATUS } from './api';
import { Hint, Pill, DaysLeft } from './ui';
import { P } from './prompts';

const NEXT = {
  connect: { label: 'Connect your Claude to start', href: '/connect' },
  schools: { hint: ['To add your schools', P.addSchools] },
  profile: { hint: ['To build your profile, attach your CV in Claude and', P.profileFromCv] },
  confirm: { label: 'Review and confirm your stories in the story bank', href: '/stories' },
  essay: { label: 'Open an essay and plan its structure with Claude', href: '/essays' },
};

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/dashboard').then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); return startPolling(load, 4000); }, [load]);
  if (!d) return err ? <div className="error">{err}</div> : <p className="muted">Loading…</p>;

  const next = d.steps.find((s) => !s.done);
  const n = next && NEXT[next.key];
  const doneCount = d.steps.filter((s) => s.done).length;

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Hi {d.user.name.split(' ')[0]}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {d.schools.length} school{d.schools.length === 1 ? '' : 's'} · {d.essays.final} of {d.essays.total} essays final · profile {d.profile_completeness}% complete
          </p>
        </div>
        <span className={`pill ${d.user.claude_connected_at ? 'jade' : 'amber'}`}>{d.user.claude_connected_at ? 'Claude connected' : 'Claude not connected'}</span>
      </div>

      {next && (
        <div className="card accent">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Get started</h3>
            <span className="small muted">{doneCount} of {d.steps.length} done</span>
          </div>
          <ul className="steps-list" style={{ marginTop: 8 }}>
            {d.steps.map((s, i) => (
              <li key={s.key}>
                <span className={`dot ${s.done ? 'done' : ''}`}>{s.done ? '✓' : ''}</span>
                <span className={s.done ? 'muted' : ''} style={{ fontWeight: s.key === next.key ? 650 : 400 }}>{i + 1}. {s.label}</span>
              </li>
            ))}
          </ul>
          {n?.hint && <Hint label={n.hint[0]} prompt={n.hint[1]} />}
          {n?.href && <a className="btn primary sm" style={{ marginTop: 12 }} href={n.href}>{n.label}</a>}
        </div>
      )}

      {d.flags.length > 0 && (
        <div className="card">
          <div className="section-title">Needs attention</div>
          {d.flags.map((f, i) => (
            <div key={i} className="row" style={{ padding: '4px 0' }}>
              <span className={`pill ${f.level === 'high' ? 'red' : 'amber'}`}>{f.level === 'high' ? 'Urgent' : 'Soon'}</span>
              <a href={f.href}>{f.text}</a>
            </div>
          ))}
        </div>
      )}

      <div className="row between" style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0 }}>Your schools</h2>
      </div>
      {d.schools.length === 0 ? (
        <div className="card">
          <p className="muted">No schools yet.</p>
          <Hint label="To add your schools" prompt={P.addSchools} />
        </div>
      ) : (
        <div className="grid3">
          {d.schools.map((s) => (
            <a key={s.id} href={`/schools/${s.id}`} className="card accent link-card stack" style={{ gap: 0 }}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{s.name}</h3>
                <DaysLeft days={s.days_left} />
              </div>
              <div className="small muted">{[s.program, s.round].filter(Boolean).join(' · ')} · {fmtDate(s.deadline)}</div>
              <div className="row" style={{ gap: 6 }}>
                <Pill map={SCHOOL_STATUS} value={s.status} />
                {!s.verified && <span className="pill amber">Unverified</span>}
              </div>
              <div>
                <div className="row between small"><span>Essays final</span><span>{s.essays_final} / {s.essays_total}</span></div>
                <div className="bar"><div style={{ width: `${s.essays_total ? (s.essays_final / s.essays_total) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="row between small"><span>Checklist</span><span>{s.checklist_done} / {s.checklist_total}</span></div>
                <div className="bar"><div style={{ width: `${s.checklist_total ? (s.checklist_done / s.checklist_total) * 100 : 0}%` }} /></div>
              </div>
              {s.recs_total > 0 && <div className="small muted">Recommendations submitted: {s.recs_submitted} / {s.recs_total}</div>}
            </a>
          ))}
        </div>
      )}
      {d.schools.length > 0 && <Hint label="To add another school" prompt={P.addSchools} />}
    </div>
  );
}
