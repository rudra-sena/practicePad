'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, peek } from './api';

const LINKS = [
  ['/dashboard', 'Dashboard'],
  ['/essays', 'Essays'],
  ['/profile', 'Profile'],
  ['/stories', 'Story bank'],
  ['/recommenders', 'Recommenders'],
  ['/connect', 'Connect Claude'],
];

export function Logo({ href = '/' }) {
  return <Link href={href} className="logo">Master<span>craft</span></Link>;
}

export default function Shell({ children }) {
  const path = usePathname();
  const [me, setMe] = useState(() => peek('/api/me') || null);
  useEffect(() => { api('/api/me').then(setMe).catch(() => {}); }, []);

  async function logout() {
    await api('/api/auth/logout', 'POST');
    window.location.href = '/';
  }
  async function resetDemo() {
    if (!confirm('Reset the demo account to its starting data? Changes made by anyone using the demo login will be lost.')) return;
    await api('/api/demo/reset', 'POST');
    window.location.href = '/dashboard';
  }

  return (
    <>
      <div className="nav">
        <div className="nav-in">
          <Logo href="/dashboard" />
          <div className="nav-links">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className={path === href || (href !== '/dashboard' && path.startsWith(href)) || (href === '/essays' && path.startsWith('/schools')) ? 'on' : ''}>{label}</Link>
            ))}
          </div>
          <div className="nav-right">
            {me?.is_demo && <button className="btn sm" onClick={resetDemo} title="Restore the demo data">Reset demo</button>}
            <span className="hide-sm">{me?.name}</span>
            <button className="btn sm" onClick={logout}>Log out</button>
          </div>
        </div>
      </div>
      <div className="wrap">{children}</div>
    </>
  );
}
