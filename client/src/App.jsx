
import { useEffect, useState, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet
} from 'react-router-dom';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import { Ctx, useApp } from './ctx';
import {
  Rings,
  Login,
  Dashboard,
  Leaves,
  People,
  News,
  Profile
} from './pages';

function Shell() {
  const { user, logout } = useApp();

  if (!user) return <Navigate to="/login" replace />;

  const nav = [
    ['/', 'Home'],
    ['/leaves', 'Leave'],
    ['/news', 'News'],
    ['/profile', 'Profile'],
    ...(user.role !== 'employee' ? [['/people', 'People']] : [])
  ];

  return (
    <div className="shell">
      <aside>
        <div className="logo">
          <Rings small />
          StaffSync
        </div>

        <nav>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.i layoutId="pill" className="pill" />
                  )}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="me">
          <b>{user.name}</b>
          <small>{user.role}</small>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('t')) {
      setReady(true);
      return;
    }

    api.get('/me')
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('t'))
      .finally(() => setReady(true));
  }, []);

  const login = d => {
    localStorage.setItem('t', d.token);
    setUser(d.user);
  };

  const logout = () => {
    localStorage.removeItem('t');
    setUser(null);
  };

  const updateUser = updatedUser => {
    setUser(current =>
      current ? { ...current, ...updatedUser } : updatedUser
    );
  };

  const say = useCallback((m, bad) => {
    setToast({ m, bad, k: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  if (!ready) return null;

  return (
    <Ctx.Provider value={{ user, login, logout, say, updateUser }}>
      <MotionConfig reducedMotion="user">
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>

        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <Login />}
            />

            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="leaves" element={<Leaves />} />
              <Route path="news" element={<News />} />
              <Route path="profile" element={<Profile />} />
              <Route path="people" element={<People />} />
            </Route>
          </Routes>
        </BrowserRouter>

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.k}
              role="status"
              className={'toast' + (toast.bad ? ' bad' : '')}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              {toast.m}
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </Ctx.Provider>
  );
}