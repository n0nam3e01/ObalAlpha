import { useMemo, useState } from 'react';
import { hapticSuccess, hapticError } from '../../lib/haptics';
import t from '../../i18n';

function statusPill(status) {
  if (status === 'PICKED_UP') return { cls: 'done', label: `✓ ${t.vbIssued}` };
  if (status === 'CANCELLED' || status === 'NO_SHOW') return { cls: 'cancelled', label: t.statusCancelled };
  return { cls: 'active', label: t.statusReserved };
}

export default function OrdersPanel({ orders, onPickupByCode }) {
  const [code, setCode] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const total = orders.length;
  const issued = orders.filter((o) => o.status === 'PICKED_UP').length;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return orders;
    return orders.filter((o) => o.pickup_code.includes(q));
  }, [orders, query]);

  async function issue(e) {
    e?.preventDefault();
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    try {
      await onPickupByCode(c);
      hapticSuccess();
      setCode('');
    } catch {
      hapticError();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vbiz-orders">
      <form className={`vbiz-pickup${shake ? ' vbiz-pickup--shake' : ''}`} onSubmit={issue}>
        <label className="vbiz-label">{t.vbOrdersIssueTitle}</label>
        <div className="vbiz-pickup__row">
          <input
            className="vbiz-input vbiz-pickup__input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder={t.vbCodePlaceholder}
            inputMode="numeric"
            maxLength={4}
            aria-label={t.vbOrdersIssueTitle}
          />
          <button type="submit" className="vbiz-btn vbiz-btn--primary vbiz-pickup__btn" disabled={busy || !code.trim()}>
            {t.vbIssue}
          </button>
        </div>
        {shake && <p className="vbiz-warn">{t.vbCodeNotFound}</p>}
      </form>

      <div className="vbiz-orders__head">
        <span className="vbiz-orders__count">{t.vbIssuedCount(issued, total)}</span>
        {total > 0 && (
          <input className="vbiz-input vbiz-orders__search" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder={t.vbSearchOrders} inputMode="numeric" />
        )}
      </div>

      {total === 0 && <p className="vbiz-empty">{t.vbNoOrders}</p>}

      <div className="vbiz-orders__list">
        {filtered.map((o) => {
          const pill = statusPill(o.status);
          return (
            <div key={o.id} className={`vbiz-order vbiz-order--${pill.cls}`}>
              <span className="vbiz-order__code">{o.pickup_code}</span>
              <div className="vbiz-order__info">
                <span className="vbiz-order__buyer">{o.user?.display_name ?? o.user?.name ?? '—'}</span>
                <span className="vbiz-order__box">{o.box?.title}</span>
              </div>
              <span className={`vbiz-order__pill vbiz-order__pill--${pill.cls}`}>{pill.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
