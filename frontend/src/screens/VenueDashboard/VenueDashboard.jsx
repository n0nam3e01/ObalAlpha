import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { formatTenge, discountPct } from '../../lib/format';
import { hapticSuccess, hapticError } from '../../lib/haptics';
import BoxCard from '../../components/BoxCard/BoxCard';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import t from '../../i18n/ru';

const BASE_URL = import.meta.env.VITE_API_URL;

async function venueFetch(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}/api/venue${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Venue-Token': token, ...options.headers },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'error'); }
  return res.json();
}

const EMPTY_FORM = { title: '', type: 'SURPRISE', description: '', items: '', price: '', original_price: '', qty: '', pickup_start: '', pickup_end: '' };
const TABS = [{ key: 'add', label: t.addBoxTitle }, { key: 'boxes', label: t.todayBoxes }, { key: 'orders', label: t.todayOrders }];
const TYPES = [{ key: 'SURPRISE', label: t.surprise }, { key: 'ITEMIZED', label: t.itemized }];

export default function VenueDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [venue, setVenue] = useState(null);
  const [stats, setStats] = useState({ orders_sold: 0, revenue: 0, qty_total: 0 });
  const [boxes, setBoxes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [publishing, setPublishing] = useState(false);
  const [codeInput, setCodeInput] = useState({});

  async function login() {
    try {
      const data = await venueFetch('/me', tokenInput);
      setVenue(data.venue);
      setStats(data.today_stats);
      setToken(tokenInput);
      reload(tokenInput);
    } catch {
      showToast(t.venueTokenInvalid, 'error');
    }
  }

  async function reload(tk) {
    const [b, o, me] = await Promise.all([
      venueFetch('/boxes', tk), venueFetch('/orders', tk), venueFetch('/me', tk),
    ]);
    setBoxes(b); setOrders(o); setStats(me.today_stats);
  }

  async function publish() {
    const { title, type, description, price, original_price, qty, pickup_start, pickup_end, items } = form;
    if (!title || !price || !original_price || !qty || !pickup_start || !pickup_end) {
      showToast('Заполните все обязательные поля', 'error'); return;
    }
    if (parseInt(price) >= parseInt(original_price)) {
      showToast('Цена должна быть меньше старой', 'error'); return;
    }
    setPublishing(true);
    try {
      await venueFetch('/boxes', token, {
        method: 'POST',
        body: JSON.stringify({
          title, type, description,
          items: type === 'ITEMIZED' ? items : undefined,
          price: parseInt(price), original_price: parseInt(original_price),
          qty: parseInt(qty), pickup_start, pickup_end,
        }),
      });
      showToast(t.boxPublished, 'success');
      setForm(EMPTY_FORM);
      await reload(token);
      setTab('boxes');
    } catch {
      showToast(t.errServer, 'error');
    } finally { setPublishing(false); }
  }

  async function changeQty(box, delta) {
    const next = Math.max(0, box.qty_left + delta);
    setBoxes((prev) => prev.map((b) => b.id === box.id ? { ...b, qty_left: next } : b));
    try {
      await venueFetch(`/boxes/${box.id}`, token, { method: 'PATCH', body: JSON.stringify({ qty_left: next }) });
    } catch { reload(token); }
  }

  async function markSoldOut(boxId) {
    await venueFetch(`/boxes/${boxId}`, token, { method: 'PATCH', body: JSON.stringify({ status: 'SOLD_OUT' }) });
    reload(token);
  }

  async function issueOrder(orderId) {
    const code = codeInput[orderId] ?? '';
    try {
      await venueFetch(`/orders/${orderId}/pickup`, token, { method: 'POST', body: JSON.stringify({ code }) });
      hapticSuccess();
      showToast(t.issueSuccess, 'success');
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'PICKED_UP' } : o));
      reload(token);
    } catch (e) {
      hapticError();
      showToast(e.message === 'code_incorrect' ? t.codeIncorrect : t.errServer, 'error');
    }
  }

  // ── Token gate ──
  if (!venue) {
    return (
      <div className="vdash page">
        <button className="reserve__back" onClick={() => navigate('/profile')}>← {t.profileTitle}</button>
        <h1 className="vdash__title">{t.venueDashTitle}</h1>
        <p className="vdash__hint">{t.venueTokenLabel}</p>
        <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
          placeholder={t.venueTokenPlaceholder} style={{ marginBottom: 12 }} />
        <button className="vdash__login-btn" onClick={login}>{t.venueTokenEnter}</button>
      </div>
    );
  }

  return (
    <div className="vdash page">
      <button className="reserve__back" onClick={() => navigate('/profile')}>← {t.profileTitle}</button>
      <h1 className="vdash__venue-name">{venue.name}</h1>

      <div className="vdash__stats">
        <Stat label={t.statPosted} value={stats.qty_total} />
        <Stat label={t.statSold} value={stats.orders_sold} />
        <Stat label={t.statRevenue} value={formatTenge(stats.revenue)} />
      </div>

      <div className="vdash__tabs">
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} size="sm" />
      </div>

      {tab === 'add' && (
        <AddBoxForm form={form} setForm={setForm} venue={venue} publish={publish} publishing={publishing} />
      )}

      {tab === 'boxes' && (
        <div className="vdash__list">
          {boxes.length === 0 && <p className="vdash__empty">{t.noBoxesVenue}</p>}
          {boxes.map((b) => (
            <div key={b.id} className="vdash__box-row">
              <div className="vdash__box-info">
                <p className="vdash__box-title">{b.title}</p>
                <p className="vdash__box-meta">{b.pickup_start}–{b.pickup_end} · {formatTenge(b.price)}</p>
              </div>
              {b.status === 'ACTIVE' ? (
                <div className="vdash__box-actions">
                  <div className="vdash__qty">
                    <button onClick={() => changeQty(b, -1)} disabled={b.qty_left <= 0}>−</button>
                    <span>{b.qty_left}</span>
                    <button onClick={() => changeQty(b, +1)}>+</button>
                  </div>
                  <button className="vdash__soldout-btn" onClick={() => markSoldOut(b.id)}>{t.markSoldOut}</button>
                </div>
              ) : (
                <span className="vdash__box-status">{b.status === 'SOLD_OUT' ? t.markSoldOut : 'Истёк'}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="vdash__list">
          {orders.length === 0 && <p className="vdash__empty">{t.noOrders}</p>}
          {orders.map((o) => {
            const done = o.status === 'PICKED_UP';
            const cancelled = ['CANCELLED', 'NO_SHOW'].includes(o.status);
            return (
              <div key={o.id} className={`vdash__order-row${done ? ' vdash__order-row--done' : ''}`}>
                <div className="vdash__order-info">
                  <p className="vdash__order-code">{o.pickup_code}</p>
                  <p className="vdash__order-meta">{o.user?.display_name ?? o.user?.name ?? '—'} · {o.box?.title}</p>
                </div>
                {(o.status === 'RESERVED' || o.status === 'PAID') ? (
                  <div className="vdash__issue">
                    <input placeholder="код" value={codeInput[o.id] ?? ''} maxLength={4}
                      onChange={(e) => setCodeInput({ ...codeInput, [o.id]: e.target.value })} />
                    <button className="vdash__issue-btn" onClick={() => issueOrder(o.id)}>{t.issueBox}</button>
                  </div>
                ) : (
                  <span className={`vdash__order-done${cancelled ? ' vdash__order-done--cancelled' : ''}`}>
                    {done ? `✓ ${t.issued}` : (cancelled ? t.statusCancelled : o.status)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="vdash__stat">
      <span className="vdash__stat-value">{value}</span>
      <span className="vdash__stat-label">{label}</span>
    </div>
  );
}

function AddBoxForm({ form, setForm, venue, publish, publishing }) {
  const set = (k, v) => setForm({ ...form, [k]: v });

  const previewBox = {
    id: 'preview',
    title: form.title || t.fieldTitle,
    type: form.type,
    qty_left: parseInt(form.qty) || 0,
    price: parseInt(form.price) || 0,
    original_price: parseInt(form.original_price) || 0,
    discount_pct: form.price && form.original_price ? discountPct(parseInt(form.original_price), parseInt(form.price)) : 0,
    pickup_start: form.pickup_start || '—',
    pickup_end: form.pickup_end || '—',
    venue: { id: venue.id, name: venue.name, category: venue.category },
  };

  return (
    <div className="vdash__form">
      <input placeholder={t.fieldTitle} value={form.title} onChange={(e) => set('title', e.target.value)} />

      <SegmentedControl segments={TYPES} value={form.type} onChange={(v) => set('type', v)} size="sm" />

      <textarea
        placeholder={form.type === 'SURPRISE' ? t.fieldDesc : t.fieldItems}
        value={form.type === 'SURPRISE' ? form.description : form.items}
        onChange={(e) => set(form.type === 'SURPRISE' ? 'description' : 'items', e.target.value)}
        rows={3}
      />
      <div className="vdash__row2">
        <input placeholder={t.fieldPrice} type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
        <input placeholder={t.fieldOriginalPrice} type="number" value={form.original_price} onChange={(e) => set('original_price', e.target.value)} />
      </div>
      <input placeholder={t.fieldQty} type="number" value={form.qty} onChange={(e) => set('qty', e.target.value)} />
      <div className="vdash__row2">
        <input placeholder={t.fieldPickupStart} value={form.pickup_start} onChange={(e) => set('pickup_start', e.target.value)} />
        <input placeholder={t.fieldPickupEnd} value={form.pickup_end} onChange={(e) => set('pickup_end', e.target.value)} />
      </div>

      <p className="vdash__preview-label">{t.livePreview}</p>
      <div className="vdash__preview"><BoxCard box={previewBox} /></div>

      <button className="vdash__publish-btn" onClick={publish} disabled={publishing}>
        {publishing ? '…' : t.publishBox}
      </button>
    </div>
  );
}
