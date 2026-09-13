import { useEffect, useState } from 'react';

// Reports whether the user prefers reduced motion. JS-driven animations
// (confetti, particle bursts) should no-op when this is true; CSS-driven
// motion is already neutralised by the media query in motion.css.
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
