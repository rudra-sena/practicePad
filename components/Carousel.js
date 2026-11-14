'use client';
import { useRef, useState } from 'react';

export default function Carousel({ items }) {
  const track = useRef(null);
  const [i, setI] = useState(0);
  function go(n) {
    const el = track.current;
    if (!el) return;
    const k = (n + items.length) % items.length;
    el.scrollTo({ left: el.children[k].offsetLeft - el.offsetLeft, behavior: 'smooth' });
    setI(k);
  }
  function onScroll() {
    const el = track.current;
    if (!el) return;
    const w = el.children[0]?.offsetWidth || 1;
    setI(Math.min(items.length - 1, Math.round(el.scrollLeft / (w + 16))));
  }
  return (
    <div className="carousel">
      <div className="car-track" ref={track} onScroll={onScroll}>
        {items.map(([t, d], n) => (
          <div key={t} className="car-card">
            <span className="car-num">{String(n + 1).padStart(2, '0')}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>
      <div className="car-ctrl">
        <button className="car-btn" onClick={() => go(i - 1)} aria-label="Previous">‹</button>
        <button className="car-btn" onClick={() => go(i + 1)} aria-label="Next">›</button>
        <div className="car-dots">
          {items.map((_, n) => <button key={n} className={`car-dot ${n === i ? 'on' : ''}`} onClick={() => go(n)} aria-label={`Card ${n + 1}`} />)}
        </div>
      </div>
    </div>
  );
}
