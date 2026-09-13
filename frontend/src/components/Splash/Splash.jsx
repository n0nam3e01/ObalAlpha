import { useEffect, useState } from 'react';
import './Splash.css';

// Brief one-time brand splash: wordmark fades in, the overlay clears within
// ~600ms so the content behind can stagger in.
export default function Splash() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), 600);
    return () => clearTimeout(id);
  }, []);
  if (done) return null;
  return (
    <div className="splash" aria-hidden="true">
      <span className="splash__mark">öbal</span>
    </div>
  );
}
