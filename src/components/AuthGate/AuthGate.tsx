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
          <svg className='h-10 w-10' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <ellipse cx='16' cy='13' rx='9' ry='8' fill='#5E6AD2' />
            <circle cx='13' cy='11' r='1.8' fill='white' />
            <circle cx='19' cy='11' r='1.8' fill='white' />
            <circle cx='13.5' cy='11.5' r='0.9' fill='#1e1b4b' />
            <circle cx='19.5' cy='11.5' r='0.9' fill='#1e1b4b' />
            <path d='M8 19 Q6 23 8 26 Q9 28 10 26 Q11 24 10 21' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
            <path d='M11 21 Q10 25 11 28 Q12 30 13 28 Q14 26 13 23' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
            <path d='M14.5 21.5 Q14 26 15 29 Q16 31 17 29 Q18 27 17 24' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
            <path d='M18 21 Q18 25 19 28 Q20 30 21 28 Q22 26 21 23' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
            <path d='M21 19 Q23 23 22 26 Q21 28 20 26 Q19 24 20 21' stroke='#5E6AD2' strokeWidth='2' strokeLinecap='round' fill='none'/>
            <ellipse cx='16' cy='20' rx='8' ry='3' fill='#5E6AD2' />
          </svg>
          <h1 className='text-base font-semibold' style={{ color: 'var(--lin-text)' }}>
            Octo Planning Poker
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
