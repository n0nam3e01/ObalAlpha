import { NavLink } from 'react-router-dom';
import t from '../../i18n/ru';

const ICONS = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z" />
  ),
  orders: (
    <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm8 1.5V8h4.5M8 13h8M8 17h8" />
  ),
  heart: (
    <path d="M12 21s-7.5-4.6-10-9.2C.8 9.1 1.9 5.5 5.2 4.8 7.4 4.3 9.4 5.4 12 8c2.6-2.6 4.6-3.7 6.8-3.2 3.3.7 4.4 4.3 3.2 7-2.5 4.6-10 9.2-10 9.2Z" />
  ),
  user: (
    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9a8 8 0 0 1 16 0" />
  ),
};

function TabIcon({ name }) {
  return (
    <svg className="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const tabClass = ({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}`;

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={tabClass}>
        <TabIcon name="home" />
        <span className="bottom-nav__label">{t.navHome}</span>
      </NavLink>
      <NavLink to="/orders" className={tabClass}>
        <TabIcon name="orders" />
        <span className="bottom-nav__label">{t.navOrders}</span>
      </NavLink>
      <NavLink to="/favorites" className={tabClass}>
        <TabIcon name="heart" />
        <span className="bottom-nav__label">{t.navFavorites}</span>
      </NavLink>
      <NavLink to="/profile" className={tabClass}>
        <TabIcon name="user" />
        <span className="bottom-nav__label">{t.navProfile}</span>
      </NavLink>
    </nav>
  );
}
