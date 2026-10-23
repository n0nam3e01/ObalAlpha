import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Layout';

export default function CatalogLocation({ districts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const list = useRef(null);
  const id = useId();
  const options = [{ value: '', label: 'Вся Астана' }, ...districts.map((district) => ({ value: district, label: district }))];
  const selected = Math.max(0, options.findIndex((option) => option.value === value));
  useEffect(() => {
    if (!open) return;
    list.current?.querySelectorAll('[role="option"]')[selected]?.focus();
    const dismiss = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, selected]);
  function close() { setOpen(false); trigger.current?.focus(); }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...list.current.querySelectorAll('[role="option"]')];
    const current = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  return <div className="catalog-location" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="catalog-location__trigger" ref={trigger} aria-label={`Район: ${value || 'Вся Астана'}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}><Icon name="pin" size={17}/><span id={`${id}-value`}>{value || 'Вся Астана'}</span><svg className="icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    {open && <div className="catalog-location__options" role="listbox" aria-label="Районы Астаны" id={id} ref={list} onKeyDown={keydown}>{options.map((option) => <button key={option.value} role="option" aria-selected={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close(); }}><span>{option.label}</span>{value === option.value && <Icon name="check" size={16}/>}</button>)}</div>}
  </div>;
}
