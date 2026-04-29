import React, { useEffect, useState } from 'react';
import { auth, signInWithEmailPassword } from '../../repository/firebase';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [authState, setAuthState] = useState<'loading' | 'signed-in' | 'signed-out'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setAuthState(user ? 'signed-in' : 'signed-out');
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmailPassword(email.trim(), password);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authState === 'loading') return null;

  if (authState === 'signed-in') return <>{children}</>;

  return (
    <div
      className='min-h-screen flex items-center justify-center'
      style={{ background: 'var(--lin-bg)' }}
    >
      <div
        className='w-full max-w-sm rounded-xl p-8 flex flex-col gap-5'
        style={{ background: 'var(--lin-surface)', border: '1px solid var(--lin-border-strong)' }}
      >
        {/* Logo / title */}
        <div className='flex flex-col items-center gap-2'>
          <svg className='h-8 w-8' viewBox='0 0 24 24' fill='none'>
            <rect x='3' y='3' width='7' height='10' rx='1.5' fill='var(--lin-accent)' opacity='0.9'/>
            <rect x='13' y='3' width='7' height='10' rx='1.5' fill='var(--lin-accent)' opacity='0.6'/>
            <rect x='3' y='16' width='7' height='5' rx='1.5' fill='var(--lin-accent)' opacity='0.4'/>
            <rect x='13' y='16' width='7' height='5' rx='1.5' fill='var(--lin-accent)' opacity='0.25'/>
          </svg>
          <h1 className='text-base font-semibold' style={{ color: 'var(--lin-text)' }}>
            Planning Poker
          </h1>
          <p className='text-xs' style={{ color: 'var(--lin-text-3)' }}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium' style={{ color: 'var(--lin-text-2)' }}>
              Email
            </label>
            <input
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2'
              style={{
                background: 'var(--lin-elevated)',
                border: '1px solid var(--lin-border-strong)',
                color: 'var(--lin-text)',
              }}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium' style={{ color: 'var(--lin-text-2)' }}>
              Password
            </label>
            <input
              type='password'
              autoComplete='current-password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2'
              style={{
                background: 'var(--lin-elevated)',
                border: '1px solid var(--lin-border-strong)',
                color: 'var(--lin-text)',
              }}
            />
          </div>

          {error && (
            <p className='text-xs font-medium' style={{ color: 'var(--lin-red)' }}>{error}</p>
          )}

          <button
            type='submit'
            disabled={submitting}
            className='w-full py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50'
            style={{ background: 'var(--lin-accent)' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
