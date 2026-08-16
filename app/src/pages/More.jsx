import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Settings, HeartPulse, FolderKanban, Target, LogOut, DollarSign, BarChart2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MODULE_CONFIG = {
  '/finance':  { color: 'var(--mod-finance)',  muted: 'var(--mod-finance-muted)' },
  '/goals':    { color: 'var(--mod-goals)',    muted: 'var(--mod-goals-muted)' },
  '/projects': { color: 'var(--mod-projects)', muted: 'var(--mod-projects-muted)' },
  '/health':   { color: 'var(--mod-health)',   muted: 'var(--mod-health-muted)' },
  '/review':   { color: 'var(--accent-primary)', muted: 'var(--accent-primary-muted)' },
  '/profile':  { color: 'var(--text-muted)',   muted: 'var(--bg-muted)' },
  '/settings': { color: 'var(--text-muted)',   muted: 'var(--bg-muted)' },
};

export default function More() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const modules = [
    { to: '/finance',  icon: DollarSign,   label: 'Finance',        desc: 'Cash flow, expenses & budget' },
    { to: '/goals',    icon: Target,        label: 'Goals',          desc: 'Vision & milestone tracking' },
    { to: '/projects', icon: FolderKanban,  label: 'Projects',       desc: 'Work & personal projects' },
    { to: '/health',   icon: HeartPulse,    label: 'Health & Trends',desc: 'Sleep, exercise & weight' },
    { to: '/review',   icon: BarChart2,     label: 'Life Review',    desc: 'Monthly insights & year direction' },
  ];

  const account = [
    { to: '/profile',  icon: User,     label: 'Profile',  desc: 'Personal details & preferences' },
    { to: '/settings', icon: Settings, label: 'Settings', desc: 'Modules, habits & notifications' },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      <div>
        <h1 style={{ margin: '0 0 var(--space-1)' }}>More</h1>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>All modules and account settings.</p>
      </div>

      {/* Modules */}
      <div>
        <div className="label-caps" style={{ marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-1)' }}>Modules</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {modules.map((item, idx) => {
            const cfg = MODULE_CONFIG[item.to] || {};
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  textDecoration: 'none',
                  borderBottom: idx < modules.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background-color var(--dur-fast) var(--ease-standard)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                  backgroundColor: cfg.muted || 'var(--bg-muted)',
                  color: cfg.color || 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <item.icon size={20} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Account */}
      <div>
        <div className="label-caps" style={{ marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-1)' }}>Account</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {account.map((item, idx) => {
            const cfg = MODULE_CONFIG[item.to] || {};
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  textDecoration: 'none',
                  borderBottom: idx < account.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background-color var(--dur-fast) var(--ease-standard)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <item.icon size={20} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(220,38,38,0.2)',
          backgroundColor: 'var(--color-error-muted)',
          color: 'var(--color-error)',
          fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          transition: 'all var(--dur-fast) var(--ease-standard)',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-error)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-error-muted)'; e.currentTarget.style.color = 'var(--color-error)'; }}
      >
        <LogOut size={16} />
        Sign Out
      </button>

      {/* User info footer */}
      {user?.email && (
        <div style={{ textAlign: 'center', paddingBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Signed in as {user.email}
          </span>
        </div>
      )}
    </div>
  );
}
