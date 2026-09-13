import { useEffect } from 'react';

export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet__handle" />
        {title && <h3 className="sheet__title">{title}</h3>}
        <div className="sheet__body">{children}</div>
      </div>
    </>
  );
}
