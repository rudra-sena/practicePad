'use client';
export async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !path.includes('?t=')) window.location.href = '/login';
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

export function countWords(t) {
  const s = String(t || '').trim();
  return s ? s.split(/\s+/).length : 0;
}

export function timeAgo(ts) {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function fmtDate(d) {
  if (!d) return 'No deadline';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ESSAY_STATUS = {
  not_started: ['Not started', ''],
  outlined: ['Outlined', 'violet'],
  drafting: ['Drafting', 'blue'],
  reviewed: ['Reviewed', 'amber'],
  final: ['Final', 'jade'],
};
export const SCHOOL_STATUS = {
  in_progress: ['In progress', ''],
  ready: ['Ready to submit', 'jade'],
  submitted: ['Submitted', 'jade'],
  interview: ['Interview', 'violet'],
  admitted: ['Admitted', 'jade'],
  waitlisted: ['Waitlisted', 'amber'],
  rejected: ['Rejected', 'red'],
};
export const QUESTION_STATUS = {
  added: ['Question added', ''],
  outlined: ['Outlined', 'violet'],
  outline_final: ['Outline final', 'violet'],
  drafting: ['Drafting', 'blue'],
  final: ['Final', 'jade'],
};
export const STORY_STATUS = {
  draft: ['Draft', 'amber'],
  needs_detail: ['Needs your detail', 'red'],
  confirmed: ['Confirmed', 'jade'],
};
