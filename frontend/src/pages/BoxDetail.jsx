import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { boxPhoto, categoryLabels, errorText, GoogleMap, Icon, money, Photo, pickupState, Shell, useViewNavigate } from '../ui';

export default function BoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const go = useViewNavigate();
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
  const back = () => (location.key !== 'default' ? navigate(-1) : go('/'));

  function changeQty(next) { setQty(next); setRequestKey(crypto.randomUUID()); }

  async function order() {
    if (!isAuthed) return navigate('/profile', { state: { returnTo: '/box/' + id } });
    setBusy(true); setMessage('');
    try {
      const created = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ box_id: box.id, qty, fulfillment: 'PICKUP', idempotency_key: requestKey }) });
      go('/orders', { state: { justBooked: created.id } });
    } catch (err) { setMessage(errorText[err.code] || 'Не получилось забронировать. Проверьте «Заказы» перед повторной попыткой.'); }
    finally { setBusy(false); }
  }

  if (!box) return <Shell><main className="detail" id="main-content">
    <div className="detail-media detail-media--loading" style={{ viewTransitionName: 'box-media' }}>
      <button type="button" className="glass-button detail-back" onClick={back} aria-label="Назад"><Icon name="back"/></button>
    </div>
    {error
      ? <div className="empty"><span className="empty__icon"><Icon name="bag" size={28}/></span><h3>{error}</h3><p>Посмотрите другие наборы на сегодня.</p><Link className="button" to="/">К предложениям</Link></div>
      : <div className="detail-skeleton" role="status" aria-label="Загружаем предложение"><span/><span/><span/></div>}
  </main></Shell>;

  const total = box.price * qty;
  const saved = (box.original_price - box.price) * qty;
  const state = pickupState(box);
  const maxQty = Math.min(3, box.qty_left);
  const available = box.status === 'ACTIVE' && box.qty_left >= qty && state.key !== 'over';
  const unavailableReason = state.key === 'over' ? 'Время выдачи прошло' : box.qty_left < 1 || box.status === 'SOLD_OUT' ? 'Все наборы разобрали' : 'Набор снят с продажи';
  const items = box.items ? box.items.split('\n').map((line) => line.trim()).filter(Boolean) : [];
  const stockShare = box.qty_total ? box.qty_left / box.qty_total : 1;

  return <Shell><main className="detail" id="main-content">
    <div className="detail-media" style={{ viewTransitionName: 'box-media' }}>
      <div className="detail-media__parallax"><Photo src={boxPhoto(box)} category={box.venue.category} alt={box.title} width="1200" height="900" fetchPriority="high"/></div>
      <button type="button" className="glass-button detail-back" onClick={back} aria-label="Назад"><Icon name="back"/></button>
      <span className="detail-media__badge">−{box.discount_pct}%</span>
    </div>
    <article className="detail-body">
      <p className="detail-venue"><span className="detail-venue__name">{box.venue.name}</span><span className="tag">{categoryLabels[box.venue.category] || 'Заведение'}</span>{box.venue.rating_count > 0 && <span className="rating-inline"><Icon name="star" size={14} filled/>{box.venue.rating_avg.toFixed(1)} <span className="muted">· {box.venue.rating_count}</span></span>}</p>
      <h1>{box.title}</h1>

      <div className="detail-price">
        <strong>{money(box.price)}</strong><s>{money(box.original_price)}</s>
        <span className="savings"><Icon name="sparkle" size={14} filled/>Экономия {money(box.original_price - box.price)}</span>
      </div>

      <section className={`pickup-card pickup-card--${state.key}`} aria-label="Время выдачи">
        <span className="pickup-card__icon"><Icon name="clock"/></span>
        <div>
          <strong>{state.key === 'now' && <span className="live-dot"/>}{state.label}</strong>
          <p>Самовывоз · {box.venue.address}</p>
          {state.key === 'now' && <div className="meter" role="img" aria-label={`Осталось ${state.minutesLeft} мин`}><span style={{ '--value': 1 - state.progress }}/></div>}
          {state.key === 'now' && <small>Осталось {state.minutesLeft >= 60 ? `${Math.floor(state.minutesLeft / 60)} ч ${state.minutesLeft % 60} мин` : `${state.minutesLeft} мин`}</small>}
        </div>
      </section>

      <section className="stock" aria-label="Остаток">
        <div><strong>{box.qty_left > 0 ? `Осталось ${box.qty_left} из ${box.qty_total}` : 'Разобрали'}</strong>{box.qty_left > 0 && box.qty_left <= 2 && <span className="stock__hot"><Icon name="flame" size={14} filled/>Почти закончились</span>}</div>
        <div className="meter meter--stock"><span style={{ '--value': stockShare }}/></div>
      </section>

      {box.description && <p className="detail-description">{box.description}</p>}
      {items.length > 0 && <section className="detail-items"><h2>Что входит</h2><ul>{items.map((line) => <li key={line}><Icon name="check" size={16}/>{line}</li>)}</ul></section>}
      {box.type === 'SURPRISE' && <aside className="callout"><Icon name="sparkle" size={18}/><p><strong>Набор-сюрприз.</strong> Точный состав зависит от того, что осталось к вечеру. Об аллергии спросите при получении.</p></aside>}

      <GoogleMap boxes={[box]} compact/>

      {available && <div className="quantity"><div><strong>Количество</strong><p>До 3 в одном заказе</p></div>
        <div className="stepper">
          <button type="button" disabled={qty <= 1 || busy} onClick={() => changeQty(qty - 1)} aria-label="Уменьшить"><Icon name="minus" size={18}/></button>
          <span aria-live="polite" key={qty}>{qty}</span>
          <button type="button" disabled={qty >= maxQty || busy} onClick={() => changeQty(qty + 1)} aria-label="Увеличить"><Icon name="plus" size={18}/></button>
        </div></div>}
      <ul className="assurances">
        <li><Icon name="wallet" size={18}/>Оплата в заведении при получении</li>
        <li><Icon name="check" size={18}/>Без доставки и сервисного сбора</li>
        <li><Icon name="close" size={18}/>Бронь можно отменить до конца выдачи</li>
      </ul>
    </article>
    <div className="order-bar">
      <div className="order-bar__total"><span>{available ? (qty > 1 ? `Итого за ${qty}` : 'Итого') : 'Недоступно'}</span><strong key={total}>{available ? money(total) : unavailableReason}</strong>{available && <small>вы экономите {money(saved)}</small>}</div>
      {available && <button type="button" className="button button--primary" onClick={order} disabled={busy}>{busy ? <span className="spinner" aria-hidden="true"/> : null}{busy ? 'Бронируем…' : isAuthed ? 'Забронировать' : 'Войти и забронировать'}</button>}
      {!available && <Link className="button button--quiet" to="/">Другие наборы</Link>}
      {message && <p role="alert">{message}</p>}
    </div>
  </main></Shell>;
}
