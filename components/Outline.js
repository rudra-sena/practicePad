'use client';
import { useState } from 'react';
import { api } from './api';

// Read-only view of an outline (essay or recommendation question).
export function OutlineView({ outline, stories }) {
  if (!outline) return null;
  const story = stories?.find((s) => s.id === outline.story_id);
  return (
    <div className="small">
      {story && <p><b>Story:</b> {story.title}{outline.story_reason ? <span className="muted"> · {outline.story_reason}</span> : null}</p>}
      {outline.angle && <p><b>Angle:</b> {outline.angle}</p>}
      {outline.sections.map((s, i) => (
        <div key={i} className="outline-sec">
          <div className="row between"><b>{s.heading}</b>{s.words ? <span className="faint tiny">~{s.words} words</span> : null}</div>
          {s.points?.length > 0 && <ul>{s.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
          {s.facts?.length > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>Use: {s.facts.join(' · ')}</div>}
        </div>
      ))}
      {outline.ending && <p style={{ marginTop: 10 }}><b>Ending:</b> {outline.ending}</p>}
      <p className="tiny faint" style={{ marginTop: 8 }}>Outline v{outline.version} · {outline.edited_by === 'claude' ? 'planned with Claude' : 'edited by you'}</p>
    </div>
  );
}

const lines = (a) => (a || []).join('\n');
const split = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

// Editable outline form; saving creates a new outline version.
export function OutlineEditor({ outline, stories, ownerType, ownerId, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    story_id: outline?.story_id || '',
    story_reason: outline?.story_reason || '',
    angle: outline?.angle || '',
    ending: outline?.ending || '',
    sections: (outline?.sections?.length ? outline.sections : [{ heading: 'Opening', points: [], facts: [], words: '' }]).map((s) => ({ heading: s.heading, points: lines(s.points), facts: lines(s.facts), words: s.words || '' })),
  }));
  const [err, setErr] = useState('');
  const setSec = (i, k, v) => setF({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });

  async function save() {
    setErr('');
    try {
      await api('/api/outlines', 'POST', {
        owner_type: ownerType, owner_id: ownerId, story_id: f.story_id || null, story_reason: f.story_reason, angle: f.angle, ending: f.ending,
        sections: f.sections.map((s) => ({ heading: s.heading, points: split(s.points), facts: split(s.facts), words: s.words })),
      });
      onSaved();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="stack small">
      <div>
        <label>Story</label>
        <select value={f.story_id} onChange={(e) => setF({ ...f, story_id: e.target.value })}>
          <option value="">No story selected</option>
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <div><label>Angle</label><input value={f.angle} onChange={(e) => setF({ ...f, angle: e.target.value })} /></div>
      {f.sections.map((s, i) => (
        <div key={i} className="outline-sec stack" style={{ gap: 6 }}>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input value={s.heading} onChange={(e) => setSec(i, 'heading', e.target.value)} placeholder="Section heading" />
            <input value={s.words} onChange={(e) => setSec(i, 'words', e.target.value)} placeholder="Words" style={{ width: 80 }} />
            <button className="btn sm ghost danger" onClick={() => setF({ ...f, sections: f.sections.filter((_, j) => j !== i) })}>✕</button>
          </div>
          <textarea rows={3} value={s.points} onChange={(e) => setSec(i, 'points', e.target.value)} placeholder="Points, one per line" />
          <textarea rows={2} value={s.facts} onChange={(e) => setSec(i, 'facts', e.target.value)} placeholder="Facts to use, one per line" />
        </div>
      ))}
      <button className="btn sm" onClick={() => setF({ ...f, sections: [...f.sections, { heading: '', points: '', facts: '', words: '' }] })}>+ Add section</button>
      <div><label>Ending</label><input value={f.ending} onChange={(e) => setF({ ...f, ending: e.target.value })} /></div>
      {err && <div className="error">{err}</div>}
      <div className="row"><button className="btn primary sm" onClick={save}>Save outline</button><button className="btn sm ghost" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}
