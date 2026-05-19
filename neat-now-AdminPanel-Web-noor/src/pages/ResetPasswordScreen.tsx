import { useState, useEffect } from 'react';
import { Activity, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';

export function ResetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Get token and uidb64 from URL
  const token = searchParams.get('token');
  const uidb64 = searchParams.get('uid');

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !uidb64) {
        setError('Invalid reset link. Please request a new password reset.');
        setValidating(false);
        setTokenValid(false);
        return;
      }

      try {
        // Call authService to validate token
        const response = await authService.validateResetToken(token, uidb64);
        if (response.success) {
          setTokenValid(true);
        } else {
          setError(response.message || 'This reset link has expired or is invalid. Please request a new one.');
          setTokenValid(false);
        }
      } catch (err: any) {
        console.error('Token validation error:', err);
        setError('This reset link has expired or is invalid. Please request a new one.');
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, uidb64]);

  // Password validation
  const validatePassword = (pwd: string) => {
    const errors = [];
    if (pwd.length < 8) errors.push('at least 8 characters');
    if (!/[a-z]/.test(pwd)) errors.push('a lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('an uppercase letter');
    if (!/\d/.test(pwd)) errors.push('a number');
    return errors;
  };

  const passwordErrors = password ?  validatePassword(password) : [];
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e:  React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(', ')}.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (! token || !uidb64) {
      setError('Invalid reset link.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(token, uidb64, password);
      
      if (response.success) {
        setSuccessMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const errorMsg = response.message || 'Failed to reset password. Please try again.';
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mb-4 shadow-xl shadow-emerald-500/20 animate-pulse">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (! tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 py-8 overflow-auto">
        <div className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-2xl text-white mb-1.5">Invalid Reset Link</h1>
            <p className="text-xs text-slate-400">This password reset link has expired or is invalid</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-lg p-5 shadow-2xl">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 text-sm text-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Return to Login
              </button>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full py-2.5 text-sm text-center border border-slate-700 text-slate-300 rounded-md hover:border-emerald-500 hover:text-emerald-500 transition-all"
              >
                Request New Reset Link
              </button>
            </div>
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

  // Main reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 py-8 relative overflow-auto">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mb-3 shadow-xl shadow-emerald-500/20">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl text-white mb-1.5">Reset Your Password</h1>
          <p className="text-xs text-slate-400">Create a new secure password for your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-lg p-5 shadow-2xl">
          {/* Error/Success messages */}
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-md text-xs text-emerald-400 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* New Password */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2.5 pr-10 bg-slate-800/50 border ${
                    confirmPassword && ! passwordsMatch 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  } rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-md p-3 space-y-1.5">
              <p className="text-xs text-slate-400 font-medium mb-2">Password must contain:</p>
              {[
                { label: 'At least 8 characters', check: password.length >= 8 },
                { label: 'One lowercase letter', check: /[a-z]/.test(password) },
                { label: 'One uppercase letter', check: /[A-Z]/.test(password) },
                { label: 'One number', check: /\d/.test(password) }
              ].map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${req.check ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                  <span className={`text-xs ${req.check ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {req.label}
                  </span>
                  {req.check && <CheckCircle className="w-3 h-3 text-emerald-500 ml-auto" />}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || passwordErrors.length > 0 || ! passwordsMatch}
              className="w-full py-2.5 text-sm text-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md hover:shadow-xl hover: shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Resetting Password...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={loading}
              className="w-full text-xs text-center text-slate-400 hover:text-emerald-500 transition-colors mt-2"
            >
              ← Back to Login
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-3">
          <p className="text-xs text-slate-500">
            Neat Now Cleanup Management System
          </p>
        </div>
      </div>
    </div>
  );
}