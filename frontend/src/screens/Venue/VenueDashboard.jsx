import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { formatTenge } from '../../lib/format';
import { hapticSuccess } from '../../lib/haptics';
import useCountUp from '../../lib/useCountUp';
import { venueFetch, venueAuth, getVenueToken, setVenueToken } from '../../lib/venueApi';
import t from '../../i18n/ru';
import VenueLogin from './VenueLogin';
import AddBoxForm from './AddBoxForm';
import OrdersPanel from './OrdersPanel';
import VenueSettings from './VenueSettings';
import './Venue.css';

const CATEGORY_EMOJI = {
  BAKERY: '🥐', PREPARED: '🍱', SUPERMARKET: '🛒', CAFE: '☕', DESSERT: '🍰', OTHER: '🍽️',
};
const TABS = [
  { key: 'add', label: t.vbAddBox },
  { key: 'boxes', label: t.vbActiveBoxes },
  { key: 'orders', label: t.vbTodayOrders },
];

function StatCard({ label, value, money, highlight }) {
  const n = useCountUp(value);
  return (
    <div className={`vbiz-stat${highlight ? ' vbiz-stat--hl' : ''}`}>
      <span className="vbiz-stat__value">{money ? formatTenge(n) : n}</span>
      <span className="vbiz-stat__label">{label}</span>
    </div>
  );
}

export default function VenueDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();

  const [booting, setBooting] = useState(true);
  const [venue, setVenue] = useState(null);
  const [stats, setStats] = useState(null);
  const [lastBox, setLastBox] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payout, setPayout] = useState(null);
  const [tab, setTab] = useState('add');
  const [showSettings, setShowSettings] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const reloaded = useRef(false);

  const loadAll = useCallback(async () => {
    setLoadError(false);
    try {
      const [me, b, o] = await Promise.all([
        venueFetch('/me'), venueFetch('/boxes'), venueFetch('/orders'),
      ]);
      setVenue(me.venue);
      setStats(me.today_stats);
      setLastBox(me.last_box);
      setBoxes(b);
      setOrders(o);
    } catch {
      setLoadError(true);
    }
  }, []);

  // Boot: magic-link ?key takes priority, else a stored token.
  useEffect(() => {
    if (reloaded.current) return;
    reloaded.current = true;
    (async () => {
      const key = params.get('key');
      try {
        if (key) {
          const { token } = await venueAuth(key);
          setVenueToken(token);
          params.delete('key');
          setParams(params, { replace: true });
        } else if (!getVenueToken()) {
          setBooting(false);
          return;
        }
        await loadAll();
      } catch {
        setVenueToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [params, setParams, loadAll]);

  async function handleLogin(code) {
    const { token, venue: v } = await venueAuth(code);
    setVenueToken(token);
    setVenue(v);
    await loadAll();
  }

  function logout() {
    setVenueToken(null);
    setVenue(null);
    setStats(null);
    navigate('/');
  }

  async function toggleOpen() {
    const next = !venue.is_active;
    setVenue((v) => ({ ...v, is_active: next })); // optimistic
    try {
      await venueFetch('/me', { method: 'PATCH', body: JSON.stringify({ is_active: next }) });
    } catch {
      setVenue((v) => ({ ...v, is_active: !next }));
      showToast(t.errServer, 'error');
    }
  }

  async function publish(payload, reset) {
    setPublishing(true);
    try {
      await venueFetch('/boxes', { method: 'POST', body: JSON.stringify(payload) });
      hapticSuccess();
      showToast(t.vbPublished, 'success');
      reset();
      await loadAll();
      setTab('boxes');
    } catch {
      showToast(t.errServer, 'error');
    } finally {
      setPublishing(false);
    }
  }

  async function changeQty(box, delta) {
    const next = Math.max(0, box.qty_left + delta);
    setBoxes((prev) => prev.map((b) => (b.id === box.id ? { ...b, qty_left: next } : b)));
    try {
      await venueFetch(`/boxes/${box.id}`, { method: 'PATCH', body: JSON.stringify({ qty_left: next }) });
    } catch { loadAll(); }
  }

  async function setBoxStatus(boxId, status) {
    setBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, status } : b)));
    try {
      await venueFetch(`/boxes/${boxId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadAll();
    } catch { loadAll(); }
  }

  async function pickupByCode(code) {
    const res = await venueFetch('/pickup', { method: 'POST', body: JSON.stringify({ code }) });
    showToast(`${t.vbIssued}: ${res.box}`, 'success');
    await loadAll();
    return res;
  }

  async function openSettings() {
    setShowSettings(true);
    try { setPayout(await venueFetch('/payout')); } catch { /* non-critical */ }
  }

  async function saveSettings(patch) {
    setSaving(true);
    try {
      const { venue: v } = await venueFetch('/me', { method: 'PATCH', body: JSON.stringify(patch) });
      setVenue(v);
      showToast(t.vbSaved, 'success');
      setShowSettings(false);
    } catch {
      showToast(t.errServer, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (booting) {
    return <div className="vbiz vbiz--center"><div className="vbiz-spinner" aria-label="…" /></div>;
  }

  if (!venue) {
    return <VenueLogin onSubmit={handleLogin} />;
  }

  return (
    <div className="vbiz">
      <header className="vbiz-header">
        <div className="vbiz-header__brand">
          <div className="vbiz-header__avatar" aria-hidden="true">
            {venue.photo_url
              ? <img src={venue.photo_url} alt="" />
              : <span>{CATEGORY_EMOJI[venue.category] ?? '🍽️'}</span>}
          </div>
          <div className="vbiz-header__id">
            <span className="vbiz-header__wm">Obal <em>{t.vbBusiness}</em></span>
            <span className="vbiz-header__name">{venue.name}</span>
          </div>
        </div>
        <div className="vbiz-header__actions">
          <button className={`vbiz-toggle${venue.is_active ? ' vbiz-toggle--on' : ''}`} onClick={toggleOpen}>
            <span className="vbiz-toggle__dot" />
            {venue.is_active ? t.vbOpen : t.vbClosed}
          </button>
          <button className="vbiz-icon-btn" onClick={openSettings} aria-label={t.vbSettings}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="vbiz-body">
          <div className="vbiz-error">
            <p>{t.errServer}</p>
            <button className="vbiz-btn vbiz-btn--primary" onClick={loadAll}>{t.retry}</button>
          </div>
        </div>
      ) : (
        <div className="vbiz-body">
          {stats && (
            <div className="vbiz-stats">
              <StatCard label={t.vbStatPosted} value={stats.boxes_posted} />
              <StatCard label={t.vbStatSold} value={stats.orders_sold} />
              <StatCard label={t.vbStatRevenue} value={stats.revenue} money highlight />
              <StatCard label={t.vbStatSaved} value={stats.portions_saved} />
            </div>
          )}

          {showSettings ? (
            <div className="vbiz-panel">
              <div className="vbiz-panel__head">
                <h2 className="vbiz-panel__title">{t.vbSettingsTitle}</h2>
                <button className="vbiz-link" onClick={() => setShowSettings(false)}>✕</button>
              </div>
              <VenueSettings venue={venue} payout={payout} onSave={saveSettings} saving={saving} />
              <button className="vbiz-btn vbiz-btn--ghost vbiz-logout" onClick={logout}>{t.vbLogout}</button>
            </div>
          ) : (
            <>
              <div className="vbiz-tabs">
                {TABS.map((x) => (
                  <button key={x.key}
                    className={`vbiz-tab${tab === x.key ? ' vbiz-tab--on' : ''}`}
                    onClick={() => setTab(x.key)}>
                    {x.label}
                    {x.key === 'orders' && orders.length > 0 && <span className="vbiz-tab__badge">{orders.length}</span>}
                  </button>
                ))}
              </div>

              {tab === 'add' && (
                <AddBoxForm venue={venue} lastBox={lastBox} onPublish={publish} publishing={publishing} />
              )}

              {tab === 'boxes' && (
                <BoxManageList boxes={boxes} onQty={changeQty} onStatus={setBoxStatus} />
              )}

              {tab === 'orders' && (
                <OrdersPanel orders={orders} onPickupByCode={pickupByCode} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BoxManageList({ boxes, onQty, onStatus }) {
  if (boxes.length === 0) return <p className="vbiz-empty">{t.vbNoBoxes}</p>;
  return (
    <div className="vbiz-boxlist">
      {boxes.map((b) => {
        const active = b.status === 'ACTIVE';
        const statusLabel = b.status === 'SOLD_OUT' ? t.vbStatusSoldOut : b.status === 'EXPIRED' ? t.vbStatusExpired : t.vbStatusActive;
        return (
          <div key={b.id} className="vbiz-mbox">
            <div className="vbiz-mbox__top">
              <span className={`vbiz-dot vbiz-dot--${b.status.toLowerCase()}`} />
              <div className="vbiz-mbox__info">
                <span className="vbiz-mbox__title">{b.title}</span>
                <span className="vbiz-mbox__meta">{b.pickup_start}–{b.pickup_end} · {formatTenge(b.price)} · {statusLabel}</span>
              </div>
              <span className="vbiz-mbox__qty">{b.qty_left}/{b.qty_total}</span>
            </div>
            <div className="vbiz-mbox__actions">
              {active ? (
                <>
                  <div className="vbiz-stepper vbiz-stepper--sm">
                    <button onClick={() => onQty(b, -1)} disabled={b.qty_left <= 0} aria-label="−">−</button>
                    <span>{b.qty_left}</span>
                    <button onClick={() => onQty(b, +1)} aria-label="+">+</button>
                  </div>
                  <button className="vbiz-btn vbiz-btn--ghost vbiz-btn--sm" onClick={() => onStatus(b.id, 'SOLD_OUT')}>{t.vbSoldOut}</button>
                  <button className="vbiz-btn vbiz-btn--ghost vbiz-btn--sm" onClick={() => onStatus(b.id, 'EXPIRED')}>{t.vbUnpublish}</button>
                </>
              ) : (
                <button className="vbiz-btn vbiz-btn--ghost vbiz-btn--sm" onClick={() => onStatus(b.id, 'ACTIVE')}>{t.vbRelist}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
