'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, peek, startPolling, timeAgo } from './api';
import { CopyIcon } from './ui';

export default function Connect() {
  const [me, setMe] = useState(() => peek('/api/me') || null);
  const load = useCallback(() => api('/api/me').then(setMe).catch(() => {}), []);
  useEffect(() => { load(); return startPolling(load, 3000); }, [load]);
  return (
    <div className="stack narrow">
      <div>
        <h1>Connect your Claude</h1>
        <p className="muted">Mastercraft has no AI of its own. Your Claude does the thinking and saves the results here through this private link. You do this once.</p>
      </div>
      <div className="card stack">
        <div>
          <label>Your private Mastercraft link</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <div className="code grow">{me?.mcp_url || 'Loading…'}</div>
            {me && <CopyIcon text={me.mcp_url} />}
          </div>
          <p className="tiny muted" style={{ marginTop: 6 }}>Treat it like a password: anyone with it can edit your applications.</p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Open <b>claude.ai</b> or the Claude desktop app, then go to <b>Settings</b> and <b>Connectors</b>.</li>
          <li>Click <b>Add custom connector</b>. Name it <b>Mastercraft</b>, paste the link above and click <b>Add</b>.</li>
          <li>Start a new chat and make sure <b>Mastercraft</b> is switched on in the tools menu.</li>
          <li>Ask anything that starts with “Using Mastercraft…”. Allow the tool when Claude asks.</li>
        </ol>
        <div className={me?.claude_connected_at ? 'notice' : 'warn'}>
          {me?.claude_connected_at
            ? <>Claude connected. Last seen {timeAgo(me.claude_last_seen_at)}. <Link href="/dashboard">Go to your dashboard</Link></>
            : 'Waiting for your Claude… This updates as soon as Claude first uses Mastercraft.'}
        </div>
      </div>
      <p className="small muted">Tip: keep Claude and Mastercraft side by side. Mastercraft updates live as Claude saves things.</p>
    </div>
  );
}
