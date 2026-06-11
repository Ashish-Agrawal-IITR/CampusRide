import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './ui';
import { Home, Grid, Car, Pin, Chart, Moon, Sun, Logout } from './icons';

const links = [
  ['/', 'Home', Home],
  ['/passenger', 'Passenger', Grid],
  ['/driver', 'Driver', Car],
  ['/tracking', 'Tracking', Pin],
  ['/admin', 'Admin', Chart],
];

export default function Navbar() {
  const { user, logout, dark, setDark } = useAuth();
  const nav = useNavigate();

  const role = user?.role || null;

  return (
    <header className="sticky top-0 z-[1000] backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-white/60 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/"><Logo /></NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.filter(([to]) => {
            // Role-based visibility: show only role-appropriate tabs
            if (to === '/passenger') return role === 'passenger';
            if (to === '/driver') return role === 'driver';
            if (to === '/admin') return role === 'admin';
            return true;
          }).map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => setDark(!dark)} aria-label="Toggle theme"
            className="w-10 h-10 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {user ? (
            <>
              <span className="hidden sm:block text-sm font-semibold muted">{user.name}</span>
              <button onClick={() => { logout(); nav('/login'); }}
                className="w-10 h-10 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Log out"><Logout size={20} /></button>
            </>
          ) : null}
          {( !user || user.role === 'passenger') && (
            <button className="btn-primary hidden sm:inline-flex" onClick={() => nav('/passenger')}>
              Book a ride
            </button>
          )}
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {links.filter(([to]) => {
            if (to === '/passenger') return role === 'passenger' || !role;
            if (to === '/driver') return role === 'driver';
            if (to === '/admin') return role === 'admin';
            return true;
          }).map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-link whitespace-nowrap ${isActive ? 'active' : ''}`}>
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
