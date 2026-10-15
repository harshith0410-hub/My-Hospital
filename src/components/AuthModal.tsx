import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import { api, setStoredToken } from '../lib/api.ts';
import { UserProfile } from '../lib/types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialTab?: 'signin' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signin',
}) => {
  const [tab, setTab] = useState<'signin' | 'register' | 'recover'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setStoredToken(res.token);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.register({ email, fullName, phone });
      setStoredToken(res.token);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      const res = await api.recoverPassword(email);
      setInfoMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery email');
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickLogin(targetEmail: string) {
    setEmail(targetEmail);
    setPassword('DemoPass123!');
    setIsLoading(true);
    setError(null);
    api.login(targetEmail, 'DemoPass123!')
      .then((res) => {
        setStoredToken(res.token);
        onSuccess(res.user);
        onClose();
      })
      .catch((err) => {
        setError(err.message || 'Failed to sign in demo user');
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 id="auth-modal-title" className="text-base font-bold text-slate-900">
              {tab === 'signin' ? 'Sign In to MyHospital' : tab === 'register' ? 'Create Patient Account' : 'Recover Password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {tab !== 'recover' && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => { setTab('signin'); setError(null); }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                tab === 'signin'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${
                tab === 'register'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Patient Registration
            </button>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Quick Demo Logins for Hackathon Evaluators */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>One-Click Pre-Seeded Profiles</span>
              <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono">Demo Ready</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('patient@demo.org')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900">Sarah Connor</span>
                  <span className="text-slate-500 text-[11px] ml-1.5">(Patient)</span>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold">Sign in &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@metrohealth.org')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900">Marcus Vance, RN</span>
                  <span className="text-teal-700 text-[11px] ml-1.5">(Metro Staff)</span>
                </div>
                <span className="text-[10px] text-teal-600 font-semibold">Sign in &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@myhospital.org')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-800 border border-slate-200 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900">Dr. Patricia Hayes</span>
                  <span className="text-purple-700 text-[11px] ml-1.5">(Admin)</span>
                </div>
                <span className="text-[10px] text-purple-600 font-semibold">Sign in &rarr;</span>
              </button>
            </div>
          </div>

          {/* Form */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab('recover'); setError(null); }}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                <strong>Patient Access Notice:</strong> Public self-registration assigns patient permissions. Hospital Staff and Administrator access require verified institutional authorization and administrator delegation.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Complete Patient Registration'}
              </button>
            </form>
          )}

          {tab === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your account email. If registered, we will dispatch password reset instructions.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Recovery Instructions'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setError(null); setInfoMessage(null); }}
                  className="py-2 px-3 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
