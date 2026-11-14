import React, { useState } from 'react';
import { User, Lock, Shield, Check, LogOut, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { settingsService } from '../services/insightService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSavingProfile(true);
    try {
      const res = await settingsService.updateProfile({ full_name: fullName.trim() });
      updateUser({ ...user, full_name: res.full_name });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in current and new password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      await settingsService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Password change error: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/70 shadow-soft">
        <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight">Account & Workspace Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">Manage personal profile details, authentication credentials, and system parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card rounded="3xl">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-900">Personal Information</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 bg-zinc-100 border border-zinc-200 rounded-2xl text-xs font-medium text-zinc-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Email is locked to your organization account identifier.</p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingProfile}
              className="mt-2"
            >
              Save Profile Changes
            </Button>
          </form>
        </Card>

        {/* Change Password Card */}
        <Card rounded="3xl">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-900">Security & Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-zinc-600 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-600 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-600 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingPassword}
              className="mt-2"
            >
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      {/* Security Architecture Summary */}
      <Card rounded="3xl" variant="dark" className="p-6 shadow-elevated">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Security & Encryption Architecture</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          LedgerLens AI enforces strict row-level tenant isolation. Document storage and extracted records are
          scoped exclusively to your verified user ID. Sensitive API keys and Supabase service-role credentials
          remain strictly backend-isolated and are never exposed to browser runtimes.
        </p>

        <div className="flex flex-wrap gap-2 mt-4 text-[11px] font-mono">
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            JWT Access Exp: 1 Hour
          </span>
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            bcrypt Hash: Salt Rounds 10
          </span>
          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            MIME & File Verification: Active
          </span>
        </div>
      </Card>
    </div>
  );
};

