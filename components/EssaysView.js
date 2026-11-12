'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, peek, startPolling, ESSAY_STATUS } from './api';
import { Hint, Pill, DaysLeft } from './ui';
import { P } from './prompts';

export default function EssaysView() {
  const [groups, setGroups] = useState(() => peek('/api/essays')?.groups || null);
  const [open, setOpen] = useState({});
  const [filter, setFilter] = useState('all');
  const load = useCallback(() => api('/api/essays').then((d) => setGroups(d.groups)).catch(() => {}), []);
  useEffect(() => { load(); return startPolling(load, 5000); }, [load]);
  if (!groups) return <p className="muted">Loading…</p>;

  const all = groups.flatMap((g) => g.essays);
  const match = (e) => filter === 'all' || (filter === 'todo' ? e.status !== 'final' : e.status === 'final');

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Essays</h1>
          <p className="muted" style={{ margin: 0 }}>{all.filter((e) => e.status === 'final').length} of {all.length} final, across {groups.length} school{groups.length === 1 ? '' : 's'}</p>
        </div>
        <div className="tabs">
          {[['all', 'All'], ['todo', 'In progress'], ['final', 'Final']].map(([k, l]) => <button key={k} className={`tab ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
      </div>
      {groups.length === 0 && <div className="card"><p className="muted">Add schools first; their essays appear here.</p><Hint label="To add your schools" prompt={P.addSchools} /></div>}
      {groups.map(({ school, essays }) => {
        const shown = essays.filter(match);
        if (!shown.length) return null;
        return (
          <div key={school.id}>
            <div className="row between" style={{ margin: '18px 0 8px' }}>
              <div className="row"><h2 style={{ margin: 0 }}>{school.name}</h2><span className="small muted">{school.round}</span></div>
              <div className="row"><DaysLeft days={school.days_left} /><Link className="small" href={`/schools/${school.id}`}>Open application</Link></div>
            </div>
            <div className="stack" style={{ gap: 0 }}>
              {shown.map((e) => {
                const isOpen = open[e.id];
                const over = e.word_limit && e.word_count > e.word_limit;
                return (
                  <div key={e.id} className="card" style={{ marginTop: 10 }}>
                    <div className="row between expand" onClick={() => setOpen({ ...open, [e.id]: !isOpen })}>
                      <div className="row"><b>{e.title}</b><Pill map={ESSAY_STATUS} value={e.status} /></div>
                      <div className="row small muted">
                        <span className={over ? 'bad' : ''}>{e.word_count}{e.word_limit ? ` / ${e.word_limit}` : ''} words</span>
                        <span>{isOpen ? '▴' : '▾'}</span>
                      </div>
                    </div>
                    <p className="small muted" style={{ margin: '6px 0 0' }}>{e.prompt}</p>
                    {isOpen && (
                      <div>
                        {e.status === 'not_started' && <Hint label="To plan the structure of this essay" prompt={P.planEssay(school.name, e.title)} />}
                        {['drafting'].includes(e.status) && <Hint label="For Claude to review this draft" prompt={P.reviewEssay(school.name, e.title)} />}
                        {e.status === 'outlined' && <p className="small muted" style={{ marginTop: 10 }}>Your outline is ready. Open the editor and start writing.</p>}
                        {e.status === 'reviewed' && <p className="small muted" style={{ marginTop: 10 }}>Claude’s review is in. Revise, or mark the essay final.</p>}
                        <Link className="btn primary sm" style={{ marginTop: 12 }} href={`/essays/${e.id}`}>{e.status === 'final' ? 'View essay' : 'Open editor'}</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
