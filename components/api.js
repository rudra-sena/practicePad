'use client';
export async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/api/share')) {
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Re-runs fn every `ms` while the tab is visible and the user is not typing.
export function startPolling(fn, ms = 4000) {
  const id = setInterval(() => {
    if (document.hidden) return;
    const el = document.activeElement;
    if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
    fn();
  }, ms);
  return () => clearInterval(id);
}

export function timeAgo(ts) {
  if (!ts) return 'not yet';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
