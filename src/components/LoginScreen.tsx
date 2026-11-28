'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Terminal,
  User,
  UserCheck,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserSummary } from '@/lib/types';

export function LoginScreen() {
  const {
    settings,
    branches,
    terminals,
    companies,
    users,
    loginUser,
    reloadContext,
  } = usePosContext();

  // Smart Shift Auto-Detection based on current hour
  const detectedShift = useMemo<'MORNING' | 'EVENING'>(() => {
    const hour = new Date().getHours();
    return hour < 14 ? 'MORNING' : 'EVENING';
  }, []);

  // Form State
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('SEASTONE');
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(1);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(1);
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'EVENING'>(detectedShift);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-sync initial company and branch
  useEffect(() => {
    if (companies.length > 0 && !companies.some((c) => c.company_code === selectedCompanyCode)) {
      setSelectedCompanyCode(companies[0].company_code);
    }
  }, [companies, selectedCompanyCode]);

  useEffect(() => {
    if (branches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Smart Counter Auto-Selection: Filter terminals for selected branch
  const branchTerminals = useMemo(() => {
    if (!selectedBranchId) return terminals;
    const matched = terminals.filter((t) => t.branch_id === selectedBranchId);
    return matched.length > 0 ? matched : terminals;
  }, [terminals, selectedBranchId]);

  useEffect(() => {
    if (branchTerminals.length > 0) {
      setSelectedTerminalId(branchTerminals[0].id);
    } else {
      setSelectedTerminalId(null);
    }
  }, [branchTerminals]);

  // Handle Form Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = (await res.json()) as { user?: UserSummary; error?: string };
      if (!res.ok || !data.user) {
        setErrorMessage(data.error || 'Invalid username or password.');
        return;
      }

      // Check if user is active
      if (data.user.is_active === 0) {
        setErrorMessage('This user account has been deactivated. Please contact Super Admin.');
        return;
      }

      // Complete login
      loginUser(data.user, selectedBranchId, selectedTerminalId, selectedShift);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to authentication service.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Test Profile Filler (For Faisal - Instant Testing)
  const handleQuickFillProfile = (roleType: 'SUPER_ADMIN' | 'CASHIER' | 'MANAGER') => {
    setErrorMessage('');
    if (roleType === 'SUPER_ADMIN') {
      setUsername('faisal');
      setPassword('admin123');
      if (branches.length > 0) setSelectedBranchId(branches[0].id);
    } else if (roleType === 'CASHIER') {
      const cashierUser = users.find((u) => u.role === 'CASHIER' && u.is_active === 1);
      if (cashierUser) {
        setUsername(cashierUser.username);
        setPassword('admin123');
        if (cashierUser.branch_id) setSelectedBranchId(cashierUser.branch_id);
      } else {
        setUsername('cashier1');
        setPassword('admin123');
        if (branches.length > 0) setSelectedBranchId(branches[0].id);
      }
    } else if (roleType === 'MANAGER') {
      const managerUser = users.find((u) => u.role === 'MANAGER' && u.is_active === 1);
      if (managerUser) {
        setUsername(managerUser.username);
        setPassword('admin123');
        if (managerUser.branch_id) setSelectedBranchId(managerUser.branch_id);
      } else {
        setUsername('manager1');
        setPassword('admin123');
        if (branches.length > 0) setSelectedBranchId(branches[0].id);
      }
    }
  };

  // Active Terminal Details
  const activeTerminalObj = useMemo(() => {
    return terminals.find((t) => t.id === selectedTerminalId) ?? terminals[0] ?? null;
  }, [terminals, selectedTerminalId]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#060e1b] via-[#0a172c] to-[#102343] p-3 sm:p-6 text-slate-100">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Main Login Card (Split-Screen Executive Portal) */}
      <div className="relative z-10 flex w-full max-w-[1080px] flex-col lg:flex-row overflow-hidden rounded-3xl border border-sky-500/20 bg-slate-900/90 shadow-2xl backdrop-blur-md">
        {/* ========================================================================= */}
        {/* LEFT BRANDING & OVERVIEW PANEL (42% WIDTH)                                */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-sky-500/20 bg-gradient-to-br from-[#0a172e] via-[#0e2142] to-[#122850] p-6 sm:p-9 text-white lg:w-[42%]">
          <div>
            {/* Business Logo & Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md border border-white/20">
                {settings.logo_data_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logo_data_url}
                    alt={settings.business_name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Store className="h-7 w-7 text-emerald-600" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  {settings.software_brand || 'Softifyx'} Multi-Tenant ERP
                </span>
                <h1 className="text-sm sm:text-base font-black leading-tight text-white line-clamp-2">
                  {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
                </h1>
              </div>
            </div>

            {/* Subtitle & Value Proposition */}
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Secure Point of Sale, multi-branch inventory ledger, and FBR certified real-time fiscal invoicing portal.
            </p>

            {/* 4 Multi-Tenant Verification Pillars */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <span className="font-bold text-emerald-200 block">FBR Tier-1 Certified POS</span>
                  <span className="text-[10px] text-slate-300">Live fiscal QR codes and automated transmission</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5 text-xs">
                <Building2 className="h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <span className="font-bold text-sky-200 block">Multi-Tenant Architecture</span>
                  <span className="text-[10px] text-slate-300">Segregated business entities, catalogs and tax profiles</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-2.5 text-xs">
                <Store className="h-4 w-4 shrink-0 text-indigo-400" />
                <div>
                  <span className="font-bold text-indigo-200 block">Multi-Branch Hardware Scoping</span>
                  <span className="text-[10px] text-slate-300">Independent POS counters and synchronized inventory</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs">
                <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold text-amber-200 block">Smart Shift Detection</span>
                  <span className="text-[10px] text-slate-300">Automatic Morning &amp; Evening cash drawer tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Footer Note */}
          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="tabular-nums">Terminal Version 2.4</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online Server Active
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT LOGIN FORM & TERMINAL SELECTION (58% WIDTH)                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between bg-white p-6 sm:p-9 text-slate-900 lg:w-[58%]">
          <div>
            {/* Form Title */}
            <div className="mb-5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Sign In to Terminal
              </h2>
              <p className="text-xs text-slate-500">
                Choose your operating company, branch location, and enter your credentials.
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Row 1: Company Entity & Branch Outlet */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 1. Company / Tenant Selector */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Business / Organization
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedCompanyCode}
                      onChange={(e) => setSelectedCompanyCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:bg-white focus:outline-hidden"
                    >
                      {companies.length > 0 ? (
                        companies.map((c) => (
                          <option key={c.id} value={c.company_code}>
                            {c.business_name}
                          </option>
                        ))
                      ) : (
                        <option value="SEASTONE">
                          {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 2. Branch Outlet Selector */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Branch Outlet Location
                  </label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedBranchId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedBranchId(val);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:bg-white focus:outline-hidden"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.display_name || b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: POS Hardware Counter & Smart Work Shift */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 3. POS Counter (Smart Auto-Selected) */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      POS Hardware Counter
                    </label>
                    {activeTerminalObj && (
                      <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                        FBR ID: {activeTerminalObj.fbr_pos_id || '104521'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Terminal className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedTerminalId ?? ''}
                      onChange={(e) => setSelectedTerminalId(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:bg-white focus:outline-hidden"
                    >
                      {branchTerminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          Counter {t.terminal_code} ({t.invoice_prefix})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Work Shift (Smart Time-Based Auto-Detection) */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Operating Work Shift
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700">
                      <Sparkles className="h-3 w-3" />
                      Auto-Detected
                    </span>
                  </div>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value as 'MORNING' | 'EVENING')}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:bg-white focus:outline-hidden"
                    >
                      <option value="MORNING">Morning Shift (08:00 AM - 02:00 PM)</option>
                      <option value="EVENING">Evening Shift (02:00 PM - 11:00 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Username Input */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  User ID / Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username (e.g. faisal, cashier1)"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Password Input with Eye Toggle */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs font-semibold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Remember session on this computer</span>
                </label>
              </div>

              {/* Sign In Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Sign In to Terminal</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* FAISAL'S QUICK TESTING ASSISTANT (INSTANT PERMISSION TESTING)             */}
          {/* ========================================================================= */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Quick Switch Profiles (For Testing)
              </span>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Profile 1: Faisal (Super Admin) */}
              <button
                type="button"
                onClick={() => handleQuickFillProfile('SUPER_ADMIN')}
                className="flex flex-col items-center rounded-xl border border-sky-200 bg-white p-2 text-center shadow-2xs hover:border-sky-400 hover:bg-sky-50/60 transition cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-sky-600 mb-1" />
                <span className="text-xs font-bold text-slate-900 block leading-tight">Faisal</span>
                <span className="text-[10px] text-sky-700 font-semibold">Super Admin</span>
              </button>

              {/* Profile 2: Cashier */}
              <button
                type="button"
                onClick={() => handleQuickFillProfile('CASHIER')}
                className="flex flex-col items-center rounded-xl border border-emerald-200 bg-white p-2 text-center shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/60 transition cursor-pointer"
              >
                <Store className="h-4 w-4 text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-slate-900 block leading-tight">Cashier</span>
                <span className="text-[10px] text-emerald-700 font-semibold">POS Billing</span>
              </button>

              {/* Profile 3: Manager */}
              <button
                type="button"
                onClick={() => handleQuickFillProfile('MANAGER')}
                className="flex flex-col items-center rounded-xl border border-indigo-200 bg-white p-2 text-center shadow-2xs hover:border-indigo-400 hover:bg-indigo-50/60 transition cursor-pointer"
              >
                <UserCheck className="h-4 w-4 text-indigo-600 mb-1" />
                <span className="text-xs font-bold text-slate-900 block leading-tight">Manager</span>
                <span className="text-[10px] text-indigo-700 font-semibold">Store Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
