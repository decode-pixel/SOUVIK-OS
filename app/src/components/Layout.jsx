import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, HeartPulse, DollarSign, ListTodo, FolderKanban, Target, Settings, User, LogOut, Sun, Moon, MoreHorizontal, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// Module accent colors for nav icons
const MODULE_COLORS = {
  '/': { bg: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', darkBg: 'var(--accent-primary-subtle)' },
  '/checkin': { bg: '#ffe4e9', color: '#e11d48', darkBg: '#3a0a15' },
  '/finance': { bg: 'var(--mod-finance-muted)', color: 'var(--mod-finance)', darkBg: 'var(--mod-finance-muted)' },
  '/tasks': { bg: 'var(--mod-tasks-muted)', color: 'var(--mod-tasks)', darkBg: 'var(--mod-tasks-muted)' },
  '/projects': { bg: 'var(--mod-projects-muted)', color: 'var(--mod-projects)', darkBg: 'var(--mod-projects-muted)' },
  '/goals': { bg: 'var(--mod-goals-muted)', color: 'var(--mod-goals)', darkBg: 'var(--mod-goals-muted)' },
  '/health': { bg: 'var(--mod-health-muted)', color: 'var(--mod-health)', darkBg: 'var(--mod-health-muted)' },
  '/review': { bg: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', darkBg: 'var(--accent-primary-subtle)' },
};

export default function Layout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = React.useState('light');

  React.useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
    if (user) {
      await supabase.from('profiles').update({ theme_preference: next }).eq('id', user.id);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const desktopNavItems = [
    { to: '/', icon: Home, label: 'Home', exact: true },
    { to: '/checkin', icon: CheckSquare, label: 'Check-in' },
    { to: '/review', icon: BarChart2, label: 'Review' },
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/health', icon: HeartPulse, label: 'Health' },
  ];

  const mobileNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/checkin', icon: CheckSquare, label: 'Check-in' },
    { to: '/review', icon: BarChart2, label: 'Review' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/more', icon: MoreHorizontal, label: 'More' },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'S';

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    if (!path) return 'Dashboard';
    if (path === 'checkin') return 'Check-in';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <div className="layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9180f5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '16px', flexShrink: 0,
            boxShadow: '0 2px 8px var(--accent-glow)',
          }}>S</div>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 'var(--font-size-lg)',
              letterSpacing: '-0.03em', color: 'var(--text-primary)',
              lineHeight: 1
            }}>Souvik OS</div>
          </div>
        </div>

        {/* Modules nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span className="label-caps">Modules</span>
          </div>

          {desktopNavItems.map(item => {
            const active = isActive(item.to);
            const colors = MODULE_COLORS[item.to] || {};
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={`nav-item ${active ? 'active' : ''}`}
                style={{ gap: 'var(--space-3)' }}
              >
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? colors.color || 'var(--accent-primary)' : 'transparent',
                  color: active ? '#fff' : (colors.color || 'var(--text-muted)'),
                  transition: 'all var(--transition-fast)',
                  flexShrink: 0,
                  ...(active && { boxShadow: `0 2px 6px ${colors.color || 'var(--accent-glow)'}33` })
                }}>
                  <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <User size={16} strokeWidth={2} />
            </div>
            Profile
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Settings size={16} strokeWidth={2} />
            </div>
            Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)' }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <LogOut size={16} strokeWidth={2} />
            </div>
            <span style={{ color: 'var(--text-secondary)' }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="content" style={{ padding: 0 }}>
        {/* Glass Header */}
        <header
          className="glass header-container"
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--glass-border-outer)',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
          }}
        >
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'var(--font-size-xl)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)'
            }}>
              {getPageTitle()}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Theme Toggle */}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ position: 'relative', overflow: 'hidden', width: '36px', height: '36px' }}
            >
              <div style={{
                position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform var(--dur-emphasis) var(--ease-spring), opacity var(--dur-normal) var(--ease-standard)',
                transform: theme === 'dark' ? 'translateY(0) rotate(0deg)' : 'translateY(32px) rotate(-90deg)',
                opacity: theme === 'dark' ? 1 : 0,
                color: '#f59e0b'
              }}>
                <Sun size={18} />
              </div>
              <div style={{
                position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform var(--dur-emphasis) var(--ease-spring), opacity var(--dur-normal) var(--ease-standard)',
                transform: theme === 'light' ? 'translateY(0) rotate(0deg)' : 'translateY(-32px) rotate(90deg)',
                opacity: theme === 'light' ? 1 : 0,
                color: 'var(--text-muted)'
              }}>
                <Moon size={18} />
              </div>
            </button>

            {/* Avatar */}
            <div style={{
              width: '34px', height: '34px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9180f5 100%)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '14px',
              boxShadow: '0 0 0 2px var(--bg-surface), 0 0 0 3px var(--accent-primary-muted)',
              transition: 'box-shadow var(--transition-fast)',
            }}>
              {userInitial}
            </div>
          </div>
        </header>

        <div className="page-container" style={{ animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {mobileNavItems.map(item => {
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={`bottom-nav-item ${active ? 'active' : ''}`}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: active ? 'var(--accent-primary-muted)' : 'transparent',
                  transition: 'background-color var(--transition-fast)',
                }}>
                  <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
