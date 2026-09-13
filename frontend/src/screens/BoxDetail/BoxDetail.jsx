import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import PriceBlock from '../../components/PriceBlock/PriceBlock';
import TimeWindowChip from '../../components/TimeWindowChip/TimeWindowChip';
import QtyBadge from '../../components/QtyBadge/QtyBadge';
import { SkeletonCard } from '../../components/Skeleton/Skeleton';
import { formatTenge } from '../../lib/format';
import t from '../../i18n';

export default function BoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/boxes/${id}`)
      .then(setBox)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleReserve = useCallback(() => navigate(`/reserve/${id}`), [id, navigate]);

  if (loading) return <div className="page" style={{ padding: 16 }}><SkeletonCard /></div>;
  if (!box) return null;

  const soldOut = box.qty_left === 0 || box.status !== 'ACTIVE';

  return (
    <div className="box-detail page">
      <button className="reserve__back" onClick={() => navigate(-1)}>← {t.back}</button>

      <div className="box-detail__hero">
        {box.photo_url ? (
          <img src={box.photo_url} alt={box.title} className="box-detail__photo" />
        ) : (
          <div className="box-detail__placeholder">
            <span className="box-detail__emoji">{box.type === 'SURPRISE' ? '🎁' : '🍱'}</span>
          </div>
        )}
        {soldOut && <div className="box-detail__sold-overlay">{t.soldOut}</div>}
      </div>

      <div className="box-detail__body">
        <button className="box-detail__venue-link" onClick={() => navigate(`/venue/${box.venue.id}`)}>
          <span className="box-detail__venue-name">{box.venue.name}</span>
          <span className="box-detail__venue-address">{box.venue.address}</span>
          <span className="box-detail__rating">
            {t.venueRating(box.venue.rating_avg.toFixed(1), box.venue.rating_count)}
          </span>
        </button>

        <div className="box-detail__price-row">
          <PriceBlock original={box.original_price} price={box.price} large />
        </div>

        <section className="box-detail__section">
          <h3 className="box-detail__section-title">{t.whatsInside}</h3>
          {box.type === 'SURPRISE' ? (
            <p className="box-detail__desc">{box.description || t.surpriseDesc}</p>
          ) : (
            <ul className="box-detail__items">
              {(box.items ?? '').split('\n').filter(Boolean).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <div className="box-detail__info-grid">
          <div className="box-detail__info-item">
            <span className="box-detail__info-label">{t.pickup}</span>
            <TimeWindowChip start={box.pickup_start} end={box.pickup_end} date={box.pickup_date} />
          </div>
          <div className="box-detail__info-item">
            <span className="box-detail__info-label">{t.leftQty}</span>
            <QtyBadge qty={box.qty_left} />
          </div>
          <div className="box-detail__info-item box-detail__info-item--full">
            <span className="box-detail__info-label">{t.payAtVenue}</span>
          </div>
        </div>

        {!soldOut && (
          <button className="box-detail__fallback-btn" onClick={handleReserve}>
            {t.reserveBtn(formatTenge(box.price))}
          </button>
        )}
      </div>
    </div>
  );
}
