import { useState } from 'react';
import { formatTenge } from '../../lib/format';
import t from '../../i18n';

const CATEGORIES = [
  { key: 'BAKERY', label: t.catBakery }, { key: 'CAFE', label: t.catCafe },
  { key: 'PREPARED', label: t.catPrepared }, { key: 'SUPERMARKET', label: t.catSupermarket },
  { key: 'DESSERT', label: t.catDessert }, { key: 'OTHER', label: 'Другое' },
];

export default function VenueSettings({ venue, payout, onSave, saving }) {
  const [form, setForm] = useState({
    name: venue.name ?? '',
    address: venue.address ?? '',
    contact_phone: venue.contact_phone ?? '',
    category: venue.category,
    kaspi_info: venue.kaspi_info ?? '',
    photo_url: venue.photo_url ?? '',
    default_pickup_start: venue.default_pickup_start ?? '18:00',
    default_pickup_end: venue.default_pickup_end ?? '21:00',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="vbiz-settings">
      <label className="vbiz-label">{t.vbName}</label>
      <input className="vbiz-input" value={form.name} onChange={(e) => set('name', e.target.value)} />

      <label className="vbiz-label">{t.vbAddress}</label>
      <input className="vbiz-input" value={form.address} onChange={(e) => set('address', e.target.value)} />

      <label className="vbiz-label">{t.vbPhone}</label>
      <input className="vbiz-input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />

      <label className="vbiz-label">{t.vbFieldCategory}</label>
      <div className="vbiz-pills">
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button"
            className={`vbiz-pill${c.key === form.category ? ' vbiz-pill--on' : ''}`}
            onClick={() => set('category', c.key)}>{c.label}</button>
        ))}
      </div>

      <label className="vbiz-label">{t.vbKaspi}</label>
      <input className="vbiz-input" value={form.kaspi_info} onChange={(e) => set('kaspi_info', e.target.value)} />

      <label className="vbiz-label">{t.vbLogo}</label>
      <input className="vbiz-input" value={form.photo_url} placeholder="https://…" onChange={(e) => set('photo_url', e.target.value)} />

      <label className="vbiz-label">{t.vbDefaultWindow}</label>
      <div className="vbiz-grid2">
        <input className="vbiz-input vbiz-time" type="time" value={form.default_pickup_start} onChange={(e) => set('default_pickup_start', e.target.value)} />
        <input className="vbiz-input vbiz-time" type="time" value={form.default_pickup_end} onChange={(e) => set('default_pickup_end', e.target.value)} />
      </div>

      <button className="vbiz-btn vbiz-btn--primary vbiz-settings__save" onClick={() => onSave(form)} disabled={saving}>
        {saving ? '…' : t.vbSave}
      </button>

      {payout && (
        <div className="vbiz-payout">
          <p className="vbiz-payout__title">{t.vbPayoutTitle}</p>
          <div className="vbiz-payout__row"><span>{t.vbPayoutTurnover}</span><span>{formatTenge(payout.turnover)}</span></div>
          <div className="vbiz-payout__row vbiz-payout__row--share"><span>{t.vbPayoutShare}</span><span>{formatTenge(payout.venue_share)}</span></div>
          <div className="vbiz-payout__row vbiz-payout__row--muted"><span>{t.vbPayoutCommission}</span><span>{formatTenge(payout.commission)}</span></div>
        </div>
      )}
    </div>
  );
}
