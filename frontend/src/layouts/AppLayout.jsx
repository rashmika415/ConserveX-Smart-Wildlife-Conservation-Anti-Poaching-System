import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Leaf,
  LayoutDashboard,
  Route,
  FileWarning,
  Radio,
  Bell,
  Users,
  UserRound,
  LogOut,
  Menu,
  X,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../components/UI';
import AlertNotifications from '../components/AlertNotifications';
const base = [['/app', 'Dashboard', LayoutDashboard]];
const links = {
  MANAGER: [
    ...base,
    ['/app/patrols', 'Patrol Management', Route],
    ['/app/incidents', 'Incidents', FileWarning],
    ['/app/tracking', 'Animal Tracking', Radio],
    ['/app/alerts', 'Alerts', Bell],
    ['/app/community', 'Community Reports', Users],
  ],
  RANGER: [
    ...base,
    ['/app/patrols', 'My Patrols', Route],
    ['/app/incidents/new', 'Report Incident', PlusCircle],
    ['/app/incidents', 'Incident History', FileWarning],
    ['/app/alerts', 'Alerts', Bell],
  ],
  LIAISON: [
    ...base,
    ['/app/community', 'Community Reports', Users],
    ['/app/alerts', 'Alerts', Bell],
  ],
};
export function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`app-shell ${user.role === 'RANGER' ? 'ranger-shell' : ''}`}
    >
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link className="brand" to="/app">
          <span className="brand-mark">
            <Leaf size={25} />
          </span>
          <span>
            Conserve<span className="brand-x">X</span>
            <small>WILDLIFE OPERATIONS</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {[...links[user.role], ['/app/profile', 'Profile', UserRound]].map(
            ([path, label, Icon]) => (
              <NavLink
                key={path}
                end={path === '/app' || path === '/app/incidents'}
                to={path}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="protected">
            <ShieldCheck size={20} />
            <span>
              Connected by purpose.<small>Protecting wildlife, together.</small>
            </span>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle icon-button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="park-label">
              Yala National Park <span className="dot" /> Operations centre
            </span>
          </div>
          <div className="topbar-actions">
            <AlertNotifications key={user._id || user.email} />
            <Link className="user-chip" to="/app/profile">
              <span className="avatar">
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span>
                {user.name}
                <small>{roleLabel[user.role]}</small>
              </span>
            </Link>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          ConserveX · Wildlife Conservation & Anti-Poaching Monitoring System
          <span>University demonstration · Simulated collar data</span>
        </footer>
      </div>
    </div>
  );
}
export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link className="brand" to="/">
          <Leaf size={29} />
          <span>
            Conserve<span className="brand-x">X</span>
          </span>
        </Link>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/report">Report a sighting</NavLink>
          <Link to="/login" className="button small">
            Staff login
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="public-footer">
        Protecting wildlife. Supporting communities.
        <span>ConserveX · University demonstration</span>
      </footer>
    </div>
  );
}
