import { useLayoutEffect, useRef, useState } from 'react';
import t from '../../i18n';
import './CategoryChips.css';

const CATEGORIES = [
  { key: 'ALL', label: t.catAll },
  { key: 'BAKERY', label: t.catBakery },
  { key: 'PREPARED', label: t.catPrepared },
  { key: 'SUPERMARKET', label: t.catSupermarket },
  { key: 'CAFE', label: t.catCafe },
  { key: 'DESSERT', label: t.catDessert },
];

export default function CategoryChips({ active, onChange }) {
  const btnRefs = useRef({});
  const [ind, setInd] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  // Slide the dark indicator pill to sit exactly behind the active chip.
  // Measured because chips are variable-width and horizontally scrollable.
  useLayoutEffect(() => {
    const el = btnRefs.current[active];
    if (!el) return;
    setInd({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, ready: true });
    el.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <div className="category-chips">
      <span
        className="category-chips__indicator"
        style={{
          transform: `translateX(${ind.left}px)`,
          top: ind.top,
          width: ind.width,
          height: ind.height,
          opacity: ind.ready ? 1 : 0,
        }}
      />
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          ref={(el) => { btnRefs.current[c.key] = el; }}
          className={`category-chip${c.key === active ? ' category-chip--active' : ''}`}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
