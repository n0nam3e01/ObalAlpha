import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { initTheme } from './lib/theme';
import BottomNav from './components/BottomNav/BottomNav';
import Splash from './components/Splash/Splash';

import Home from './screens/Home/Home';
import BoxDetail from './screens/BoxDetail/BoxDetail';
import Reserve from './screens/Reserve/Reserve';
import Ticket from './screens/Ticket/Ticket';
import Orders from './screens/Orders/Orders';
import Profile from './screens/Profile/Profile';
import Favorites from './screens/Favorites/Favorites';
import VenueDashboard from './screens/Venue/VenueDashboard';
import VenueDetail from './screens/VenueDetail/VenueDetail';

function RoutedApp() {
  const location = useLocation();
  const navType = useNavigationType(); // PUSH | REPLACE | POP
  const transitionClass = `page-transition${navType === 'POP' ? ' page-transition--back' : ''}`;
  // The venue panel (exactly /venue) is a standalone B2B surface — no consumer
  // bottom nav. /venue/:id is the consumer venue page and keeps the nav.
  const isVenue = location.pathname === '/venue';
  return (
    <>
      <div className={transitionClass} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/box/:id" element={<BoxDetail />} />
          <Route path="/reserve/:id" element={<Reserve />} />
          <Route path="/ticket/:id" element={<Ticket />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/venue" element={<VenueDashboard />} />
          <Route path="/venue/:id" element={<VenueDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isVenue && <BottomNav />}
    </>
  );
}

export default function App() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Splash />
          <RoutedApp />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
