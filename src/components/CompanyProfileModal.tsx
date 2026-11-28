'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Phone,
  Plus,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  Store,
  User,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { CompanyTenant } from '@/lib/types';

type CompanyTab = 'profile' | 'companies';

export function CompanyProfileModal() {
  const {
    settings,
    branches,
    companies,
    activeUser,
    closeCompanyModal,
    reloadContext,
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

  // Check if current user is Platform Super Admin (strictly Faisal or SUPER_ADMIN)
  const isSuperAdmin = useMemo(() => {
    if (!activeUser) return false;
    return (
      activeUser.role === 'SUPER_ADMIN' ||
      activeUser.username.toLowerCase() === 'faisal'
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
        if (showAddCompanyModal) {
          setShowAddCompanyModal(false);
        } else {
          closeCompanyModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCompanyModal, showAddCompanyModal]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Save Active Company Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      showToast('Business / Company name is required', 'error');
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
      showToast('Company profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error saving company profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Register New Company (Super Admin Only)
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
      showToast(`Company "${payload.business_name}" added successfully!`, 'success');
      setShowAddCompanyModal(false);
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
      showToast('Error registering new company', 'error');
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
              : 'w-full max-w-[1100px] h-[88vh]'
          }`}
        >
          {/* ========================================================================= */}
          {/* EXECUTIVE MIDNIGHT NAVY HEADER (STYLE 2)                                  */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                <Building2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                    Company Profile Settings
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Profile
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Business Name, FBR Tax Registration, Contact &amp; Receipt Details
                </span>
              </div>
            </div>

            {/* Window Controls & User Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-white truncate max-w-[200px]">
                  {isSuperAdmin ? 'Super Admin' : 'Company Admin'}
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
          {/* CLEAN & SIMPLE SUMMARY RIBBON (3 PRACTICAL CARDS)                         */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-200 bg-white p-3">
            {/* 1. Active Company */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Active Business
                </span>
                <div className="text-xs font-black text-slate-900 truncate" title={businessName}>
                  {businessName || 'M/S SEASTONE PVC PIPE INDUSTRY'}
                </div>
                <span className="text-[10px] text-slate-500 truncate block">
                  Owner: {ownerName || 'Faisal'}
                </span>
              </div>
            </div>

            {/* 2. Tax Registration */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  FBR Tax Status
                </span>
                <div className="text-xs font-black text-emerald-950 tabular-nums">
                  NTN: {ntn || '4125890-7'}
                </div>
                <span className="text-[10px] text-emerald-700 tabular-nums truncate block">
                  STRN: {strn || '3277876124891'}
                </span>
              </div>
            </div>

            {/* 3. Contact & Location */}
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  Contact &amp; Location
                </span>
                <div className="text-xs font-bold text-indigo-950 tabular-nums truncate">
                  Phone: {phone || '0945-822140'}
                </div>
                <span className="text-[10px] text-indigo-700 truncate block" title={address}>
                  {address || 'Timergara, Lower Dir'}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB STRIP: 2 CRYSTAL CLEAR TABS                                          */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Company Profile Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('companies')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'companies'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                <Users className="h-4 w-4 text-sky-600" />
                <span>All Companies List</span>
                <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] text-sky-800 font-extrabold tabular-nums">
                  {companies.length || 1}
                </span>
              </button>
            </div>

            {/* Quick Save button in tab bar for fast accessibility */}
            {activeTab === 'profile' && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="hidden sm:inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS                                                              */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-auto bg-slate-50/60 p-4">
            {/* ----------------------------------------------------------------------- */}
            {/* TAB 1: SIMPLE & PROFESSIONAL COMPANY PROFILE FORM                       */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-4xl mx-auto">
                {/* CARD 1: BUSINESS & CONTACT INFORMATION */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        1. Business &amp; Contact Information
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Official business name and contact information displayed on bill headers and reports
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Legal Company Name */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Company / Business Name (Prints on Invoices &amp; Bills)
                      </label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. M/S SEASTONE PVC PIPE INDUSTRY"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Owner Name */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Owner / Director Name
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Faisal (Owner)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Software Title */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Software Title (Top Header)
                      </label>
                      <input
                        type="text"
                        value={softwareBrand}
                        onChange={(e) => setSoftwareBrand(e.target.value)}
                        placeholder="e.g. Softifyx"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Phone / WhatsApp Contact
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0945-822140"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. info@seastone.pk"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Business Address */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Business / Factory Address
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

                {/* CARD 2: FBR TAX REGISTRATION & DEFAULTS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        2. FBR Tax Numbers &amp; Currency
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Tax registration numbers required for FBR POS invoices and official receipts
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    {/* NTN Number */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        FBR NTN Number (National Tax Number)
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
                    <div className="sm:col-span-2">
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

                    {/* Default Tax Rate */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Standard Sales Tax / GST Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(e.target.value)}
                        placeholder="18"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs tabular-nums focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Currency Symbol */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="Rs."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Default Opening Cash */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Default Float Cash (Rs.)
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
                </div>

                {/* CARD 3: THERMAL RECEIPT FOOTER & LIVE PREVIEW */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        3. Thermal Receipt Note &amp; Footer Message
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Custom thank you note and tax verification text printed at the bottom of 80mm cash slips
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Receipt Bottom Note Text
                      </label>
                      <textarea
                        rows={2}
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        placeholder="e.g. Thank you for shopping with M/S Seastone PVC Pipe Industry! Verify FBR invoice via Tax Asaan App or SMS to 9966."
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-hidden leading-relaxed"
                      />
                    </div>

                    {/* Live Preview Box */}
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Live Preview on 80mm Receipt Bottom
                      </span>
                      <div className="mx-auto max-w-sm rounded border border-slate-200 bg-white p-3 shadow-2xs text-[11px] text-slate-700 leading-relaxed">
                        <div className="border-t border-dashed border-slate-300 pt-2 mb-2 text-slate-400 text-[10px]">
                          ------------------------------------------------
                        </div>
                        <p className="font-semibold text-slate-800">
                          {receiptFooter || 'Thank you for shopping with us! Please visit again.'}
                        </p>
                        <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                          FBR Tier-1 Verified POS Invoicing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM SUBMISSION BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCompanyModal}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving Changes...' : 'Save Company Profile'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* TAB 2: REGISTERED COMPANIES DIRECTORY                                   */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'companies' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Header Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Registered Companies Directory
                    </h3>
                    <p className="text-xs text-slate-500">
                      Overview of business entities configured in your system
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
                      <span>Register New Company</span>
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
                        <th className="px-3 py-2.5 text-center w-28">Company Code</th>
                        <th className="px-3 py-2.5 text-center">Business / Legal Name</th>
                        <th className="px-3 py-2.5 text-center">Owner &amp; Phone</th>
                        <th className="px-3 py-2.5 text-center">NTN / STRN</th>
                        <th className="px-3 py-2.5 text-center">Currency</th>
                        <th className="px-3 py-2.5 text-center">Branches</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="no-print px-3 py-2.5 text-center w-24">Actions</th>
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
                            {branches.length} Outlets
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
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
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
                              {c.branch_count || branches.length} Outlets
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
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
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
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* WINDOW FOOTER WITH STATUS & SHORTCUTS                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">
                Operating Role: {isSuperAdmin ? 'Super Admin (Owner)' : 'Company Admin'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="tabular-nums font-medium text-slate-700">
                Company: {businessName || 'M/S SEASTONE PVC PIPE INDUSTRY'}
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
      {/* SUPER ADMIN: REGISTER NEW COMPANY DRAWER MODAL                            */}
      {/* ========================================================================= */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Register New Business Entity
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
                    Company Code (e.g. HARDWARE)
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
