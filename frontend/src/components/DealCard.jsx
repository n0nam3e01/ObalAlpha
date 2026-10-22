import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Layout';
import FoodPhoto from './FoodPhoto';
import { rememberScroll } from '../lib/catalogScroll';
const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;
export default function DealCard({ box, index = 0 }) {
  const { pathname, search } = useLocation();
  return <Link className="deal-card" to={`/box/${box.id}`} state={{ catalogReturnTo: pathname + search }} onClick={() => rememberScroll(pathname + search, window.scrollY)}>
    <div className="deal-card__media"><FoodPhoto src={box.photo_url} alt={`${box.title}, ${box.venue.name}`} priority={index === 0}/>
      <span className="deal-card__discount">−{box.discount_pct}%</span><span className="deal-card__left">Осталось {box.qty_left}</span>
    </div>
    <div className="deal-card__body"><div><p className="eyebrow">{box.venue.name}</p><h3>{box.title}</h3></div>
      <p className="deal-card__meta"><Icon name="clock" size={17}/>{box.pickup_start}–{box.pickup_end}</p>
      <p className="deal-card__meta"><Icon name="pin" size={17}/>{Number.isFinite(box.distance_km) ? `${box.distance_km} км по прямой` : box.venue.district || 'Астана'}</p>
      <div className="price"><strong>{money(box.price)}</strong><s>{money(box.original_price)}</s></div>
    </div>
  </Link>;
}
