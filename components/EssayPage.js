'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, peek, startPolling, countWords, timeAgo, ESSAY_STATUS } from './api';
import { Hint, Pill } from './ui';
import { OutlineView, OutlineEditor } from './Outline';
import { P } from './prompts';

export default function EssayPage({ id }) {
  const [d, setD] = useState(() => peek(`/api/essays/${id}`) || null);
  const [text, setText] = useState(() => peek(`/api/essays/${id}`)?.versions?.[0]?.body || '');
  const [view, setView] = useState(null); // version number being viewed (null = latest/editor)
  const [editOutline, setEditOutline] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const dirty = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/essays/${id}`);
      setD(data);
      if (!dirty.current) setText(data.versions[0]?.body || '');
    } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); return startPolling(load, 4000); }, [load]);

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 2000); }

  async function saveVersion() {
    setErr('');
    try {
      await api(`/api/essays/${id}/versions`, 'POST', { text });
      dirty.current = false;
      await load();
      flash('Draft saved as a new version');
    } catch (e) { setErr(e.message); }
  }

  async function setFinal(final) {
    setErr('');
    try {
      if (final && dirty.current) await saveVersion();
      const r = await api(`/api/essays/${id}/final`, 'POST', { final });
      if (r.all_final) { window.location.href = `/schools/${r.school_id}?check=1`; return; }
      await load();
    } catch (e) { setErr(e.message); }
  }

  if (!d) return err ? <div className="error">{err}</div> : <p className="muted">Loading…</p>;
  const { essay, school, versions, outline, reviews, stories } = d;
  const latest = versions[0];
  const isFinal = essay.status === 'final';
  const viewing = view ? versions.find((v) => v.version === view) : null;
  const wc = viewing ? viewing.word_count : countWords(text);
  const over = essay.word_limit && wc > essay.word_limit;
  const reviewForLatest = reviews.find((r) => latest && r.version === latest.version);
  const shownReview = viewing ? reviews.find((r) => r.version === viewing.version) : reviews[0];
  const confirmed = stories.filter((s) => s.status === 'confirmed');

  return (
    <div className="stack">
      <Link href={`/schools/${school.id}`} className="small">← {school.name} application</Link>
      <div className="row between">
        <div>
          <div className="row"><h1 style={{ margin: 0 }}>{school.name} · {essay.title}</h1><Pill map={ESSAY_STATUS} value={essay.status} /></div>
          <p className="muted" style={{ margin: '6px 0 0', maxWidth: 720 }}>{essay.prompt}</p>
        </div>
      </div>
      {msg && <div className="notice">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="row small">
                <b className={over ? 'bad' : ''}>{wc}{essay.word_limit ? ` / ${essay.word_limit}` : ''} words</b>
                {viewing ? <span className="pill">Viewing v{viewing.version}</span> : latest ? <span className="faint">Latest saved: v{latest.version}, {timeAgo(latest.created_at)}</span> : <span className="faint">No draft yet</span>}
              </div>
              {versions.length > 0 && (
                <select value={view || ''} onChange={(e) => setView(e.target.value ? Number(e.target.value) : null)} style={{ width: 'auto' }}>
                  <option value="">{isFinal ? `Final (v${latest.version})` : 'Editing latest'}</option>
                  {versions.map((v) => <option key={v.version} value={v.version}>Version {v.version} · {v.word_count} words</option>)}
                </select>
              )}
            </div>
            {viewing ? (
              <div className="editor" style={{ whiteSpace: 'pre-wrap', padding: 10, background: '#FAFCFB', borderRadius: 9, border: '1px solid var(--line)' }}>{viewing.body}</div>
            ) : (
              <textarea
                className="editor"
                value={text}
                readOnly={isFinal}
                onChange={(e) => { dirty.current = true; setText(e.target.value); }}
                placeholder={outline ? 'Write your essay here, following your outline. Paste from Google Docs if you prefer.' : 'Plan the structure with Claude first, or start writing here.'}
              />
            )}
            {!viewing && (
              <div className="row" style={{ marginTop: 10 }}>
                {!isFinal && <button className="btn primary" onClick={saveVersion} disabled={!text.trim()}>Save draft</button>}
                {!isFinal && latest && <button className="btn outline" onClick={() => setFinal(true)}>Mark final</button>}
                {isFinal && <button className="btn" onClick={() => setFinal(false)}>Reopen for editing</button>}
                {dirty.current && !isFinal && <span className="small muted">Unsaved changes</span>}
              </div>
            )}
            {!isFinal && latest && !reviewForLatest && <Hint label="For Claude to review this draft" prompt={P.reviewEssay(school.name, essay.title)} />}
          </div>

          {shownReview && (
            <div className="card">
              <div className="row between"><h3 style={{ margin: 0 }}>Claude’s review</h3><span className="pill amber">Draft v{shownReview.version}</span></div>
              <p style={{ marginTop: 8 }}>{shownReview.overall}</p>
              {shownReview.strengths.length > 0 && (<><div className="section-title" style={{ marginTop: 10 }}>Working well</div><ul className="list-plain small">{shownReview.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
              {shownReview.fixes.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 12 }}>To fix</div>
                  {shownReview.fixes.map((f, i) => (
                    <div key={i} className="check-row small">
                      <span className="pill violet">{f.where || 'General'}</span>
                      <div><div>{f.issue}</div>{f.suggestion && <div className="muted">{f.suggestion}</div>}</div>
                    </div>
                  ))}
                </>
              )}
              {shownReview.fact_check && <p className="small muted" style={{ marginTop: 10 }}><b>Fact check:</b> {shownReview.fact_check}</p>}
              {reviews.length > 1 && <p className="tiny faint">{reviews.length} reviews in total. Pick a version above to see its review.</p>}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>Outline</h3>{outline && !editOutline && !isFinal && <button className="btn sm" onClick={() => setEditOutline(true)}>Edit</button>}</div>
            {editOutline ? (
              <div style={{ marginTop: 10 }}>
                <OutlineEditor outline={outline} stories={confirmed} ownerType="essay" ownerId={essay.id} onSaved={() => { setEditOutline(false); load(); }} onCancel={() => setEditOutline(false)} />
              </div>
            ) : outline ? (
              <div style={{ marginTop: 8 }}><OutlineView outline={outline} stories={stories} /></div>
            ) : (
              <>
                <p className="small muted" style={{ marginTop: 8 }}>No outline yet. Claude will suggest stories that fit this prompt, let you choose, and build the structure.</p>
                <Hint label="To plan the structure of this essay" prompt={P.planEssay(school.name, essay.title)} />
                <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setEditOutline(true)}>Or write an outline yourself</button>
              </>
            )}
            {outline && !isFinal && !editOutline && <Hint label="To re-plan with a different story" prompt={`Using Mastercraft, re-plan my ${school.name} ${essay.title} with a different story.`} />}
          </div>
          <div className="card small">
            <div className="section-title">Essay details</div>
            <p style={{ margin: 0 }}>Word limit: {essay.word_limit || 'none'} · {versions.length} version{versions.length === 1 ? '' : 's'} · {reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
            <p className="faint tiny" style={{ marginTop: 6 }}>Only you write this essay. Claude plans and reviews; it never edits your text.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
