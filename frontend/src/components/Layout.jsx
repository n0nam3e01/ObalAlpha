import { Link } from 'react-router-dom';

export function Icon({ name, size = 22 }) {
  const paths = {
    home: <><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bag: <><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.2-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="m9 5 7 7-7 7"/>,
    back: <path d="m15 5-7 7 7 7"/>,
    heart: <path d="M12 21S3 16 3 9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 9 1.5C21 16 12 21 12 21Z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    leaf: <><path d="M19 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M5 20c2-5 5-8 10-11"/></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function Brand({ partner = false }) {
  return <Link to="/" className="brand" aria-label="Öbal, на главную"><span>öbal</span>{partner && <em>partner</em>}</Link>;
}

export function Shell({ children }) {
  return <div className="consumer-shell">{children}</div>;
}

