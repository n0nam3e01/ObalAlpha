import { useState } from 'react';
import { Link } from 'react-router-dom';

// Shared building blocks for the customer app and the partner panel.

export const fallbackImages = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85',
];

export const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;

export const categoryLabels = { ALL: 'Все', BAKERY: 'Выпечка', PREPARED: 'Готовая еда', SUPERMARKET: 'Продукты', CAFE: 'Кофейни', DESSERT: 'Десерты', OTHER: 'Другое' };

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
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>,
  route: <><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/></>,
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
  return <div className="empty"><Icon name={icon} size={30}/><h3>{title}</h3><p>{text}</p>{action}</div>;
}

const initials = (name = '') => name.startsWith('Öbal') ? 'ö' : name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('');

// Photo with a calm branded fallback: a broken image icon with alt text is the
// first thing a shopper sees when a venue pastes a dead link.
export function Photo({ src, alt, name, index = 0, ...props }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="photo-fallback" role="img" aria-label={alt}><span>{initials(name)}</span></div>;
  return <img src={src || fallbackImages[index % fallbackImages.length]} alt={alt} onError={() => setFailed(true)} {...props}/>;
}

// Pickup windows are Astana wall-clock times on the box's pickup_date.
export function pickupState(box, now = new Date()) {
  const day = String(box.pickup_date).slice(0, 10);
  const start = new Date(`${day}T${box.pickup_start}:00+05:00`);
  const end = new Date(`${day}T${box.pickup_end}:00+05:00`);
  if (now >= end) return { key: 'over', label: 'Время выдачи прошло' };
  if (now >= start) return { key: 'now', label: `Выдача идёт до ${box.pickup_end}` };
  return { key: 'soon', label: `Сегодня ${box.pickup_start}–${box.pickup_end}` };
}

export function routeUrl(venue) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.geo_lat},${venue.geo_lng}`)}`;
}

export function DealCard({ box, index }) {
  const state = pickupState(box);
  const low = box.qty_left <= 2;
  return <Link className="deal-card" to={`/box/${box.id}`} style={{ '--delay': `${Math.min(index, 8) * 45}ms` }}>
    <div className="deal-card__media">
      <Photo src={box.photo_url} name={box.venue.name} index={index} alt={`${box.title}, ${box.venue.name}`} width="640" height="480" loading="lazy"/>
      <span className="deal-card__discount">−{box.discount_pct}%</span>
      <span className={`deal-card__left${low ? ' is-low' : ''}`}>{low ? `Последние ${box.qty_left}` : `Осталось ${box.qty_left}`}</span>
    </div>
    <div className="deal-card__body">
      <div>
        <p className="eyebrow deal-card__venue"><span>{box.venue.name}</span>{box.venue.rating_count > 0 && <span className="rating-inline"><Icon name="star" size={13} filled/>{box.venue.rating_avg.toFixed(1)}</span>}</p>
        <h3>{box.title}</h3>
      </div>
      <p className={`deal-card__meta${state.key === 'now' ? ' is-live' : ''}`}><Icon name="clock" size={17}/> {state.label}</p>
      <p className="deal-card__meta"><Icon name="pin" size={17}/> {box.distance_km != null ? `${box.distance_km} км · ${box.venue.district || 'Астана'}` : box.venue.district || box.venue.address}</p>
      <div className="price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s></div>
    </div>
  </Link>;
}

export function DealSkeleton({ count = 4 }) {
  return <div className="deal-grid" aria-hidden="true">{Array.from({ length: count }, (_, i) => <div className="deal-card deal-card--skeleton" key={i}><div className="deal-card__media"/><div className="deal-card__body"><span/><span/><span/></div></div>)}</div>;
}

export function GoogleMap({ boxes, compact = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const venues = [...new Map(boxes.map((box) => [box.venue.id, box.venue])).values()];
  const selected = venues.find((venue) => venue.id === selectedId) || venues[0];
  const query = encodeURIComponent(selected ? `${selected.geo_lat},${selected.geo_lng}` : '51.1283,71.4305');
  return <section className={`map-panel${compact ? ' map-panel--pickup' : ''}`} aria-label={compact ? 'Место самовывоза' : 'Карта заведений Астаны'}>
    <iframe title={selected ? `${selected.name} на Google Maps` : 'Астана на Google Maps'} src={`https://www.google.com/maps?q=${query}&z=${selected ? 16 : 12}&output=embed&hl=ru`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
    <div className="map-results"><strong>{compact ? 'Где забрать заказ' : 'Заведения с предложениями'}</strong>
      {!selected && <p>Пока нет предложений. Здесь будут показаны заведения Астаны.</p>}
      {compact && selected ? <p>{selected.name}<br/>{selected.address}</p> :
        <div className="map-results__list">{venues.map((venue) => <button key={venue.id} type="button" className={venue.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(venue.id)} aria-pressed={venue.id === selected.id}>
          <strong>{venue.name}</strong><span>{venue.address}</span>
        </button>)}</div>}
      {selected && <a href={routeUrl(selected)} target="_blank" rel="noreferrer">Построить маршрут в Google Maps ↗</a>}
    </div>
  </section>;
}
