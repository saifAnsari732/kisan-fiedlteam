import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('alex@company.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: usernameOrEmail.trim(),
            password: password
          })
        });

        let data: any = {};
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            res.status === 500
              ? 'Server database error. Please redeploy Vercel and check MongoDB Atlas Network Access.'
              : `Server error (${res.status}): ${text.substring(0, 80)}`
          );
        }

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create account.');
        }

        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernameOrEmail: usernameOrEmail.trim(),
            password: password
          })
        });

        let data: any = {};
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            res.status === 500
              ? 'Server database error. Please redeploy Vercel and check MongoDB Atlas Network Access.'
              : `Server error (${res.status}): ${text.substring(0, 80)}`
          );
        }

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials.');
        }

        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (email: string, pass: string, accName?: string) => {
    setUsernameOrEmail(email);
    setPassword(pass);
    if (accName) setName(accName);
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 sm:p-8">
        {/* Geometric Balance Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-rose-600 rounded-md mx-auto mb-3 flex items-center justify-center shadow-xs">
            <div className="w-5 h-5 bg-white rounded-xs"></div>
          </div>
          <h2 className="text-xl font-bold text-stone-800 tracking-tight">
            {isRegister ? 'Create User Account' : 'Sign in to Field Portal'}
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
            {isRegister
              ? 'Register to log client feedback and site visit coordinates'
              : 'Enter your credentials to access client reports & location logs'}
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2 text-xs text-green-700">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1" htmlFor="reg-name">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Miller"
                className="w-full px-3 py-2 border border-stone-200 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-stone-800 placeholder:text-stone-400 bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1" htmlFor="login-username">
              {isRegister ? 'Email Address' : 'Username or Email'}
            </label>
            <input
              id="login-username"
              type={isRegister ? 'email' : 'text'}
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="alex@company.com or username"
              className="w-full px-3 py-2 border border-stone-200 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-stone-800 placeholder:text-stone-400 bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-stone-200 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm text-stone-800 placeholder:text-stone-400 bg-white transition-all"
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white py-2.5 rounded-md font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Continue</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle between login and register */}
        <div className="mt-5 pt-4 border-t border-stone-100 text-center">
          <button
            id="auth-toggle-mode-btn"
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>

        {/* Quick Demo Fill accounts */}
        <div className="mt-5 bg-stone-50 border border-stone-200/80 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>Pre-seeded Demo Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="demo-user-1-btn"
              onClick={() => fillQuickAccount('alex@company.com', 'password123', 'Alex Miller')}
              className="text-left px-2.5 py-1.5 bg-white hover:bg-rose-50/50 hover:border-rose-200 border border-stone-200 rounded-md text-xs transition-colors cursor-pointer"
            >
              <div className="font-semibold text-stone-800 truncate">Alex Miller</div>
              <div className="text-[10px] text-stone-400 truncate">alex@company.com</div>
            </button>
            <button
              type="button"
              id="demo-user-2-btn"
              onClick={() => fillQuickAccount('sarah@company.com', 'password123', 'Sarah Miller')}
              className="text-left px-2.5 py-1.5 bg-white hover:bg-rose-50/50 hover:border-rose-200 border border-stone-200 rounded-md text-xs transition-colors cursor-pointer"
            >
              <div className="font-semibold text-stone-800 truncate">Sarah Miller</div>
              <div className="text-[10px] text-stone-400 truncate">sarah@company.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

