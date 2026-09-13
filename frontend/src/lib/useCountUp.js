import { useEffect, useRef, useState } from 'react';
import useReducedMotion from './useReducedMotion';

// Animates a number from 0 → target with an ease-out curve. Honors
// prefers-reduced-motion (snaps to the final value). Re-runs when target changes.
export default function useCountUp(target, duration = 700) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const raf = useRef(null);

  useEffect(() => {
    if (reduced) { setValue(target); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, reduced]);

  return value;
}
