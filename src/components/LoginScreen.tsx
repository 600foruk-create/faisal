'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserSummary } from '@/lib/types';

export function LoginScreen() {
  const {
    settings,
    branches,
    terminals,
    companies,
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
      // SMART BACKGROUND LOGIC (AUTOMATICALLY ROUTED BEHIND THE SCENES)
      // =========================================================================
      // 0. Smart Company Scoping: If user belongs to a specific company (e.g. Imperial Plast), sync business settings
      if (loggedUser.company_code && loggedUser.role !== 'SUPER_ADMIN') {
        const targetCompany = companies.find((c) => c.company_code === loggedUser.company_code);
        if (targetCompany) {
          try {
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'business',
                data: {
                  business_name: targetCompany.business_name,
                  owner_name: targetCompany.owner_name || '',
                  ntn: targetCompany.ntn || '',
                  strn: targetCompany.strn || '',
                  phone: targetCompany.phone || '',
                  email: targetCompany.email || '',
                  address: targetCompany.address || '',
                  currency_symbol: targetCompany.currency_symbol || 'Rs.',
                  default_tax_rate: targetCompany.default_tax_rate || 18,
                },
              }),
            });
          } catch {}
        }
      }

      // 1. Smart Branch Scoping
      let assignedBranchId = loggedUser.branch_id;
      if (!assignedBranchId || !branches.some((b) => b.id === assignedBranchId)) {
        assignedBranchId = branches[0]?.id ?? 1;
      }

      // 2. Smart POS Hardware Counter
      const branchTerminals = terminals.filter((t) => t.branch_id === assignedBranchId);
      const assignedTerminalId = branchTerminals.length > 0 ? branchTerminals[0].id : (terminals[0]?.id ?? 1);

      // 3. Smart Shift Auto-Detection (< 2:00 PM = MORNING, >= 2:00 PM = EVENING)
      const currentHour = new Date().getHours();
      const autoShift: 'MORNING' | 'EVENING' = currentHour < 14 ? 'MORNING' : 'EVENING';

      // 4. Complete login into context
      loginUser(loggedUser, assignedBranchId, assignedTerminalId, autoShift);

      // 5. Direct Account Role Routing: If Cashier, launch POS Sale Billing Window directly!
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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#050c18] via-[#091529] to-[#0d1e3d] p-3 sm:p-6 text-slate-100 overflow-hidden">
      {/* Background Ambient Glows in Our Brand Colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-600/15 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#091529]/60 blur-[160px]" />
      </div>

      {/* Main Floating Glass Portal Card */}
      <div className="relative z-10 flex w-full max-w-[980px] flex-col overflow-hidden rounded-[30px] border border-emerald-500/40 bg-[#091529]/95 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        {/* ========================================================================= */}
        {/* TOP BRAND BAR (CLEAN & SEAMLESS)                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b-2 border-emerald-500/80 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#0b1830] px-6 py-3.5 sm:px-8">
          {/* Left: Software Brand (White) - Company Name (Amber-400 Gold) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
              {settings.software_brand || 'Softifyx'}
            </span>
            <span className="truncate text-xs sm:text-base font-bold tracking-wide text-amber-400">
              - {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
            </span>
          </div>

          {/* Right: Authentic Logo Emblem */}
          <div className="flex h-10 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm">
            {settings.logo_data_url ? (
              <img
                src={settings.logo_data_url}
                alt={settings.business_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <svg viewBox="0 0 64 52" className="h-full w-full" aria-label="Company Logo">
                <path
                  d="M27 7H14C9.5 7 7 9.8 7 13.5C7 17.2 9.5 19.5 14 20.5L22 22.3C26.5 23.3 29 25.8 29 29.5C29 33.5 25.8 36 21 36H8"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M35 36V10H46.5C52 10 55.5 13.3 55.5 18.2C55.5 23.1 52 26.4 46.5 26.4H35"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  x="32"
                  y="45"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  fill="#334155"
                  fontFamily="Arial, sans-serif"
                >
                  SEASTONE
                </text>
                <text
                  x="32"
                  y="51"
                  textAnchor="middle"
                  fontSize="5.2"
                  fontWeight="700"
                  fill="#ea580c"
                  fontFamily="Arial, sans-serif"
                >
                  PVC PIPES
                </text>
              </svg>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SPLIT BODY: LEFT LOGIN FORM (45%) & RIGHT BRAND WAVE ART (55%)            */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row min-h-[420px]">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT: MINIMAL SLEEK & BALANCED LOGIN FORM                                */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800/90 bg-[#091529] p-6 sm:p-10 lg:w-[45%]">
            {/* Center Profile Avatar Circle in Emerald Green Glow */}
            <div className="mb-6 flex flex-col items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                <User className="h-9 w-9 text-emerald-400" />
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form with Pill Inputs in Dark Navy & Emerald Border */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Input 1: Username Pill */}
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="USERNAME"
                  className="w-full rounded-full border border-slate-700/80 bg-[#0e1d38] py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-slate-400 shadow-inner focus:border-emerald-500 focus:bg-[#0b172e] focus:outline-hidden transition"
                />
              </div>

              {/* Input 2: Password Pill with Eye Toggle */}
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-emerald-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full rounded-full border border-slate-700/80 bg-[#0e1d38] py-3 pl-11 pr-11 text-xs font-semibold text-white placeholder-slate-400 shadow-inner focus:border-emerald-500 focus:bg-[#0b172e] focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-3 text-slate-400 hover:text-emerald-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Solid Emerald Green Button */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-emerald-950/60 transition"
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

              {/* Remember Me Row */}
              <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-slate-400">Authorized Personnel</span>
              </div>
            </form>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT: ELEGANT FLUID WAVE ARTWORK & MAJESTIC WELCOME                      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-12 lg:w-[55%] bg-gradient-to-br from-[#0a172c] via-[#0e2142] to-[#122850]">
            {/* Organic Fluid Wave Artwork SVG in Emerald Green & Warm Amber */}
            <div className="absolute inset-0 pointer-events-none opacity-85">
              <svg
                viewBox="0 0 600 450"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full object-cover"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="waveEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#091529" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="waveAmber" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#059669" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#091529" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,170 C130,70 230,310 370,190 C490,90 540,250 600,210 L600,450 L0,450 Z"
                  fill="url(#waveEmerald)"
                />
                <path
                  d="M0,230 C150,130 270,330 410,230 C510,150 560,300 600,270 L600,450 L0,450 Z"
                  fill="url(#waveAmber)"
                />
              </svg>
            </div>

            {/* Glowing Ambient Aura */}
            <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 my-auto py-8">
              {/* Bold "Welcome." */}
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3 drop-shadow-sm">
                Welcome.
              </h1>

              {/* Subheading in Amber Gold & White */}
              <div className="flex flex-wrap items-baseline gap-1.5 mb-4 text-sm sm:text-base font-bold">
                <span className="text-white">Softifyx POS</span>
                <span className="text-amber-400">• M/S SEASTONE PVC PIPE INDUSTRY</span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-300 max-w-[420px] leading-relaxed">
                Direct single sign-on access to your point of sale terminal, centralized retail ledger, and FBR fiscal certified billing portal.
              </p>
            </div>

            {/* Bottom Footer Note inside Card */}
            <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Secure Multi-Tenant TLS Session</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                FBR Fiscal Certified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
