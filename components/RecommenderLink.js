'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, startPolling } from './api';
import { Logo } from './Shell';
import RecPanel from './RecPanel';

export default function RecommenderLink({ token }) {
  const [panel, setPanel] = useState(null);
  const [err, setErr] = useState('');
  const endpoint = `/api/rec/token?t=${encodeURIComponent(token)}`;
  const load = useCallback(() => api(endpoint).then((d) => setPanel(d.panel)).catch((e) => setErr(e.message)), [endpoint]);
  useEffect(() => { load(); return startPolling(load, 5000); }, [load]);

  return (
    <>
      <div className="nav"><div className="nav-in"><Logo href="#" /><div className="grow" /><span className="small" style={{ color: '#D1FAE5' }}>Recommendation workspace</span></div></div>
      <div className="wrap" style={{ maxWidth: 860 }}>
        {err && !panel && <div className="error">{err}</div>}
        {!panel && !err && <p className="muted">Loading…</p>}
        {panel && (
          <div className="stack">
            <div className="card accent">
              <h1 style={{ marginBottom: 4 }}>Hi {panel.name.split(' ')[0]}</h1>
              <p className="muted" style={{ margin: 0 }}>
                {panel.applicant_name} has asked you for a recommendation. Each school’s questions are below with a suggested outline of examples you witnessed.
                Draft your answers here, copy them into the school’s form, then mark each school submitted.
              </p>
            </div>
            <RecPanel panel={panel} endpoint={endpoint} onPanel={setPanel} />
            <p className="tiny faint">Only you and {panel.applicant_name} can see this page. No account needed.</p>
          </div>
        )}
      </div>
    </>
  );
}
