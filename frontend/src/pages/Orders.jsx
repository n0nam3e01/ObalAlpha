import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { ConfirmSheet, Empty, errorText, Icon, money, pickupState, routeUrl, Shell } from '../ui';

const orderLabels = { RESERVED: 'Ждёт получения', PAID: 'Оплачен', PICKED_UP: 'Получен', CANCELLED: 'Отменён', NO_SHOW: 'Не забран вовремя' };
const isActive = (order) => ['RESERVED', 'PAID'].includes(order.status);

function Pass({ order, highlighted, busy, onCancel }) {
  const state = pickupState(order.box);
  const venue = order.box.venue;
  return <article className={`pass pass--${state.key}${highlighted ? ' pass--new' : ''}`} aria-labelledby={`order-${order.id}`}>
    <div className="pass__top">
      <div className="pass__aurora" aria-hidden="true"/>
      {highlighted && <p className="pass__flash" role="status"><span className="check-burst" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m7 12.5 3.2 3.2L17 9"/></svg></span>Заказ оформлен</p>}
      <div className="pass__head">
        <div><p className="pass__venue">{venue.name}</p><h2 id={`order-${order.id}`}>{order.box.title}{order.qty > 1 && <span className="pass__qty"> × {order.qty}</span>}</h2></div>
        <span className={`status-pill status-pill--${state.key}`}>{state.key === 'now' && <span className="live-dot"/>}{state.key === 'now' ? 'Можно забирать' : state.key === 'soon' ? 'Скоро выдача' : orderLabels[order.status]}</span>
      </div>
    </div>
    <div className="pass__perforation" aria-hidden="true"/>
    <div className="pass__bottom">
      <p className="pass__label">Код получения</p>
      <p className="pass__code" aria-label={`Код ${order.pickup_code.split('').join(' ')}`}>{order.pickup_code.split('').map((digit, index) => <span key={index} style={{ '--d': index }} aria-hidden="true">{digit}</span>)}</p>
      <p className="pass__hint">Покажите сотруднику и оплатите <strong>{money(order.amount)}</strong> на месте</p>
      {state.key === 'now' && <div className="pass__meter"><div className="meter"><span style={{ '--value': 1 - state.progress }}/></div><small>До конца выдачи {state.minutesLeft >= 60 ? `${Math.floor(state.minutesLeft / 60)} ч ${state.minutesLeft % 60} мин` : `${state.minutesLeft} мин`}</small></div>}
      <dl className="pass__facts">
        <div><dt><Icon name="clock" size={16}/>Когда</dt><dd>{state.key === 'soon' ? state.label : `${order.box.pickup_start}–${order.box.pickup_end}`}</dd></div>
        <div><dt><Icon name="pin" size={16}/>Где</dt><dd>{venue.address}</dd></div>
      </dl>
      <div className="pass__actions">
        <a className="button button--quiet" href={routeUrl(venue)} target="_blank" rel="noreferrer"><Icon name="route" size={18}/> Маршрут</a>
        {order.status === 'RESERVED' && <button type="button" className="text-button text-button--danger" disabled={busy} onClick={() => onCancel(order)}>Отменить бронь</button>}
      </div>
    </div>
  </article>;
}

function Stars({ order, onRated }) {
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState('');
  async function rate(stars) {
    setBusy(true); setError('');
    try { await apiFetch('/ratings', { method: 'POST', body: JSON.stringify({ order_id: order.id, stars }) }); onRated(order.id, stars); }
    catch (err) { setError(errorText[err.code] || 'Не удалось сохранить оценку.'); }
    finally { setBusy(false); }
  }
  if (order.rating) return <p className="stars-done">{[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={14} filled={n <= order.rating.stars}/>)}<span>Ваша оценка</span></p>;
  return <div className="stars"><span>Оцените заведение</span><div role="group" aria-label="Оценка от 1 до 5" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" disabled={busy} className={n <= hover ? 'is-on' : ''} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onClick={() => rate(n)} aria-label={`${n} из 5`}><Icon name="star" size={24} filled={n <= hover}/></button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}

export default function Orders() {
  const { isAuthed, loading: authLoading } = useAuth();
  const location = useLocation();
  const justBooked = location.state?.justBooked;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const refresh = useCallback(async () => {
    const data = await apiFetch('/orders');
    setOrders([...data.active, ...data.past]);
  }, []);

  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    setLoading(true);
    refresh().catch(() => setError('Не удалось загрузить заказы. Обновите страницу.')).finally(() => setLoading(false));
  }, [isAuthed, refresh]);

  // The venue confirms pickup on its own device; keep the pass in sync while
  // the shopper is standing at the counter.
  const hasActive = orders.some(isActive);
  useEffect(() => {
    if (!hasActive) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') refresh().catch(() => {}); };
    const timer = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [hasActive, refresh]);

  async function cancel() {
    const order = confirming;
    setConfirming(null);
    setBusy(order.id); setError('');
    try { await apiFetch('/orders/' + order.id + '/cancel', { method: 'POST', body: '{}' }); await refresh(); }
    catch (err) { setError(errorText[err.code] || 'Не удалось отменить заказ. Обновите список перед повторной попыткой.'); }
    finally { setBusy(null); }
  }
  const rated = (id, stars) => setOrders((list) => list.map((o) => (o.id === id ? { ...o, rating: { stars } } : o)));

  const active = orders.filter(isActive);
  const past = orders.filter((order) => !isActive(order));
  return <Shell><main className="simple-page orders-page" id="main-content">
    <header className="page-head"><h1 className="large-title">Заказы</h1>{active.length > 0 && <p className="page-head__sub">{active.length === 1 ? 'Одна активная бронь' : `Активных броней: ${active.length}`}</p>}</header>
    {error && <p className="notice notice--error" role="alert">{error}</p>}
    {authLoading || loading ? <div className="detail-skeleton" role="status" aria-label="Загружаем заказы"><span/><span/></div>
      : !isAuthed ? <Empty icon="bag" title="Войдите, чтобы увидеть заказы" text="Здесь появятся брони и коды получения." action={<Link className="button" to="/profile" state={{ returnTo: '/orders' }}>Войти</Link>}/>
        : !orders.length ? !error && <Empty icon="bag" title="Заказов пока нет" text="Выберите набор на сегодня. После брони код получения появится здесь." action={<Link className="button" to="/">Смотреть предложения</Link>}/>
          : <>
            {active.length > 0 && <section className="orders-section" aria-label="Активные"><div className="pass-list">{active.map((order) => <Pass key={order.id} order={order} highlighted={order.id === justBooked} busy={busy === order.id} onCancel={setConfirming}/>)}</div></section>}
            {!active.length && <p className="inline-note">Активных броней нет. <Link to="/">Посмотреть наборы на сегодня</Link></p>}
            {past.length > 0 && <section className="orders-section"><h2 className="group-title">История</h2><div className="history-list">{past.map((order) => <article key={order.id}>
              <div className="history-list__main"><strong>{order.box.title}</strong><span>{order.box.venue.name} · {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {money(order.amount)}</span></div>
              <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>{orderLabels[order.status] || order.status}</span>
              {order.status === 'PICKED_UP' && <Stars order={order} onRated={rated}/>}
            </article>)}</div></section>}
          </>}
    <ConfirmSheet open={Boolean(confirming)} title="Отменить бронь?" text={confirming ? `«${confirming.box.title}» вернётся в продажу, и его смогут забрать другие.` : ''} confirmLabel="Отменить бронь" onConfirm={cancel} onClose={() => setConfirming(null)}/>
  </main></Shell>;
}
