import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to LedgerLens AI!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@ledgerlens.ai');
    setPassword('DemoPass123!');
    setLoading(true);
    try {
      // First try to login, or register demo account if not exists
      try {
        await login('demo@ledgerlens.ai', 'DemoPass123!');
      } catch (loginErr) {
        // Auto register demo
        const { authService } = await import('../services/authService');
        await authService.register({
          full_name: 'Alex Vance (Lead Auditor)',
          email: 'demo@ledgerlens.ai',
          password: 'DemoPass123!',
        });
        await login('demo@ledgerlens.ai', 'DemoPass123!');
      }
      toast.success('Signed in as Hackathon Demo Auditor!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to initialize demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F3] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#111113] text-white shadow-elevated mb-4">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <circle cx="11" cy="14" r="3" />
              <path d="m15 17 2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">LedgerLens AI</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">From Documents to Decisions — Powered by AI</p>
        </div>

        {/* Login Card */}
        <Card rounded="3xl" className="p-8 shadow-elevated">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-950">Welcome back</h2>
            <p className="text-xs text-zinc-500 mt-1">Sign in to your intelligent document workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/70 border border-zinc-200 rounded-2xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-800 border-zinc-300"
                />
                <span className="text-xs font-medium text-zinc-600">Remember session</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Quick Demo 1-Click Access for Evaluation */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Instant Demo Login (Hackathon Evaluator)
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-zinc-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-zinc-900 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-zinc-400 mt-6">
          <ShieldCheck className="w-4 h-4 text-zinc-400" />
          <span>Protected with 256-bit JWT & bcrypt security</span>
        </div>
      </div>
    </div>
  );
};

