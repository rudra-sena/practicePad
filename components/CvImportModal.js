'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from './api';

export function markStoriesSeen(username, total) {
  try { localStorage.setItem(`mc_seen_stories_${username}`, String(total)); } catch {}
}

// Shows a clear success modal when Claude has just saved stories from the CV.
// Remembers how many stories this browser has already seen, so it fires once per import.
export default function CvImportModal({ username, total, unconfirmed }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!username || typeof total !== 'number') return;
    const key = `mc_seen_stories_${username}`;
    let seen = null;
    try { seen = localStorage.getItem(key); } catch {}
    if (seen === null) { try { localStorage.setItem(key, String(total)); } catch {} return; }
    if (total > Number(seen)) {
      setOpen({ added: total - Number(seen), unconfirmed });
    }
    try { localStorage.setItem(key, String(total)); } catch {}
  }, [username, total, unconfirmed]);

  if (!open) return null;
  async function confirmAll() {
    await api('/api/stories/confirm-all', 'POST');
    setOpen(null);
    window.location.href = '/stories';
  }
  return (
    <div className="modal-back" onClick={() => setOpen(null)}>
      <div className="modal stack" style={{ maxWidth: 480, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="big-tick">✓</div>
        <h2 style={{ margin: 0 }}>Your profile is ready</h2>
        <p className="muted" style={{ margin: 0 }}>Claude added {open.added} stor{open.added === 1 ? 'y' : 'ies'} from your CV and filled in your profile.</p>
        <p className="small" style={{ margin: 0 }}>Review them and confirm the ones that are right. Only confirmed stories are used to plan your essays.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn primary" href="/stories" onClick={() => setOpen(null)}>Review stories</Link>
          {open.unconfirmed > 0 && <button className="btn outline" onClick={confirmAll}>Confirm all {open.unconfirmed}</button>}
        </div>
        <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => setOpen(null)}>Close</button>
      </div>
    </div>
  );
}
