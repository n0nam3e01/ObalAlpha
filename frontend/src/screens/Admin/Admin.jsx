import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch, getAdminToken, setAdminToken } from '../../lib/adminApi';
import './Admin.css';

const categories = { BAKERY: 'Пекарня', PREPARED: 'Готовая еда', SUPERMARKET: 'Магазин', CAFE: 'Кофейня', DESSERT: 'Десерты', OTHER: 'Другое' };
const money = (n) => `${new Intl.NumberFormat('ru-RU').format(n)} ₸`;
const date = (value) => new Date(value).toLocaleDateString('ru-RU');
const field = (label, key, value, change, type = 'text', extra = {}) => <label className="admin-field" key={key}><span>{label}</span><input type={type} name={key} value={value ?? ''} onChange={change} {...extra}/></label>;

export default function Admin() {
  const [token, setToken] = useState(getAdminToken());
  const [login, setLogin] = useState({ username: 'adminsuperapp1', password: '' });
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ overview: null, venues: [], boxes: [], users: { items: [], total: 0, page: 1 } });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [oneTimeCode, setOneTimeCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showBoxForm, setShowBoxForm] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', category: 'BAKERY', address: '', district: '', contact_phone: '', geo_lat: '', geo_lng: '', commission_pct: 20, description: '', photo_url: '' });
  const [boxForm, setBoxForm] = useState({ venue_id: '', title: '', type: 'SURPRISE', description: '', items: '', price: '', original_price: '', qty: 1, pickup_start: '19:00', pickup_end: '21:00', photo_url: '' });

  const load = useCallback(async (section = tab, page = 1, q = search) => {
    try {
      const path = section === 'users' ? `/users?page=${page}&q=${encodeURIComponent(q)}` : `/${section}`;
      const result = await adminFetch(path);
      setData((prev) => ({ ...prev, [section]: result })); setError('');
    } catch (err) { if (err.status === 401 || err.status === 403) setToken(null); else setError('Не удалось загрузить данные. Попробуйте обновить страницу.'); }
  }, [tab, search]);

  useEffect(() => { if (token) { load(tab); if (tab === 'boxes') load('venues'); } }, [token, tab, load]);
  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await adminFetch('/login', { method: 'POST', body: JSON.stringify(login) }); setAdminToken(result.token); setToken(result.token); setLogin((prev) => ({ ...prev, password: '' })); }
    catch { setError('Неверный логин или пароль.'); }
    finally { setBusy(false); }
  }
  async function action(path, body, section = tab) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await adminFetch(path, { method: 'PATCH', body: JSON.stringify(body) }); await load(section); setNotice('Изменения сохранены.'); return result; }
    catch (err) { setError(err.message === 'box_unavailable' ? 'Время выдачи прошло или набор закончился.' : 'Не удалось сохранить изменения.'); return null; }
    finally { setBusy(false); }
  }
  async function createVenue(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await adminFetch('/venues', { method: 'POST', body: JSON.stringify(venueForm) });
      setOneTimeCode({ name: result.venue.name, code: result.access_code }); setShowVenueForm(false); await load('venues'); setNotice('Заведение создано. Проверьте карточку и откройте публикацию.');
    } catch (err) { setError(err.message === 'astana_only' ? 'Пока подключаем заведения только в Астане. Проверьте координаты.' : 'Проверьте данные заведения.'); }
    finally { setBusy(false); }
  }
  async function createBox(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await adminFetch('/boxes', { method: 'POST', body: JSON.stringify(boxForm) }); setShowBoxForm(false); await load('boxes'); setNotice('Набор добавлен.'); }
    catch { setError('Проверьте данные и время выдачи сегодня.'); }
    finally { setBusy(false); }
  }
  async function rotateCode(venue) {
    if (!window.confirm(`Создать новый код для «${venue.name}»? Старый код и все текущие входы заведения перестанут работать.`)) return;
    setBusy(true); setError('');
    try { const result = await adminFetch(`/venues/${venue.id}/code`, { method: 'POST', body: '{}' }); setOneTimeCode({ name: venue.name, code: result.access_code }); }
    catch { setError('Не удалось создать код.'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="admin-login" id="main-content"><Link className="admin-brand" to="/">öbal <span>admin</span></Link><form onSubmit={signIn}><p className="admin-kicker">Управление платформой</p><h1>Вход администратора</h1><p>Только для команды Öbal. Покупатели и заведения входят через свои страницы.</p>{field('Логин', 'username', login.username, (e) => setLogin({ ...login, username: e.target.value }), 'text', { autoComplete: 'username', required: true })}{field('Пароль', 'password', login.password, (e) => setLogin({ ...login, password: e.target.value }), 'password', { autoComplete: 'current-password', required: true })}{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy}>Войти</button></form><Link to="/">Вернуться на сайт</Link></main>;

  const tabs = [['overview', 'Обзор'], ['venues', 'Заведения'], ['boxes', 'Продукты'], ['users', 'Пользователи']];
  return <main className="admin" id="main-content"><header className="admin-header"><Link className="admin-brand" to="/">öbal <span>admin</span></Link><div><span>Панель управления · Астана</span><button onClick={() => { setAdminToken(null); setToken(null); }} className="admin-link">Выйти</button></div></header>
    <div className="admin-body"><aside className="admin-sidebar"><p className="admin-kicker">Рабочее пространство</p><nav aria-label="Разделы администратора">{tabs.map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setNotice(''); setError(''); }}>{label}</button>)}</nav><p className="admin-sidebar-note">Новые предложения не видны покупателям до одобрения.</p></aside>
    <div className="admin-content"><div className="admin-title"><div><p className="admin-kicker">Öbal / {tabs.find(([key]) => key === tab)?.[1]}</p><h1>{tabs.find(([key]) => key === tab)?.[1]}</h1></div><button className="admin-secondary" onClick={() => load(tab)}>Обновить</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {oneTimeCode && <section className="admin-code" role="status"><div><strong>Новый код для «{oneTimeCode.name}»</strong><p>Покажите его владельцу по защищённому каналу. После закрытия он больше не появится в списке.</p><code>{oneTimeCode.code}</code></div><button className="admin-secondary" onClick={() => setOneTimeCode(null)}>Скрыть</button></section>}
    {tab === 'overview' && <><p className="admin-lead">Здесь видно, что ждёт проверки, и сколько людей уже пользуются сервисом.</p><div className="admin-stats">{[['Пользователи', data.overview?.users], ['Заведения', data.overview?.venues], ['Наборы', data.overview?.boxes], ['Заказы', data.overview?.orders]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '—'}</strong></div>)}</div><div className="admin-queue"><button onClick={() => setTab('venues')}><span>Заведения на проверке</span><strong>{data.overview?.pendingVenues ?? '—'}</strong></button><button onClick={() => setTab('boxes')}><span>Наборы на проверке</span><strong>{data.overview?.pendingBoxes ?? '—'}</strong></button></div></>}
    {tab === 'venues' && <><div className="admin-section-head"><p className="admin-lead">Проверяйте карточки, открывайте заведения и выдавайте владельцам коды входа.</p><button className="admin-primary" onClick={() => setShowVenueForm((v) => !v)}>+ Добавить заведение</button></div>
      {showVenueForm && <form className="admin-form" onSubmit={createVenue}><h2>Новое заведение в Астане</h2>{field('Название', 'name', venueForm.name, (e) => setVenueForm({ ...venueForm, name: e.target.value }), 'text', { required: true })}<label className="admin-field"><span>Категория</span><select value={venueForm.category} onChange={(e) => setVenueForm({ ...venueForm, category: e.target.value })}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{field('Адрес в Астане', 'address', venueForm.address, (e) => setVenueForm({ ...venueForm, address: e.target.value }), 'text', { required: true })}{field('Район', 'district', venueForm.district, (e) => setVenueForm({ ...venueForm, district: e.target.value }))}{field('Телефон заведения', 'contact_phone', venueForm.contact_phone, (e) => setVenueForm({ ...venueForm, contact_phone: e.target.value }), 'tel', { required: true })}{field('Широта', 'geo_lat', venueForm.geo_lat, (e) => setVenueForm({ ...venueForm, geo_lat: e.target.value }), 'number', { step: 'any', placeholder: '51.1694', required: true })}{field('Долгота', 'geo_lng', venueForm.geo_lng, (e) => setVenueForm({ ...venueForm, geo_lng: e.target.value }), 'number', { step: 'any', placeholder: '71.4491', required: true })}{field('Комиссия, %', 'commission_pct', venueForm.commission_pct, (e) => setVenueForm({ ...venueForm, commission_pct: e.target.value }), 'number', { min: 0, max: 100 })}{field('Описание', 'description', venueForm.description, (e) => setVenueForm({ ...venueForm, description: e.target.value }))}{field('Фото (https://)', 'photo_url', venueForm.photo_url, (e) => setVenueForm({ ...venueForm, photo_url: e.target.value }), 'url')}<div className="admin-form-actions"><button className="admin-primary" disabled={busy}>Создать и получить код</button><button type="button" className="admin-secondary" onClick={() => setShowVenueForm(false)}>Отмена</button></div></form>}
      <div className="admin-list">{data.venues.map((venue) => <article className="admin-item" key={venue.id}><div className="admin-item-main"><div><strong>{venue.name}</strong><span>#{venue.id} · {categories[venue.category]} · {venue.address}</span></div><div className="admin-badges"><span className={venue.is_approved ? 'is-ok' : 'is-wait'}>{venue.is_approved ? 'Проверено' : 'На проверке'}</span><span>{venue.is_active ? 'Открыто' : 'Скрыто'}</span></div></div><div className="admin-item-actions"><button disabled={busy} onClick={() => action(`/venues/${venue.id}`, { is_approved: !venue.is_approved }, 'venues')}>{venue.is_approved ? 'Снять одобрение' : 'Одобрить'}</button><button disabled={busy} onClick={() => action(`/venues/${venue.id}`, venue.is_active ? { is_active: false, is_approved: false } : { is_active: true, is_approved: true }, 'venues')}>{venue.is_active ? 'Приостановить' : 'Открыть'}</button><button disabled={busy} onClick={() => rotateCode(venue)}>Новый код входа</button></div></article>)}{!data.venues.length && <p className="admin-empty">Заведений пока нет.</p>}</div></>}
    {tab === 'boxes' && <><div className="admin-section-head"><p className="admin-lead">Все наборы и очередь модерации. Заказы по уже проданным наборам сохраняются.</p><button className="admin-primary" onClick={() => setShowBoxForm((v) => !v)}>+ Добавить продукт</button></div>
      {showBoxForm && <form className="admin-form" onSubmit={createBox}><h2>Новый набор на сегодня</h2><label className="admin-field"><span>Заведение</span><select required value={boxForm.venue_id} onChange={(e) => setBoxForm({ ...boxForm, venue_id: e.target.value })}><option value="">Выберите заведение</option>{data.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>{field('Название набора', 'title', boxForm.title, (e) => setBoxForm({ ...boxForm, title: e.target.value }), 'text', { required: true })}<label className="admin-field"><span>Тип</span><select value={boxForm.type} onChange={(e) => setBoxForm({ ...boxForm, type: e.target.value })}><option value="SURPRISE">Сюрприз-набор</option><option value="ITEMIZED">Точный состав</option></select></label>{field('Описание и аллергены', 'description', boxForm.description, (e) => setBoxForm({ ...boxForm, description: e.target.value }), 'text', { required: true })}{field('Состав', 'items', boxForm.items, (e) => setBoxForm({ ...boxForm, items: e.target.value }))}{field('Цена', 'price', boxForm.price, (e) => setBoxForm({ ...boxForm, price: e.target.value }), 'number', { min: 1, required: true })}{field('Обычная цена', 'original_price', boxForm.original_price, (e) => setBoxForm({ ...boxForm, original_price: e.target.value }), 'number', { min: 1, required: true })}{field('Количество', 'qty', boxForm.qty, (e) => setBoxForm({ ...boxForm, qty: e.target.value }), 'number', { min: 1, required: true })}{field('Выдача с', 'pickup_start', boxForm.pickup_start, (e) => setBoxForm({ ...boxForm, pickup_start: e.target.value }), 'time', { required: true })}{field('Выдача до', 'pickup_end', boxForm.pickup_end, (e) => setBoxForm({ ...boxForm, pickup_end: e.target.value }), 'time', { required: true })}{field('Фото (https://)', 'photo_url', boxForm.photo_url, (e) => setBoxForm({ ...boxForm, photo_url: e.target.value }), 'url')}<div className="admin-form-actions"><button className="admin-primary" disabled={busy}>Добавить набор</button><button type="button" className="admin-secondary" onClick={() => setShowBoxForm(false)}>Отмена</button></div></form>}
      <div className="admin-list">{data.boxes.map((box) => <article className="admin-item" key={box.id}><div className="admin-item-main"><div><strong>{box.title}</strong><span>{box.venue.name} · {date(box.pickup_date)} · {box.pickup_start}–{box.pickup_end} · {money(box.price)} · {box.qty_left} шт.</span></div><div className="admin-badges"><span className={box.is_approved ? 'is-ok' : 'is-wait'}>{box.is_approved ? 'Проверено' : 'На проверке'}</span><span>{box.status === 'ACTIVE' ? 'Активен' : box.status === 'SOLD_OUT' ? 'Разобрали' : 'Снят'}</span></div></div><p>{box.description}</p><div className="admin-item-actions"><button disabled={busy} onClick={() => action(`/boxes/${box.id}`, { is_approved: !box.is_approved }, 'boxes')}>{box.is_approved ? 'Отклонить' : 'Одобрить'}</button>{box.status === 'ACTIVE' && <button disabled={busy} onClick={() => action(`/boxes/${box.id}`, { status: 'EXPIRED', is_approved: false }, 'boxes')}>Снять с продажи</button>}</div></article>)}{!data.boxes.length && <p className="admin-empty">Наборов пока нет.</p>}</div></>}
    {tab === 'users' && <><p className="admin-lead">Публичный ID выдаётся при регистрации. Пароли и служебные ключи здесь не показываются.</p><form className="admin-search" onSubmit={(e) => { e.preventDefault(); load('users', 1, search); }}><input aria-label="Поиск пользователей" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID, имя, почта или телефон"/><button className="admin-secondary">Найти</button></form><p className="admin-count">Всего: {data.users.total}</p><div className="admin-list">{data.users.items.map((user) => <article className="admin-item admin-user" key={user.id}><strong>{user.name}</strong><code>{user.public_id || `#${user.id}`}</code><span>{user.email || user.phone || 'Без контакта'}</span><span>{date(user.created_at)} · заказов: {user._count.orders}</span></article>)}{!data.users.items.length && <p className="admin-empty">Пользователи не найдены.</p>}</div><div className="admin-pages"><button className="admin-secondary" disabled={data.users.page <= 1} onClick={() => load('users', data.users.page - 1)}>Назад</button><span>Страница {data.users.page}</span><button className="admin-secondary" disabled={data.users.page * data.users.pageSize >= data.users.total} onClick={() => load('users', data.users.page + 1)}>Далее</button></div></>}
    </div></div></main>;
}
