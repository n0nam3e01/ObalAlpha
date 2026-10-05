import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';

// Shared building blocks for the customer app and the partner panel.

export const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;

export const categoryLabels = { ALL: 'Все', BAKERY: 'Выпечка', PREPARED: 'Готовая еда', SUPERMARKET: 'Продукты', CAFE: 'Кофейни', DESSERT: 'Десерты', OTHER: 'Другое' };
export const categoryIcons = { ALL: 'grid', BAKERY: 'croissant', PREPARED: 'bowl', SUPERMARKET: 'basket', CAFE: 'cup', DESSERT: 'cake', OTHER: 'sparkle' };

export const errorText = {
  already_exists: 'Такие данные уже используются.',
  sold_out: 'Набор закончился или время выдачи истекло.',
  pickup_not_started: 'Время выдачи ещё не началось.',
  pickup_window_invalid: 'Укажите корректное время выдачи сегодня.',
  too_many_requests: 'Слишком много попыток. Подождите минуту.',
  credentials_invalid: 'Почта, телефон или пароль не совпадают.',
  account_exists: 'Такой аккаунт уже есть. Войдите.',
  password_invalid: 'Пароль должен содержать от 8 до 128 символов.',
  email_invalid: 'Проверьте адрес почты.',
  phone_invalid: 'Введите номер полностью, например +7 700 000 00 00.',
  contact_required: 'Укажите почту или телефон.',
  order_not_active: 'Заказ уже выдан, отменён или время получения истекло.',
  code_not_found: 'Активный заказ с таким кодом не найден.',
  code_ambiguous_use_order_id: 'Код совпал у двух заказов. Сверьте имя покупателя в списке ниже.',
  box_has_orders_create_new: 'По набору уже есть заказы. Создайте новый набор.',
  price_must_be_less_than_original: 'Цена со скидкой должна быть ниже обычной.',
  venue_inactive: 'Заведение ещё на проверке или скрыто. Наборы появятся после одобрения.',
  photo_invalid: 'Ссылка на фото должна начинаться с https://.',
  already_rated: 'Вы уже оценили этот заказ.',
  field_invalid: 'Проверьте заполненные поля.',
};

const iconPaths = {
  home: <><path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
  bag: <><path d="M5.5 8h13l1 12.5h-15L5.5 8Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.2-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow: <path d="m9 5 7 7-7 7"/>,
  back: <path d="m15 5-7 7 7 7"/>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  heart: <path d="M12 21S3 16 3 9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 9 1.5C21 16 12 21 12 21Z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  leaf: <><path d="M19 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M5 20c2-5 5-8 10-11"/></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>,
  route: <><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/></>,
  flame: <path d="M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.5 2 1.5 3 2.5 3 0-3 1-6 4-8 0 3 4 6 4 11.5 0 3.8-3 6.5-7 6.5Z"/>,
  bolt: <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z"/>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/></>,
  chat: <path d="M4 5.5h16v10H9l-5 4v-14Z"/>,
  store: <><path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5c0 1.5 1.2 2.5 2.7 2.5s2.6-1 2.6-2.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.1 2.5 2.6 2.5S20 11 20 9.5M5.5 12v8h13v-8"/></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></>,
  croissant: <><path d="M3.5 15.5C4.5 10 8 7 12 7s7.5 3 8.5 8.5"/><path d="M3.5 15.5c1.8 1.3 4 1.2 5.2-.8M20.5 15.5c-1.8 1.3-4 1.2-5.2-.8M9 7.8l1.3 6.4M15 7.8l-1.3 6.4"/></>,
  bowl: <><path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M8 8.5c0-1.6 1.2-1.6 1.2-3.3M12 8.5c0-1.6 1.2-1.6 1.2-3.3M16 8.5c0-1.6 1.2-1.6 1.2-3.3"/></>,
  basket: <><path d="M3 10h18l-2 10H5L3 10Z"/><path d="m8 10 3-6M16 10l-3-6M9 14v3M15 14v3M12 14v3"/></>,
  cup: <><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9Z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8.5 3c0 1.5 1 1.5 1 3M12.5 3c0 1.5 1 1.5 1 3"/></>,
  cake: <><path d="M4 20.5h16V13H4v7.5Z"/><path d="M4 16.5c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 13V9.5M12 7c.9-.8.9-1.8 0-2.8-.9 1-.9 2 0 2.8Z"/></>,
  sparkle: <path d="M12 3c.6 4.7 2.3 6.4 7 7-4.7.6-6.4 2.3-7 7-.6-4.7-2.3-6.4-7-7 4.7-.6 6.4-2.3 7-7Z"/>,
};

export function Icon({ name, size = 22, filled = false }) {
  return <svg className={`icon${filled ? ' icon--filled' : ''}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{iconPaths[name]}</svg>;
}

export function Brand({ partner = false }) {
  return <Link to="/" className="brand" aria-label="Öbal, на главную"><span>öbal</span>{partner && <em>partner</em>}</Link>;
}

export function Shell({ children }) {
  return <div className="consumer-shell">{children}</div>;
}

export function Empty({ icon = 'bag', title, text, action }) {
  return <div className="empty"><span className="empty__icon"><Icon name={icon} size={28}/></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

// Branded artwork for offers without a photo, so a feed of unphotographed
// boxes still reads as food rather than a wall of initials.
export function CategoryArt({ category = 'OTHER', label }) {
  const key = categoryIcons[category] ? category : 'OTHER';
  return <div className={`art art--${key.toLowerCase()}`} role="img" aria-label={label}>
    <span className="art__glyph art__glyph--ghost"><Icon name={categoryIcons[key]} size={150}/></span>
    <span className="art__glyph"><Icon name={categoryIcons[key]} size={56}/></span>
  </div>;
}

export function Photo({ src, alt, category, ...props }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <CategoryArt category={category} label={alt}/>;
  return <img src={src} alt={alt} onError={() => setFailed(true)} {...props}/>;
}

export const boxPhoto = (box) => box.photo_url || box.venue?.photo_url || null;

// Pickup windows are Astana wall-clock times on the box's pickup_date.
export function pickupState(box, now = new Date()) {
  const day = String(box.pickup_date).slice(0, 10);
  const start = new Date(`${day}T${box.pickup_start}:00+05:00`);
  const end = new Date(`${day}T${box.pickup_end}:00+05:00`);
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const minutesLeft = Math.max(0, Math.round((end - now) / 60000));
  if (now >= end) return { key: 'over', label: 'Время выдачи прошло', progress: 1, minutesLeft: 0 };
  if (now >= start) return { key: 'now', label: `Выдача идёт до ${box.pickup_end}`, progress, minutesLeft };
  return { key: 'soon', label: `Сегодня ${box.pickup_start}–${box.pickup_end}`, progress: 0, minutesLeft };
}

export function routeUrl(venue) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.geo_lat},${venue.geo_lng}`)}`;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wraps a route change in the View Transitions API when the browser has it.
export function useViewNavigate() {
  const navigate = useNavigate();
  return (to, options) => {
    if (!document.startViewTransition || reducedMotion()) return navigate(to, options);
    return document.startViewTransition(() => flushSync(() => navigate(to, options)));
  };
}

// A link whose media morphs into the next page's hero. Only the tapped card
// carries the shared name, so names stay unique during the snapshot.
export function MorphLink({ to, children, ...props }) {
  const go = useViewNavigate();
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const media = event.currentTarget.querySelector('[data-morph]');
    if (media) media.style.viewTransitionName = 'box-media';
    go(to);
  }
  return <Link to={to} onClick={onClick} {...props}>{children}</Link>;
}

export function useCountUp(value, duration = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (reducedMotion()) { setShown(value); return undefined; }
    let frame;
    const start = performance.now();
    const origin = from.current;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(Math.round(origin + (value - origin) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}

export function CountUp({ value, format = (n) => n }) {
  const shown = useCountUp(value);
  return <span aria-label={String(format(value))}><span aria-hidden="true">{format(shown)}</span></span>;
}

export function DealCard({ box, index = 0, layout = 'row' }) {
  const state = pickupState(box);
  const low = box.qty_left <= 2;
  return <MorphLink className={`deal-card deal-card--${layout}`} to={`/box/${box.id}`} style={{ '--i': Math.min(index, 8) }}>
    <div className="deal-card__media" data-morph>
      <Photo src={boxPhoto(box)} category={box.venue.category} alt={`${box.title}, ${box.venue.name}`} width="640" height="480" loading="lazy"/>
      <span className="deal-card__discount">−{box.discount_pct}%</span>
      {low && <span className="deal-card__left"><Icon name="flame" size={13} filled/> Последние {box.qty_left}</span>}
    </div>
    <div className="deal-card__body">
      <p className="deal-card__venue"><span>{box.venue.name}</span>{box.venue.rating_count > 0 && <span className="rating-inline"><Icon name="star" size={12} filled/>{box.venue.rating_avg.toFixed(1)}</span>}</p>
      <h3>{box.title}</h3>
      <p className={`deal-card__meta${state.key === 'now' ? ' is-live' : ''}`}>{state.key === 'now' && <span className="live-dot" aria-hidden="true"/>}{state.key === 'now' ? `Забрать до ${box.pickup_end}` : `${box.pickup_start}–${box.pickup_end}`}<span aria-hidden="true">·</span>{box.distance_km != null ? `${box.distance_km} км` : box.venue.district || 'Астана'}</p>
      <div className="price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s>{!low && <span className="price__left">ещё {box.qty_left}</span>}</div>
    </div>
  </MorphLink>;
}

export function DealSkeleton({ count = 4 }) {
  return <div className="deal-grid" aria-hidden="true">{Array.from({ length: count }, (_, i) => <div className="deal-card deal-card--row deal-card--skeleton" key={i}><div className="deal-card__media"/><div className="deal-card__body"><span/><span/><span/></div></div>)}</div>;
}

// Bottom action sheet on the native <dialog>, replacing window.confirm.
export function ConfirmSheet({ open, title, text, confirmLabel, cancelLabel = 'Оставить', destructive = true, onConfirm, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="sheet-title">
    <div className="sheet__panel">
      <span className="sheet__grabber" aria-hidden="true"/>
      <h2 id="sheet-title">{title}</h2>
      {text && <p>{text}</p>}
      <div className="sheet__actions">
        <button type="button" className={`button button--block${destructive ? ' button--danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="button button--block button--quiet" onClick={onClose} autoFocus>{cancelLabel}</button>
      </div>
    </div>
  </dialog>;
}

export function GoogleMap({ boxes, compact = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const venues = [...new Map(boxes.map((box) => [box.venue.id, box.venue])).values()];
  const selected = venues.find((venue) => venue.id === selectedId) || venues[0];
  const query = encodeURIComponent(selected ? `${selected.geo_lat},${selected.geo_lng}` : '51.1283,71.4305');
  return <section className={`map-panel${compact ? ' map-panel--pickup' : ''}`} aria-label={compact ? 'Место самовывоза' : 'Карта заведений Астаны'}>
    <div className="map-panel__frame"><iframe title={selected ? `${selected.name} на Google Maps` : 'Астана на Google Maps'} src={`https://www.google.com/maps?q=${query}&z=${selected ? 16 : 12}&output=embed&hl=ru`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/></div>
    <div className="map-results">
      {!compact && <strong>Заведения с предложениями</strong>}
      {!selected && <p>Пока нет предложений. Здесь будут показаны заведения Астаны.</p>}
      {compact && selected ? <div className="map-results__venue"><span className="map-results__pin"><Icon name="pin" size={18}/></span><div><strong>{selected.name}</strong><p>{selected.address}</p></div></div> :
        <div className="map-results__list">{venues.map((venue) => <button key={venue.id} type="button" className={venue.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(venue.id)} aria-pressed={venue.id === selected.id}>
          <strong>{venue.name}</strong><span>{venue.address}</span>
        </button>)}</div>}
      {selected && <a className="map-results__route" href={routeUrl(selected)} target="_blank" rel="noreferrer"><Icon name="route" size={18}/> Маршрут в Google Maps</a>}
    </div>
  </section>;
}
