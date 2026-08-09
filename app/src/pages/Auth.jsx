import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
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
      
      // If sign in successful, redirect to home
      if (isLogin) {
        navigate('/');
      } else {
        setError('Check your email for the confirmation link.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
        <p style={{ marginBottom: 'var(--space-6)' }}>Souvik OS</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-4)' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: '100%' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
