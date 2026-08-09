import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, HeartPulse, DollarSign, ListTodo, FolderKanban, Target, Settings, User, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

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
    { to: '/', icon: Home, label: 'Home' },
    { to: '/checkin', icon: CheckSquare, label: 'Check-in' },
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/health', icon: HeartPulse, label: 'Health' },
  ];

  const mobileNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/checkin', icon: CheckSquare, label: 'Check-in' },
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/more', icon: Menu, label: 'More' }
  ];

  // Get first letter of email for avatar
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'S';

  // Map path to title
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {userInitial}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>Souvik OS</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modules</span>
          </div>
          
          {desktopNavItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <NavLink to="/profile" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} strokeWidth={2} /> Profile
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} strokeWidth={2} /> Settings
          </NavLink>
          <button 
            onClick={handleLogout} 
            className="nav-item" 
            style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit', fontSize: '1rem', marginTop: 'var(--space-2)' }}
          >
            <LogOut size={20} strokeWidth={2} color="var(--text-secondary)" /> <span style={{ color: 'var(--text-secondary)' }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content" style={{ padding: 0 }}>
        {/* Glass Header */}
        <header className="glass header-container" style={{
          position: 'sticky', top: 0, zIndex: 30,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--glass-border)',
          borderLeft: 'none', borderRight: 'none', borderTop: 'none',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.02)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {getPageTitle()}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button 
              className="btn-icon" 
              onClick={toggleTheme}
              style={{ position: 'relative', overflow: 'hidden' }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div style={{
                position: 'absolute',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform var(--duration-emphasis) var(--ease-spring), opacity var(--duration-standard)',
                transform: theme === 'dark' ? 'translateY(0) rotate(0)' : 'translateY(30px) rotate(-90deg)',
                opacity: theme === 'dark' ? 1 : 0
              }}>
                <Sun size={20} />
              </div>
              <div style={{
                position: 'absolute',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform var(--duration-emphasis) var(--ease-spring), opacity var(--duration-standard)',
                transform: theme === 'light' ? 'translateY(0) rotate(0)' : 'translateY(-30px) rotate(90deg)',
                opacity: theme === 'light' ? 1 : 0
              }}>
                <Moon size={20} />
              </div>
            </button>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--accent-primary-muted)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              {userInitial}
            </div>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation (5 slots) */}
      <nav className="bottom-nav glass">
        <div className="bottom-nav-inner">
          {mobileNavItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({isActive}) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div style={{ 
                padding: '4px 16px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'var(--accent-primary-subtle)' : 'transparent',
                transition: 'background-color var(--transition-fast)'
              }}>
                <item.icon size={24} strokeWidth={2} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
