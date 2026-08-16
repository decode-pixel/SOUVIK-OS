import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Home, LogIn } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--accent-primary-muted)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={28} strokeWidth={2} />
        </div>

        <div>
          <span
            className="label-caps"
            style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-1)', display: 'block' }}
          >
            404 Error
          </span>
          <h1 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-2xl)' }}>
            Page Not Found
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            The path <code style={{ backgroundColor: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', fontFamily: 'monospace' }}>{location.pathname}</code> does not exist or has been moved.
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-4)', width: '100%' }}>
          {user ? (
            <Link
              to="/"
              className="btn btn-primary"
              style={{ width: '100%', textDecoration: 'none', gap: 'var(--space-2)' }}
            >
              <Home size={16} />
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="btn btn-primary"
              style={{ width: '100%', textDecoration: 'none', gap: 'var(--space-2)' }}
            >
              <LogIn size={16} />
              Sign In to Souvik OS
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
