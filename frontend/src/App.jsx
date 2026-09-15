import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import { getVenueToken, setVenueToken, venueAuth, venueFetch } from './lib/venueApi';

const images = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85',
];


const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;
const categoryLabels = { ALL: 'Все', BAKERY: 'Выпечка', PREPARED: 'Готовая еда', SUPERMARKET: 'Продукты', CAFE: 'Кофейни', DESSERT: 'Десерты' };
const errorText = {
  already_exists: 'Такие данные уже используются.', sold_out: 'Набор закончился или время выдачи истекло.', pickup_not_started: 'Время выдачи ещё не началось.', pickup_window_invalid: 'Укажите корректное время выдачи сегодня.', too_many_requests: 'Слишком много попыток. Подождите минуту.', credentials_invalid: 'Почта, телефон или пароль не совпадают.', account_exists: 'Такой аккаунт уже есть.',
  password_invalid: 'Пароль должен содержать от 8 до 128 символов.', email_invalid: 'Проверьте адрес почты.',
  phone_invalid: 'Введите номер полностью.', contact_required: 'Укажите почту или телефон.',
};

function Icon({ name, size = 22 }) {
  const paths = {
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
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Brand({ partner = false }) {
  return <Link to="/" className="brand" aria-label="Öbal, на главную"><span>öbal</span>{partner && <em>partner</em>}</Link>;
}

function Shell({ children }) {
  return <div className="consumer-shell">{children}</div>;
}

function BottomNav() {
  const { pathname, search } = useLocation();
  const [instant, setInstant] = useState(false);
  if (pathname.startsWith('/box/') || pathname === '/partner') return null;
  const selected = pathname === '/orders' ? 2 : pathname === '/profile' ? 3
    : new URLSearchParams(search).get('focus') === 'search' ? 1 : 0;
  const tabs = [
    { to: '/', icon: 'home', label: 'Главная' },
    { to: '/?focus=search', icon: 'search', label: 'Поиск' },
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

function DealCard({ box, index }) {
  return <Link className="deal-card" to={`/box/${box.id}`} style={{ '--delay': `${index * 45}ms` }}>
    <div className="deal-card__media">
      <img src={box.photo_url || images[index % images.length]} alt={`${box.title}, ${box.venue.name}`} />
      <span className="deal-card__discount">−{box.discount_pct}%</span>
      <span className="deal-card__left">Осталось {box.qty_left}</span>
    </div>
    <div className="deal-card__body">
      <div><p className="eyebrow">{box.venue.name}</p><h3>{box.title}</h3></div>
      <p className="deal-card__meta"><Icon name="clock" size={17}/> Сегодня {box.pickup_start}–{box.pickup_end}</p>
      <p className="deal-card__meta"><Icon name="pin" size={17}/> {box.distance_km ? `${box.distance_km} км` : box.venue.district}</p>
      <div className="price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s></div>
    </div>
  </Link>;
}

function Home() {
  const [boxes, setBoxes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [view, setView] = useState('list');

  useEffect(() => {
    let active = true;
    apiFetch('/boxes', { skipAuth: true }).then((data) => { if (active) setBoxes(data); })
      .catch(() => { if (active) setError('Не удалось загрузить предложения. Проверьте подключение и обновите страницу.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visible = useMemo(() => boxes.filter((box) => {
    const matchesCategory = category === 'ALL' || box.venue.category === category;
    const haystack = `${box.title} ${box.venue.name}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [boxes, category, query]);

  return <Shell><main className="home" id="main-content">
    <header className="home-head"><Brand/><button className="location"><Icon name="pin" size={18}/><span>Астана · Есиль</span></button><Link className="avatar" to="/profile" aria-label="Профиль">М</Link></header>
    <section className="intro">
      <div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Что спасём сегодня?" aria-label="Поиск предложений"/></div>
      <div className="hero-copy"><p className="eyebrow">Еда с хорошим продолжением</p><h1>Заберите сегодня дешевле</h1><p>Еда из заведений рядом со скидкой. Заберите сегодня в указанное время.</p></div>
    </section>
    <div className="category-row" aria-label="Категории">{Object.entries(categoryLabels).map(([key, label]) => <button key={key} className={category === key ? 'active' : ''} onClick={() => setCategory(key)}>{label}</button>)}</div>
    <section className="feed-head"><div><p className="eyebrow">Рядом с вами</p><h2>Можно забрать сегодня</h2></div><div className="view-switch"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Список</button><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Карта</button></div></section>
    {view === 'list'
      ? <section className="deal-grid">{visible.map((box, index) => <DealCard key={box.id} box={box} index={index}/>)}</section>
      : <GoogleMap boxes={visible}/>
    }
    {loading && <p role="status">Загружаем предложения…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && !visible.length && <div className="empty"><Icon name="search" size={30}/><h3>Ничего не нашли</h3><p>Сбросьте фильтр или попробуйте другой запрос.</p><button onClick={() => { setCategory('ALL'); setQuery(''); }}>Показать всё</button></div>}
    <section className="impact-strip"><Icon name="leaf" size={30}/><div><strong>Каждый заказ помогает</strong><p>Вы экономите, а хорошая еда не отправляется в мусор.</p></div></section>
  </main></Shell>;
}

function GoogleMap({ boxes }) {
  const first = boxes[0];
  if (!first) return null;
  const query = encodeURIComponent(`${first.venue.geo_lat},${first.venue.geo_lng}`);
  return <section className="map-panel">
    <iframe title="Предложения Öbal на Google Maps" src={`https://www.google.com/maps?q=${query}&z=13&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
    <div className="map-results"><strong>{first.venue.name}</strong><p>На карте первое заведение из списка. Адрес каждого предложения есть в его карточке.</p></div>
  </section>;
}

function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [box, setBox] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setBox(null); setError(''); setQty(1);
    apiFetch('/boxes/' + id, { skipAuth: true }).then((data) => { if (active) setBox(data); })
      .catch((err) => { if (active) setError(err.status === 404 ? 'Предложение не найдено.' : 'Не удалось загрузить предложение.'); });
    return () => { active = false; };
  }, [id]);
  async function order() {
    if (!isAuthed) return navigate('/profile', { state: { returnTo: '/box/' + id } });
    setBusy(true); setMessage('');
    try {
      await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ box_id: box.id, qty, fulfillment: 'PICKUP' }) });
      navigate('/orders');
    } catch (err) { setMessage(errorText[err.code] || 'Не получилось забронировать. Проверьте заказы перед повторной попыткой.'); }
    finally { setBusy(false); }
  }
  if (!box) return <Shell><main className="simple-page" id="main-content"><p role="status">{error || 'Загружаем предложение…'}</p><Link to="/">К предложениям</Link></main></Shell>;
  const total = box.price * qty;
  const available = box.status === 'ACTIVE' && box.qty_left >= qty && new Date(box.pickup_date.slice(0, 10) + 'T' + box.pickup_end + ':00+05:00') > new Date();
  return <Shell nav={false}><main className="detail" id="main-content">
    <div className="detail-media"><img src={box.photo_url || images[0]} alt={box.title}/><Link className="round-action back" to="/" aria-label="Назад"><Icon name="back"/></Link></div>
    <article className="detail-body"><p className="eyebrow">{box.venue.name}{box.venue.rating_count > 0 ? ' · ' + box.venue.rating_avg : ''}</p><h1>{box.title}</h1>
      <div className="detail-price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s><span>Экономия {box.discount_pct}%</span></div>
      <p className="detail-description">{box.description}</p>{box.items && <p>{box.items}</p>}
      <section className="pickup-info"><Icon name="clock"/><div><strong>Самовывоз · {new Date(box.pickup_date).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}, {box.pickup_start}–{box.pickup_end}</strong><p>{box.venue.address}</p><a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(box.venue.geo_lat + ',' + box.venue.geo_lng)} target="_blank" rel="noreferrer">Открыть в Google Maps</a></div></section>
      <div className="quantity"><div><strong>Количество</strong><p>Осталось {box.qty_left}</p></div><div className="stepper"><button disabled={qty <= 1 || busy} onClick={() => setQty(qty - 1)} aria-label="Уменьшить">−</button><span>{qty}</span><button disabled={qty >= Math.min(3, box.qty_left) || busy} onClick={() => setQty(qty + 1)} aria-label="Увеличить">+</button></div></div>
      <p>Без доставки и дополнительного сервисного сбора. Онлайн-оплата пока не подключена.</p>
    </article>
    <div className="sticky-order"><div><span>Итого</span><strong>{money(total)}</strong></div><button onClick={order} disabled={busy || !available}>{busy ? 'Бронируем…' : available ? 'Забронировать' : 'Недоступно'}</button>{message && <p role="alert">{message}</p>}</div>
  </main></Shell>;
}

const orderLabels = { RESERVED: 'Ждёт получения', PAID: 'Оплачен', PICKED_UP: 'Получен', CANCELLED: 'Отменён', NO_SHOW: 'Время получения истекло' };

function Orders() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  async function refresh() {
    const data = await apiFetch('/orders');
    setOrders([...data.active, ...data.past]);
  }
  useEffect(() => {
    if (!isAuthed) { setLoading(false); return; }
    setLoading(true);
    refresh().catch(() => setError('Не удалось загрузить заказы. Обновите страницу.')).finally(() => setLoading(false));
  }, [isAuthed]);
  async function cancel(id) {
    if (!window.confirm('Отменить бронирование?')) return;
    setBusy(id); setError('');
    try { await apiFetch('/orders/' + id + '/cancel', { method: 'POST', body: '{}' }); await refresh(); }
    catch { setError('Не удалось отменить заказ. Обновите список перед повторной попыткой.'); }
    finally { setBusy(null); }
  }
  return <Shell><main className="simple-page" id="main-content"><header><Brand/><h1>Ваши заказы</h1></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {authLoading || loading ? <p role="status">Загружаем…</p> : !isAuthed
      ? <Empty title="Сначала войдите" text="После входа здесь появятся заказы и коды получения." action={<Link className="button" to="/profile">Войти</Link>}/>
      : orders.length ? <div className="order-list">{orders.map((order) => <article key={order.id}><div><p className="eyebrow">{orderLabels[order.status] || order.status}</p><h3>{order.box.title}</h3><p>{order.box.venue.name} · {order.box.pickup_start}–{order.box.pickup_end}</p><p>{order.box.venue.address}</p><p>{money(order.amount)}</p>{order.status === 'RESERVED' && <button className="text-button" disabled={busy === order.id} onClick={() => cancel(order.id)}>Отменить</button>}</div>{['RESERVED', 'PAID'].includes(order.status) && <strong className="pickup-code" style={{ fontSize: '1rem', overflowWrap: 'anywhere' }}>{order.pickup_code}</strong>}</article>)}</div>
      : !error && <Empty title="Заказов пока нет" text="Выберите набор на сегодня. После бронирования код появится здесь." action={<Link className="button" to="/">Смотреть предложения</Link>}/>}
  </main></Shell>;
}

function Empty({ title, text, action }) { return <div className="empty"><Icon name="bag" size={30}/><h3>{title}</h3><p>{text}</p>{action}</div>; }

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthed, login, register, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [contactType, setContactType] = useState('email');
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
  if (isAuthed) return <Shell><main className="simple-page profile" id="main-content"><header><Brand/><h1>Профиль</h1></header><section className="profile-card"><div className="profile-avatar">{(user.display_name || user.name || 'М')[0]}</div><div><h2>{user.display_name || user.name}</h2><p>{user.email || user.phone}</p></div></section><section className="impact-card"><div><strong>{user.boxes_saved || 0}</strong><span>порций спасено</span></div><div><strong>{money(user.money_saved || 0)}</strong><span>сэкономлено</span></div></section><Link className="settings-row" to="/partner"><span>Кабинет заведения</span><Icon name="arrow"/></Link><button className="text-button" onClick={() => { logout(); navigate('/'); }}>Выйти из аккаунта</button></main></Shell>;
  return <Shell><main className="auth-page" id="main-content"><Brand/><div className="auth-copy"><p className="eyebrow">Аккаунт Öbal</p><h1>{mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}</h1><p>{mode === 'login' ? 'Войдите, чтобы оформить заказ и сохранить код получения.' : 'Почта или телефон, пароль и ничего лишнего.'}</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Вход</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Регистрация</button></div><form className="auth-form" onSubmit={submit}>
    {mode === 'register' && <><label className="field"><span>Имя</span><input value={form.name} onChange={change('name')} autoComplete="name" required/></label><div className="contact-switch"><button type="button" className={contactType === 'email' ? 'active' : ''} onClick={() => setContactType('email')}>Почта</button><button type="button" className={contactType === 'phone' ? 'active' : ''} onClick={() => setContactType('phone')}>Телефон</button></div></>}
    <label className="field"><span>{mode === 'login' ? 'Почта или телефон' : contactType === 'email' ? 'Почта' : 'Телефон'}</span><input type={mode === 'register' && contactType === 'email' ? 'email' : 'text'} value={mode === 'login' ? form.identifier : form[contactType]} onChange={change(mode === 'login' ? 'identifier' : contactType)} autoComplete={contactType === 'email' ? 'email' : 'tel'} required/></label>
    <label className="field"><span>Пароль</span><input type="password" value={form.password} onChange={change('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required/></label>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button auth-submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
  </form><p className="auth-note">Продолжая, вы принимаете условия сервиса и политику конфиденциальности.</p></main></Shell>;
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
  async function refresh() {
    const [me, offers, queue] = await Promise.all([venueFetch('/me'), venueFetch('/boxes'), venueFetch('/orders')]);
    setSession(me); setBoxes(offers); setOrders(queue);
  }
  useEffect(() => {
    if (token) refresh().catch((err) => {
      if (err.status === 401) { setVenueToken(null); setLocalToken(null); }
      setError('Не удалось загрузить кабинет. Проверьте подключение или войдите снова.');
    });
  }, [token]);
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
      await refresh();
    } catch (err) { setError(errorText[err.code] || 'Не удалось подтвердить выдачу. Проверьте код и обновите заказы.'); }
    finally { setBusy(false); }
  }
  if (!token) return <main className="partner-login" id="main-content"><Brand partner/><form onSubmit={signIn}><p className="eyebrow">Для партнёров</p><h1>Вход для заведения</h1><p>Введите код, полученный при подключении к Öbal.</p><label className="field"><span>Код заведения</span><input value={code} onChange={(e) => setCode(e.target.value)} required/></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Входим…' : 'Открыть кабинет'}</button></form><Link to="/">Вернуться в приложение</Link></main>;
  if (!session) return <main className="simple-page" id="main-content"><p role="status">{error || 'Загружаем кабинет…'}</p><button onClick={() => { setVenueToken(null); setLocalToken(null); }}>Вернуться ко входу</button></main>;
  const stats = session.today_stats;
  const active = orders.filter((order) => ['RESERVED', 'PAID'].includes(order.status));
  return <main className="partner" id="main-content">
    <header className="partner-top"><Brand partner/><div><strong>{session.venue.name}</strong><span>{session.venue.address}</span></div><button className="text-button" onClick={() => { setVenueToken(null); setLocalToken(null); setSession(null); }}>Выйти</button></header>
    <section className="partner-hero"><div><p className="eyebrow">{new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long' })}</p><h1>{session.venue.name}</h1><p>Предложения и выдача заказов на сегодня.</p></div><button className="button" onClick={() => setShowForm(!showForm)}>Добавить набор</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <section className="metrics"><div><span>Выдано заказов</span><strong>{stats.picked_up}</strong></div><div><span>Выдано за вычетом комиссии</span><strong>{money(stats.revenue)}</strong></div><div><span>Спасено порций</span><strong>{stats.portions_saved}</strong></div><div><span>Комиссия заведения</span><strong>{session.venue.commission_pct}%</strong></div></section>
    <button className="text-button" disabled={busy} onClick={() => refresh().then(() => setError('')).catch(() => setError('Не удалось обновить кабинет.'))}>Обновить данные</button>
    {showForm && <OfferForm onDone={() => { setShowForm(false); refresh().catch(() => setError('Набор создан, но список не обновился. Нажмите «Обновить данные».')); }}/>}
    <div className="partner-columns"><section className="offers"><h2>Наборы на сегодня</h2>{!boxes.length && <p>Предложений пока нет. Добавьте первый набор.</p>}<div className="offer-table">{boxes.map((box) => <article key={box.id}><div className="offer-name"><div><strong>{box.title}</strong><span>{box.description}</span></div></div><span>{box.pickup_start}–{box.pickup_end}</span><span>{money(box.price)}</span><span>{box.qty_left} / {box.qty_total}</span><span>{({ ACTIVE: 'Активен', SOLD_OUT: 'Разобрали', EXPIRED: 'Закрыт' })[box.status]}</span></article>)}</div></section>
    <aside className="live-orders"><h2>Выдача заказов</h2><form onSubmit={issue}><label className="field"><span>Код с экрана покупателя</span><input value={pickupCode} onChange={(e) => setPickupCode(e.target.value.toUpperCase())} required maxLength={12}/></label><button className="button" disabled={busy}>Подтвердить выдачу</button></form><h3>Ожидают получения: {active.length}</h3>{active.map((order) => <article key={order.id}><strong>Заказ №{order.id} · {order.customer_name || order.user?.name || 'Покупатель'}</strong><p>{order.box.title} × {order.qty}</p><p>{money(order.amount)}</p></article>)}</aside></div>
  </main>;
}

function OfferForm({ onDone }) {
  const [form, setForm] = useState({ title: '', description: '', price: '', original_price: '', qty: '', pickup_start: '19:00', pickup_end: '21:00' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const box = await venueFetch('/boxes', { method: 'POST', body: JSON.stringify({ ...form, type: 'SURPRISE', price: Number(form.price), original_price: Number(form.original_price), qty: Number(form.qty) }) });
      onDone(box);
    } catch (err) { setError(errorText[err.code] || 'Не удалось опубликовать. Проверьте данные и список предложений перед повтором.'); }
    finally { setBusy(false); }
  }
  return <form className="offer-form" onSubmit={submit}><h2>Новый набор-сюрприз</h2>
    <label className="field"><span>Название</span><input value={form.title} onChange={change('title')} maxLength={160} required/></label>
    <label className="field"><span>Что может быть в наборе, важные аллергены</span><textarea value={form.description} onChange={change('description')} maxLength={4000} required/></label>
    <label className="field"><span>Цена</span><input type="number" min="1" max="10000000" value={form.price} onChange={change('price')} required/></label>
    <label className="field"><span>Обычная цена</span><input type="number" min="1" max="10000000" value={form.original_price} onChange={change('original_price')} required/></label>
    <label className="field"><span>Количество</span><input type="number" value={form.qty} onChange={change('qty')} min="1" max="1000" required/></label>
    <label className="field"><span>С</span><input type="time" value={form.pickup_start} onChange={change('pickup_start')} required/></label>
    <label className="field"><span>До</span><input type="time" value={form.pickup_end} onChange={change('pickup_end')} required/></label>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Публикуем…' : 'Опубликовать'}</button>
  </form>;
}

function AppRoutes() { return <Routes><Route path="/" element={<Home/>}/><Route path="/box/:id" element={<Detail/>}/><Route path="/orders" element={<Orders/>}/><Route path="/profile" element={<Profile/>}/><Route path="/partner" element={<Partner/>}/><Route path="*" element={<Home/>}/></Routes>; }

export default function App() {
  return <BrowserRouter><AuthProvider><a className="skip-link" href="#main-content">К содержанию</a><AppRoutes/><BottomNav/></AuthProvider></BrowserRouter>;
}
