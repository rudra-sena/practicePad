'use client';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Shell';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', password: '', name: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('mode') === 'signup') setMode('signup'); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || 'Something went wrong.');
    window.location.href = '/dashboard';
  }

  return (
    <>
      <div className="nav"><div className="nav-in"><Logo /></div></div>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <div className="card stack" style={{ marginTop: 32 }}>
          <h2>{mode === 'login' ? 'Log in to Mastercraft' : 'Create your account'}</h2>
          {mode === 'login' && (
            <div className="notice small">
              Evaluating? Use the demo account: <b>demo</b> / <b>mastercraft</b>{' '}
              <button type="button" className="btn sm" onClick={() => setF({ ...f, username: 'demo', password: 'mastercraft' })}>Fill it in</button>
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            {mode === 'signup' && <div><label>Your name</label><input value={f.name} onChange={set('name')} placeholder="Riya Sharma" /></div>}
            <div><label>Username</label><input value={f.username} onChange={set('username')} autoComplete="username" /></div>
            <div><label>Password</label><input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
            {err && <div className="error">{err}</div>}
            <button className="btn primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {mode === 'login'
              ? <>New here? <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setErr(''); }}>Create an account</a></>
              : <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setErr(''); }}>Log in</a></>}
          </p>
        </div>
      </div>
    </>
  );
}
