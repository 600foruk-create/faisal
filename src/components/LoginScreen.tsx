'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
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
    users,
    loginUser,
    openPosSale,
  } = usePosContext();

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Form Submission with Smart Background Logic
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

      const loggedUser = data.user;

      if (loggedUser.is_active === 0) {
        setErrorMessage('This user account has been deactivated. Please contact Super Admin.');
        return;
      }

      // =========================================================================
      // SMART BACKGROUND LOGIC (NO CLUTTER ON SCREEN)
      // =========================================================================
      // 1. Smart Branch Scoping:
      // If user is tied to a specific branch, use it. Otherwise use primary branch (1).
      let assignedBranchId = loggedUser.branch_id;
      if (!assignedBranchId || !branches.some((b) => b.id === assignedBranchId)) {
        assignedBranchId = branches[0]?.id ?? 1;
      }

      // 2. Smart POS Hardware Counter:
      // Automatically assign the primary active terminal for the assigned branch.
      const branchTerminals = terminals.filter((t) => t.branch_id === assignedBranchId);
      const assignedTerminalId = branchTerminals.length > 0 ? branchTerminals[0].id : (terminals[0]?.id ?? 1);

      // 3. Smart Shift Auto-Detection:
      // Automatically determine operating shift from system clock (< 2:00 PM = MORNING, >= 2:00 PM = EVENING).
      const currentHour = new Date().getHours();
      const autoShift: 'MORNING' | 'EVENING' = currentHour < 14 ? 'MORNING' : 'EVENING';

      // 4. Log in the user into ERP session
      loginUser(loggedUser, assignedBranchId, assignedTerminalId, autoShift);

      // 5. Direct Account Role Routing:
      // If Cashier logs in, automatically pop open the POS Billing Terminal!
      if (loggedUser.role === 'CASHIER') {
        openPosSale();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to authentication service.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Test Profile Filler (For Faisal - 1-Click Fast Testing)
  const handleQuickFillProfile = (roleType: 'SUPER_ADMIN' | 'CASHIER' | 'MANAGER') => {
    setErrorMessage('');
    if (roleType === 'SUPER_ADMIN') {
      setUsername('faisal');
      setPassword('admin123');
    } else if (roleType === 'CASHIER') {
      const cashierUser = users.find((u) => u.role === 'CASHIER' && u.is_active === 1);
      if (cashierUser) {
        setUsername(cashierUser.username);
        setPassword('admin123');
      } else {
        setErrorMessage('No cashier account created yet. Log in as Super Admin (Faisal) and create a cashier in User Logins.');
      }
    } else if (roleType === 'MANAGER') {
      const managerUser = users.find(
        (u) => (u.role === 'MANAGER' || u.role === 'ADMIN') && u.username !== 'faisal' && u.is_active === 1
      );
      if (managerUser) {
        setUsername(managerUser.username);
        setPassword('admin123');
      } else {
        setErrorMessage('No branch manager account created yet. Log in as Super Admin (Faisal) and create a manager in User Logins.');
      }
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#060c18] via-[#09152a] to-[#0e2142] p-3 sm:p-6 text-slate-100 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
      </div>

      {/* Main Floating Glass Portal Card (Style Matched to Reference Image) */}
      <div className="relative z-10 flex w-full max-w-[1040px] flex-col overflow-hidden rounded-[28px] border border-sky-500/20 bg-[#0c1830]/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* ========================================================================= */}
        {/* TOP BRAND NAV BAR (INSIDE CARD)                                           */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b border-sky-500/15 px-6 py-4 sm:px-8">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block leading-tight">
                {settings.software_brand || 'Softifyx'} ERP
              </span>
              <span className="text-xs font-bold text-white tracking-tight">
                {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
              </span>
            </div>
          </div>

          {/* Minimal Status Indicators */}
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FBR Tier-1 Verified
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 tabular-nums">Version 2.4</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SPLIT BODY: LEFT LOGIN FORM (42%) & RIGHT WAVE ARTWORK (58%)              */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT: MINIMAL SLEEK LOGIN PANEL                                         */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-sky-500/15 p-6 sm:p-10 lg:w-[44%]">
            {/* Center Profile Avatar Circle (Exactly Like Reference Image) */}
            <div className="mb-6 flex flex-col items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-sky-400/80 bg-sky-500/10 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
                <User className="h-9 w-9 text-sky-400" />
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form with Pill Inputs */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Input 1: Username Pill */}
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="USERNAME"
                  className="w-full rounded-full border border-slate-700/80 bg-slate-800/80 py-2.5 pl-11 pr-4 text-xs font-semibold text-white placeholder-slate-400 shadow-inner focus:border-sky-400 focus:bg-slate-900 focus:outline-hidden transition"
                />
              </div>

              {/* Input 2: Password Pill with Eye Toggle */}
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full rounded-full border border-slate-700/80 bg-slate-800/80 py-2.5 pl-11 pr-11 text-xs font-semibold text-white placeholder-slate-400 shadow-inner focus:border-sky-400 focus:bg-slate-900 focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Login Button with Our Signature Emerald/Teal Gradient */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 active:scale-[0.99] disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>

              {/* Remember Me & Help Text */}
              <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-slate-500">Authorized Personnel</span>
              </div>
            </form>

            {/* Quick Testing Profile Pills for Faisal */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
                Quick Profile Fill (For Testing)
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFillProfile('SUPER_ADMIN')}
                  className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-500/20 transition cursor-pointer"
                >
                  Faisal (Super Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillProfile('CASHIER')}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  Cashier
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillProfile('MANAGER')}
                  className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                >
                  Manager
                </button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT: FLUID WAVE ARTWORK & WELCOME TYPOGRAPHY (MATCHING REFERENCE)     */}
          {/* ----------------------------------------------------------------------- */}
          <div className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-10 lg:w-[56%] bg-gradient-to-br from-[#0c1832] via-[#0f2146] to-[#142c5c]">
            {/* Fluid Organic Wave Artwork SVG in our Signature Teal/Cyan/Navy theme */}
            <div className="absolute inset-0 pointer-events-none opacity-80">
              <svg
                viewBox="0 0 600 450"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full object-cover"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,180 C120,80 220,320 360,200 C480,100 540,260 600,220 L600,450 L0,450 Z"
                  fill="url(#waveGrad1)"
                />
                <path
                  d="M0,240 C140,140 260,340 400,240 C500,160 560,310 600,280 L600,450 L0,450 Z"
                  fill="url(#waveGrad2)"
                />
              </svg>
            </div>

            {/* Glowing Accent Ring */}
            <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 my-auto py-6">
              {/* Big Bold "Welcome." Title (Exactly Like Reference Image) */}
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-sm">
                Welcome.
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base font-semibold text-emerald-300 mb-3">
                Point of Sale &amp; FBR Fiscal ERP Management System
              </p>

              {/* Description */}
              <p className="text-xs text-slate-300 max-w-[420px] leading-relaxed mb-6">
                Single sign-on access to your authorized company catalog, branch inventory ledger, and FBR fiscal billing terminal.
              </p>

              {/* 3 Pillars of Automated Background Intelligence */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-[460px]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                  <Store className="h-4 w-4 text-emerald-400 mb-1" />
                  <span className="text-[11px] font-bold text-white block">Auto Branch</span>
                  <span className="text-[9px] text-slate-300">Outlet scoped</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                  <Terminal className="h-4 w-4 text-sky-400 mb-1" />
                  <span className="text-[11px] font-bold text-white block">Auto Counter</span>
                  <span className="text-[9px] text-slate-300">POS-01 linked</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs">
                  <Clock className="h-4 w-4 text-amber-400 mb-1" />
                  <span className="text-[11px] font-bold text-white block">Auto Shift</span>
                  <span className="text-[9px] text-slate-300">Time-detected</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Note inside Card */}
            <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Secure TLS Encrypted Session</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Live Fiscal Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
