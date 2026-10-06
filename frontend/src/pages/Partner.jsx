import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVenueToken, setVenueToken, venueAuth, venueFetch } from '../lib/venueApi';
import { Brand, errorText, Icon, money } from '../ui';

const boxStatus = { ACTIVE: 'В продаже', SOLD_OUT: 'Разобрали', EXPIRED: 'Снят' };

export default function Partner() {
  const [token, setLocalToken] = useState(getVenueToken());
  const [session, setSession] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [code, setCode] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const codeInput = useRef(null);

  const signOut = () => { setVenueToken(null); setLocalToken(null); setSession(null); };
  const refresh = useCallback(async () => {
    const [me, offers, queue] = await Promise.all([venueFetch('/me'), venueFetch('/boxes'), venueFetch('/orders')]);
    setSession(me); setBoxes(offers); setOrders(queue);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    refresh().catch((err) => {
      if (err.status === 401) signOut();
      setError('Не удалось загрузить кабинет. Проверьте подключение или войдите снова.');
    });
    // New bookings arrive without any action at the counter.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh().catch(() => {}); }, 30000);
    return () => clearInterval(timer);
  }, [token, refresh]);

  async function signIn(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const data = await venueAuth(code.trim()); setVenueToken(data.token); setLocalToken(data.token); }
    catch (err) { setError(err.code === 'too_many_requests' ? errorText.too_many_requests : 'Код не подошёл. Проверьте его или запросите новый у команды Öbal.'); }
    finally { setBusy(false); }
  }
  async function issue(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await venueFetch('/pickup', { method: 'POST', body: JSON.stringify({ code: pickupCode.trim() }) });
      setPickupCode('');
      setNotice(`Выдано: ${result.box}${result.buyer ? ` — ${result.buyer}` : ''}. Примите оплату.`);
      await refresh();
    } catch (err) { setError(errorText[err.code] || 'Не удалось подтвердить выдачу. Проверьте код и обновите заказы.'); }
    finally { setBusy(false); codeInput.current?.focus(); }
  }
  async function closeOffer(box) {
    if (!window.confirm(`Снять «${box.title}» с продажи? Уже оформленные заказы сохранятся.`)) return;
    setBusy(true); setError('');
    try { await venueFetch('/boxes/' + box.id, { method: 'PATCH', body: JSON.stringify({ status: 'EXPIRED' }) }); await refresh(); }
    catch { setError('Не удалось снять набор с продажи. Обновите данные и попробуйте снова.'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="partner-login" id="main-content"><Brand partner/>
    <form onSubmit={signIn}><h1>Кабинет заведения</h1><p>Введите код, который вы получили при подключении к Öbal.</p>
      <label className="field"><span>Код заведения</span><input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck="false" required/></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? 'Входим…' : 'Открыть кабинет'}</button></form>
    <Link to="/">Вернуться в приложение</Link></main>;

  if (!session) return <main className="simple-page" id="main-content"><p role="status">{error || 'Загружаем кабинет…'}</p><button type="button" className="text-button" onClick={signOut}>Вернуться ко входу</button></main>;

  const { venue, today_stats: stats } = session;
  const waiting = orders.filter((order) => ['RESERVED', 'PAID'].includes(order.status) && new Date(order.reserved_until) > new Date());
  return <main className="partner" id="main-content">
    <header className="partner-top"><Brand partner/><div><strong>{venue.name}</strong><span>{venue.address}</span></div><button type="button" className="text-button" onClick={signOut}>Выйти</button></header>
    {(!venue.is_approved || !venue.is_active) && <p className="notice partner-banner" role="status">{!venue.is_active ? 'Заведение скрыто от покупателей.' : 'Карточка заведения на проверке.'} Новые наборы станут видны после одобрения командой Öbal.</p>}
    <section className="partner-hero"><div><p className="eyebrow">{new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{venue.name}</h1></div>
      <div className="partner-hero__actions"><button type="button" className="button button--quiet" disabled={busy} onClick={() => refresh().then(() => setError('')).catch(() => setError('Не удалось обновить кабинет.'))}><Icon name="refresh" size={18}/> Обновить</button><button type="button" className="button" onClick={() => { setEditingBox(null); setShowForm(true); }}><Icon name="plus" size={18}/> Добавить набор</button></div></section>
    {error && <p className="notice notice--error partner-banner" role="alert">{error}</p>}
    {notice && <p className="notice notice--ok partner-banner" role="status"><Icon name="check" size={18}/> {notice}</p>}
    <div className="partner-columns">
      <aside className="live-orders" aria-labelledby="pickup-title">
        <h2 id="pickup-title">Выдача заказа</h2>
        <form onSubmit={issue} className="pickup-form"><label className="field"><span>Код с экрана покупателя</span><input ref={codeInput} className="code-input" value={pickupCode} onChange={(e) => setPickupCode(e.target.value.replace(/\s/g, '').toUpperCase())} inputMode="numeric" autoComplete="off" placeholder="000000" required maxLength={12}/></label><button className="button" disabled={busy || !pickupCode.trim()}>Подтвердить выдачу</button></form>
        <h3>Ждут получения · {waiting.length}</h3>
        {!waiting.length && <p className="muted">Пока никто не ждёт. Новые брони появятся здесь автоматически.</p>}
        {waiting.map((order) => <article key={order.id}><div><strong>{order.customer_name || order.user?.display_name || order.user?.name || 'Покупатель'}</strong><span>№{order.id}</span></div><p>{order.box.title} × {order.qty} · {money(order.amount)}</p><p>Выдача {order.box.pickup_start}–{order.box.pickup_end}{order.customer_phone && <> · <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></>}</p></article>)}
      </aside>
      <div className="partner-main">
        <section className="metrics" aria-label="Сегодня"><div><span>Ждут получения</span><strong>{waiting.length}</strong></div><div><span>Выдано заказов</span><strong>{stats.picked_up}</strong></div><div><span>Ваша выручка после комиссии</span><strong>{money(stats.revenue)}</strong></div><div><span>Спасено порций</span><strong>{stats.portions_saved}</strong></div></section>
        {showForm && <OfferForm key={editingBox?.id || 'new'} box={editingBox} venue={venue} onCancel={() => setShowForm(false)} onDone={() => { setShowForm(false); setEditingBox(null); setNotice('Набор отправлен на проверку. После одобрения его увидят покупатели.'); refresh().catch(() => setError('Набор сохранён, но список не обновился. Нажмите «Обновить».')); }}/>}
        <section className="offers"><h2>Наборы на сегодня</h2>
          {!boxes.length && <p className="muted">Предложений пока нет. Добавьте первый набор — это займёт минуту.</p>}
          <div className="offer-table">{boxes.map((box) => <article key={box.id}>
            <div className="offer-name"><strong>{box.title}</strong><span>{box.description}</span></div>
            <span><small>Выдача</small>{box.pickup_start}–{box.pickup_end}</span>
            <span><small>Цена</small>{money(box.price)}</span>
            <span><small>Осталось</small>{box.qty_left} из {box.qty_total}</span>
            <span><small>Статус</small><b className={`offer-status${!box.is_approved && box.status === 'ACTIVE' ? ' is-wait' : box.status === 'ACTIVE' ? ' is-ok' : ''}`}>{!box.is_approved && box.status === 'ACTIVE' ? 'На проверке' : boxStatus[box.status]}</b></span>
            <span className="offer-actions">{box.status === 'ACTIVE' && box._count.orders === 0 && <button type="button" className="text-button" disabled={busy} onClick={() => { setEditingBox(box); setShowForm(true); }}>Изменить</button>}{box.status === 'ACTIVE' && <button type="button" className="text-button" disabled={busy} onClick={() => closeOffer(box)}>Снять</button>}</span>
          </article>)}</div>
        </section>
      </div>
    </div>
  </main>;
}

function OfferForm({ box, venue, onDone, onCancel }) {
  const [form, setForm] = useState({ title: box?.title || '', type: 'SURPRISE', description: '', items: '', photo_url: '', price: box?.price || '', original_price: box?.original_price || '', qty: box?.qty_left || '', pickup_start: box?.pickup_start || venue.default_pickup_start || '19:00', pickup_end: box?.pickup_end || venue.default_pickup_end || '21:00' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const price = Number(form.price); const original = Number(form.original_price);
  const discount = price > 0 && original > price ? Math.round((1 - price / original) * 100) : null;
  async function submit(e) {
    e.preventDefault(); setError('');
    if (price >= original) return setError(errorText.price_must_be_less_than_original);
    if (form.pickup_end <= form.pickup_start) return setError('Окончание выдачи должно быть позже начала.');
    setBusy(true);
    try {
      const payload = box
        ? { title: form.title, price, original_price: original, qty_left: Number(form.qty), pickup_start: form.pickup_start, pickup_end: form.pickup_end }
        : { ...form, price, original_price: original, qty: Number(form.qty), photo_url: form.photo_url || null, items: form.type === 'ITEMIZED' ? form.items : null };
      onDone(await venueFetch(box ? '/boxes/' + box.id : '/boxes', { method: box ? 'PATCH' : 'POST', body: JSON.stringify(payload) }));
    } catch (err) { setError(errorText[err.code] || 'Не удалось сохранить. Проверьте данные и список наборов перед повтором.'); }
    finally { setBusy(false); }
  }
  return <form className="offer-form" onSubmit={submit}><h2>{box ? 'Изменить набор' : 'Новый набор на сегодня'}</h2>
    <label className="field offer-form__wide"><span>Название</span><input value={form.title} onChange={change('title')} maxLength={160} placeholder="Например, «Вечерняя выпечка»" required/></label>
    {!box && <><label className="field"><span>Тип набора</span><select value={form.type} onChange={change('type')}><option value="SURPRISE">Сюрприз — состав меняется</option><option value="ITEMIZED">Точный состав</option></select></label>
      <label className="field"><span>Ссылка на фото, необязательно</span><input type="url" value={form.photo_url} onChange={change('photo_url')} placeholder="https://"/></label>
      <label className="field offer-form__wide"><span>Описание и аллергены</span><textarea value={form.description} onChange={change('description')} maxLength={4000} rows="3" placeholder="Что примерно внутри, есть ли орехи, глютен, лактоза" required/></label>
      {form.type === 'ITEMIZED' && <label className="field offer-form__wide"><span>Что входит, каждая позиция с новой строки</span><textarea value={form.items} onChange={change('items')} maxLength={4000} rows="3" required/></label>}</>}
    <label className="field"><span>Обычная цена, ₸</span><input type="number" inputMode="numeric" min="1" max="10000000" value={form.original_price} onChange={change('original_price')} required/></label>
    <label className="field"><span>Цена в Öbal, ₸{discount !== null && <em className="field-hint"> · скидка {discount}%</em>}</span><input type="number" inputMode="numeric" min="1" max="10000000" value={form.price} onChange={change('price')} required/></label>
    <label className="field"><span>Количество</span><input type="number" inputMode="numeric" value={form.qty} onChange={change('qty')} min="1" max="1000" required/></label>
    <label className="field"><span>Выдача с</span><input type="time" value={form.pickup_start} onChange={change('pickup_start')} required/></label>
    <label className="field"><span>Выдача до</span><input type="time" value={form.pickup_end} onChange={change('pickup_end')} required/></label>
    {error && <p className="form-error offer-form__wide" role="alert">{error}</p>}
    <div className="offer-form__actions offer-form__wide"><button className="button" disabled={busy}>{busy ? 'Сохраняем…' : box ? 'Сохранить' : 'Опубликовать'}</button><button type="button" className="text-button" onClick={onCancel}>Отмена</button></div>
  </form>;
}
