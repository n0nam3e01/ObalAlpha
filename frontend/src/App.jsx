import { useLayoutEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Admin from './screens/Admin/Admin';
import Support from './screens/Support';
import Home from './pages/Home';
import Search from './pages/Search';
import BoxDetail from './pages/BoxDetail';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Partner from './pages/Partner';
import { Brand, Icon, useViewNavigate } from './ui';

const standalone = (pathname) => pathname === '/partner' || pathname === '/admin';

function AppHeader() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (standalone(pathname) || pathname.startsWith('/box/')) return null;
  return <header className="app-header">
    <Brand/>
    <span className="location"><Icon name="pin" size={16}/><span>Астана</span></span>
    <Link className="avatar" to="/profile" aria-label="Профиль">{user ? (user.display_name || user.name || 'М')[0] : <Icon name="user" size={18}/>}</Link>
  </header>;
}

const tabs = [
  { to: '/', icon: 'home', label: 'Главная' },
  { to: '/search', icon: 'search', label: 'Поиск' },
  { to: '/orders', icon: 'bag', label: 'Заказы' },
  { to: '/profile', icon: 'user', label: 'Профиль' },
];

function BottomNav() {
  const { pathname } = useLocation();
  const go = useViewNavigate();
  if (pathname.startsWith('/box/') || standalone(pathname)) return null;
  const selected = pathname === '/orders' ? 2 : ['/profile', '/support'].includes(pathname) ? 3 : pathname === '/search' ? 1 : 0;
  return <nav className="tab-bar" aria-label="Основная навигация" style={{ '--tab': selected }}>
    <span className="tab-bar__indicator" aria-hidden="true"/>
    {tabs.map((tab, index) => <Link key={tab.to} to={tab.to}
      className={selected === index ? 'active' : undefined}
      aria-current={selected === index ? 'page' : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        if (pathname !== tab.to) go(tab.to);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }}>
      <Icon name={tab.icon}/><span>{tab.label}</span>
    </Link>)}
  </nav>;
}

function AppRoutes() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return <div className="route" key={pathname}><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/search" element={<Search/>}/>
    <Route path="/support" element={<Support/>}/>
    <Route path="/box/:id" element={<BoxDetail/>}/>
    <Route path="/orders" element={<Orders/>}/>
    <Route path="/profile" element={<Profile/>}/>
    <Route path="/partner" element={<Partner/>}/>
    <Route path="/admin" element={<Admin/>}/>
    <Route path="*" element={<Home/>}/>
  </Routes></div>;
}

export default function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider>
    <a className="skip-link" href="#main-content">К содержанию</a>
    <AppHeader/><AppRoutes/><BottomNav/>
  </AuthProvider></ThemeProvider></BrowserRouter>;
}
