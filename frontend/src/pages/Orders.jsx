import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { Empty, errorText, Icon, money, pickupState, routeUrl, Shell } from '../ui';

const orderLabels = { RESERVED: 'Ждёт получения', PAID: 'Оплачен', PICKED_UP: 'Получен', CANCELLED: 'Отменён', NO_SHOW: 'Не забран вовремя' };
const isActive = (order) => ['RESERVED', 'PAID'].includes(order.status);

function Ticket({ order, highlighted, busy, onCancel }) {
  const state = pickupState(order.box);
  const venue = order.box.venue;
  return <article className={`ticket${highlighted ? ' ticket--new' : ''}`} aria-labelledby={`order-${order.id}`}>
    {highlighted && <p className="ticket__flash" role="status"><Icon name="check" size={18}/> Заказ оформлен</p>}
    <div className="ticket__head">
      <div><p className="eyebrow">{venue.name}</p><h2 id={`order-${order.id}`}>{order.box.title}{order.qty > 1 && ` × ${order.qty}`}</h2></div>
      <span className={`status-pill status-pill--${state.key}`}>{state.key === 'now' ? 'Можно забирать' : state.key === 'soon' ? 'Скоро выдача' : orderLabels[order.status]}</span>
    </div>
    <div className="ticket__code">
      <span>Код получения</span>
      <strong aria-label={`Код ${order.pickup_code.split('').join(' ')}`}>{order.pickup_code}</strong>
      <small>Покажите сотруднику и оплатите {money(order.amount)} на месте</small>
    </div>
    <dl className="ticket__facts">
      <div><dt>Когда</dt><dd>{state.label}</dd></div>
      <div><dt>Где</dt><dd>{venue.address}</dd></div>
    </dl>
    <div className="ticket__actions">
      <a className="button button--quiet" href={routeUrl(venue)} target="_blank" rel="noreferrer"><Icon name="route" size={18}/> Маршрут</a>
      {order.status === 'RESERVED' && <button type="button" className="text-button" disabled={busy} onClick={() => onCancel(order)}>Отменить бронь</button>}
    </div>
  </article>;
}

function Stars({ order, onRated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function rate(stars) {
    setBusy(true); setError('');
    try { await apiFetch('/ratings', { method: 'POST', body: JSON.stringify({ order_id: order.id, stars }) }); onRated(order.id, stars); }
    catch (err) { setError(errorText[err.code] || 'Не удалось сохранить оценку.'); }
    finally { setBusy(false); }
  }
  if (order.rating) return <p className="stars-done"><Icon name="star" size={15} filled/> Ваша оценка: {order.rating.stars}</p>;
  return <div className="stars"><span>Оцените заведение</span><div role="group" aria-label="Оценка от 1 до 5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" disabled={busy} onClick={() => rate(n)} aria-label={`${n} из 5`}><Icon name="star" size={22}/></button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

export default function Orders() {
  const { isAuthed, loading: authLoading } = useAuth();
  const location = useLocation();
  const justBooked = location.state?.justBooked;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(async () => {
    const data = await apiFetch('/orders');
    setOrders([...data.active, ...data.past]);
  }, []);

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    setLoading(true);
    refresh().catch(() => setError('Не удалось загрузить заказы. Обновите страницу.')).finally(() => setLoading(false));
  }, [isAuthed, refresh]);

  // The venue confirms pickup on its own device; keep the ticket in sync while
  // the shopper is standing at the counter.
  const hasActive = orders.some(isActive);
  useEffect(() => {
    if (!hasActive) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') refresh().catch(() => {}); };
    const timer = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [hasActive, refresh]);

  async function cancel(order) {
    if (!window.confirm(`Отменить бронь «${order.box.title}»? Набор вернётся в продажу.`)) return;
    setBusy(order.id); setError('');
    try { await apiFetch('/orders/' + order.id + '/cancel', { method: 'POST', body: '{}' }); await refresh(); }
    catch (err) { setError(errorText[err.code] || 'Не удалось отменить заказ. Обновите список перед повторной попыткой.'); }
    finally { setBusy(null); }
  }
  const rated = (id, stars) => setOrders((list) => list.map((o) => (o.id === id ? { ...o, rating: { stars } } : o)));

  const active = orders.filter(isActive);
  const past = orders.filter((order) => !isActive(order));
  return <Shell><main className="simple-page orders-page" id="main-content"><header><h1>Заказы</h1></header>
    {error && <p className="notice notice--error" role="alert">{error}</p>}
    {authLoading || loading ? <div className="detail-skeleton" role="status" aria-label="Загружаем заказы"><span/><span/></div>
      : !isAuthed ? <Empty title="Войдите, чтобы увидеть заказы" text="Здесь появятся брони и коды получения." action={<Link className="button" to="/profile" state={{ returnTo: '/orders' }}>Войти</Link>}/>
        : !orders.length ? !error && <Empty title="Заказов пока нет" text="Выберите набор на сегодня. После брони код получения появится здесь." action={<Link className="button" to="/">Смотреть предложения</Link>}/>
          : <>
            {active.length > 0 && <section className="orders-section" aria-label="Активные"><div className="ticket-list">{active.map((order) => <Ticket key={order.id} order={order} highlighted={order.id === justBooked} busy={busy === order.id} onCancel={cancel}/>)}</div></section>}
            {!active.length && <p className="inline-note">Активных броней нет. <Link to="/">Посмотреть наборы на сегодня</Link></p>}
            {past.length > 0 && <section className="orders-section"><h2>История</h2><div className="history-list">{past.map((order) => <article key={order.id}>
              <div className="history-list__main"><strong>{order.box.title}</strong><span>{order.box.venue.name} · {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {money(order.amount)}</span></div>
              <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>{orderLabels[order.status] || order.status}</span>
              {order.status === 'PICKED_UP' && <Stars order={order} onRated={rated}/>}
            </article>)}</div></section>}
          </>}
  </main></Shell>;
}
