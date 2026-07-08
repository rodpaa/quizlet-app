import { useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ open, onClose, initialMode = 'signin' }) {
  const { configured, signIn, signUp, continueAsDemo } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      if (mode === 'signup') {
        const result = await signUp({ name, email, password });
        if (!result.session) {
          setStatus({ type: 'success', message: 'Check your email to confirm your account.' });
        } else {
          onClose();
        }
      } else {
        await signIn({ email, password });
        onClose();
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = () => {
    continueAsDemo();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950/60 backdrop-blur-sm px-4 flex items-center justify-center" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl animate-scale-in"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <p className="text-xs font-black text-qblue uppercase tracking-wide mb-1">Your account</p>
            <h2 id="auth-title" className="text-2xl font-black text-gray-950 dark:text-white">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h2>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close account dialog" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1" aria-label="Account action">
            <button onClick={() => setMode('signin')} className={`segmented-button ${mode === 'signin' ? 'segmented-button-active' : ''}`}>
              Sign in
            </button>
            <button onClick={() => setMode('signup')} className={`segmented-button ${mode === 'signup' ? 'segmented-button-active' : ''}`}>
              Sign up
            </button>
          </div>
        </div>

        {!configured && (
          <div className="mx-6 mt-5 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
            <p className="font-bold text-amber-950 dark:text-amber-100">Cloud accounts are not connected yet.</p>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mt-1">Demo sets stay in this browser and are not shared online.</p>
            <button onClick={useDemo} className="mt-3 w-full py-2.5 px-4 rounded-md bg-amber-400 hover:bg-amber-300 text-amber-950 font-black transition-colors">
              Continue in demo mode
            </button>
          </div>
        )}

        <form onSubmit={submit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <label className="form-label">
              Display name
              <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required disabled={!configured} placeholder="Alex Morgan" />
            </label>
          )}
          <label className="form-label">
            Email
            <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={!configured} placeholder="alex@example.com" />
          </label>
          <label className="form-label">
            Password
            <span className="relative block">
              <input className="form-input pr-12" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required disabled={!configured} placeholder="At least 8 characters" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} disabled={!configured}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {status.message && (
            <p className={`text-sm font-bold ${status.type === 'error' ? 'text-qred' : 'text-qgreen'}`} role="status">{status.message}</p>
          )}

          <button disabled={!configured || submitting} className="primary-button w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            {mode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {submitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
