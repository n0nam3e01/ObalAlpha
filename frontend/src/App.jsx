import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import { getVenueToken, setVenueToken, venueAuth, venueFetch } from './lib/venueApi';

const images = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=85',
];

const demoBoxes = [
  { id: 1, title: 'Вечерний бокс выпечки', description: 'Круассаны, слойки и хлеб сегодняшней выпечки. Состав зависит от того, что осталось к вечеру.', original_price: 3200, price: 1490, qty_left: 4, pickup_start: '19:30', pickup_end: '21:00', discount_pct: 53, distance_km: 2.1, photo_url: images[0], venue: { id: 1, name: 'Тёплый хлеб', category: 'BAKERY', address: 'Кабанбай батыра, 42', district: 'Есиль', geo_lat: 51.112, geo_lng: 71.414, rating_avg: 4.8 } },
  { id: 2, title: 'Сладкое к чаю', description: 'Десерты и свежая выпечка из витрины. Отличный повод устроить вечерний чай.', original_price: 4100, price: 1790, qty_left: 2, pickup_start: '20:00', pickup_end: '21:30', discount_pct: 56, distance_km: 3.4, photo_url: images[1], venue: { id: 2, name: 'Tatte', category: 'DESSERT', address: 'Достык, 5', district: 'Есиль', geo_lat: 51.128, geo_lng: 71.43, rating_avg: 4.9 } },
  { id: 3, title: 'Обед с собой', description: 'Горячее, гарнир и салат. Всё приготовлено сегодня.', original_price: 3600, price: 1690, qty_left: 5, pickup_start: '18:30', pickup_end: '20:30', discount_pct: 53, distance_km: 4.2, photo_url: images[2], venue: { id: 3, name: 'Дала кухня', category: 'PREPARED', address: 'Сыганак, 16', district: 'Нура', geo_lat: 51.102, geo_lng: 71.419, rating_avg: 4.7 } },
  { id: 4, title: 'Набор из кондитерской', description: 'Пирожные, пончики или тарталетки из сегодняшней витрины.', original_price: 2800, price: 1190, qty_left: 3, pickup_start: '19:00', pickup_end: '20:00', discount_pct: 58, distance_km: 5.3, photo_url: images[3], venue: { id: 4, name: 'Сахар & ваниль', category: 'DESSERT', address: 'Мангилик Ел, 37', district: 'Есиль', geo_lat: 51.09, geo_lng: 71.43, rating_avg: 4.8 } },
];

const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;
const categoryLabels = { ALL: 'Все', BAKERY: 'Выпечка', PREPARED: 'Готовая еда', SUPERMARKET: 'Продукты', CAFE: 'Кофейни', DESSERT: 'Десерты' };
const errorText = {
  credentials_invalid: 'Почта, телефон или пароль не совпадают.', account_exists: 'Такой аккаунт уже есть.',
  password_short: 'Пароль должен быть не короче 8 символов.', email_invalid: 'Проверьте адрес почты.',
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

function Shell({ children, nav = true }) {
  return <div className="consumer-shell">{children}{nav && <BottomNav />}</div>;
}

function BottomNav() {
  return <nav className="bottom-nav" aria-label="Основная навигация">
    <NavLink to="/" end><Icon name="home"/><span>Главная</span></NavLink>
    <Link to="/?focus=search"><Icon name="search"/><span>Поиск</span></Link>
    <NavLink to="/orders"><Icon name="bag"/><span>Заказы</span></NavLink>
    <NavLink to="/profile"><Icon name="user"/><span>Профиль</span></NavLink>
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
  const [boxes, setBoxes] = useState(demoBoxes);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [view, setView] = useState('list');

  useEffect(() => { apiFetch('/boxes?sort=nearby', { skipAuth: true }).then((data) => data.length && setBoxes(data)).catch(() => {}); }, []);
  const visible = useMemo(() => boxes.filter((box) => {
    const matchesCategory = category === 'ALL' || box.venue.category === category;
    const haystack = `${box.title} ${box.venue.name}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [boxes, category, query]);

  return <Shell><main className="home" id="main-content">
    <header className="home-head"><Brand/><button className="location"><Icon name="pin" size={18}/><span>Астана · Есиль</span></button><Link className="avatar" to="/profile" aria-label="Профиль">М</Link></header>
    <section className="intro">
      <div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Что спасём сегодня?" aria-label="Поиск предложений"/></div>
      <div className="hero-copy"><p className="eyebrow">Еда с хорошим продолжением</p><h1>Заберите сегодня дешевле</h1><p>Свежая еда из пекарен, кафе и магазинов со скидкой до 70%.</p></div>
    </section>
    <div className="category-row" aria-label="Категории">{Object.entries(categoryLabels).map(([key, label]) => <button key={key} className={category === key ? 'active' : ''} onClick={() => setCategory(key)}>{label}</button>)}</div>
    <section className="feed-head"><div><p className="eyebrow">Рядом с вами</p><h2>Можно забрать сегодня</h2></div><div className="view-switch"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Список</button><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Карта</button></div></section>
    {view === 'list'
      ? <section className="deal-grid">{visible.map((box, index) => <DealCard key={box.id} box={box} index={index}/>)}</section>
      : <GoogleMap boxes={visible}/>
    }
    {!visible.length && <div className="empty"><Icon name="search" size={30}/><h3>Ничего не нашли</h3><p>Сбросьте фильтр или попробуйте другой запрос.</p><button onClick={() => { setCategory('ALL'); setQuery(''); }}>Показать всё</button></div>}
    <section className="impact-strip"><Icon name="leaf" size={30}/><div><strong>Каждый заказ помогает</strong><p>Вы экономите, а хорошая еда не отправляется в мусор.</p></div></section>
  </main></Shell>;
}

function GoogleMap({ boxes }) {
  const first = boxes[0] || demoBoxes[0];
  const query = encodeURIComponent(`${first.venue.geo_lat},${first.venue.geo_lng}`);
  return <section className="map-panel">
    <iframe title="Предложения Öbal на Google Maps" src={`https://www.google.com/maps?q=${query}&z=13&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
    <div className="map-results"><strong>{boxes.length} предложений рядом</strong><p>Откройте карточку, чтобы увидеть адрес и время получения.</p></div>
  </section>;
}

function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [box, setBox] = useState(demoBoxes.find((item) => item.id === Number(id)) || demoBoxes[0]);
  const [qty, setQty] = useState(1);
  const [fulfillment, setFulfillment] = useState('PICKUP');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { apiFetch(`/boxes/${id}`, { skipAuth: true }).then(setBox).catch(() => {}); }, [id]);
  const subtotal = box.price * qty;
  const serviceFee = Math.max(99, Math.round(subtotal * .07));
  const deliveryFee = fulfillment === 'DELIVERY' ? 790 : 0;
  async function order() {
    if (!isAuthed) return navigate('/profile', { state: { returnTo: `/box/${id}` } });
    if (fulfillment === 'DELIVERY' && !address.trim()) return setMessage('Укажите адрес доставки.');
    setBusy(true); setMessage('');
    try {
      await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ box_id: box.id, qty, fulfillment, delivery_address: address }) });
      navigate('/orders');
    } catch { setMessage('Не получилось оформить заказ. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }
  return <Shell nav={false}><main className="detail" id="main-content">
    <div className="detail-media"><img src={box.photo_url || images[0]} alt={box.title}/><button className="round-action back" onClick={() => navigate(-1)} aria-label="Назад"><Icon name="back"/></button><button className="round-action favorite" aria-label="Добавить в избранное"><Icon name="heart"/></button></div>
    <article className="detail-body"><p className="eyebrow">{box.venue.name} · {box.venue.rating_avg || '4,8'}</p><h1>{box.title}</h1><div className="detail-price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s><span>Экономия {box.discount_pct}%</span></div><p className="detail-description">{box.description}</p>
      <section className="pickup-info"><Icon name="clock"/><div><strong>Забрать сегодня, {box.pickup_start}–{box.pickup_end}</strong><p>{box.venue.address}</p></div><Icon name="arrow"/></section>
      <div className="fulfillment"><button className={fulfillment === 'PICKUP' ? 'active' : ''} onClick={() => setFulfillment('PICKUP')}>Самовывоз</button><button className={fulfillment === 'DELIVERY' ? 'active' : ''} onClick={() => setFulfillment('DELIVERY')}>Доставка · 790 ₸</button></div>
      {fulfillment === 'DELIVERY' && <label className="field"><span>Адрес доставки</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Улица, дом, квартира" autoComplete="street-address"/></label>}
      <div className="quantity"><div><strong>Количество</strong><p>Осталось {box.qty_left} набора</p></div><div className="stepper"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Уменьшить">−</button><span>{qty}</span><button onClick={() => setQty(Math.min(3, box.qty_left, qty + 1))} aria-label="Увеличить">+</button></div></div>
      <div className="fee-lines"><p><span>Набор</span><strong>{money(subtotal)}</strong></p><p><span>Сервисный сбор</span><strong>{money(serviceFee)}</strong></p>{deliveryFee > 0 && <p><span>Доставка</span><strong>{money(deliveryFee)}</strong></p>}</div>
    </article>
    <div className="sticky-order"><div><span>Итого</span><strong>{money(subtotal + serviceFee + deliveryFee)}</strong></div><button onClick={order} disabled={busy}>{busy ? 'Оформляем…' : 'Забронировать'}</button>{message && <p role="alert">{message}</p>}</div>
  </main></Shell>;
}

function Orders() {
  const { isAuthed } = useAuth();
  const [orders, setOrders] = useState([]);
  useEffect(() => { if (isAuthed) apiFetch('/orders').then((data) => setOrders([...data.active, ...data.past])).catch(() => {}); }, [isAuthed]);
  return <Shell><main className="simple-page" id="main-content"><header><Brand/><h1>Ваши заказы</h1></header>
    {!isAuthed
      ? <Empty title="Сначала войдите" text="После входа здесь появятся заказы и коды получения." action={<Link className="button" to="/profile">Войти</Link>}/>
      : orders.length
        ? <div className="order-list">{orders.map((order) => <article key={order.id}><div><p className="eyebrow">{order.status === 'RESERVED' ? 'Ждёт получения' : 'Завершён'}</p><h3>{order.box.title}</h3><p>{order.box.venue.name} · {order.box.pickup_start}–{order.box.pickup_end}</p></div><strong className="pickup-code">{order.pickup_code}</strong></article>)}</div>
        : <Empty title="Заказов пока нет" text="Выберите набор на сегодня. После бронирования код появится здесь." action={<Link className="button" to="/">Смотреть предложения</Link>}/>
    }
  </main></Shell>;
}

function Empty({ title, text, action }) { return <div className="empty"><Icon name="bag" size={30}/><h3>{title}</h3><p>{text}</p>{action}</div>; }

function Profile() {
  const navigate = useNavigate();
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

const partnerDemo = { venue: { name: 'Тёплый хлеб', address: 'Достык, 18, Астана', commission_pct: 10 }, today_stats: { orders_sold: 12, revenue: 24600, portions_saved: 48 } };
const partnerBoxes = demoBoxes.slice(0, 3).map((b, i) => ({ ...b, qty_total: [5,4,6][i], status: 'ACTIVE' }));

function Partner() {
  const [session, setSession] = useState(getVenueToken() ? partnerDemo : null);
  const [boxes, setBoxes] = useState(partnerBoxes);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { if (getVenueToken()) { venueFetch('/me').then(setSession).catch(() => {}); venueFetch('/boxes').then(setBoxes).catch(() => {}); } }, []);
  async function signIn(e) { e.preventDefault(); setError(''); try { const data = await venueAuth(code); setVenueToken(data.token); setSession({ ...partnerDemo, venue: data.venue }); } catch { setError('Код не подошёл. Проверьте его и попробуйте снова.'); } }
  if (!session) return <main className="partner-login"><Brand partner/><form onSubmit={signIn}><p className="eyebrow">Для партнёров</p><h1>Вход для заведения</h1><p>Введите код, который вы получили после подключения к Öbal.</p><label className="field"><span>Код заведения</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="OBAL-01" required/></label>{error && <p className="form-error">{error}</p>}<button className="button">Открыть кабинет</button><small>Для локального демо используйте код из команды <code>npm run seed</code>.</small></form><Link to="/">Вернуться в приложение</Link></main>;
  const stats = session.today_stats || partnerDemo.today_stats;
  return <main className="partner" id="main-content"><header className="partner-top"><Brand partner/><div><strong>{session.venue.name}</strong><span>{session.venue.address}</span></div><button className="text-button" onClick={() => { setVenueToken(null); setSession(null); }}>Выйти</button></header><section className="partner-hero"><div><p className="eyebrow">Сегодня, 14 сентября</p><h1>Добрый вечер, {session.venue.name}</h1><p>Здесь только то, что нужно для сегодняшних продаж.</p></div><button className="button" onClick={() => setShowForm(!showForm)}><Icon name="plus"/>Добавить набор</button></section>
    <section className="metrics"><div><span>Заказов сегодня</span><strong>{stats.orders_sold || 0}</strong></div><div><span>Выручка</span><strong>{money(stats.revenue || 0)}</strong></div><div><span>Спасено порций</span><strong>{stats.portions_saved || 0}</strong></div><div><span>Комиссия сервиса</span><strong>{session.venue.commission_pct}%</strong></div></section>
    {showForm && <OfferForm onDone={(box) => { setBoxes([box, ...boxes]); setShowForm(false); }}/>}<div className="partner-columns"><section className="offers"><div className="section-title"><div><p className="eyebrow">Каталог</p><h2>Наборы на сегодня</h2></div><span>{boxes.length} активных</span></div><div className="offer-table"><div className="table-head"><span>Набор</span><span>Получение</span><span>Цена</span><span>Осталось</span><span>Статус</span></div>{boxes.map((box, index) => <article key={box.id}><div className="offer-name"><img src={box.photo_url || images[index % images.length]} alt=""/><div><strong>{box.title}</strong><span>{box.description}</span></div></div><span>{box.pickup_start}–{box.pickup_end}</span><span><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s></span><span>{box.qty_left} / {box.qty_total || box.qty_left}</span><span className="status-dot">Активен</span></article>)}</div></section><aside className="live-orders"><div className="section-title"><div><p className="eyebrow">Сейчас</p><h2>Текущие заказы</h2></div></div>{[{ code: '4812', name: 'Айсұлу К.', time: '19:25' }, { code: '7306', name: 'Марат С.', time: '19:40' }].map((order) => <article key={order.code}><div><strong className="pickup-code">{order.code}</strong><span>{order.name}</span></div><p>{order.time} · готов к выдаче</p><button>Выдать заказ</button></article>)}</aside></div>
  </main>;
}

function OfferForm({ onDone }) {
  const [form, setForm] = useState({ title: '', price: '', original_price: '', qty: '', pickup_start: '19:00', pickup_end: '21:00' });
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) { e.preventDefault(); const payload = { ...form, type: 'SURPRISE', description: 'Состав зависит от остатков дня', price: Number(form.price), original_price: Number(form.original_price), qty: Number(form.qty) }; try { const box = await venueFetch('/boxes', { method: 'POST', body: JSON.stringify(payload) }); onDone(box); } catch { onDone({ ...payload, id: Date.now(), qty_left: payload.qty, qty_total: payload.qty, photo_url: images[0] }); } }
  return <form className="offer-form" onSubmit={submit}><h2>Новый набор</h2><label className="field"><span>Название</span><input value={form.title} onChange={change('title')} required/></label><label className="field"><span>Цена</span><input type="number" value={form.price} onChange={change('price')} required/></label><label className="field"><span>Обычная цена</span><input type="number" value={form.original_price} onChange={change('original_price')} required/></label><label className="field"><span>Количество</span><input type="number" value={form.qty} onChange={change('qty')} min="1" required/></label><label className="field"><span>С</span><input type="time" value={form.pickup_start} onChange={change('pickup_start')} required/></label><label className="field"><span>До</span><input type="time" value={form.pickup_end} onChange={change('pickup_end')} required/></label><button className="button">Опубликовать</button></form>;
}

function AppRoutes() { return <Routes><Route path="/" element={<Home/>}/><Route path="/box/:id" element={<Detail/>}/><Route path="/orders" element={<Orders/>}/><Route path="/profile" element={<Profile/>}/><Route path="/partner" element={<Partner/>}/><Route path="*" element={<Home/>}/></Routes>; }

export default function App() {
  return <BrowserRouter><AuthProvider><a className="skip-link" href="#main-content">К содержанию</a><AppRoutes/></AuthProvider></BrowserRouter>;
}
