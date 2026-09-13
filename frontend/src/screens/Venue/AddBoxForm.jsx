import { useEffect, useMemo, useState } from 'react';
import BoxCard from '../../components/BoxCard/BoxCard';
import { discountPct } from '../../lib/format';
import t from '../../i18n';

const TYPES = [{ key: 'SURPRISE', label: t.surprise }, { key: 'ITEMIZED', label: t.itemized }];
const CATEGORIES = [
  { key: 'BAKERY', label: t.catBakery }, { key: 'CAFE', label: t.catCafe },
  { key: 'PREPARED', label: t.catPrepared }, { key: 'SUPERMARKET', label: t.catSupermarket },
  { key: 'DESSERT', label: t.catDessert }, { key: 'OTHER', label: 'Другое' },
];

function emptyForm(venue) {
  return {
    type: 'SURPRISE',
    title: '',
    description: '',
    items: '',
    category: venue.category,
    price: '',
    original_price: '',
    qty: '3',
    pickup_start: venue.default_pickup_start || '18:00',
    pickup_end: venue.default_pickup_end || '21:00',
    photo_url: '',
  };
}

// Mini segmented for type/category, styled (no browser defaults).
function Pills({ options, value, onChange }) {
  return (
    <div className="vbiz-pills">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`vbiz-pill${o.key === value ? ' vbiz-pill--on' : ''}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AddBoxForm({ venue, lastBox, onPublish, publishing }) {
  const [form, setForm] = useState(() => emptyForm(venue));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Keep default window in sync if venue settings change.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      pickup_start: f.pickup_start || venue.default_pickup_start || '18:00',
      pickup_end: f.pickup_end || venue.default_pickup_end || '21:00',
    }));
  }, [venue.default_pickup_start, venue.default_pickup_end]);

  const priceNum = parseInt(form.price) || 0;
  const wasNum = parseInt(form.original_price) || 0;
  const priceBad = priceNum > 0 && wasNum > 0 && priceNum >= wasNum;
  const windowBad = form.pickup_start && form.pickup_end && form.pickup_end <= form.pickup_start;
  const pct = priceNum > 0 && wasNum > 0 && !priceBad ? discountPct(wasNum, priceNum) : 0;

  const titleShown = form.title || t.vbDefaultTitle[form.category] || t.vbDefaultTitle.OTHER;

  const previewBox = useMemo(() => ({
    id: 'preview',
    title: titleShown,
    type: form.type,
    qty_left: parseInt(form.qty) || 0,
    price: priceNum,
    original_price: wasNum,
    discount_pct: pct,
    pickup_start: form.pickup_start || '—',
    pickup_end: form.pickup_end || '—',
    photo_url: form.photo_url || null,
    venue: { id: venue.id, name: venue.name, category: form.category },
  }), [titleShown, form.type, form.qty, priceNum, wasNum, pct, form.pickup_start, form.pickup_end, form.photo_url, form.category, venue.id, venue.name]);

  function repeatLast() {
    if (!lastBox) return;
    setForm({
      type: lastBox.type,
      title: lastBox.title,
      description: lastBox.description ?? '',
      items: lastBox.items ?? '',
      category: venue.category,
      price: String(lastBox.price),
      original_price: String(lastBox.original_price),
      qty: String(lastBox.qty_total),
      pickup_start: lastBox.pickup_start,
      pickup_end: lastBox.pickup_end,
      photo_url: lastBox.photo_url ?? '',
    });
  }

  function submit() {
    if (!form.price || !form.original_price || !form.qty || !form.pickup_start || !form.pickup_end) return;
    if (priceBad || windowBad) return;
    onPublish({
      title: titleShown,
      type: form.type,
      description: form.type === 'SURPRISE' ? form.description : '',
      items: form.type === 'ITEMIZED' ? form.items : undefined,
      category: form.category,
      price: priceNum,
      original_price: wasNum,
      qty: parseInt(form.qty),
      pickup_start: form.pickup_start,
      pickup_end: form.pickup_end,
      photo_url: form.photo_url || undefined,
    }, () => setForm(emptyForm(venue)));
  }

  const qty = parseInt(form.qty) || 0;

  return (
    <div className="vbiz-addbox">
      <div className="vbiz-addbox__form">
        {lastBox && (
          <button type="button" className="vbiz-btn vbiz-btn--ghost vbiz-addbox__repeat" onClick={repeatLast}>
            ↻ {t.vbRepeatLast}
          </button>
        )}

        <label className="vbiz-label">{t.vbType}</label>
        <Pills options={TYPES} value={form.type} onChange={(v) => set('type', v)} />

        <label className="vbiz-label">{t.vbFieldTitle}</label>
        <input className="vbiz-input" value={form.title} placeholder={t.vbDefaultTitle[form.category]}
          onChange={(e) => set('title', e.target.value)} />

        <label className="vbiz-label">{form.type === 'SURPRISE' ? t.vbFieldWhatInside : t.vbFieldItems}</label>
        <textarea className="vbiz-input vbiz-textarea" rows={3}
          value={form.type === 'SURPRISE' ? form.description : form.items}
          onChange={(e) => set(form.type === 'SURPRISE' ? 'description' : 'items', e.target.value)} />

        <label className="vbiz-label">{t.vbFieldCategory}</label>
        <Pills options={CATEGORIES} value={form.category} onChange={(v) => set('category', v)} />

        <div className="vbiz-grid2">
          <div>
            <label className="vbiz-label">{t.vbPriceNow}</label>
            <input className={`vbiz-input${priceBad ? ' vbiz-input--error' : ''}`} type="number" inputMode="numeric"
              value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div>
            <label className="vbiz-label">{t.vbPriceWas}</label>
            <input className={`vbiz-input${priceBad ? ' vbiz-input--error' : ''}`} type="number" inputMode="numeric"
              value={form.original_price} onChange={(e) => set('original_price', e.target.value)} />
          </div>
        </div>
        {priceBad ? (
          <p className="vbiz-warn">{t.vbPriceWarn}</p>
        ) : pct > 0 ? (
          <p className="vbiz-discount-live">−{pct}%</p>
        ) : null}

        <label className="vbiz-label">{t.vbFieldQty}</label>
        <div className="vbiz-stepper">
          <button type="button" onClick={() => set('qty', String(Math.max(1, qty - 1)))} aria-label="−">−</button>
          <span>{qty}</span>
          <button type="button" onClick={() => set('qty', String(qty + 1))} aria-label="+">+</button>
        </div>

        <label className="vbiz-label">{t.vbPickupWindow}</label>
        <div className="vbiz-grid2">
          <input className={`vbiz-input vbiz-time${windowBad ? ' vbiz-input--error' : ''}`} type="time"
            value={form.pickup_start} onChange={(e) => set('pickup_start', e.target.value)} />
          <input className={`vbiz-input vbiz-time${windowBad ? ' vbiz-input--error' : ''}`} type="time"
            value={form.pickup_end} onChange={(e) => set('pickup_end', e.target.value)} />
        </div>
        {windowBad
          ? <p className="vbiz-warn">{t.vbPickupInvalid}</p>
          : <p className="vbiz-hint">{t.today} {form.pickup_start}–{form.pickup_end}</p>}

        <label className="vbiz-label">{t.vbPhotoOptional}</label>
        <input className="vbiz-input" value={form.photo_url} placeholder="https://…"
          onChange={(e) => set('photo_url', e.target.value)} />

        <button className="vbiz-btn vbiz-btn--primary vbiz-addbox__publish"
          onClick={submit} disabled={publishing || priceBad || windowBad}>
          {publishing ? t.vbPublishing : t.vbPublish}
        </button>
      </div>

      <div className="vbiz-addbox__preview">
        <p className="vbiz-preview-label">{t.vbPreviewLabel}</p>
        <div className="vbiz-preview-card"><BoxCard box={previewBox} /></div>
      </div>
    </div>
  );
}
