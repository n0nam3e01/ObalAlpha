import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { errorText, GoogleMap, Icon, money, Photo, pickupState, Shell } from '../ui';

export default function BoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed } = useAuth();
  const [box, setBox] = useState(null);
  const [qty, setQty] = useState(1);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setBox(null); setError(''); setQty(1); setRequestKey(crypto.randomUUID());
    apiFetch('/boxes/' + id, { skipAuth: true }).then((data) => { if (active) setBox(data); })
      .catch((err) => { if (active) setError(err.status === 404 ? 'Предложение не найдено или уже снято с продажи.' : 'Не удалось загрузить предложение.'); });
    return () => { active = false; };
  }, [id]);

  // In-app navigation has history to return to; a shared link does not.
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  function changeQty(next) { setQty(next); setRequestKey(crypto.randomUUID()); }

  async function order() {
    if (!isAuthed) return navigate('/profile', { state: { returnTo: '/box/' + id } });
    setBusy(true); setMessage('');
    try {
      const created = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ box_id: box.id, qty, fulfillment: 'PICKUP', idempotency_key: requestKey }) });
      navigate('/orders', { state: { justBooked: created.id } });
    } catch (err) { setMessage(errorText[err.code] || 'Не получилось забронировать. Проверьте «Заказы» перед повторной попыткой.'); }
    finally { setBusy(false); }
  }

  if (!box) return <Shell><main className="simple-page" id="main-content">{error
    ? <div className="empty"><Icon name="bag" size={30}/><h3>{error}</h3><p>Посмотрите другие наборы на сегодня.</p><Link className="button" to="/">К предложениям</Link></div>
    : <div className="detail-skeleton" role="status" aria-label="Загружаем предложение"><span/><span/><span/></div>}</main></Shell>;

  const total = box.price * qty;
  const state = pickupState(box);
  const maxQty = Math.min(3, box.qty_left);
  const available = box.status === 'ACTIVE' && box.qty_left >= qty && state.key !== 'over';
  const unavailableReason = state.key === 'over' ? 'Время выдачи прошло' : box.qty_left < 1 || box.status === 'SOLD_OUT' ? 'Все наборы разобрали' : 'Набор снят с продажи';
  const items = box.items ? box.items.split('\n').map((line) => line.trim()).filter(Boolean) : [];

  return <Shell><main className="detail" id="main-content">
    <div className="detail-media">
      <Photo src={box.photo_url} name={box.venue.name} alt={box.title} width="1200" height="900" fetchPriority="high"/>
      <button type="button" className="round-action back" onClick={back} aria-label="Назад"><Icon name="back"/></button>
      <span className="detail-media__badge">−{box.discount_pct}%</span>
    </div>
    <article className="detail-body">
      <p className="eyebrow detail-venue"><span>{box.venue.name}</span>{box.venue.rating_count > 0 && <span className="rating-inline"><Icon name="star" size={14} filled/>{box.venue.rating_avg.toFixed(1)} · {box.venue.rating_count}</span>}</p>
      <h1>{box.title}</h1>
      <div className="detail-price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s><span>Экономия {money(box.original_price - box.price)}</span></div>
      <section className="pickup-info">
        <Icon name="clock"/>
        <div><strong className={state.key === 'now' ? 'is-live' : ''}>{state.label}</strong><p>Самовывоз · {box.venue.address}</p></div>
      </section>
      {box.description && <p className="detail-description">{box.description}</p>}
      {items.length > 0 && <section className="detail-items"><h2>Что входит</h2><ul>{items.map((line) => <li key={line}>{line}</li>)}</ul></section>}
      {box.type === 'SURPRISE' && <p className="detail-hint">Это набор-сюрприз: точный состав зависит от того, что осталось к вечеру. Об аллергии спросите при получении.</p>}
      <GoogleMap boxes={[box]} compact/>
      {available && <div className="quantity"><div><strong>Количество</strong><p>Осталось {box.qty_left} · до 3 в одном заказе</p></div><div className="stepper"><button type="button" disabled={qty <= 1 || busy} onClick={() => changeQty(qty - 1)} aria-label="Уменьшить">−</button><span aria-live="polite">{qty}</span><button type="button" disabled={qty >= maxQty || busy} onClick={() => changeQty(qty + 1)} aria-label="Увеличить">+</button></div></div>}
      <p className="detail-hint">Оплата в заведении при получении. Доставки и сервисного сбора нет. Бронь можно отменить в «Заказах» до конца выдачи.</p>
    </article>
    <div className="sticky-order">
      <div><span>{available ? (qty > 1 ? `Итого за ${qty}` : 'Итого') : 'Недоступно'}</span><strong>{available ? money(total) : unavailableReason}</strong></div>
      {available && <button type="button" onClick={order} disabled={busy}>{busy ? 'Бронируем…' : isAuthed ? 'Забронировать' : 'Войти и забронировать'}</button>}
      {!available && <Link className="button button--quiet" to="/">Другие наборы</Link>}
      {message && <p role="alert">{message}</p>}
    </div>
  </main></Shell>;
}
