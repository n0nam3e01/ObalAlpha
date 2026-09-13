import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, isAuthed } from '../../lib/api';
import EmptyState from '../../components/EmptyState/EmptyState';
import t from '../../i18n';

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed()) { setLoading(false); return; }
    apiFetch('/favorites').then(setFavorites).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function unfavorite(venueId, e) {
    e.stopPropagation();
    await apiFetch(`/favorites/${venueId}`, { method: 'DELETE' });
    setFavorites((prev) => prev.filter((f) => f.venue.id !== venueId));
  }

  return (
    <div className="favorites page">
      <h1 className="favorites__title">{t.favoritesTitle}</h1>

      {loading && <p className="favorites__loading">…</p>}

      {!loading && favorites.length === 0 && (
        <EmptyState icon="♡" title={t.emptyFavorites} description={t.emptyFavoritesDesc}
          action={t.emptyOrdersAction} onAction={() => navigate('/')} />
      )}

      {favorites.map(({ venue }) => (
        <div key={venue.id} className="fav-row" onClick={() => navigate(`/venue/${venue.id}`)}>
          <div className="fav-row__icon">
            {venue.photo_url ? <img src={venue.photo_url} alt="" /> : <span>🏪</span>}
          </div>
          <div className="fav-row__body">
            <p className="fav-row__name">{venue.name}</p>
            <p className="fav-row__address">{venue.address}</p>
            {venue.active_boxes_count > 0 && (
              <p className="fav-row__active">{t.activeBoxes(venue.active_boxes_count)}</p>
            )}
          </div>
          <button className="fav-row__unfav" onClick={(e) => unfavorite(venue.id, e)}>♥</button>
        </div>
      ))}
    </div>
  );
}
