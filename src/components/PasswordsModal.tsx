'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserRole, UserSummary } from '@/lib/types';

function isSuperAdminUser(u: UserSummary | null | undefined): boolean {
  if (!u) return false;
  const uname = (u.username || '').toLowerCase();
  const fname = (u.full_name || '').toLowerCase();
  const urole = (u.role || '').toUpperCase();
  return (
    urole === 'SUPER_ADMIN' ||
    urole === 'ADMIN' ||
    uname === 'faisal' ||
    uname === 'admin' ||
    fname.includes('faisal') ||
    fname.includes('owner')
  );
}

export function PasswordsModal() {
  const {
    users,
    branches,
    companies,
    settings,
    closePasswordsModal,
    reloadContext,
  } = usePosContext();

  // Multi-Tenant Companies List
  const tenantCompanies = useMemo(() => {
    if (companies && companies.length > 0) return companies;
    return [
      {
        id: 1,
        company_code: 'SEASTONE',
        business_name: settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY',
        owner_name: settings.owner_name || 'Faisal (Owner)',
        currency_symbol: settings.currency_symbol || 'Rs.',
        default_tax_rate: settings.default_tax_rate || 18,
        branch_count: branches.length,
        is_active: 1,
      },
    ];
  }, [companies, settings, branches.length]);

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Filter 1: Company Selector (Default: SEASTONE)
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('SEASTONE');

  // Filter 2: Selected User / Staff Member
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [searchDirectory, setSearchDirectory] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePasswordsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePasswordsModal]);

  // Filter 2 User Options: Strictly filtered by selected Company
  const companyUsers = useMemo(() => {
    return users.filter((u) => {
      const isSuper = isSuperAdminUser(u);

      // Super Admin (Faisal) is available across all companies
      if (isSuper) return true;

      if (selectedCompanyCode === 'ALL') return true;

      const comp = tenantCompanies.find(
        (c) => c.company_code.toLowerCase() === selectedCompanyCode.toLowerCase()
      );
      const compName = (comp?.business_name || '').toLowerCase();
      const codeLower = selectedCompanyCode.toLowerCase();
      const bName = (u.branch_name || '').toLowerCase();

      const matchesBranch =
        bName.includes(codeLower) || (compName && bName.includes(compName));
      const isPrimarySeastone =
        codeLower === 'seastone' &&
        (bName.includes('timergara') ||
          bName.includes('mingora') ||
          bName.includes('retail') ||
          !u.branch_id);

      return matchesBranch || isPrimarySeastone;
    });
  }, [users, selectedCompanyCode, tenantCompanies]);

  // Keep selected user valid whenever company filter changes
  useEffect(() => {
    if (companyUsers.length > 0) {
      const exists = companyUsers.some((u) => u.id === selectedUserId);
      if (!exists) {
        // Prefer first staff member (e.g. Bilal Khan) or first user
        const nonSuper = companyUsers.find((u) => !isSuperAdminUser(u));
        setSelectedUserId(nonSuper ? nonSuper.id : companyUsers[0].id);
      }
    }
  }, [companyUsers, selectedUserId]);

  const selectedUserObj = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const isSelectedUserSuper = useMemo(() => {
    return isSuperAdminUser(selectedUserObj);
  }, [selectedUserObj]);

  // Reset form inputs when user changes
  useEffect(() => {
    setNewPassword('');
    setConfirmPassword('');
  }, [selectedUserId]);

  // Quick Generators
  const generate4DigitPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPassword(pin);
    setConfirmPassword(pin);
    setShowPassword(true);
    showToast(`Generated 4-digit PIN: ${pin}`, 'success');
  };

  const generate6DigitPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(pin);
    setConfirmPassword(pin);
    setShowPassword(true);
    showToast(`Generated 6-digit PIN: ${pin}`, 'success');
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
    showToast(`Generated secure password: ${pwd}`, 'success');
  };

  // Submit Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('Select a user account first', 'error');
      return;
    }

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      showToast('User not found', 'error');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      showToast('Password / PIN must be at least 4 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify both fields.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_update',
          data: {
            id: targetUser.id,
            full_name: targetUser.full_name,
            role: targetUser.role,
            branch_id: targetUser.branch_id,
            is_active: targetUser.is_active,
            password: newPassword.trim(),
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user password');
      }

      await reloadContext();
      setNewPassword('');
      setConfirmPassword('');
      showToast(
        `Password updated successfully for ${targetUser.full_name} (@${targetUser.username})!`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      showToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Filtered Users Directory
  const filteredDirectoryUsers = useMemo(() => {
    if (!searchDirectory.trim()) return companyUsers;
    const q = searchDirectory.toLowerCase().trim();
    return companyUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.branch_name && u.branch_name.toLowerCase().includes(q))
    );
  }, [companyUsers, searchDirectory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[99vh] w-[99.5vw] max-w-none'
            : 'h-[95vh] max-h-[900px] w-full max-w-5xl'
        }`}
      >
        {/* Executive Midnight Navy Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#071322] via-[#0d213a] to-[#071322] px-6 py-3.5 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40 shadow-inner">
              <KeyRound className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-wide text-white">
                  Passwords &amp; Security PIN Manager
                </h2>
                <span className="rounded-full bg-amber-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-200 ring-1 ring-amber-400/40">
                  Step 5 Security
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Reset employee login credentials and front-desk terminal PINs across all companies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closePasswordsModal}
              title="Close (ESC)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`mx-6 mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all shrink-0 ${
              toastMessage.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span className="font-bold">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Content Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
          {/* Top Section: The 2 Connected Dropdown Filter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/90 shrink-0 shadow-xs">
            {/* Filter 1: Company Selector Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-amber-300">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span>1. Select Company / Tenant:</span>
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Step 1
                </span>
              </div>
              <select
                value={selectedCompanyCode}
                onChange={(e) => setSelectedCompanyCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-white focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="SEASTONE">
                  🏢 M/S SEASTONE PVC PIPE INDUSTRY (SEASTONE)
                </option>
                {tenantCompanies
                  .filter((c) => c.company_code !== 'SEASTONE')
                  .map((c) => (
                    <option key={c.id} value={c.company_code}>
                      🏢 {c.business_name} ({c.company_code})
                    </option>
                  ))}
                <option value="ALL">🏢 All Companies (Global Directory)</option>
              </select>
            </div>

            {/* Filter 2: User Selector Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-amber-300">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span>2. Select Staff Member / User:</span>
                </label>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Step 2 ({companyUsers.length} Users)
                </span>
              </div>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-white focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
              >
                {companyUsers.map((u) => {
                  const isSuper = isSuperAdminUser(u);
                  return (
                    <option key={u.id} value={u.id}>
                      {isSuper ? '👑' : '👤'} {u.full_name} (@{u.username}) — Role: {u.role} — Branch: {u.branch_name || 'All Outlets (HQ)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Upper Card: Password Reset Form */}
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              {/* Profile Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-extrabold text-base shadow-inner ${
                      isSelectedUserSuper
                        ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300'
                        : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    }`}
                  >
                    {isSelectedUserSuper ? (
                      <Crown className="h-6 w-6 text-purple-700" />
                    ) : (
                      selectedUserObj?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {selectedUserObj?.full_name}
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        (@{selectedUserObj?.username})
                      </span>
                      {isSelectedUserSuper ? (
                        <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 ring-1 ring-purple-300">
                          Super Admin
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-300">
                          {selectedUserObj?.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assigned Branch: <span className="font-semibold text-slate-700">{selectedUserObj?.branch_name || 'All Company Outlets (Headquarters)'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Credential Status: Protected &amp; Active</span>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleUpdatePassword} className="mt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Field 1: New Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      New Password / Terminal Access PIN:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter minimum 4 characters or numbers"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Confirm Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Confirm New Password / PIN:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password / PIN to confirm"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-3.5 pr-10 text-xs font-semibold text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 transition"
                        required
                      />
                      {confirmPassword && (
                        <div className="absolute right-3 top-2.5">
                          {newPassword === confirmPassword ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <X className="h-4 w-4 text-rose-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Match Status */}
                {confirmPassword && (
                  <div className="text-xs">
                    {newPassword === confirmPassword ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match perfectly.
                      </span>
                    ) : (
                      <span className="font-bold text-rose-600 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match yet.
                      </span>
                    )}
                  </div>
                )}

                {/* Quick Generator Toolbar & Save Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">
                      Quick Generators:
                    </span>
                    <button
                      type="button"
                      onClick={generate4DigitPin}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-500 hover:text-amber-700 transition shadow-2xs"
                    >
                      🔢 4-Digit PIN
                    </button>
                    <button
                      type="button"
                      onClick={generate6DigitPin}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-500 hover:text-amber-700 transition shadow-2xs"
                    >
                      🔢 6-Digit PIN
                    </button>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-amber-500 hover:text-amber-700 transition shadow-2xs"
                    >
                      🔐 Strong Password
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-98 transition disabled:opacity-50"
                  >
                    {savingPassword ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Update Password for {selectedUserObj?.full_name?.split(' ')[0] || 'User'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Lower Card: Company Staff Credentials Directory */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Company Staff Credentials Directory ({filteredDirectoryUsers.length})
                  </h4>
                </div>
                <div className="w-64 relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff name..."
                    value={searchDirectory}
                    onChange={(e) => setSearchDirectory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 select-none">
                      <th className="py-2.5 px-3 text-center w-12">Sr #</th>
                      <th className="py-2.5 px-4 text-center">Staff Member &amp; Username</th>
                      <th className="py-2.5 px-3 text-center w-32">Security Role</th>
                      <th className="py-2.5 px-4 text-center">Assigned Branch Outlet</th>
                      <th className="py-2.5 px-3 text-center w-36">PIN / Password</th>
                      <th className="py-2.5 px-3 text-center w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredDirectoryUsers.map((u, idx) => {
                      const isSuper = isSuperAdminUser(u);
                      const isSelected = u.id === selectedUserId;

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-50/50 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isSuper ? (
                                <Crown className="h-4 w-4 text-purple-600 shrink-0" />
                              ) : (
                                <Users className="h-4 w-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {u.full_name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  @{u.username}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isSuper ? (
                              <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                                Super Admin
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                {u.role}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {u.branch_name || 'All Company Outlets (Headquarters)'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <Check className="h-3 w-3 text-emerald-600" />
                              Encrypted &amp; Active
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedUserId(u.id)}
                              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition shadow-2xs ${
                                isSelected
                                  ? 'bg-amber-600 text-white'
                                  : 'border border-slate-300 bg-white text-slate-700 hover:border-amber-500 hover:text-amber-700'
                              }`}
                            >
                              {isSelected ? 'Editing' : 'Reset PIN'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Modal Footer */}
        <div className="flex select-none items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span>Keyboard Shortcut:</span>
            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 shadow-2xs">
              ESC
            </kbd>
            <span>closes this window</span>
          </div>

          <button
            type="button"
            onClick={closePasswordsModal}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
