import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatTenge, formatPickup } from '../../lib/format';
import { hapticSuccess } from '../../lib/haptics';
import useReducedMotion from '../../lib/useReducedMotion';
import GhostButton from '../../components/GhostButton/GhostButton';
import Rating from '../../components/Rating/Rating';
import { useToast } from '../../context/ToastContext';
import t from '../../i18n';

const STATUS_LABEL = {
  RESERVED: t.statusReserved,
  PAID: t.statusPaid,
  PICKED_UP: t.statusPickedUp,
  CANCELLED: t.statusCancelled,
  NO_SHOW: t.statusNoShow,
};

// Minutes remaining until "HH:MM" today (null if already passed).
function remainingMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const end = new Date();
  end.setHours(h, m, 0, 0);
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.floor(diff / 60000);
}

function humanRemaining(mins) {
  if (mins == null) return null;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0
    ? `${hrs} ${t.hoursShort} ${rem} ${t.minutesShort}`
    : `${rem} ${t.minutesShort}`;
}

// Animated checkmark — strokes itself via stroke-dashoffset (see Ticket.css).
function Checkmark() {
  return (
    <svg className="ticket__check-svg" viewBox="0 0 52 52" aria-hidden="true">
      <circle className="ticket__check-circle" cx="26" cy="26" r="24" fill="none" />
      <path className="ticket__check-mark" fill="none" d="M14 27l8 8 16-16" />
    </svg>
  );
}

// One-shot confetti, max 12 particles, never loops.
// Colours come from :nth-child rules in Ticket.css so the palette stays in
// tokens — the old inline array still held the retired orange brand colours.
function Confetti() {
  const pieces = Array.from({ length: 12 }, () => ({
    cx: `${(Math.random() * 2 - 1) * 60}px`,
    cy: `${60 + Math.random() * 50}px`,
    cr: `${Math.random() * 360}deg`,
    left: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 120}ms`,
  }));
  return (
    <div className="ticket__confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ticket__confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            '--cx': p.cx, '--cy': p.cy, '--cr': p.cr,
          }}
        />
      ))}
    </div>
  );
}

export default function Ticket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const reduced = useReducedMotion();

  const [order, setOrder] = useState(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingDone, setRatingDone] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const celebrate = location.state?.celebrate === true;

  useEffect(() => {
    apiFetch(`/orders/${id}`).then((o) => {
      setOrder(o);
      if (o.rating) setRatingDone(true);
      if (celebrate) {
        hapticSuccess();
        if (!reduced) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1400);
        }
      }
    }).catch(() => navigate('/orders'));
  }, [id, navigate, celebrate, reduced]);

  // Live countdown tick.
  useEffect(() => {
    if (!order || order.status !== 'RESERVED') return;
    const update = () => setRemaining(remainingMinutes(order.box?.pickup_end));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [order]);

  async function cancelOrder() {
    if (!window.confirm(t.cancelConfirm)) return;
    try {
      await apiFetch(`/orders/${id}/cancel`, { method: 'POST' });
      setOrder((o) => ({ ...o, status: 'CANCELLED' }));
    } catch {
      showToast(t.errServer, 'error');
    }
  }

  async function submitRating() {
    if (!stars) return;
    try {
      await apiFetch('/ratings', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id, stars, comment: comment.trim() || null }),
      });
      setRatingDone(true);
      showToast(t.ratingThanks, 'success');
    } catch {
      showToast(t.errServer, 'error');
    }
  }

  if (!order) return null;

  const box = order.box;
  const venue = box?.venue;
  const canCancel = order.status === 'RESERVED';
  const pickedUp = order.status === 'PICKED_UP';
  const mapsUrl = `https://2gis.kz/astana/search/${encodeURIComponent(venue?.address ?? '')}`;
  const urgent = remaining != null && remaining < 30;

  return (
    <div className="ticket page">
      <button className="reserve__back" onClick={() => navigate('/orders')}>← {t.ordersTitle}</button>

      <div className={`ticket__card ticket__card--in${pickedUp ? ' ticket__card--done' : ''}`}>
        {showConfetti && <Confetti />}
        <div className="ticket__top">
          <span className="ticket__check"><Checkmark /></span>
          <h2 className="ticket__title">{pickedUp ? t.pickedUp : t.ticketTitle}</h2>
          <p className="ticket__hint">{t.showCode}</p>
        </div>

        <div className="ticket__perforated" />

        <div className="ticket__code-section">
          <p className="ticket__code-label">{t.pickupCodeLabel}</p>
          <p className="ticket__code">
            {String(order.pickup_code).split('').map((d, i) => (
              <span key={i} className="ticket__code-digit" style={{ animationDelay: `${i * 70}ms` }}>{d}</span>
            ))}
          </p>
        </div>

        <div className="ticket__perforated" />

        <div className="ticket__meta">
          <div className="ticket__meta-row">
            <span className="ticket__meta-label">{t.venue}</span>
            <span className="ticket__meta-value">{venue?.name}</span>
          </div>
          <div className="ticket__meta-row">
            <span className="ticket__meta-label">{t.addressLabel}</span>
            <a className="ticket__meta-value ticket__meta-value--link" href={mapsUrl} target="_blank" rel="noreferrer">
              {venue?.address} {t.openIn2GIS}
            </a>
          </div>
          <div className="ticket__meta-row">
            <span className="ticket__meta-label">{t.pickupTime}</span>
            <span className="ticket__meta-value">{formatPickup(box?.pickup_start, box?.pickup_end, box?.pickup_date, t.today)}</span>
          </div>
          <div className="ticket__meta-row">
            <span className="ticket__meta-label">{t.payAtVenueLabel}</span>
            <span className="ticket__meta-value">{formatTenge(order.amount)}</span>
          </div>
          <div className="ticket__meta-row">
            <span className="ticket__meta-label">{t.statusLabel}</span>
            <span className={`ticket__status ticket__status--${order.status.toLowerCase()}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
        </div>
      </div>

      {canCancel && (
        <div className={`ticket__countdown${urgent ? ' ticket__countdown--urgent' : ''}`}>
          {remaining != null ? `${t.countdownPrefix} ${box?.pickup_end} · ${humanRemaining(remaining)}` : t.countdownEnded}
        </div>
      )}

      {canCancel && (
        <div className="ticket__actions">
          <GhostButton danger fullWidth onClick={cancelOrder}>
            {t.cancelReservation}
          </GhostButton>
        </div>
      )}

      {pickedUp && !ratingDone && (
        <div className="ticket__rating">
          <p className="ticket__rating-title">{t.rateVenue}</p>
          <Rating value={stars} onChange={setStars} />
          {stars > 0 && (
            <>
              <textarea
                className="ticket__rating-comment"
                placeholder={t.ratingCommentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <button className="ticket__rating-submit" onClick={submitRating}>
                {t.submitRating}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
