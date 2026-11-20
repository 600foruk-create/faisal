'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  Check,
  CheckCircle2,
  DollarSign,
  FileText,
  Globe,
  Info,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Percent,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency } from '@/lib/format';
import type { CompanyTenant } from '@/lib/types';

type CompanyTab = 'profile' | 'tenants' | 'licensing';

export function CompanyProfileModal() {
  const {
    settings,
    branches,
    users,
    companies,
    activeUser,
    closeCompanyModal,
    reloadContext,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<CompanyTab>('profile');

  // Form State for Active Company Profile
  const [businessName, setBusinessName] = useState(settings.business_name || '');
  const [softwareBrand, setSoftwareBrand] = useState(settings.software_brand || '');
  const [ownerName, setOwnerName] = useState(settings.owner_name || 'Faisal (Owner)');
  const [ntn, setNtn] = useState(settings.ntn || '');
  const [strn, setStrn] = useState(settings.strn || '');
  const [phone, setPhone] = useState(settings.phone || '0945-822140');
  const [email, setEmail] = useState(settings.email || 'info@seastone.pk');
  const [address, setAddress] = useState(
    settings.address || 'Industrial Estate, Timergara, Lower Dir, KP'
  );
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || 'Rs.');
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    settings.default_tax_rate !== undefined ? String(settings.default_tax_rate) : '18'
  );
  const [defaultOpeningCash, setDefaultOpeningCash] = useState(
    settings.default_opening_cash !== undefined ? String(settings.default_opening_cash) : '5000'
  );
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer || '');

  // Loading & Saving States
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // New Company Registration Drawer / Form (For Super Admin)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyOwner, setNewCompanyOwner] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyNtn, setNewCompanyNtn] = useState('');
  const [newCompanyStrn, setNewCompanyStrn] = useState('');
  const [newCompanyAddress, setNewCompanyAddress] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);

  // Check if current user is Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!activeUser) return true; // Default admin
    return (
      activeUser.role === 'SUPER_ADMIN' ||
      activeUser.username.toLowerCase() === 'admin'
    );
  }, [activeUser]);

  // Sync state if settings update
  useEffect(() => {
    setBusinessName(settings.business_name || '');
    setSoftwareBrand(settings.software_brand || '');
    setOwnerName(settings.owner_name || 'Faisal (Owner)');
    setNtn(settings.ntn || '');
    setStrn(settings.strn || '');
    setPhone(settings.phone || '0945-822140');
    setEmail(settings.email || 'info@seastone.pk');
    setAddress(settings.address || 'Industrial Estate, Timergara, Lower Dir, KP');
    setCurrencySymbol(settings.currency_symbol || 'Rs.');
    setDefaultTaxRate(
      settings.default_tax_rate !== undefined ? String(settings.default_tax_rate) : '18'
    );
    setDefaultOpeningCash(
      settings.default_opening_cash !== undefined ? String(settings.default_opening_cash) : '5000'
    );
    setReceiptFooter(settings.receipt_footer || '');
  }, [settings]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCompanyModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCompanyModal]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Save Active Company Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      showToast('Legal company name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        software_brand: softwareBrand.trim(),
        owner_name: ownerName.trim(),
        ntn: ntn.trim(),
        strn: strn.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        currency_symbol: currencySymbol.trim(),
        default_tax_rate: Number(defaultTaxRate) || 18,
        default_opening_cash: Number(defaultOpeningCash) || 0,
        receipt_footer: receiptFooter.trim(),
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'business',
          data: payload,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save company profile');
      }

      await reloadContext();
      showToast('Company profile & defaults updated successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error saving company profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Register New Tenant / Company (Super Admin Only)
  const handleRegisterNewCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyCode.trim() || !newCompanyName.trim()) {
      showToast('Company code and business name are required', 'error');
      return;
    }

    setAddingCompany(true);
    try {
      const payload = {
        company_code: newCompanyCode.trim().toUpperCase(),
        business_name: newCompanyName.trim(),
        owner_name: newCompanyOwner.trim(),
        phone: newCompanyPhone.trim(),
        email: newCompanyEmail.trim(),
        ntn: newCompanyNtn.trim(),
        strn: newCompanyStrn.trim(),
        address: newCompanyAddress.trim(),
        currency_symbol: 'Rs.',
        default_tax_rate: 18,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'company',
          data: payload,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to register new company');
      }

      await reloadContext();
      showToast(`Company "${payload.business_name}" registered successfully!`, 'success');
      setShowAddCompanyModal(false);
      // Reset form
      setNewCompanyCode('');
      setNewCompanyName('');
      setNewCompanyOwner('');
      setNewCompanyPhone('');
      setNewCompanyEmail('');
      setNewCompanyNtn('');
      setNewCompanyStrn('');
      setNewCompanyAddress('');
    } catch (err) {
      console.error(err);
      showToast('Error registering new company tenant', 'error');
    } finally {
      setAddingCompany(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-2 sm:p-4">
        {/* Floating Modal Window */}
        <div
          className={`flex flex-col rounded-2xl bg-white shadow-2xl transition-all duration-200 border border-slate-300 overflow-hidden ${
            isMaximized
              ? 'fixed inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] max-w-none'
              : 'w-full max-w-[1240px] h-[88vh]'
          }`}
        >
          {/* ========================================================================= */}
          {/* EXECUTIVE MIDNIGHT NAVY HEADER                                            */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                <Building2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                    My Company &amp; Multi-Tenant Organization Manager
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Multi-Tenant Active
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Legal Business Identity, Tax Registration, Multi-Company Management &amp; Defaults
                </span>
              </div>
            </div>

            {/* Window Controls & Active Tenant Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-white truncate max-w-[240px]">
                  {isSuperAdmin ? 'Platform Super Admin' : 'Company Admin'}
                </span>
              </div>

              {/* Window Buttons */}
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Collapse view'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore Window' : 'Maximize Window'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={closeCompanyModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOAST NOTIFICATION                                                        */}
          {/* ========================================================================= */}
          {toastMessage && (
            <div
              className={`flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-white hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TOP EXECUTIVE TENANT KPI CARDS                                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Active Company Name */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Active Tenant / Company
              </span>
              <div className="mt-1 text-sm font-black text-slate-900 truncate">
                {businessName || 'Seastone POS'}
              </div>
              <span className="text-[9.5px] text-slate-500">SEASTONE PVC PIPE</span>
            </div>

            {/* Tax IDs */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                NTN / STRN Tax Reg
              </span>
              <div className="mt-1 text-xs font-black text-sky-950 tabular-nums">
                NTN: {ntn || 'Not Set'}
              </div>
              <span className="text-[9.5px] text-sky-700 tabular-nums">
                STRN: {strn || 'Not Set'}
              </span>
            </div>

            {/* Currency & Tax Rate */}
            <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Operating Currency &amp; GST
              </span>
              <div className="mt-1 text-sm font-black text-emerald-950 tabular-nums">
                {currencySymbol} | {defaultTaxRate}% Standard
              </div>
              <span className="text-[9.5px] text-emerald-700">FBR Fiscal Rate</span>
            </div>

            {/* Operating Branches */}
            <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Authorized Outlets
              </span>
              <div className="mt-1 text-sm font-black text-indigo-950 tabular-nums">
                {branches.length} Branches Active
              </div>
              <span className="text-[9.5px] text-indigo-700">Super Admin Provisioned</span>
            </div>

            {/* Multi-Tenant Scope */}
            <div className="flex flex-col rounded-xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Tenant Scope
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="mt-1 text-sm font-black text-teal-950">
                {companies.length || 1} Companies Registered
              </div>
              <span className="text-[9.5px] text-teal-700">SaaS Multi-Tenant</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB NAVIGATION STRIP                                                      */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 border border-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-sky-600" />
              <span>Company Profile &amp; Tax Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tenants')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'tenants'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 border border-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              <span>Multi-Tenant Companies Directory</span>
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] text-indigo-800 tabular-nums font-extrabold">
                {companies.length || 1}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('licensing')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'licensing'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 border border-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Award className="h-3.5 w-3.5 text-emerald-600" />
              <span>Enterprise Licensing &amp; Quota</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS                                                              */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* ----------------------------------------------------------------------- */}
            {/* TAB 1: COMPANY PROFILE FORM                                             */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-4xl mx-auto">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Primary Business Identity &amp; FBR Tax Details
                      </h2>
                      <p className="text-xs text-slate-500">
                        These legal details appear on all invoices, fiscal receipts, and official tax filings.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{saving ? 'Saving Changes...' : 'Save Company Profile'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Legal Company Name */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Legal Business Name (Invoice Header)
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. M/S SEASTONE PVC PIPE INDUSTRY"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Software Brand Title */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Software Brand Title (Top Bar)
                      </label>
                      <input
                        type="text"
                        value={softwareBrand}
                        onChange={(e) => setSoftwareBrand(e.target.value)}
                        placeholder="e.g. Softifyx"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Owner / Managing Director */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Owner / Managing Director Name
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Faisal (Owner)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* NTN Number */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        FBR National Tax Number (NTN)
                      </label>
                      <input
                        type="text"
                        value={ntn}
                        onChange={(e) => setNtn(e.target.value)}
                        placeholder="e.g. 4125890-7"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* STRN Number */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Sales Tax Registration Number (STRN)
                      </label>
                      <input
                        type="text"
                        value={strn}
                        onChange={(e) => setStrn(e.target.value)}
                        placeholder="e.g. 3277876124891"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Official Phone / WhatsApp Contact
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0945-822140"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Official Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. info@seastone.pk"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Head Office Address */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Head Office / Factory Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Industrial Estate, Timergara, Lower Dir, KP"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Defaults & Receipt Note */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                    Financial Defaults &amp; Thermal Receipt Policy
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                    {/* Currency Symbol */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Default Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="Rs."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Default Tax Rate */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Standard GST Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(e.target.value)}
                        placeholder="18"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Opening Cash Default */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Default Opening Cash (Rs.)
                      </label>
                      <input
                        type="number"
                        value={defaultOpeningCash}
                        onChange={(e) => setDefaultOpeningCash(e.target.value)}
                        placeholder="5000"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Receipt Footer Message */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Thermal Receipt Bottom Note &amp; FBR Verification Notice
                    </label>
                    <textarea
                      rows={2}
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      placeholder="e.g. Thank you for shopping with M/S Seastone PVC Pipe Industry! Verify FBR invoice via Tax Asaan App or SMS to 9966."
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* TAB 2: MULTI-TENANT COMPANIES DIRECTORY                                 */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'tenants' && (
              <div className="space-y-4">
                {/* Top Action Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Multi-Tenant Organization Accounts
                    </h3>
                    <p className="text-xs text-slate-500">
                      Each company operates with its own independent catalog, branches, users, and tax returns.
                    </p>
                  </div>

                  {/* Super Admin Add Company Button */}
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCompanyModal(true)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Register New Company / Tenant</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Company Provisioning: Super Admin Only</span>
                    </div>
                  )}
                </div>

                {/* Companies Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                    <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                        <th className="px-3 py-2.5 text-center w-28">Tenant Code</th>
                        <th className="px-3 py-2.5 text-center">Business / Legal Name</th>
                        <th className="px-3 py-2.5 text-center">Owner / Contact</th>
                        <th className="px-3 py-2.5 text-center">NTN / STRN</th>
                        <th className="px-3 py-2.5 text-center">Operating Currency</th>
                        <th className="px-3 py-2.5 text-center">Branches</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="no-print px-3 py-2.5 text-center w-28">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {companies.length === 0 ? (
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">1</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">SEASTONE</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                            {businessName || 'M/S SEASTONE PVC PIPE INDUSTRY'}
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-700">
                            {ownerName || 'Faisal'} ({phone})
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                            {ntn || '4125890-7'} / {strn || '3277876124891'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-800 tabular-nums">
                            {currencySymbol} ({defaultTaxRate}% GST)
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                            {branches.length} Branches
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                              <Check className="h-3 w-3" />
                              <span>Active Primary</span>
                            </span>
                          </td>
                          <td className="no-print px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveTab('profile')}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      ) : (
                        companies.map((c, idx) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                              {c.company_code}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                              {c.business_name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-700">
                              {c.owner_name || 'Owner'} {c.phone ? `(${c.phone})` : ''}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                              {c.ntn || 'N/A'} {c.strn ? `/ ${c.strn}` : ''}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-emerald-800 tabular-nums">
                              {c.currency_symbol || 'Rs.'} ({c.default_tax_rate || 18}%)
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                              {c.branch_count || branches.length} Branches
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                                <Check className="h-3 w-3" />
                                <span>Active</span>
                              </span>
                            </td>
                            <td className="no-print px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setActiveTab('profile')}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                              >
                                Edit Profile
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Super Admin Notice */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Multi-Tenant Licensing Rule:</span> New branches inside any company can only be created by the Super Admin. Company Admins manage their inventory, pricing, users, and day closing within their assigned organization.
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* TAB 3: ENTERPRISE LICENSING & QUOTA                                     */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'licensing' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Software License &amp; Deployment Scope
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official software certification and commercial tenant quotas.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Certified Enterprise Edition</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-600 block">Product Edition</span>
                      <span className="text-sm font-black text-slate-900">Softifyx Multi-Tenant ERP POS</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Version 2.4.0 (2026 Release)</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-600 block">Licensed Tenant</span>
                      <span className="text-sm font-black text-slate-900">{businessName}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">NTN: {ntn || '4125890-7'}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-600 block">Branch Provisioning Right</span>
                      <span className="text-sm font-black text-amber-700">Super Admin Exclusive</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Company admins cannot add branches</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-bold text-slate-600 block">FBR POS Integration</span>
                      <span className="text-sm font-black text-emerald-800">Certified Tier-1 Integration</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Online Real-time &amp; Offline Queue</span>
                    </div>
                  </div>

                  {/* Software Provider Credit Block */}
                  <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-400 text-sm block">Softifyx Technologies</span>
                      <span className="text-slate-300">Official Software Provider &amp; System Architect</span>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">Support: 0300-XXXXXXX</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* WINDOW FOOTER WITH STATUS & SHORTCUTS                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">
                Operating Role: {isSuperAdmin ? 'Super Admin (Software Owner)' : 'Company Admin'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="tabular-nums">
                Tenant: {businessName || 'Seastone POS'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Press <kbd className="rounded border bg-white px-1 font-mono text-[10px]">Esc</kbd> to close
              </span>
              <button
                type="button"
                onClick={closeCompanyModal}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUPER ADMIN: REGISTER NEW TENANT DRAWER MODAL                             */}
      {/* ========================================================================= */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Register New Organization Tenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterNewCompany} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tenant Code (e.g. HARDWARE)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompanyCode}
                    onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                    placeholder="HARDWARE"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 uppercase focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={newCompanyOwner}
                    onChange={(e) => setNewCompanyOwner(e.target.value)}
                    placeholder="Owner Full Name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Legal Company / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Al-Madina Hardware & Sanitary Store"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={newCompanyPhone}
                    onChange={(e) => setNewCompanyPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newCompanyEmail}
                    onChange={(e) => setNewCompanyEmail(e.target.value)}
                    placeholder="store@domain.pk"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    FBR NTN Number
                  </label>
                  <input
                    type="text"
                    value={newCompanyNtn}
                    onChange={(e) => setNewCompanyNtn(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Sales Tax STRN
                  </label>
                  <input
                    type="text"
                    value={newCompanyStrn}
                    onChange={(e) => setNewCompanyStrn(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Business Address / City
                </label>
                <input
                  type="text"
                  value={newCompanyAddress}
                  onChange={(e) => setNewCompanyAddress(e.target.value)}
                  placeholder="e.g. Main Bazar, Swat"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCompany}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {addingCompany ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
