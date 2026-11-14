import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: request, 2: reset
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toast = useToast();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      toast.success('Password reset instructions generated.');
      if (res?.resetToken) {
        setResetToken(res.resetToken);
      }
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Error initiating password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;

    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      setSuccess(true);
      toast.success('Your password has been successfully reset.');
    } catch (err) {
      toast.error(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F3] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#111113] text-white shadow-elevated mb-4">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <circle cx="11" cy="14" r="3" />
              <path d="m15 17 2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">LedgerLens AI</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">Account Recovery Service</p>
        </div>

        <Card rounded="3xl" className="p-8 shadow-elevated">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-950">Password Updated</h2>
              <p className="text-xs text-zinc-500 mt-2 mb-6">
                Your password has been successfully changed. You can now sign in using your new credentials.
              </p>
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Sign In Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : step === 1 ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Reset password</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your registered account email to initiate secure verification.
                </p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full mt-2"
                >
                  Send Recovery Link <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Set new password</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your secure reset token and your new chosen password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Verification Token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter reset token"
                    required
                    className="w-full px-4 py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-2xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                  />
                  {resetToken && (
                    <p className="text-[10px] text-emerald-600 mt-1">
                      Token loaded automatically from local session.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full mt-2"
                >
                  Save New Password <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </>
          )}

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
