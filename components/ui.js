'use client';
import { useEffect, useState } from 'react';

export function Pill({ map, value }) {
  const [label, tone] = map[value] || [value, ''];
  return <span className={`pill ${tone}`}>{label}</span>;
}

export function CopyIcon({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      aria-label="Copy"
      title="Copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
      )}
    </button>
  );
}

// "To do X, paste this in your Claude chat:" + prompt + copy icon.
export function Hint({ label, prompt }) {
  return (
    <div className="hint">
      <div className="hint-label">{label}, paste this in your Claude chat:</div>
      <div className="hint-box">
        <code>{prompt}</code>
        <CopyIcon text={prompt} />
      </div>
    </div>
  );
}

export function DaysLeft({ days }) {
  if (days === null || days === undefined) return <span className="pill">No deadline</span>;
  if (days < 0) return <span className="pill">Deadline passed</span>;
  const tone = days <= 7 ? 'red' : days <= 14 ? 'amber' : 'jade';
  return <span className={`pill ${tone}`}>{days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} left`}</span>;
}

// Splits notes into short points: one per line, or per sentence / semicolon if written as a paragraph.
export function toPoints(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const lines = t.split(/\n+/).map((x) => x.replace(/^[-•*\s]+/, '').trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return t.split(/;\s+|\.\s+(?=[A-Z])/).map((x) => x.replace(/\.$/, '').trim()).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1));
}

// Small self-dismissing message in the corner.
export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDone, 4500);
    return () => clearTimeout(id);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span className="toast-tick">✓</span>
      <div><b>{toast.title}</b>{toast.text && <div className="small">{toast.text}</div>}</div>
      <button className="toast-x" onClick={onDone} aria-label="Dismiss">×</button>
    </div>
  );
}
