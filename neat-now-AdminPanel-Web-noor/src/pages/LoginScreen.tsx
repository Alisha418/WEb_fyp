import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import authService from '../services/authService';

interface LoginScreenProps {
  onLogin: (email: string, password:  string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ✨ MODIFIED: Add actual API call
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Call backend API
      const response = await authService.login(email, password);
      
      if (response.success) {
        setSuccessMessage(`Welcome back, ${response.data.user.name}!`);
         
        // Call parent callback after short delay
        setTimeout(() => {
          onLogin(email, password);
        }, 500);
      }
    } catch (err: any) {
      // Show error message
      const errorMsg = err.response?.data?.errors 
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✨ MODIFIED: Add actual password reset API call
  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Call backend API
      const response = await authService.requestPasswordReset(resetEmail);
      
      if (response.success) {
        setSuccessMessage('Password reset link has been sent to your email! ');
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setSuccessMessage('');
        }, 2000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 🎨 FORGOT PASSWORD SCREEN - Your exact styling, just added backend calls
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 py-8 overflow-auto"> 
        <div className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mb-3 shadow-xl shadow-emerald-500/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl text-white mb-1.5">Reset Password</h1>
            <p className="text-xs text-slate-400">Enter your email to receive a reset link</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-lg p-5 shadow-2xl">
            {/* ✨ ADDED: Error/Success messages */}
            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-xs text-red-400">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-md text-xs text-emerald-400">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="noor@cleanup.gov"
                  required
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 flex items-center justify-center text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccessMessage('');
                }}
                disabled={loading}
                className="w-full text-xs text-center text-slate-400 hover:text-emerald-500 transition-colors mt-2"
              >
                ← Back to Login
              </button>
            </form>
          </div>

          <div className="text-center mt-3">
            <p className="text-xs text-slate-500">
              Neat Now Cleanup Management System 
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 🎨 MAIN LOGIN SCREEN - Your exact styling, just added backend calls
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 py-8 relative overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-4">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mb-3 shadow-xl shadow-emerald-500/20">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl text-white mb-1.5">Admin Control Panel</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-emerald-500">System Online</span>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-lg p-5 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-xl text-white mb-1">Welcome Back</h2>
            <p className="text-xs text-slate-400">Sign in to access your admin dashboard</p>
          </div>

          {/* ✨ ADDED:  Error/Success messages */}
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-xs text-red-400">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-md text-xs text-emerald-400">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="admin@cleanup.gov"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                disabled={loading}
                className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm text-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <div className="text-center mt-3 space-y-1.5">
          <p className="text-xs text-slate-600">
            © 2025 Neat Now Cleanup Management.  All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}