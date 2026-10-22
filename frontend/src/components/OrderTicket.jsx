import OrderRating from './OrderRating';
import { supportBotName, supportTelegramUrl } from '../lib/supportContact';

const labels = { RESERVED: 'Ждёт получения', PAID: 'Оплачен', PICKED_UP: 'Получен', CANCELLED: 'Отменён', NO_SHOW: 'Время получения истекло' };
const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;

export default function OrderTicket({ order, highlighted = false, ticketRef, busy, onCancel, onRated }) {
  const venue = order.box.venue;
  const active = ['RESERVED', 'PAID'].includes(order.status) && new Date(order.reserved_until) > new Date();
  const expired = ['RESERVED', 'PAID'].includes(order.status) && !active;
  const date = new Date(order.box.pickup_date).toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long' });
  const destination = encodeURIComponent(`${venue.geo_lat},${venue.geo_lng}`);
  return <article ref={ticketRef} tabIndex={highlighted ? -1 : undefined} className={`order-ticket${highlighted ? ' order-ticket--selected' : ''}`} aria-label={`Заказ №${order.id}`}>
    <div className="order-ticket__body">
      <p className="eyebrow">Заказ №{order.id} · {order.cancelled_by === 'VENUE' ? 'Отменён заведением' : expired ? 'Окно получения закончилось' : labels[order.status] || order.status}</p>
      {highlighted && active && <p className="order-confirmation" role="status">{order.status === 'RESERVED' ? 'Забронировано' : 'Заказ оплачен'}</p>}
      <h2>{order.box.title}</h2><h3>{venue.name}</h3>
      <p>Количество: {order.qty} · <strong>{money(order.amount)}</strong></p>
      <p>{date} · {order.box.pickup_start}–{order.box.pickup_end} <span className="muted">по времени Астаны</span></p>
      <p>{venue.address}</p>
      {active && <>
        <p className="order-payment">{order.status === 'PAID' ? 'Заказ оплачен' : 'Оплата при получении. Без доставки и сервисного сбора.'}</p>
        <div className="order-ticket__code"><span>Покажите код сотруднику</span><strong className="pickup-code">{order.pickup_code}</strong></div>
        <a className="button order-route" href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noreferrer">Маршрут в Google Maps ↗</a>
      </>}
      {expired && <p>Обновите статус заказа. Код получения больше не действует.</p>}
      {order.cancellation_reason && <p className="cancellation-reason"><strong>Причина отмены:</strong> {order.cancellation_reason}</p>}
      {order.picked_up_at && <p>Выдан {new Date(order.picked_up_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</p>}
      {order.status === 'PICKED_UP' && <OrderRating order={order} onRated={onRated}/>}
      {active && order.status === 'RESERVED' && <div className="order-ticket__cancel"><button type="button" className="text-button" disabled={busy} onClick={() => onCancel(order.id)}>Отменить бронирование</button></div>}
      <div className="order-ticket__support"><a className="text-button" href={supportTelegramUrl} target="_blank" rel="noreferrer">Помощь по заказу · {supportBotName} ↗</a><p>В сообщении боту укажите номер заказа №{order.id}. Пароль и код получения отправлять не нужно.</p></div>
    </div>
  </article>;
}
