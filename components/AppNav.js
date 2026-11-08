'use client';
import Logo from './Logo';
import { api } from './api';

export default function AppNav({ name }) {
  async function logout() {
    await api('/api/auth/logout', 'POST');
    window.location.href = '/';
  }
  return (
    <div className="nav">
      <Logo />
      <div className="row">
        <a className="btn ghost" href="/dashboard">Dashboard</a>
        {name && <span className="small muted">{name}</span>}
        <button className="btn small" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
