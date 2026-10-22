import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function OrderRating({ order, onRated }) {
  const [stars, setStars] = useState('');
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rating = order.rating?.stars ?? saved;
  if (rating) return <p>Ваша оценка: {rating} из 5</p>;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiFetch('/ratings', { method: 'POST', body: JSON.stringify({ order_id: order.id, stars: Number(stars) }) });
      setSaved(Number(stars)); onRated?.();
    } catch (err) { setError(err.status === 409 ? 'Оценка уже сохранена. Обновите заказы.' : 'Не удалось сохранить оценку. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }
  return <form className="order-rating" onSubmit={submit}>
    <label className="field"><span>Оценка полученного заказа №{order.id}</span><select required value={stars} disabled={busy} onChange={(event) => setStars(event.target.value)}><option value="">Выберите оценку</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} из 5</option>)}</select></label>
    <button className="button" disabled={busy || !stars}>{busy ? 'Сохраняем…' : 'Отправить оценку'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
