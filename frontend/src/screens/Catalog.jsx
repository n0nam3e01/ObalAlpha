import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useLiveRefresh } from '../lib/useLiveRefresh';
import { selectOffers } from '../lib/catalog';
import { rememberScroll, savedScroll } from '../lib/catalogScroll';
import { Shell, Icon } from '../components/Layout';
import DealCard from '../components/DealCard';
import GoogleMap from '../components/GoogleMap';
import CatalogLocation from '../components/CatalogLocation';
import { useHomeScroll } from '../lib/useHomeScroll';
import CatalogIntro, { CatalogEmpty, CatalogSteps } from '../components/CatalogIntro';
import { supportBotName, supportTelegramUrl } from '../lib/supportContact';
import '../styles/catalog.css';

const categories = { ALL: 'Все', BAKERY: 'Выпечка', PREPARED: 'Готовая еда', SUPERMARKET: 'Продукты', CAFE: 'Кофейни', DESSERT: 'Десерты', OTHER: 'Другое' };
let rememberedLocation = null; // Opt-in coordinates stay in memory, never in a shareable URL.

export default function Catalog({ discovery = false }) {
  const scope = useRef(null);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigation = useNavigationType();
  const restored = useRef(false);
  const restoreTarget = useRef(savedScroll(location.pathname + location.search));
  const [boxes, setBoxes] = useState([]);
  const [geo, setGeo] = useState(rememberedLocation);
  const [geoMessage, setGeoMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const mounted = useRef(true);
  const filters = Object.fromEntries(params);
  const latestParams = useRef(params);
  latestParams.current = params;
  const sort = ['ending', 'cheapest', 'nearby'].includes(filters.sort) ? filters.sort : 'ending';
  const sync = useLiveRefresh(async (signal) => {
    const query = new URLSearchParams({ sort });
    if (geo) { query.set('lat', geo.lat); query.set('lng', geo.lng); }
    const rows = await apiFetch('/boxes?' + query, { skipAuth: true, signal });
    if (!signal.aborted) setBoxes(rows);
  }, true);
  useEffect(() => { void sync.refresh({ fresh: true }); }, [geo, sort, sync.refresh]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const visible = useMemo(() => selectOffers(boxes, { ...filters, sort }), [boxes, params, sort]);
  useHomeScroll(scope, visible.map((box) => box.id).join(','));
  const districts = [...new Set(boxes.map((box) => box.venue.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  if (filters.district && !districts.includes(filters.district)) districts.unshift(filters.district);
  const venues = [...new Map(boxes.map((box) => [box.venue.id, box.venue])).values()];
  const availableCategories = new Set(boxes.map((box) => box.venue.category));
  function change(key, value) {
    const next = new URLSearchParams(latestParams.current);
    if (value && value !== 'ALL') next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  function reset() { setParams({}, { replace: true }); }
  useLayoutEffect(() => {
    if (!sync.loading && !restored.current) {
      if (navigation === 'POP' || location.state?.restoreScroll) window.scrollTo({ top: restoreTarget.current, behavior: 'instant' });
      restored.current = true;
    }
  }, [sync.loading, boxes, navigation, location]);
  useLayoutEffect(() => {
    if (sync.loading) return;
    const save = () => rememberScroll(location.pathname + location.search, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [sync.loading, location.pathname, location.search]);
  function locate() {
    if (!navigator.geolocation) { setGeoMessage('Устройство не поддерживает определение места. Выберите район вручную.'); return; }
    setLocating(true); setGeoMessage('');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!mounted.current) return;
      rememberedLocation = { lat: Number(coords.latitude.toFixed(4)), lng: Number(coords.longitude.toFixed(4)) };
      setGeo(rememberedLocation); setLocating(false); change('sort', 'nearby');
    }, () => {
      if (!mounted.current) return;
      setLocating(false); setGeoMessage('Не удалось определить место. Каталог доступен — выберите район вручную.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }
  return <Shell><main ref={scope} className="simple-page catalog" id="main-content">
    <CatalogIntro discovery={discovery}/>
    <div className="search-box"><Icon name="search"/><input type="search" aria-label="Поиск еды и заведений" placeholder="Еда, набор или заведение" maxLength={200} value={filters.q || ''} onChange={(event) => change('q', event.target.value)}/>{filters.q && <button className="search-clear" aria-label="Очистить поиск" onClick={() => change('q', '')}>×</button>}</div>
    {(availableCategories.size > 0 || filters.category) && <div className="category-row" aria-label="Категории">{Object.entries(categories).filter(([key]) => key === 'ALL' || availableCategories.has(key) || key === filters.category).map(([key, label]) => <button key={key} className={(filters.category || 'ALL') === key ? 'active' : ''} aria-pressed={(filters.category || 'ALL') === key} onClick={() => change('category', key)}>{label}</button>)}</div>}
    <div className="catalog-controls"><CatalogLocation districts={districts} value={filters.district || ''} onChange={(value) => change('district', value)}/>
      <details className="catalog-filters"><summary>Фильтры</summary><div>
        <label className="field"><span>Сортировка</span><select value={sort} onChange={(event) => change('sort', event.target.value)}><option value="ending">Скоро заканчивается</option><option value="cheapest">Дешевле</option><option value="nearby" disabled={!geo}>Рядом</option></select></label>
        <label className="field"><span>Цена до, ₸</span><input type="number" inputMode="numeric" min="0" max="10000000" value={filters.max || ''} onChange={(event) => change('max', event.target.value)}/></label>
        <label className="catalog-checkbox"><input type="checkbox" checked={filters.now === '1'} onChange={(event) => change('now', event.target.checked ? '1' : '')}/>Можно забрать сейчас</label>
        <button type="button" className="text-button" disabled={locating} onClick={locate}>{locating ? 'Определяем…' : 'Определить местоположение'}</button>
        {geo && <button type="button" className="text-button" onClick={() => { rememberedLocation = null; setGeo(null); if (sort === 'nearby') change('sort', 'ending'); }}>Сбросить местоположение</button>}
        {geoMessage && <p role="status">{geoMessage}</p>}
        <button type="button" className="text-button" onClick={reset}>Сбросить фильтры</button>
      </div></details>
    </div>
    {filters.venue && <button className="venue-filter" onClick={() => change('venue', '')}>{venues.find((venue) => String(venue.id) === filters.venue)?.name || 'Выбрано заведение'} · Сбросить</button>}
    {discovery && venues.length > 0 && <details className="catalog-venues"><summary>Заведения с наборами · {venues.length}</summary><div className="venue-grid">{venues.map((venue) => <button className="venue-tile" key={venue.id} onClick={() => change('venue', String(venue.id))}><strong>{venue.name}</strong><span>{venue.district}</span></button>)}</div></details>}
    <section className="feed-head" data-scroll-reveal><div><h2>Предложения на сегодня</h2>{!sync.loading && visible.length > 0 && <p className="catalog-count">Найдено: {visible.length}</p>}</div><div className="view-switch"><button aria-pressed={filters.view !== 'map'} className={filters.view !== 'map' ? 'active' : ''} onClick={() => change('view', '')}>Список</button><button aria-pressed={filters.view === 'map'} className={filters.view === 'map' ? 'active' : ''} onClick={() => change('view', 'map')}>Карта</button></div></section>
    {sync.loading && <p role="status">Загружаем предложения…</p>}
    {sync.error && <p className="form-error" role="alert">Не удалось обновить каталог. {boxes.length ? 'Показаны последние загруженные предложения.' : 'Проверьте подключение.'} <button className="text-button" onClick={() => { void sync.refresh(); }}>Повторить</button></p>}
    {sort === 'nearby' && !geo && <p>Для сортировки «Рядом» определите местоположение в фильтрах или выберите район.</p>}
    {boxes.length >= 500 && <p className="support-caption">Показаны первые 500 предложений каталога.</p>}
    {filters.view === 'map' && visible.length > 0 ? <GoogleMap boxes={visible}/> : <section className="deal-grid">{visible.map((box, index) => <div className="offer-reveal" key={box.id}><DealCard box={box} index={index}/></div>)}</section>}
    {!sync.loading && !sync.error && !visible.length && <CatalogEmpty filtered={boxes.length > 0} reset={reset} refresh={() => { void sync.refresh(); }} supportUrl={supportTelegramUrl} supportName={supportBotName}/>}
    {!discovery && !sync.loading && !sync.error && !boxes.length && <CatalogSteps/>}
    <footer className="catalog-footer"><span>Хорошая еда заслуживает второго шанса.</span><a href="/support">Нужна помощь?</a></footer>
  </main></Shell>;
}
