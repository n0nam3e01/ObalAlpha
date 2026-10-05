import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { categoryIcons, DealCard, DealSkeleton, Icon, Shell } from '../ui';
import { plural } from './Home';

export default function Search() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const venueId = params.get('venue');
  useEffect(() => {
    let active = true;
    apiFetch('/boxes', { skipAuth: true }).then((data) => { if (active) setBoxes(data); })
      .catch(() => { if (active) setError('Не удалось загрузить предложения. Обновите страницу.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Query lives in the URL so Back from a box returns to the same results.
  const update = (next) => setParams(Object.fromEntries(Object.entries({ q: query, venue: venueId, ...next }).filter(([, v]) => v)), { replace: true });
  const venues = [...new Map(boxes.map((box) => [box.venue.id, box.venue])).values()];
  const perVenue = boxes.reduce((acc, box) => ({ ...acc, [box.venue.id]: (acc[box.venue.id] || 0) + 1 }), {});
  const selectedVenue = venues.find((venue) => String(venue.id) === venueId);
  const needle = query.trim().toLowerCase();
  const filtered = boxes.filter((box) => (!venueId || String(box.venue.id) === venueId) && `${box.title} ${box.venue.name} ${box.items || ''} ${box.description || ''}`.toLowerCase().includes(needle));
  const searching = needle || venueId;
  const popular = [...boxes].sort((a, b) => (b.popularity_today || 0) - (a.popularity_today || 0) || b.discount_pct - a.discount_pct).slice(0, 4);

  return <Shell><main className="search-page simple-page" id="main-content">
    <header className="page-head"><h1 className="large-title">Поиск</h1></header>
    <div className="search-field"><Icon name="search" size={19}/><input type="search" enterKeyHint="search" autoFocus value={query} onChange={(e) => update({ q: e.target.value })} placeholder="Круассаны, плов, кофейня…" aria-label="Поиск еды и заведений"/>{query && <button type="button" className="search-clear" onClick={() => update({ q: '' })} aria-label="Очистить поиск"><Icon name="close" size={14}/></button>}</div>
    {selectedVenue && <button type="button" className="venue-filter" onClick={() => update({ venue: '' })}><Icon name="store" size={16}/>{selectedVenue.name}<Icon name="close" size={14}/><span className="sr-only">Сбросить фильтр заведения</span></button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="discovery-section"><DealSkeleton count={2}/></div>
      : !error && (searching
        ? <section className="discovery-section"><h2>{selectedVenue ? 'Предложения заведения' : 'Результаты'}</h2><p role="status">{filtered.length ? `Найдено: ${filtered.length}` : 'Ничего не нашли. Попробуйте другое слово или сбросьте фильтр.'}</p><div className="deal-grid">{filtered.map((box, index) => <DealCard key={box.id} box={box} index={index}/>)}</div></section>
        : <>
          <section className="discovery-section"><h2>Заведения сегодня</h2><p>{venues.length ? 'Выберите заведение, чтобы увидеть его наборы' : 'Заведения появятся вместе с новыми предложениями.'}</p>
            <div className="venue-grid">{venues.map((venue) => <button type="button" className="venue-tile" key={venue.id} onClick={() => update({ venue: String(venue.id) })}><span className={`venue-logo art--${(categoryIcons[venue.category] ? venue.category : 'OTHER').toLowerCase()}`} aria-hidden="true"><Icon name={categoryIcons[venue.category] || 'sparkle'} size={28}/></span><strong>{venue.name}</strong><span>{perVenue[venue.id]} {plural(perVenue[venue.id], 'набор', 'набора', 'наборов')} · {venue.district || 'Астана'}</span></button>)}</div>
          </section>
          {boxes.length > 0 && <section className="discovery-section"><h2>Популярно сегодня</h2><p>{boxes.some((box) => box.popularity_today > 0) ? 'Наборы, которые чаще бронируют сегодня' : 'Пока мало заказов — начните с самых выгодных'}</p><div className="deal-grid">{popular.map((box, index) => <DealCard key={box.id} box={box} index={index}/>)}</div></section>}
        </>)}
  </main></Shell>;
}
