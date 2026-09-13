import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, isAuthed } from '../../lib/api';
import { formatPickup } from '../../lib/format';
import EmptyState from '../../components/EmptyState/EmptyState';
import { SkeletonCard } from '../../components/Skeleton/Skeleton';
import t from '../../i18n/ru';

const STATUS_LABEL = {
  RESERVED: t.statusReserved,
  PAID: t.statusPaid,
  PICKED_UP: t.statusPickedUp,
  CANCELLED: t.statusCancelled,
  NO_SHOW: t.statusNoShow,
};

const STATUS_CLASS = {
  RESERVED: 'status--active',
  PAID: 'status--active',
  PICKED_UP: 'status--done',
  CANCELLED: 'status--cancelled',
  NO_SHOW: 'status--cancelled',
};

export default function Orders() {
  const navigate = useNavigate();
  const [data, setData] = useState({ active: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthed()) { setLoading(false); return; }
    apiFetch('/orders')
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const empty = !loading && !error && data.active.length === 0 && data.past.length === 0;

  return (
    <div className="orders page">
      <h1 className="orders__title">{t.ordersTitle}</h1>

      {loading && <div style={{ padding: '0 var(--page-px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SkeletonCard /><SkeletonCard />
      </div>}

      {error && (
        <EmptyState icon="⚠️" title={t.errServer} action={t.retry} onAction={() => window.location.reload()} />
      )}

      {empty && (
        <EmptyState icon="🗒️" title={t.emptyOrders} action={t.emptyOrdersAction} onAction={() => navigate('/')} />
      )}

      {!loading && !error && data.active.length > 0 && (
        <section className="orders__section">
          <p className="orders__section-label">{t.ordersActive}</p>
          {data.active.map((o) => <OrderRow key={o.id} order={o} navigate={navigate} />)}
        </section>
      )}

      {!loading && !error && data.past.length > 0 && (
        <section className="orders__section">
          <p className="orders__section-label">{t.ordersHistory}</p>
          {data.past.map((o) => <OrderRow key={o.id} order={o} navigate={navigate} />)}
        </section>
      )}
    </div>
  );
}

function OrderRow({ order, navigate }) {
  const box = order.box;
  const venue = box?.venue;

  return (
    <div className="order-row" onClick={() => navigate(`/ticket/${order.id}`)}>
      <div className="order-row__icon">
        {venue?.photo_url ? <img src={venue.photo_url} alt="" /> : <span>🏪</span>}
      </div>
      <div className="order-row__body">
        <p className="order-row__venue">{venue?.name}</p>
        <p className="order-row__meta">
          код {order.pickup_code} · {formatPickup(box?.pickup_start, box?.pickup_end, box?.pickup_date, t.today)}
        </p>
      </div>
      <span className={`order-row__status ${STATUS_CLASS[order.status] ?? ''}`}>
        {STATUS_LABEL[order.status] ?? order.status}
      </span>
    </div>
  );
}
