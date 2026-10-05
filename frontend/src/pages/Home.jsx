import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { categoryIcons, categoryLabels, CountUp, DealCard, DealSkeleton, GoogleMap, Icon, pickupState, Shell } from '../ui';

const sorts = [
  ['best', 'Выгоднее'],
  ['ending', 'Скоро закончится'],
  ['cheapest', 'Дешевле'],
  ['nearby', 'Рядом'],
];

function sortBoxes(boxes, sort) {
  const list = [...boxes];
  if (sort === 'ending') return list.sort((a, b) => a.pickup_end.localeCompare(b.pickup_end));
  if (sort === 'cheapest') return list.sort((a, b) => a.price - b.price);
  if (sort === 'nearby') return list.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  return list.sort((a, b) => b.discount_pct - a.discount_pct || a.price - b.price);
}

const today = () => new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'long' });

export default function Home() {
  const [boxes, setBoxes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState('best');
  const [geoNote, setGeoNote] = useState('');
  const [view, setView] = useState('list');

  const load = useCallback((coords) => {
    setLoading(true); setError('');
    const query = coords ? `?lat=${coords.latitude}&lng=${coords.longitude}` : '';
    return apiFetch('/boxes' + query, { skipAuth: true })
      .then(setBoxes)
      .catch(() => setError('Не удалось загрузить предложения. Проверьте подключение.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function chooseSort(next) {
    setGeoNote('');
    if (next !== 'nearby' || boxes.some((box) => box.distance_km != null)) return setSort(next);
    if (!navigator.geolocation) return setGeoNote('Браузер не передаёт местоположение.');
    setGeoNote('Определяем, где вы…');
    navigator.geolocation.getCurrentPosition(
      (position) => { setSort('nearby'); setGeoNote(''); load(position.coords); },
      () => setGeoNote('Без доступа к местоположению покажем все заведения Астаны.'),
      { maximumAge: 300000, timeout: 10000 },
    );
  }

  const counts = useMemo(() => boxes.reduce((acc, box) => ({ ...acc, [box.venue.category]: (acc[box.venue.category] || 0) + 1 }), {}), [boxes]);
  const visible = useMemo(() => sortBoxes(boxes.filter((box) => category === 'ALL' || box.venue.category === category), sort), [boxes, category, sort]);
  const ending = useMemo(() => boxes.filter((box) => pickupState(box).key !== 'over').sort((a, b) => a.pickup_end.localeCompare(b.pickup_end) || a.qty_left - b.qty_left).slice(0, 6), [boxes]);
  const bestDiscount = boxes.reduce((max, box) => Math.max(max, box.discount_pct), 0);
  const liveVenues = new Set(boxes.filter((box) => pickupState(box).key === 'now').map((box) => box.venue.id)).size;

  return <Shell><main className="home" id="main-content">
    <header className="page-head">
      <p className="page-head__date">{today()}</p>
      <h1 className="large-title">Забрать сегодня</h1>
    </header>

    <Link className="search-field search-entry" to="/search"><Icon name="search" size={19}/><span>Еда, заведение или район</span></Link>

    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__aurora" aria-hidden="true"><span/><span/><span/></div>
      <div className="hero__content">
        {liveVenues > 0
          ? <p className="hero__live"><span className="live-dot"/>Сейчас выдают в {liveVenues} {plural(liveVenues, 'заведении', 'заведениях', 'заведениях')}</p>
          : <p className="hero__live hero__live--quiet"><Icon name="leaf" size={14}/>Спасаем еду в Астане</p>}
        <h2 id="hero-title">Еда из заведений рядом со скидкой</h2>
        <p>Бронируете в приложении, забираете в своё время, платите на месте.</p>
        {boxes.length > 0 && <dl className="hero__stats">
          <div><dt>наборов сегодня</dt><dd><CountUp value={boxes.length}/></dd></div>
          <div><dt>максимальная скидка</dt><dd>−<CountUp value={bestDiscount}/>%</dd></div>
        </dl>}
      </div>
    </section>

    {ending.length >= 3 && <section className="rail" aria-labelledby="ending-title">
      <div className="section-head"><h2 id="ending-title"><Icon name="flame" size={20} filled/> Успейте забрать</h2><button type="button" className="link-button" onClick={() => { setSort('ending'); setView('list'); document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' }); }}>Все</button></div>
      <div className="rail__track">{ending.map((box, index) => <DealCard key={box.id} box={box} index={index} layout="tile"/>)}</div>
    </section>}

    <div className="chips" role="group" aria-label="Категории">
      {Object.entries(categoryLabels).filter(([key]) => key === 'ALL' || counts[key]).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={category === key} className={category === key ? 'active' : ''} onClick={() => setCategory(key)}>
          <Icon name={categoryIcons[key]} size={17}/>{label}{key !== 'ALL' && <span className="chip-count">{counts[key]}</span>}
        </button>)}
    </div>

    <section className="feed-head" id="feed">
      <h2>{category === 'ALL' ? 'Все предложения' : categoryLabels[category]}</h2>
      <div className="segmented" role="group" aria-label="Вид" style={{ '--seg': view === 'list' ? 0 : 1, '--seg-count': 2 }}>
        <span className="segmented__thumb" aria-hidden="true"/>
        <button type="button" aria-pressed={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Список</button>
        <button type="button" aria-pressed={view === 'map'} className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Карта</button>
      </div>
    </section>
    {view === 'list' && boxes.length > 1 && <div className="sort-row" role="group" aria-label="Сортировка">
      {sorts.map(([key, label]) => <button key={key} type="button" aria-pressed={sort === key} className={sort === key ? 'active' : ''} onClick={() => chooseSort(key)}>{label}</button>)}
    </div>}
    {geoNote && <p className="inline-note" role="status">{geoNote}</p>}
    {loading && !boxes.length ? <DealSkeleton/>
      : view === 'list' ? <section className="deal-grid" aria-busy={loading}>{visible.map((box, index) => <DealCard key={box.id} box={box} index={index}/>)}</section>
        : <GoogleMap boxes={visible}/>}
    {error && <div className="notice notice--error" role="alert"><span>{error}</span><button type="button" onClick={() => load()}>Повторить</button></div>}
    {!loading && !error && !visible.length && <div className="empty"><span className="empty__icon"><Icon name="search" size={28}/></span><h3>{boxes.length ? 'В этой категории пусто' : 'Предложений пока нет'}</h3><p>{boxes.length ? 'Посмотрите другие категории.' : 'Заведения публикуют наборы ближе к вечеру. Загляните позже.'}</p>{boxes.length > 0 && <button type="button" className="button button--quiet" onClick={() => setCategory('ALL')}>Показать всё</button>}</div>}

    <section className="steps" aria-labelledby="steps-title">
      <h2 id="steps-title">Как это работает</h2>
      <ol>
        <li><span className="steps__icon"><Icon name="bag"/></span><strong>Забронируйте набор</strong><span>Количество ограничено. Бронь держится до конца времени выдачи.</span></li>
        <li><span className="steps__icon"><Icon name="clock"/></span><strong>Приходите в своё время</strong><span>Адрес и окно выдачи указаны в карточке и в заказе.</span></li>
        <li><span className="steps__icon"><Icon name="wallet"/></span><strong>Покажите код и оплатите</strong><span>Оплата в заведении по цене на экране. Сборов нет.</span></li>
      </ol>
    </section>
    <section className="impact-strip"><span className="impact-strip__icon"><Icon name="leaf" size={24}/></span><div><strong>Каждый заказ помогает</strong><p>Вы экономите, а хорошая еда не отправляется в мусор.</p></div></section>
  </main></Shell>;
}

export function plural(n, one, few, many) {
  const mod10 = n % 10; const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
