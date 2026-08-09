import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Settings, HeartPulse, FolderKanban, Target, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function More() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const moreLinks = [
    { to: '/health', icon: HeartPulse, label: 'Health & Trends', desc: 'Sleep, exercise, and weight stats' },
    { to: '/projects', icon: FolderKanban, label: 'Projects Pulse', desc: 'Active projects & milestones' },
    { to: '/goals', icon: Target, label: 'Goals', desc: 'Target tracking & progress' },
    { to: '/profile', icon: User, label: 'Profile', desc: 'Personal details & focus areas' },
    { to: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences & habit management' }
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ marginBottom: 'var(--space-1)' }}>More Modules</h1>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Access additional modules and settings.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {moreLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="card card-interactive"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', textDecoration: 'none' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <item.icon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          </NavLink>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-2)' }}>
        <button 
          onClick={handleLogout} 
          className="btn btn-secondary" 
          style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--border-color)' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}
