import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@cybersecurity.local');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'analyst') => {
    if (role === 'admin') {
      setEmail('admin@cybersecurity.local');
      setPassword('Admin@123456');
    } else {
      setEmail('analyst@cybersecurity.local');
      setPassword('Analyst@123456');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">CyberSecurity Platform</h1>
          <p className="text-sm text-slate-400 mt-1">AI-Powered Threat Analytics & Incident Management</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="analyst@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <p className="text-xs text-slate-400 text-center mb-3">Quick Fill Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin')}
              className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors text-center"
            >
              👑 Administrator
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('analyst')}
              className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors text-center"
            >
              🔍 Read-only Analyst
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        CyberSecurity Analytics System &bull; Version 1.0 &bull; 2026
      </p>
    </div>
  );
};
