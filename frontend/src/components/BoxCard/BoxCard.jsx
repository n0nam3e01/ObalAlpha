import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import QtyBadge from '../QtyBadge/QtyBadge';
import PriceBlock from '../PriceBlock/PriceBlock';
import TimeWindowChip from '../TimeWindowChip/TimeWindowChip';
import { formatDistance } from '../../lib/format';
import { apiFetch, isAuthed } from '../../lib/api';
import useReducedMotion from '../../lib/useReducedMotion';
import t from '../../i18n/ru';

const CATEGORY_LABEL = {
  BAKERY: t.catBakery, PREPARED: t.catPrepared, SUPERMARKET: t.catSupermarket,
  CAFE: t.catCafe, DESSERT: t.catDessert, OTHER: t.surprise,
};

const CATEGORY_EMOJI = {
  BAKERY: '🥐', PREPARED: '🍱', SUPERMARKET: '🛒',
  CAFE: '☕', DESSERT: '🍰', OTHER: '🎁',
};

// Six particle directions for the favorite burst (even ring).
const BURST_DIRS = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 6;
  return { x: Math.round(Math.cos(a) * 18), y: Math.round(Math.sin(a) * 18) };
});

export default function BoxCard({ box, index = 0, entrance = false, isFavorited, onFavoriteToggle }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [faved, setFaved] = useState(isFavorited ?? false);
  const [favLoading, setFavLoading] = useState(false);
  const [burst, setBurst] = useState(false);

  const cat = (box.venue?.category ?? 'OTHER').toLowerCase();
  const catLabel = CATEGORY_LABEL[box.venue?.category] ?? t.surprise;
  const distance = formatDistance(box.distance_km);
  const delay = Math.min(index, 8) * 60;
  const canFav = !!box.venue?.id;

  async function toggleFav(e) {
    e.stopPropagation();
    if (favLoading || !isAuthed() || !canFav) return;
    setFavLoading(true);
    try {
      if (faved) {
        await apiFetch(`/favorites/${box.venue.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/favorites/${box.venue.id}`, { method: 'POST' });
        if (!reduced) {
          setBurst(true);
          setTimeout(() => setBurst(false), 600);
        }
      }
      setFaved(!faved);
      onFavoriteToggle?.(!faved, box.venue.id);
    } catch { /* favoriting is best-effort */ }
    finally { setFavLoading(false); }
  }

  return (
    <div
      className={`box-card${entrance ? ' box-card--enter' : ''}`}
      style={entrance ? { animationDelay: `${delay}ms` } : undefined}
      onClick={() => navigate(`/box/${box.id}`)}
    >
      <div className="box-card__hero">
        {box.photo_url ? (
          <img src={box.photo_url} alt="" className="box-card__photo" />
        ) : (
          <div className={`box-card__placeholder box-card__placeholder--${cat}`} aria-hidden="true">
            <span className="box-card__ph-emoji">
              {CATEGORY_EMOJI[box.venue?.category ?? 'OTHER'] ?? '🎁'}
            </span>
          </div>
        )}
        <QtyBadge qty={box.qty_left} />
        <span
          className={`box-card__discount${entrance ? ' box-card__discount--pop' : ''}`}
          style={entrance ? { animationDelay: `${delay + 120}ms` } : undefined}
        >
          −{box.discount_pct}%
        </span>
        {canFav && (
          <button
            className={`box-card__fav${faved ? ' box-card__fav--active' : ''}`}
            onClick={toggleFav}
            aria-label={faved ? t.unfavorite : t.favoritesLabel}
            aria-pressed={faved}
          >
            <svg className="box-card__fav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-10-9.2C.8 9.1 1.9 5.5 5.2 4.8 7.4 4.3 9.4 5.4 12 8c2.6-2.6 4.6-3.7 6.8-3.2 3.3.7 4.4 4.3 3.2 7C19.5 16.4 12 21 12 21Z" />
            </svg>
            {burst && (
              <span className="box-card__burst" aria-hidden="true">
                {BURST_DIRS.map((d, i) => (
                  <span key={i} className="box-card__particle" style={{ '--hx': `${d.x}px`, '--hy': `${d.y}px` }} />
                ))}
              </span>
            )}
          </button>
        )}
      </div>
      <div className="box-card__body">
        <div className="box-card__footer">
          <PriceBlock original={box.original_price} price={box.price} large />
          <TimeWindowChip start={box.pickup_start} end={box.pickup_end} compact />
        </div>
        <p className="box-card__meta">
          {catLabel}
          {distance && ` · ${distance}`}
        </p>
        <button
          className="box-card__cta"
          onClick={(e) => { e.stopPropagation(); navigate(`/box/${box.id}`); }}
        >
          {t.pickup}
        </button>
      </div>
    </div>
  );
}
