import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { useLiveRefresh } from '../lib/useLiveRefresh';
import OrderTicket from '../components/OrderTicket';
import SyncStatus from '../components/SyncStatus';
import '../styles/orders.css';

export default function Orders() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const selectedId = params.get('order');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const selected = useRef(null);
  const opened = useRef(null);
  const sync = useLiveRefresh(async (signal) => {
    const data = await apiFetch('/orders', { signal });
    const all = [...data.active, ...data.past];
    if (selectedId && /^\d+$/.test(selectedId) && !all.some((order) => String(order.id) === selectedId)) {
      try { all.unshift(await apiFetch('/orders/' + selectedId, { signal })); }
      catch (err) { if (err.status !== 404) throw err; }
    }
    if (!signal.aborted) setOrders(all);
  }, isAuthed);
  useEffect(() => { void sync.refresh(); }, [selectedId, sync.refresh]);
  useEffect(() => {
    if (selected.current && opened.current !== selectedId) {
      selected.current.scrollIntoView({ block: 'start', behavior: 'instant' });
      selected.current.focus({ preventScroll: true });
      opened.current = selectedId;
    }
  }, [orders, selectedId]);
  async function cancel(id) {
    if (!window.confirm('Отменить бронирование?')) return;
    setBusy(id); setError('');
    try {
      await apiFetch('/orders/' + id + '/cancel', { method: 'POST', body: '{}' });
      await sync.refresh({ fresh: true });
    } catch { setError('Не удалось отменить заказ. Обновите список перед повторной попыткой.'); }
    finally { setBusy(null); }
  }
  return <div className="consumer-shell"><main className="simple-page orders-page" id="main-content"><header><h1>Ваши заказы</h1></header>
    {isAuthed && <SyncStatus {...sync}/>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {authLoading || sync.loading ? <p role="status">Загружаем…</p> : !isAuthed
      ? <div className="empty"><h2>Сначала войдите</h2><p>После входа здесь появятся заказы и коды получения.</p><Link className="button" to="/profile">Войти</Link></div>
      : <>
        {selectedId && !orders.some((order) => String(order.id) === selectedId) && !sync.error && <p role="status">Этот заказ не найден в вашем аккаунте.</p>}
        {orders.length ? <div className="order-list">{orders.map((order) => <OrderTicket key={order.id} order={order} highlighted={String(order.id) === selectedId} ticketRef={String(order.id) === selectedId ? selected : undefined} busy={busy === order.id} onCancel={cancel} onRated={() => sync.refresh({ fresh: true })}/>)}</div>
          : !sync.error && <div className="empty"><h2>Заказов пока нет</h2><p>Выберите набор на сегодня. После бронирования код появится здесь.</p><Link className="button" to="/">Смотреть предложения</Link></div>}
      </>}
  </main></div>;
}
