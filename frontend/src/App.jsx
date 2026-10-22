import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams, useLocation, useNavigationType } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import { getVenueToken, setVenueToken, venueAuth, venueFetch } from './lib/venueApi';
import Admin from './screens/Admin/Admin';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Support from './screens/Support';
import Catalog from './screens/Catalog';
import { Brand, Icon, Shell } from './components/Layout';
import GoogleMap from './components/GoogleMap';
import FoodPhoto from './components/FoodPhoto';
import { savedScroll } from './lib/catalogScroll';
import Orders from './screens/Orders';
import { useLiveRefresh } from './lib/useLiveRefresh';
import SyncStatus from './components/SyncStatus';


const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;
const errorText = {
  account_changed: 'Аккаунт изменился в другой вкладке. Войдите снова перед бронированием.',
  active_order_limit: 'Можно иметь не больше трёх активных броней. Сначала получите или отмените один из заказов.',
  cancellation_reason_invalid: 'Укажите причину отмены: от 5 до 500 символов.',
  order_not_active: 'Заказ уже изменился или окно получения закончилось. Обновите данные.',
  already_exists: 'Такие данные уже используются.', sold_out: 'Набор закончился или время выдачи истекло.', pickup_not_started: 'Время выдачи ещё не началось.', pickup_window_invalid: 'Укажите корректное время выдачи сегодня.', too_many_requests: 'Слишком много попыток. Подождите минуту.', credentials_invalid: 'Почта, телефон или пароль не совпадают.', account_exists: 'Такой аккаунт уже есть.',
  password_invalid: 'Пароль должен содержать от 8 до 128 символов.', email_invalid: 'Проверьте адрес почты.',
  phone_invalid: 'Введите номер полностью.', contact_required: 'Укажите почту или телефон.',
};

function AppHeader() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (pathname === '/partner' || pathname === '/admin') return null;
  return <header className="home-head app-header"><Brand/><span className="location"><Icon name="pin" size={18}/><span>Астана</span></span><Link className="avatar" to="/profile" aria-label="Профиль">{user ? (user.display_name || user.name || 'М')[0] : <Icon name="user" size={19}/>}</Link></header>;
}

function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return <><section className="theme-settings" aria-label="Настройки темы"><div><strong>Тема приложения</strong><p>Выберите, как выглядит Öbal</p></div><div className="theme-options" role="group" aria-label="Тема приложения">{[['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как на устройстве']].map(([value, label]) => <button key={value} type="button" aria-pressed={theme === value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)}>{label}</button>)}</div></section><Link className="settings-row" to="/support"><span>Поддержка Öbal</span><Icon name="arrow"/></Link></>;
}

function BottomNav() {
  const { pathname, search } = useLocation();
  const [instant, setInstant] = useState(false);
  if (pathname.startsWith('/box/') || pathname === '/partner' || pathname === '/admin') return null;
  const selected = pathname === '/orders' ? 2 : ['/profile', '/support'].includes(pathname) ? 3 : pathname === '/search' ? 1
    : new URLSearchParams(search).get('focus') === 'search' ? 1 : 0;
  const tabs = [
    { to: '/', icon: 'home', label: 'Главная' },
    { to: '/search', icon: 'search', label: 'Поиск' },
    { to: '/orders', icon: 'bag', label: 'Заказы' },
    { to: '/profile', icon: 'user', label: 'Профиль' },
  ];
  return <nav className="bottom-nav" aria-label="Основная навигация" data-instant={instant}>
    <span className="bottom-nav__indicator" aria-hidden="true" style={{ transform: `translateX(${selected * 100}%)` }}/>
    {tabs.map((tab, index) => <Link key={tab.to} to={tab.to}
      className={selected === index ? 'active' : undefined}
      aria-current={selected === index ? 'page' : undefined}
      onClick={(event) => setInstant(event.detail === 0)}>
      <Icon name={tab.icon}/><span>{tab.label}</span>
    </Link>)}
  </nav>;
}

function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.catalogReturnTo;
  const backTo = typeof returnTo === 'string' && (returnTo === '/' || returnTo.startsWith('/?') || returnTo === '/search' || returnTo.startsWith('/search?')) ? returnTo : '/';
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
      .catch((err) => { if (active) setError(err.status === 404 ? 'Предложение не найдено.' : 'Не удалось загрузить предложение.'); });
    return () => { active = false; };
  }, [id]);
  async function order() {
    if (!isAuthed) return navigate('/profile', { state: { returnTo: '/box/' + id } });
    setBusy(true); setMessage('');
    try {
      const booked = await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ box_id: box.id, qty, fulfillment: 'PICKUP', idempotency_key: requestKey }) });
      navigate('/orders?order=' + booked.id);
    } catch (err) { setMessage(errorText[err.code] || 'Не получилось забронировать. Проверьте заказы перед повторной попыткой.'); }
    finally { setBusy(false); }
  }
  if (!box) return <Shell><main className="simple-page" id="main-content"><p role="status">{error || 'Загружаем предложение…'}</p><Link to="/">К предложениям</Link></main></Shell>;
  const total = box.price * qty;
  const available = box.status === 'ACTIVE' && box.qty_left >= qty && new Date(box.pickup_date.slice(0, 10) + 'T' + box.pickup_end + ':00+05:00') > new Date();
  return <Shell nav={false}><main className="detail" id="main-content">
    <div className="detail-media"><FoodPhoto src={box.photo_url} alt={box.title} priority/><Link className="round-action back" to={backTo} state={{ restoreScroll: true }} aria-label="Назад"><Icon name="back"/></Link></div>
    <article className="detail-body"><p className="eyebrow">{box.venue.name}{box.venue.rating_count > 0 ? ' · ' + box.venue.rating_avg : ''}</p><h1>{box.title}</h1>
      <div className="detail-price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s><span>Экономия {box.discount_pct}%</span></div>
      <p className="detail-description">{box.description}</p>{box.items && <p>{box.items}</p>}
      <section className="pickup-info"><Icon name="clock"/><div><strong>Самовывоз · {new Date(box.pickup_date).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}, {box.pickup_start}–{box.pickup_end}</strong><p>{box.venue.address}</p></div><GoogleMap boxes={[box]} compact/></section>
      <div className="quantity"><div><strong>Количество</strong><p>Осталось {box.qty_left}</p></div><div className="stepper"><button disabled={qty <= 1 || busy} onClick={() => { setQty(qty - 1); setRequestKey(crypto.randomUUID()); }} aria-label="Уменьшить">−</button><span>{qty}</span><button disabled={qty >= Math.min(3, box.qty_left) || busy} onClick={() => { setQty(qty + 1); setRequestKey(crypto.randomUUID()); }} aria-label="Увеличить">+</button></div></div>
      <p>Оплата в заведении при получении. Сумма к оплате указана выше; доставка и сервисный сбор не добавляются.</p>
    </article>
    <div className="sticky-order"><div><span>Итого</span><strong>{money(total)}</strong></div><button onClick={order} disabled={busy || !available}>{busy ? 'Бронируем…' : available ? 'Забронировать' : 'Недоступно'}</button>{message && <p role="alert">{message}</p>}</div>
  </main></Shell>;
}

function Empty({ title, text, action }) { return <div className="empty"><Icon name="bag" size={30}/><h3>{title}</h3><p>{text}</p>{action}</div>; }

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthed, loading: authLoading, login, register, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [contactType, setContactType] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'login') await login({ identifier: form.identifier, password: form.password });
      else await register({ name: form.name, [contactType]: form[contactType], password: form.password });
      if (location.state?.returnTo?.startsWith('/box/')) navigate(location.state.returnTo, { replace: true });
    } catch (err) { setError(errorText[err.code] || 'Не получилось войти. Проверьте данные.'); }
    finally { setBusy(false); }
  }
  if (authLoading) return <Shell><main className="simple-page" id="main-content"><p role="status">Проверяем вход…</p></main></Shell>;
  if (isAuthed) return <Shell><main className="simple-page profile" id="main-content"><header><h1>Профиль</h1></header><section className="profile-card"><div className="profile-avatar">{(user.display_name || user.name || 'М')[0]}</div><div><h2>{user.display_name || user.name}</h2><p>{user.email || user.phone}</p><p>ID: {user.public_id || `#${user.id}`}</p></div></section><section className="impact-card"><div><strong>{user.boxes_saved || 0}</strong><span>порций спасено</span></div><div><strong>{money(user.money_saved || 0)}</strong><span>сэкономлено</span></div></section>{error && <p className="form-error" role="alert">{error}</p>}<ThemeSettings/><Link className="settings-row" to="/partner"><span>Войти в компанию</span><Icon name="arrow"/></Link><div>{[false, true].map((all) => <button key={String(all)} className="text-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await logout(all); navigate('/'); } catch { setError('Не удалось завершить сессию на сервере. Проверьте подключение и повторите выход.'); } finally { setBusy(false); } }}>{all ? 'Выйти на всех устройствах' : 'Выйти из аккаунта'}</button>)}</div></main></Shell>;
  return <Shell><main className="auth-page" id="main-content"><div className="auth-copy"><p className="eyebrow">Аккаунт Öbal</p><h1>{mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}</h1><p>{mode === 'login' ? 'Войдите, чтобы оформить заказ и сохранить код получения.' : 'Почта или телефон, пароль и ничего лишнего.'}</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Вход</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Регистрация</button></div><form className="auth-form" onSubmit={submit}>
    {mode === 'register' && <><label className="field"><span>Имя</span><input value={form.name} onChange={change('name')} autoComplete="name" required/></label><div className="contact-switch"><button type="button" className={contactType === 'email' ? 'active' : ''} onClick={() => setContactType('email')}>Почта</button><button type="button" className={contactType === 'phone' ? 'active' : ''} onClick={() => setContactType('phone')}>Телефон</button></div></>}
    <label className="field"><span>{mode === 'login' ? 'Почта или телефон' : contactType === 'email' ? 'Почта' : 'Телефон'}</span><input type={mode === 'register' ? contactType === 'email' ? 'email' : 'tel' : 'text'} inputMode={mode === 'register' && contactType === 'phone' ? 'tel' : undefined} value={mode === 'login' ? form.identifier : form[contactType]} onChange={change(mode === 'login' ? 'identifier' : contactType)} autoComplete={mode === 'login' ? 'username' : contactType === 'email' ? 'email' : 'tel'} required/></label>
    <label className="field"><span>Пароль</span><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={change('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" maxLength="128" required/></label><button className="text-button" type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Скрыть пароль' : 'Показать пароль'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
  </form><p className="auth-note">Контакт нужен для входа и бронирования. Имя и телефон, если вы его указали, увидит заведение для выдачи заказа.</p><ThemeSettings/><Link className="settings-row" to="/partner"><span>Войти в компанию</span><Icon name="arrow"/></Link></main></Shell>;
}

function Partner() {
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
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [queueNotice, setQueueNotice] = useState('');
  const seenOrders = useRef(null);
  const pickupInput = useRef(null);
  const sync = useLiveRefresh(async (signal) => {
    const options = { signal, token };
    const [me, offers, queue] = await Promise.all([venueFetch('/me', options), venueFetch('/boxes', options), venueFetch('/orders', options)]);
    if (signal.aborted) return;
    const activeIds = queue.filter((order) => ['RESERVED', 'PAID'].includes(order.status) && new Date(order.reserved_until) > new Date()).map((order) => order.id);
    if (seenOrders.current) {
      const added = activeIds.filter((id) => !seenOrders.current.has(id)).length;
      if (added) setQueueNotice(`Новых броней: ${added}. Проверьте очередь выдачи.`);
    }
    seenOrders.current = new Set(queue.map((order) => order.id));
    setSession(me); setBoxes(offers); setOrders(queue);
  }, Boolean(token));
  const { refresh } = sync;
  useEffect(() => {
    if (sync.error?.status === 401) { setVenueToken(null); setLocalToken(null); setSession(null); seenOrders.current = null; }
  }, [sync.error]);
  async function signIn(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const data = await venueAuth(code); setVenueToken(data.token); setLocalToken(data.token); }
    catch { setError('Не удалось войти. Проверьте код и подключение.'); }
    finally { setBusy(false); }
  }
  async function issue(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await venueFetch('/pickup', { method: 'POST', body: JSON.stringify({ code: pickupCode }) });
      setPickupCode(''); setNotice('Выдача подтверждена.');
      setQueueNotice('');
      await refresh({ fresh: true });
    } catch (err) { setError(errorText[err.code] || 'Не удалось подтвердить выдачу. Проверьте код и обновите заказы.'); }
    finally { setBusy(false); requestAnimationFrame(() => pickupInput.current?.focus()); }
  }
  async function cancelReservation(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await venueFetch('/orders/' + cancelling + '/cancel', { method: 'POST', body: JSON.stringify({ reason: cancelReason }) });
      setCancelling(null); setCancelReason(''); setNotice('Заказ отменён. Покупатель увидит причину в билете. Набор снят с продажи.');
      await refresh({ fresh: true });
    } catch (err) { setError(errorText[err.code] || 'Не удалось отменить заказ. Обновите очередь.'); }
    finally { setBusy(false); }
  }
  async function closeOffer(box) {
    if (!window.confirm(`Снять «${box.title}» с продажи? Уже оформленные заказы сохранятся.`)) return;
    setBusy(true); setError('');
    try {
      await venueFetch('/boxes/' + box.id, { method: 'PATCH', body: JSON.stringify({ status: 'EXPIRED' }) });
      await refresh({ fresh: true });
    } catch { setError('Не удалось снять набор с продажи. Обновите данные и попробуйте снова.'); }
    finally { setBusy(false); }
  }
  if (!token) return <main className="partner-login" id="main-content"><Brand partner/><form onSubmit={signIn}><p className="eyebrow">Для партнёров</p><h1>Вход для заведения</h1><p>Введите код, полученный при подключении к Öbal.</p><label className="field"><span>Код заведения</span><input value={code} onChange={(e) => setCode(e.target.value)} required/></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Входим…' : 'Открыть кабинет'}</button></form><Link to="/">Вернуться в приложение</Link></main>;
  if (!session) return <main className="simple-page" id="main-content"><p role="status">{error || (sync.error ? 'Не удалось загрузить кабинет.' : 'Загружаем кабинет…')}</p><SyncStatus {...sync}/><button onClick={() => { setVenueToken(null); setLocalToken(null); }}>Вернуться ко входу</button></main>;
  const stats = session.today_stats;
  const active = orders.filter((order) => ['RESERVED', 'PAID'].includes(order.status) && new Date(order.reserved_until) > new Date()).sort((a, b) => a.box.pickup_end.localeCompare(b.box.pickup_end) || a.id - b.id);
  return <main className="partner" id="main-content">
    <header className="partner-top"><Brand partner/><div><strong>{session.venue.name}</strong><span>{session.venue.address}</span></div><button className="text-button" onClick={() => { setVenueToken(null); setLocalToken(null); setSession(null); seenOrders.current = null; setQueueNotice(''); }}>Выйти</button></header>
    <section className="partner-hero"><div><p className="eyebrow">{new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long' })}</p><h1>{session.venue.name}</h1><p>Предложения и выдача заказов на сегодня.</p></div><button className="button" onClick={() => { setEditingBox(null); setShowForm(true); }}>Добавить набор</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <section className="metrics"><div><span>Выдано заказов</span><strong>{stats.picked_up}</strong></div><div><span>Выдано за вычетом комиссии</span><strong>{money(stats.revenue)}</strong></div><div><span>Спасено порций</span><strong>{stats.portions_saved}</strong></div><div><span>Комиссия заведения</span><strong>{session.venue.commission_pct}%</strong></div></section>
    <SyncStatus {...sync}/>
    {showForm && <OfferForm key={editingBox?.id || 'new'} box={editingBox} onCancel={() => setShowForm(false)} onDone={() => { setShowForm(false); setEditingBox(null); void refresh({ fresh: true }); }}/>}
    <div className="partner-columns">
    <aside className="live-orders"><h2>Выдача заказов</h2>
      {queueNotice && <p className="queue-notice" role="status">{queueNotice} <button className="text-button" onClick={() => setQueueNotice('')}>Понятно</button></p>}
      <form onSubmit={issue}><label className="field"><span>Код с экрана покупателя</span><input ref={pickupInput} value={pickupCode} onChange={(e) => setPickupCode(e.target.value.toUpperCase())} inputMode="numeric" autoComplete="off" required maxLength={12}/></label><button className="button" disabled={busy}>Подтвердить выдачу</button></form>
      <h3>Ожидают получения: {active.length}</h3>{!active.length && <p>Активных заказов пока нет.</p>}
      {active.map((order) => <article key={order.id}><strong>Заказ №{order.id} · {order.customer_name || order.user?.name || 'Покупатель'}</strong><p>{order.box.title} × {order.qty}</p><p>{money(order.amount)} · {order.box.pickup_start}–{order.box.pickup_end}</p>
        {order.status === 'PAID' ? <p>Оплачен. Для отмены и возврата обратитесь в поддержку.</p> : cancelling === order.id
          ? <form className="venue-cancel-form" onSubmit={cancelReservation}><p>Набор будет снят с продажи. Остальные брони сохранятся — проверьте, сможете ли их выдать.</p><label className="field"><span>Причина для покупателя</span><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} minLength={5} maxLength={500} required/></label><button className="button" disabled={busy || cancelReason.trim().length < 5}>Отменить заказ</button><button className="text-button" type="button" disabled={busy} onClick={() => { setCancelling(null); setCancelReason(''); }}>Назад</button></form>
          : <button className="text-button" disabled={busy} onClick={() => { setCancelling(order.id); setCancelReason(''); }}>Не можем выдать заказ</button>}
      </article>)}
    </aside>
    <section className="offers"><h2>Наборы на сегодня</h2>{!boxes.length && <p>Предложений пока нет. Добавьте первый набор.</p>}<div className="offer-table">{boxes.map((box) => <article key={box.id}><div className="offer-name"><div><strong>{box.title}</strong><span>{box.description}</span></div></div><span>{box.pickup_start}–{box.pickup_end}</span><span>{money(box.price)}</span><span>{box.qty_left} / {box.qty_total}</span><span>{!box.is_approved ? 'На проверке' : ({ ACTIVE: 'Активен', SOLD_OUT: 'Разобрали', EXPIRED: 'Закрыт' })[box.status]}</span><span className="offer-actions">{box.status === 'ACTIVE' && box._count.orders === 0 && <button className="text-button" disabled={busy} onClick={() => { setEditingBox(box); setShowForm(true); }}>Изменить</button>}{box.status === 'ACTIVE' && <button className="text-button" disabled={busy} onClick={() => closeOffer(box)}>Снять</button>}</span></article>)}</div></section></div>
  </main>;
}

function OfferForm({ box, onDone, onCancel }) {
  const [form, setForm] = useState({ title: box?.title || '', type: 'SURPRISE', description: '', items: '', photo_url: '', price: box?.price || '', original_price: box?.original_price || '', qty: box?.qty_left || '', pickup_start: box?.pickup_start || '19:00', pickup_end: box?.pickup_end || '21:00' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = box
        ? { title: form.title, price: Number(form.price), original_price: Number(form.original_price), qty_left: Number(form.qty), pickup_start: form.pickup_start, pickup_end: form.pickup_end }
        : { ...form, price: Number(form.price), original_price: Number(form.original_price), qty: Number(form.qty), photo_url: form.photo_url || null, items: form.type === 'ITEMIZED' ? form.items : null };
      const saved = await venueFetch(box ? '/boxes/' + box.id : '/boxes', { method: box ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      onDone(saved);
    } catch (err) { setError(errorText[err.code] || 'Не удалось опубликовать. Проверьте данные и список предложений перед повтором.'); }
    finally { setBusy(false); }
  }
  return <form className="offer-form" onSubmit={submit}><h2>{box ? 'Изменить набор' : 'Новый набор'}</h2>
    <label className="field"><span>Название</span><input value={form.title} onChange={change('title')} maxLength={160} required/></label>
    {!box && <><label className="field"><span>Тип набора</span><select value={form.type} onChange={change('type')}><option value="SURPRISE">Сюрприз</option><option value="ITEMIZED">Точный состав</option></select></label>
    <label className="field offer-form__wide"><span>Описание и важные аллергены</span><textarea value={form.description} onChange={change('description')} maxLength={4000} rows="3" required/></label>
    {form.type === 'ITEMIZED' && <label className="field offer-form__wide"><span>Что входит в набор</span><textarea value={form.items} onChange={change('items')} maxLength={4000} rows="3" required/></label>}
    <label className="field"><span>Ссылка на фото (необязательно)</span><input type="url" value={form.photo_url} onChange={change('photo_url')} placeholder="https://"/></label></>}
    <label className="field"><span>Цена</span><input type="number" min="1" max="10000000" value={form.price} onChange={change('price')} required/></label>
    <label className="field"><span>Обычная цена</span><input type="number" min="1" max="10000000" value={form.original_price} onChange={change('original_price')} required/></label>
    <label className="field"><span>Количество</span><input type="number" value={form.qty} onChange={change('qty')} min="1" max="1000" required/></label>
    <label className="field"><span>С</span><input type="time" value={form.pickup_start} onChange={change('pickup_start')} required/></label>
    <label className="field"><span>До</span><input type="time" value={form.pickup_end} onChange={change('pickup_end')} required/></label>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Сохраняем…' : box ? 'Сохранить' : 'Опубликовать'}</button><button type="button" className="text-button" onClick={onCancel}>Отмена</button>
  </form>;
}

function AppRoutes() {
  const { pathname, search, state } = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    window.scrollTo({ top: navigation === 'POP' || state?.restoreScroll ? savedScroll(pathname + search) : 0, behavior: 'instant' });
  }, [pathname, search]);
  return <div className="page-transition" key={pathname}><Routes><Route path="/" element={<Catalog/>}/><Route path="/search" element={<Catalog discovery/>}/><Route path="/support" element={<Support/>}/><Route path="/box/:id" element={<Detail/>}/><Route path="/orders" element={<Orders/>}/><Route path="/profile" element={<Profile/>}/><Route path="/partner" element={<Partner/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Catalog/>}/></Routes></div>;
}

export default function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><a className="skip-link" href="#main-content">К содержанию</a><AppHeader/><AppRoutes/><BottomNav/></AuthProvider></ThemeProvider></BrowserRouter>;
}
