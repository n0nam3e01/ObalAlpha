import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import BoxCard from '../../components/BoxCard/BoxCard';
import PromoCarousel from '../../components/PromoCarousel/PromoCarousel';
import CategoryChips from '../../components/CategoryChips/CategoryChips';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import EmptyState from '../../components/EmptyState/EmptyState';
import { SkeletonCard } from '../../components/Skeleton/Skeleton';
import MapView from '../../components/MapView/MapView';
import t from '../../i18n';
import './Home.css';

const SORTS = [
  { key: 'nearby', label: t.sortNearby },
  { key: 'ending', label: t.sortEnding },
  { key: 'cheapest', label: t.sortCheapest },
];

const VIEWS = [
  { key: 'list', label: t.viewList },
  { key: 'map', label: t.viewMap },
];

// Persist the browse state so returning from a box detail (which unmounts Home)
// restores the same category / sort / view / query instead of resetting to ALL.
const PERSIST_KEY = 'obal_home_state';
function loadPersisted() {
  try {
    return JSON.parse(sessionStorage.getItem(PERSIST_KEY)) ?? {};
  } catch {
    return {};
  }
}
const persisted = loadPersisted();

export default function Home() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(persisted.category ?? 'ALL');
  const [sort, setSort] = useState(persisted.sort ?? 'nearby');
  const [q, setQ] = useState(persisted.q ?? '');
  const [debouncedQ, setDebouncedQ] = useState(persisted.q ?? '');
  const [view, setView] = useState(persisted.view ?? 'list');

  // Only the latest in-flight request is allowed to write state — this kills the
  // race where a slow earlier response lands after a newer one (Bug 1).
  const activeController = useRef(null);
  // Stagger card entrance on the first populated load only, not on every filter.
  const hasAnimated = useRef(false);
  // Promo banner → re-sort the list and scroll it into view.
  const listRef = useRef(null);
  const onPromoSelect = useCallback((nextSort) => {
    setCategory('ALL');
    setSort(nextSort);
    setView('list');
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Debounce the search box: typing stays responsive, fetches don't fire per key.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Persist browse state on every change.
  useEffect(() => {
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify({ category, sort, q, view }));
  }, [category, sort, q, view]);

  const load = useCallback(async () => {
    // Supersede any request still in flight.
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (category !== 'ALL') params.set('category', category);
      if (debouncedQ) params.set('q', debouncedQ);
      const data = await apiFetch(`/boxes?${params}`, { skipAuth: true, signal: controller.signal });
      if (activeController.current !== controller) return; // superseded
      setBoxes(data);
    } catch (err) {
      if (err.name === 'AbortError' || activeController.current !== controller) return;
      setError(true);
    } finally {
      if (activeController.current === controller) setLoading(false);
    }
  }, [category, sort, debouncedQ]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => activeController.current?.abort(), []);
  useEffect(() => { if (boxes.length) hasAnimated.current = true; }, [boxes]);

  return (
    <div className="home page">
      <header className="home__header">
        <span className="home__wordmark">öbal</span>
        <span className="home__city">
          <svg className="home__pin" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" />
          </svg>
          {t.city}
        </span>
      </header>

      <div className="home__search-row">
        <div className="home__search-wrap">
          <svg className="home__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="home__search"
            placeholder={t.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.searchPlaceholder}
          />
        </div>
      </div>

      <CategoryChips active={category} onChange={setCategory} />

      {/* Swipeable promo banners — each navigates the list (re-sort + scroll) */}
      <PromoCarousel onSelect={onPromoSelect} />

      <div className="home__controls">
        <div className="home__view"><SegmentedControl segments={VIEWS} value={view} onChange={setView} size="sm" /></div>
        <SegmentedControl segments={SORTS} value={sort} onChange={setSort} size="sm" />
      </div>

      {view === 'map' ? (
        <MapView boxes={boxes} loading={loading} />
      ) : (
        <div className="home__list" ref={listRef}>
          <p className="home__section-label">{t.sectionNearby}</p>

          {loading && [1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)}

          {!loading && error && (
            <EmptyState icon="⚠️" title={t.errServer} action={t.retry} onAction={load} />
          )}

          {!loading && !error && boxes.length === 0 && (
            <EmptyState
              icon="🌙"
              description={t.emptyBoxes}
              action={category !== 'ALL' || q ? t.emptyBoxesAction : undefined}
              onAction={() => { setCategory('ALL'); setQ(''); }}
            />
          )}

          {!loading && !error && boxes.map((box, i) => (
            <BoxCard key={box.id} box={box} index={i} entrance={!hasAnimated.current} />
          ))}
        </div>
      )}
    </div>
  );
}
