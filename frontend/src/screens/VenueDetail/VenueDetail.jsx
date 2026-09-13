import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import BoxCard from '../../components/BoxCard/BoxCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import { SkeletonCard } from '../../components/Skeleton/Skeleton';
import t from '../../i18n';

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/boxes?category=ALL', { skipAuth: true })
      .then((all) => all.filter((b) => b.venue_id === parseInt(id)))
      .then((venueBoxes) => {
        setBoxes(venueBoxes);
        if (venueBoxes[0]) setVenue(venueBoxes[0].venue);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="venue-detail page">
      <button className="reserve__back" onClick={() => navigate(-1)}>← {t.navHome}</button>

      {loading && <div style={{ padding: '8px 16px' }}><SkeletonCard /></div>}

      {!loading && venue && (
        <>
          <div className="venue-detail__header">
            <h1 className="venue-detail__name">{venue.name}</h1>
            <p className="venue-detail__address">{venue.address}</p>
            {venue.rating_count > 0 && (
              <p className="venue-detail__rating">★ {venue.rating_avg?.toFixed(1)} · {venue.rating_count}</p>
            )}
          </div>
          <div className="venue-detail__boxes">
            {boxes.map((b) => <BoxCard key={b.id} box={b} />)}
          </div>
        </>
      )}

      {!loading && !venue && (
        <EmptyState icon="📦" description={t.emptyBoxes} action={t.navHome} onAction={() => navigate('/')} />
      )}
    </div>
  );
}
