'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Edit,
  FileText,
  KeyRound,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Terminal,
  User,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { Branch, FbrMode, PosTerminal } from '@/lib/types';

type BranchesTab = 'branches' | 'terminals' | 'licensing';

export function BranchesCountersModal() {
  const {
    branches,
    terminals,
    settings,
    activeUser,
    closeBranchesCountersModal,
    reloadContext,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<BranchesTab>('branches');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Check if current user is Platform Super Admin (strictly Faisal / SUPER_ADMIN)
  const isSuperAdmin = useMemo(() => {
    if (!activeUser) return false;
    return (
      activeUser.role === 'SUPER_ADMIN' ||
      activeUser.username.toLowerCase() === 'faisal'
    );
  }, [activeUser]);

  // Drawer / Form State for Add / Edit Branch & Terminal
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | undefined>(undefined);
  const [editingTerminalId, setEditingTerminalId] = useState<number | undefined>(undefined);
  const [bCode, setBCode] = useState('');
  const [bName, setBName] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [tCode, setTCode] = useState('');
  const [tPrefix, setTPrefix] = useState('');
  const [tPosId, setTPosId] = useState('');
  const [tToken, setTToken] = useState('');
  const [tMode, setTMode] = useState<FbrMode>('MOCK');
  const [saving, setSaving] = useState(false);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDrawer) {
          setShowDrawer(false);
        } else {
          closeBranchesCountersModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeBranchesCountersModal, showDrawer]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Filtered branches by search
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const q = searchQuery.toLowerCase().trim();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.display_name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q)
    );
  }, [branches, searchQuery]);

  // Open Drawer to Add New Branch (Super Admin Only)
  const handleOpenAddBranch = () => {
    if (!isSuperAdmin) {
      showToast('Branch creation is restricted to Super Admin only', 'error');
      return;
    }
    const nextIdx = branches.length + 1;
    const nextLetter = String.fromCharCode(65 + branches.length); // C, D, E...
    setEditingBranchId(undefined);
    setEditingTerminalId(undefined);
    setBCode(`SWT-${nextLetter}`);
    setBName(`Branch ${nextIdx}`);
    setBAddress('');
    setBPhone('');
    setTCode(`TERM-${nextLetter}1`);
    setTPrefix(`SWT-${nextLetter}-POS`);
    setTPosId(`10452${nextIdx}`);
    setTToken(`MOCK-TOKEN-BRANCH-${nextLetter}`);
    setTMode('MOCK');
    setShowDrawer(true);
  };

  // Open Drawer to Edit Existing Branch
  const handleOpenEditBranch = (b: Branch) => {
    const t = terminals.find((term) => term.branch_id === b.id);
    setEditingBranchId(b.id);
    setEditingTerminalId(t?.id);
    setBCode(b.code);
    setBName(b.name);
    setBAddress(b.address);
    setBPhone(b.phone);
    if (t) {
      setTCode(t.terminal_code);
      setTPrefix(t.invoice_prefix);
      setTPosId(t.fbr_pos_id);
      setTToken(t.fbr_token);
      setTMode(t.fbr_mode);
    } else {
      setTCode(`TERM-${b.code}-1`);
      setTPrefix(`${b.code}-POS`);
      setTPosId('104520');
      setTToken('');
      setTMode('MOCK');
    }
    setShowDrawer(true);
  };

  // Save Branch & Terminal
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bCode.trim() || !bName.trim()) {
      showToast('Branch code and name are required', 'error');
      return;
    }

    // Security check: Only Super Admin can create new branches
    if (!editingBranchId && !isSuperAdmin) {
      showToast('Only Platform Super Admin is authorized to create new branches', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        branchId: editingBranchId,
        code: bCode.trim().toUpperCase(),
        name: bName.trim(),
        address: bAddress.trim(),
        phone: bPhone.trim(),
        terminalId: editingTerminalId,
        terminalCode: tCode.trim().toUpperCase() || 'TERM-1',
        invoicePrefix: tPrefix.trim().toUpperCase() || `${bCode.trim().toUpperCase()}-POS`,
        fbrPosId: tPosId.trim() || '104521',
        fbrToken: tToken.trim(),
        fbrMode: tMode,
        requestingRole: activeUser?.role,
        requestingUser: activeUser?.username,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'branch_terminal',
          data: payload,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save branch configuration');
      }

      await reloadContext();
      showToast(
        editingBranchId
          ? `Branch "${payload.name}" updated successfully`
          : `New Branch "${payload.name}" provisioned successfully!`,
        'success'
      );
      setShowDrawer(false);
    } catch (err) {
      console.error(err);
      showToast('Error saving branch and terminal configuration', 'error');
    } finally {
      setSaving(false);
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
                <Store className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                    Branches &amp; POS Counters Management
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Multi-Branch Active
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Multi-Tenant Outlets, POS Terminals, FBR Certified POS IDs &amp; Licensing Control
                </span>
              </div>
            </div>

            {/* Window Controls & Role Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-white truncate max-w-[240px]">
                  {isSuperAdmin ? 'Super Admin Mode' : 'Company Admin Mode'}
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
                onClick={closeBranchesCountersModal}
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
          {/* TOP EXECUTIVE BRANCH KPI CARDS                                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Total Branches */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Operating Outlets
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                {branches.length} Branches
              </div>
              <span className="text-[9.5px] text-slate-500">Active retail locations</span>
            </div>

            {/* POS Terminals */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Active POS Counters
              </span>
              <div className="mt-1 text-lg font-black text-sky-950 tabular-nums">
                {terminals.length} Counters
              </div>
              <span className="text-[9.5px] text-sky-700">Hardware billing points</span>
            </div>

            {/* FBR Tier-1 Status */}
            <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                FBR Fiscal Certification
              </span>
              <div className="mt-1 text-sm font-black text-emerald-950 truncate">
                {terminals[0]?.fbr_pos_id ? `POS-${terminals[0].fbr_pos_id}` : 'FBR Verified'}
              </div>
              <span className="text-[9.5px] text-emerald-700">Certified POS Invoicing</span>
            </div>

            {/* Security Authority */}
            <div className="flex flex-col rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                  Branch Provisioning
                </span>
                <Lock className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="mt-1 text-sm font-black text-amber-950">
                Super Admin Only
              </div>
              <span className="text-[9.5px] text-amber-800">Commercial License Guard</span>
            </div>

            {/* Multi-Tenant Scope */}
            <div className="flex flex-col rounded-xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Active Tenant
                </span>
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="mt-1 text-xs font-black text-teal-950 truncate">
                {settings.business_name || 'Seastone POS'}
              </div>
              <span className="text-[9.5px] text-teal-700">Consolidated System</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB NAVIGATION & ACTION BAR                                               */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'branches'
                    ? 'bg-white text-slate-900 shadow-2xs ring-1 border border-slate-200'
                    : 'hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                <Store className="h-3.5 w-3.5 text-sky-600" />
                <span>Branches &amp; Outlets Directory</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                  {branches.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('terminals')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'terminals'
                    ? 'bg-white text-slate-900 shadow-2xs ring-1 border border-slate-200'
                    : 'hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                <Terminal className="h-3.5 w-3.5 text-indigo-600" />
                <span>POS Counters &amp; FBR Terminals</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] text-indigo-800 tabular-nums font-extrabold">
                  {terminals.length}
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
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Licensing &amp; Security Policy</span>
              </button>
            </div>

            {/* Right Side: Search & Super Admin Provision Button */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search branch name, code..."
                  className="h-8 w-44 sm:w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              {/* + Add New Branch (Super Admin Only vs Locked Badge) */}
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={handleOpenAddBranch}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Branch &amp; Counter</span>
                </button>
              ) : (
                <div
                  title="Branch provisioning is locked to Super Admin only. Contact software owner to add a new licensed branch."
                  className="flex items-center gap-1.5 rounded-xl bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 cursor-not-allowed"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Add Branch: Super Admin Only</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS                                                              */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* ----------------------------------------------------------------------- */}
            {/* TAB 1: BRANCHES DIRECTORY TABLE                                         */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'branches' && (
              <div className="space-y-4">
                {/* Branch Provisioning Security Notice Banner */}
                {!isSuperAdmin && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                    <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Branch Provisioning Restriction:</span> As Company Admin, you can view your branches and update local contact info. Creating or licensing a new branch outlet is strictly reserved for the Platform Super Admin. Please contact your Software Provider to add a new branch.
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                    <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                        <th className="px-3 py-2.5 text-center w-28">Branch Code</th>
                        <th className="px-3 py-2.5 text-center">Outlet Short Name</th>
                        <th className="px-3 py-2.5 text-center">Full Display Title</th>
                        <th className="px-3 py-2.5 text-center">Address &amp; City</th>
                        <th className="px-3 py-2.5 text-center">Phone Contact</th>
                        <th className="px-3 py-2.5 text-center">POS Counter</th>
                        <th className="px-3 py-2.5 text-center">FBR POS ID</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="no-print px-3 py-2.5 text-center w-24">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredBranches.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                            <Store className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                            <p className="text-xs font-bold text-slate-600">No branches match your search</p>
                          </td>
                        </tr>
                      ) : (
                        filteredBranches.map((b, idx) => {
                          const t = terminals.find((term) => term.branch_id === b.id);
                          return (
                            <tr key={b.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                                {b.code}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {b.name}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-800">
                                {b.display_name}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">
                                {b.address || 'Standard Location'}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                                {b.phone || 'N/A'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                                  {t?.terminal_code || 'TERM-1'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 tabular-nums border border-emerald-200">
                                  {t?.fbr_pos_id ? `POS-${t.fbr_pos_id}` : 'Certified'}
                                </span>
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
                                  onClick={() => handleOpenEditBranch(b)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                                >
                                  <Edit className="h-3 w-3 text-sky-600" />
                                  <span>Edit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* TAB 2: POS COUNTERS & FBR TERMINALS                                     */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'terminals' && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                        <th className="px-3 py-2.5 text-center w-32">Terminal Code</th>
                        <th className="px-3 py-2.5 text-center">Assigned Branch Outlet</th>
                        <th className="px-3 py-2.5 text-center">Invoice Prefix</th>
                        <th className="px-3 py-2.5 text-center">Next Invoice #</th>
                        <th className="px-3 py-2.5 text-center">FBR POS ID</th>
                        <th className="px-3 py-2.5 text-center">Fiscal Mode</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {terminals.map((t, idx) => {
                        const b = branches.find((br) => br.id === t.branch_id);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                              {t.terminal_code}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-800">
                              {b?.display_name || `Branch #${t.branch_id}`}
                            </td>
                            <td className="px-3 py-2.5 text-center font-extrabold text-sky-800 tabular-nums">
                              {t.invoice_prefix}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-700 font-semibold">
                              #{t.next_sequence}
                            </td>
                            <td className="px-3 py-2.5 text-center font-black text-emerald-800 tabular-nums">
                              {t.fbr_pos_id || '104521'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                  t.fbr_mode === 'PRODUCTION'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : t.fbr_mode === 'SANDBOX'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {t.fbr_mode}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                                <Check className="h-3 w-3" />
                                <span>Active Counter</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* TAB 3: LICENSING & SECURITY POLICY                                      */}
            {/* ----------------------------------------------------------------------- */}
            {activeTab === 'licensing' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Multi-Branch Provisioning Policy
                      </h3>
                      <p className="text-xs text-slate-500">
                        Commercial software license distribution rules and security enforcement.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Security Enforced</span>
                    </span>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h4 className="font-bold text-slate-900 mb-1">
                        1. Why is Branch Creation Locked to Super Admin?
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        In commercial ERP POS deployments, each retail branch operates with its own hardware counter license and official FBR POS ID. To prevent unauthorized branch replication, only the Platform Super Admin (Software Owner) possesses the cryptographic and administrative credentials to provision new branches.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h4 className="font-bold text-slate-900 mb-1">
                        2. What Can Company Admins Manage?
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        Company Admins have complete control over day-to-day retail operations inside their provisioned branches: managing cashiers and POS users, assigning inventory, setting wholesale &amp; retail prices, viewing tax returns, and conducting day closing audits.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h4 className="font-bold text-slate-900 mb-1">
                        3. How to Request an Additional Branch License?
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        To add a new branch outlet or counter, contact your Softifyx Software Provider. The Super Admin will provision the new branch code, assign the certified FBR POS ID, and activate it instantly across your system.
                      </p>
                    </div>
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
                Authority: {isSuperAdmin ? 'Super Admin (Full Provisioning Access)' : 'Company Admin (Read & Local Edit)'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="tabular-nums">
                {branches.length} Outlets Configured
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Press <kbd className="rounded border bg-white px-1 font-mono text-[10px]">Esc</kbd> to close
              </span>
              <button
                type="button"
                onClick={closeBranchesCountersModal}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRAWER MODAL: ADD / EDIT BRANCH & POS TERMINAL                            */}
      {/* ========================================================================= */}
      {showDrawer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingBranchId ? 'Edit Branch Outlet Configuration' : 'Provision New Branch & POS Counter'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              {/* Branch Outlet Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Outlet Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Branch Code (e.g. SWT-C)
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingBranchId && !isSuperAdmin)}
                      value={bCode}
                      onChange={(e) => setBCode(e.target.value.toUpperCase())}
                      placeholder="SWT-C"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 uppercase focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Outlet Short Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bName}
                      onChange={(e) => setBName(e.target.value)}
                      placeholder="e.g. Saddar"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={bAddress}
                    onChange={(e) => setBAddress(e.target.value)}
                    placeholder="e.g. Main Chakdara Road, Timergara, Lower Dir"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phone / Landline Contact
                  </label>
                  <input
                    type="text"
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    placeholder="e.g. 0945-822140"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 tabular-nums focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* POS Terminal & FBR Licensing Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. POS Terminal &amp; FBR Certified Licensing
                  </h4>
                  {!isSuperAdmin && (
                    <span className="text-[10px] font-bold text-amber-700">
                      Super Admin Managed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Counter Code
                    </label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={tCode}
                      onChange={(e) => setTCode(e.target.value.toUpperCase())}
                      placeholder="TERM-C1"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={tPrefix}
                      onChange={(e) => setTPrefix(e.target.value.toUpperCase())}
                      placeholder="SWT-C-POS"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      FBR POS ID
                    </label>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={tPosId}
                      onChange={(e) => setTPosId(e.target.value)}
                      placeholder="104523"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 tabular-nums focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Fiscal Integration Mode
                    </label>
                    <select
                      disabled={!isSuperAdmin}
                      value={tMode}
                      onChange={(e) => setTMode(e.target.value as FbrMode)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                    >
                      <option value="MOCK">MOCK (Local Sandbox)</option>
                      <option value="SANDBOX">SANDBOX (FBR Staging)</option>
                      <option value="PRODUCTION">PRODUCTION (Live FBR)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    FBR Bearer Authentication Token
                  </label>
                  <input
                    type="password"
                    disabled={!isSuperAdmin}
                    value={tToken}
                    onChange={(e) => setTToken(e.target.value)}
                    placeholder="MOCK-TOKEN-XXXXXX"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : editingBranchId ? 'Save Changes' : 'Provision Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
