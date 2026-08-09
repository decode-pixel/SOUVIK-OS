import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = isLogin
        ? await signIn({ email, password })
        : await signUp({ email, password });
      if (error) throw error;
      if (isLogin) navigate('/');
      else setError('Check your email for the confirmation link.');
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'An error occurred during Google authentication.');
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      alignItems: 'stretch',
    }}>
      {/* Left Brand Panel — hidden on mobile */}
      <div style={{
        display: 'none',
        flex: '1',
        background: 'linear-gradient(135deg, #1a1440 0%, #2d1b69 40%, #1a1440 100%)',
        padding: 'var(--space-10)',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }} className="auth-brand-panel">
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '15%', left: '20%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(124,110,240,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', position: 'relative' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #7c6ef0 0%, #9180f5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '20px',
            color: '#fff', boxShadow: '0 4px 16px rgba(124,110,240,0.4)',
          }}>S</div>
          <div style={{ color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>
            Souvik OS
          </div>
        </div>

        {/* Tag line */}
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '2rem', fontWeight: 800,
            color: '#fff', letterSpacing: '-0.04em',
            lineHeight: 1.1, marginBottom: 'var(--space-4)',
          }}>
            Your personal<br />operating system.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Track your health, finances, habits, goals,<br />
            and everything that matters.
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        minHeight: '100vh',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9180f5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '16px',
                color: '#fff', boxShadow: '0 2px 8px var(--accent-glow)',
              }}>S</div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 'var(--font-size-lg)', letterSpacing: '-0.02em' }}>Souvik OS</span>
            </div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-1)' }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
              {isLogin ? 'Sign in to your personal OS' : 'Start your personal operating system'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-error-muted)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-5)',
              border: '1px solid rgba(220,38,38,0.15)',
            }}>
              {error}
            </div>
          )}

          {/* Google Auth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              minHeight: '44px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              fontSize: 'var(--font-size-sm)',
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              opacity: loading || googleLoading ? 0.6 : 1,
              transition: 'all var(--transition-fast)',
              marginBottom: 'var(--space-5)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {!googleLoading && (
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="input"
                placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: '44px', fontWeight: 600, marginTop: 'var(--space-2)' }}
              disabled={loading || googleLoading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-primary)', fontWeight: 600,
                fontSize: 'var(--font-size-sm)', fontFamily: 'inherit',
                padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px',
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .auth-brand-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
