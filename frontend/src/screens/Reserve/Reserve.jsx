import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatTenge } from '../../lib/format';
import { hapticImpact, hapticSuccess, hapticError } from '../../lib/haptics';
import TimeWindowChip from '../../components/TimeWindowChip/TimeWindowChip';
import { useToast } from '../../context/ToastContext';
import t from '../../i18n/ru';
import './Reserve.css';

export default function Reserve() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, login } = useAuth();

  const [box, setBox] = useState(null);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch(`/boxes/${id}`, { skipAuth: true }).then(setBox).catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.display_name ?? user.name ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const handleReserve = useCallback(async () => {
    if (loading || !box) return;

    // Ensure identity first (login is idempotent on phone).
    if (!user) {
      if (!name.trim()) { showToast(t.loginErrName, 'error'); return; }
      if (!phone.trim()) { showToast(t.loginErrPhone, 'error'); return; }
    }

    setLoading(true);
    try {
      hapticImpact();
      if (!user) await login(name.trim(), phone.trim());

      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ box_id: box.id, qty }),
      });
      hapticSuccess();
      // celebrate flag → Ticket fires confetti once (not when reopened later).
      navigate(`/ticket/${order.id}`, { replace: true, state: { celebrate: true } });
    } catch (err) {
      hapticError();
      if (err.code === 'sold_out') {
        showToast(t.soldOutToast, 'error');
        navigate('/', { replace: true });
      } else {
        showToast(t.errServer, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [box, qty, name, phone, user, loading, login, navigate, showToast]);

  if (!box) return null;

  const total = box.price * qty;
  const maxQty = Math.min(3, box.qty_left);

  return (
    <div className="reserve page">
      <button className="reserve__back" onClick={() => navigate(-1)}>← {t.box}</button>
      <h1 className="reserve__title">{t.reserveTitle}</h1>

      <div className="reserve__card">
        <div className="reserve__row">
          <span className="reserve__label">{t.venue}</span>
          <span className="reserve__value">{box.venue?.name}</span>
        </div>
        <div className="reserve__divider" />
        <div className="reserve__row">
          <span className="reserve__label">{t.box}</span>
          <span className="reserve__value">{box.title}</span>
        </div>
        <div className="reserve__divider" />
        <div className="reserve__row">
          <span className="reserve__label">{t.pickupTime}</span>
          <TimeWindowChip start={box.pickup_start} end={box.pickup_end} date={box.pickup_date} />
        </div>
        <div className="reserve__divider" />
        <div className="reserve__row">
          <span className="reserve__label">{t.qty}</span>
          <div className="reserve__stepper">
            <button onClick={() => setQty((v) => Math.max(1, v - 1))} disabled={qty <= 1}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((v) => Math.min(maxQty, v + 1))} disabled={qty >= maxQty}>+</button>
          </div>
        </div>
        <div className="reserve__divider" />
        <div className="reserve__row reserve__row--total">
          <span className="reserve__label">{t.toPay}</span>
          <span className="reserve__total">{formatTenge(total)}</span>
        </div>
      </div>

      {!user && (
        <div className="reserve__form">
          <p className="reserve__form-hint">{t.loginSubtitle}</p>
          <label className="reserve__field-label">{t.loginName}</label>
          <input
            className="reserve__input" type="text"
            placeholder={t.loginNamePlaceholder}
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <label className="reserve__field-label">{t.loginPhone}</label>
          <input
            className="reserve__input" type="tel"
            placeholder={t.loginPhonePlaceholder}
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}

      <div className="reserve__note">
        <span className="reserve__note-icon">ℹ️</span>
        <p>{t.v0PayNote}</p>
      </div>

      <button className="reserve__btn" onClick={handleReserve} disabled={loading}>
        {loading ? '…' : t.confirmReserve}
      </button>
    </div>
  );
}
