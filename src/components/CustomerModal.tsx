'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { Customer } from '@/lib/types';

// Helper to get consistent avatar background color by name
function getAvatarBg(name: string): string {
  const colors = [
    'bg-emerald-600 text-white',
    'bg-sky-600 text-white',
    'bg-indigo-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials (up to 2 letters)
function getInitials(name: string): string {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function CustomerModal() {
  const {
    branches,
    closeCustomerModal,
    setSelectedCustomerId,
    triggerCustomerRefresh,
    isPosModalOpen,
  } = usePosContext();

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Data & loading state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'KHATA' | 'WALKIN'>('ALL');

  // Dedicated Registration / Edit Dialog State
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBranchId, setFormBranchId] = useState<number | null>(null);
  const [formCnic, setFormCnic] = useState('');
  const [formNtn, setFormNtn] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formAccountType, setFormAccountType] = useState<'RETAIL' | 'WHOLESALE' | 'WALKIN'>('RETAIL');
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch customers from API
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = (await res.json()) as { customers: Customer[] };
        setCustomers(data.customers || []);
      }
    } catch {
      setToastMessage({ text: 'Error connecting to database to load customers.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  // Open "New Customer Registration" Dialog
  const handleOpenAddDialog = useCallback(() => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormBranchId(branches[0]?.id ?? null);
    setFormCnic('');
    setFormNtn('');
    setFormCity('Haripur');
    setFormAddress('');
    setFormAccountType('RETAIL');
    setFormError(null);
    setShowFormDialog(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  }, [branches]);

  // Open "Edit Customer Profile" Dialog
  const handleOpenEditDialog = useCallback((c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name || '');
    setFormPhone(c.phone || '');
    setFormBranchId(c.branch_id || null);
    setFormCnic(c.cnic || '');
    setFormNtn(c.ntn || '');
    setFormCity(c.city || '');
    setFormAddress(c.address || '');
    setFormAccountType(c.is_walk_in === 1 ? 'WALKIN' : 'RETAIL');
    setFormError(null);
    setShowFormDialog(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  }, []);

  // Close Registration Dialog
  const handleCloseFormDialog = useCallback(() => {
    setShowFormDialog(false);
    setEditingCustomer(null);
    setFormError(null);
  }, []);

  // Save Customer (Create or Update)
  const handleSaveCustomer = useCallback(
    async (selectInPosAfterSave = false) => {
      if (!formName.trim()) {
        setFormError('Customer / Business Name is required!');
        nameInputRef.current?.focus();
        return;
      }

      setSaving(true);
      setFormError(null);

      try {
        const payload = {
          branch_id: formBranchId,
          name: formName.trim(),
          phone: formPhone.trim(),
          cnic: formCnic.trim(),
          ntn: formNtn.trim(),
          city: formCity.trim(),
          address: formAddress.trim(),
        };

        let targetId: number;

        if (editingCustomer) {
          // PUT update
          const res = await fetch('/api/customers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingCustomer.id, ...payload }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to update customer');
          }
          targetId = editingCustomer.id;
          setToastMessage({
            text: `Customer #${editingCustomer.id} (${formName}) profile successfully updated!`,
            type: 'success',
          });
        } else {
          // POST create
          const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to register customer');
          }
          const created = data.customer as Customer;
          targetId = created.id;
          setToastMessage({
            text: `New customer #${created.id} (${formName}) registered successfully!`,
            type: 'success',
          });
        }

        // Auto sync with POS Sale
        setSelectedCustomerId(targetId);
        triggerCustomerRefresh();
        await loadCustomers();
        setShowFormDialog(false);

        if (selectInPosAfterSave && isPosModalOpen) {
          closeCustomerModal();
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Error saving customer profile.');
      } finally {
        setSaving(false);
      }
    },
    [
      formName,
      formBranchId,
      formPhone,
      formCnic,
      formNtn,
      formCity,
      formAddress,
      editingCustomer,
      loadCustomers,
      triggerCustomerRefresh,
      setSelectedCustomerId,
      isPosModalOpen,
      closeCustomerModal,
    ]
  );

  // Delete Customer
  const handleDeleteCustomer = useCallback(
    async (c: Customer) => {
      if (c.is_walk_in === 1) {
        setToastMessage({ text: 'Default Walk-in cash customer cannot be deleted.', type: 'error' });
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete customer #${c.id} (${c.name})?\nAll profile details will be permanently removed.`
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/customers?id=${c.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete customer');
        }
        setToastMessage({ text: `Customer #${c.id} (${c.name}) deleted.`, type: 'success' });
        await loadCustomers();
        triggerCustomerRefresh();
      } catch (err) {
        setToastMessage({
          text: err instanceof Error ? err.message : 'Error deleting customer.',
          type: 'error',
        });
      }
    },
    [loadCustomers, triggerCustomerRefresh]
  );

  // Select customer directly into active POS Sale
  const handleSelectForPos = useCallback(
    (c: Customer) => {
      setSelectedCustomerId(c.id);
      setToastMessage({ text: `Selected #${c.id} (${c.name}) for active POS Sale bill.`, type: 'success' });
      if (isPosModalOpen) {
        setTimeout(() => closeCustomerModal(), 200);
      }
    },
    [setSelectedCustomerId, isPosModalOpen, closeCustomerModal]
  );

  // Print directory
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Keyboard shortcuts (F2: New, Ctrl+S: Save, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFormDialog) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          void handleSaveCustomer();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseFormDialog();
        }
      } else {
        if (e.key === 'F2') {
          e.preventDefault();
          handleOpenAddDialog();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeCustomerModal();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFormDialog, handleSaveCustomer, handleCloseFormDialog, handleOpenAddDialog, closeCustomerModal]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (branchFilter !== 'ALL') {
        const bId = Number(branchFilter);
        if (c.branch_id !== null && c.branch_id !== bId) return false;
      }
      if (typeFilter === 'WALKIN' && c.is_walk_in !== 1) return false;
      if (typeFilter === 'KHATA' && c.is_walk_in === 1) return false;

      if (!query) return true;
      return (
        String(c.id).includes(query) ||
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.cnic && c.cnic.toLowerCase().includes(query)) ||
        (c.ntn && c.ntn.toLowerCase().includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
      );
    });
  }, [customers, searchQuery, branchFilter, typeFilter]);

  // Summary counts
  const totalCount = customers.length;
  const walkInCount = customers.filter((c) => c.is_walk_in === 1).length;
  const khataCount = totalCount - walkInCount;
  const filerCount = customers.filter((c) => (c.cnic && c.cnic.length > 5) || (c.ntn && c.ntn.length > 3)).length;

  // Minimized dock pill on bottom left
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-xs font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-900 font-extrabold shadow-sm">
            <Users className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Maintain Module</p>
            <p className="text-xs font-bold text-white">Customers Directory ({customers.length} Profiles)</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs font-sans">
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[820px] w-full max-w-[1240px]'
        }`}
      >
        {/* 1. TITLEBAR (Executive Midnight Navy #091529) */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Maintain Module • Customers &amp; Khata Profiles Directory
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-normal">
                (FBR Compliant Customer Directory)
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live DB Synced
            </span>
          </div>

          {/* Window action controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize to Dock"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={closeCustomerModal}
              title="Close (Esc)"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. EXECUTIVE METRIC SUMMARY CARDS BAR */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-100/90 p-2.5 border-b border-slate-200">
          {/* Metric 1 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Customers</p>
              <p className="text-sm font-extrabold text-slate-900">{totalCount} Profiles</p>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Khata / Credit Dealers</p>
              <p className="text-sm font-extrabold text-slate-900">{khataCount} Accounts</p>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Walk-in Counter</p>
              <p className="text-sm font-extrabold text-slate-900">{walkInCount} Cash Profiles</p>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FBR Compliant / NTN</p>
              <p className="text-sm font-extrabold text-slate-900">{filerCount} Registered</p>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTION & SEARCH CONTROL BAR */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {/* Left: Primary Register Customer Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddDialog}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Register New Customer (F2)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Directory</span>
            </button>

            <button
              type="button"
              onClick={loadCustomers}
              title="Refresh Customers List"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: Filters & Omni-Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
            {/* Category Filter Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('KHATA')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  typeFilter === 'KHATA'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khata ({khataCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('WALKIN')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  typeFilter === 'WALKIN'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Walk-in ({walkInCount})
              </button>
            </div>

            {/* Branch Dropdown */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-[#f8fafc] px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>

            {/* Omni Search Box */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, CNIC, city..."
                className="h-8 w-full rounded-lg border border-slate-300 bg-[#f8fafc] pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. TOAST NOTIFICATION BANNER IF ACTIVE */}
        {toastMessage && (
          <div
            className={`flex shrink-0 items-center justify-between px-4 py-1.5 text-xs font-semibold transition ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 5. CUSTOMER DIRECTORY DATA TABLE */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-[#091529] text-[11px] font-bold uppercase tracking-wider text-white select-none">
              <tr className="h-8 border-b border-slate-700">
                <th className="w-10 border-r border-slate-700/60 text-center font-bold">#</th>
                <th className="w-24 border-r border-slate-700/60 px-3 text-center font-bold">Client ID</th>
                <th className="border-r border-slate-700/60 px-3 font-bold">Customer / Business Name</th>
                <th className="w-32 border-r border-slate-700/60 px-3 font-bold">Contact Phone</th>
                <th className="w-32 border-r border-slate-700/60 px-3 font-bold">Branch</th>
                <th className="w-36 border-r border-slate-700/60 px-3 font-bold">CNIC / NTN</th>
                <th className="border-r border-slate-700/60 px-3 font-bold">City &amp; Location</th>
                <th className="w-28 border-r border-slate-700/60 px-3 text-center font-bold">Account Type</th>
                <th className="w-40 px-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    {loading ? (
                      <p>Loading customers from ERP database...</p>
                    ) : (
                      <p>No customers found matching &quot;{searchQuery}&quot;.</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const branchObj = branches.find((b) => b.id === c.branch_id);
                  const isWalkIn = c.is_walk_in === 1;

                  return (
                    <tr
                      key={c.id}
                      onDoubleClick={() => handleOpenEditDialog(c)}
                      className={`h-8 border-b border-slate-200 transition-colors ${
                        idx % 2 === 0 ? 'bg-white hover:bg-sky-50/60' : 'bg-slate-50/50 hover:bg-sky-50/60'
                      }`}
                    >
                      {/* Row number */}
                      <td className="border-r border-slate-200 text-center text-[11px] font-semibold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* ID Badge */}
                      <td className="border-r border-slate-200 px-2 text-center">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
                          #{c.id}
                        </span>
                      </td>

                      {/* Customer Avatar & Name */}
                      <td className="border-r border-slate-200 px-3 py-1">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold shadow-2xs ${getAvatarBg(
                              c.name
                            )}`}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                            {c.phone && (
                              <p className="text-[10px] text-slate-500 sm:hidden">{c.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Phone */}
                      <td className="border-r border-slate-200 px-3">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700">
                            <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="border-r border-slate-200 px-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Store className="h-3 w-3 text-slate-400" />
                          <span>{branchObj ? `${branchObj.code}` : 'All Branches'}</span>
                        </span>
                      </td>

                      {/* CNIC / NTN */}
                      <td className="border-r border-slate-200 px-3">
                        {c.cnic || c.ntn ? (
                          <div className="text-[11px] font-mono text-slate-700">
                            {c.cnic && <p className="leading-tight">{c.cnic}</p>}
                            {c.ntn && (
                              <p className="text-[10px] text-indigo-700 font-semibold leading-tight">
                                NTN: {c.ntn}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* City & Address */}
                      <td className="border-r border-slate-200 px-3">
                        <div className="max-w-[220px] truncate text-[11px]">
                          {c.city && <span className="font-bold text-slate-800">{c.city}</span>}
                          {c.address && (
                            <span className="text-slate-500">
                              {c.city ? ` — ${c.address}` : c.address}
                            </span>
                          )}
                          {!c.city && !c.address && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="border-r border-slate-200 px-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isWalkIn
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isWalkIn ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          />
                          {isWalkIn ? 'Walk-in Cash' : 'Khata Profile'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Select for POS button */}
                          <button
                            type="button"
                            onClick={() => handleSelectForPos(c)}
                            title="Select this customer for active POS bill"
                            className="flex h-6 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 text-[10.5px] font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Select</span>
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditDialog(c)}
                            title="Edit customer details"
                            className="flex h-6 w-6 items-center justify-center rounded border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>

                          {/* Delete button (disabled for walk-in) */}
                          <button
                            type="button"
                            disabled={isWalkIn}
                            onClick={() => handleDeleteCustomer(c)}
                            title={isWalkIn ? 'Walk-in cash profile cannot be deleted' : 'Delete customer'}
                            className="flex h-6 w-6 items-center justify-center rounded border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 cursor-pointer shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. BOTTOM STATUS BAR */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Showing <strong className="text-slate-900">{filteredCustomers.length}</strong> of{' '}
              {totalCount} customers
            </span>
            <span className="text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600">
              Double-click any customer row to edit profile
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              F2: New Customer
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Ctrl+F: Search
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Esc: Close
            </span>
          </div>
        </div>

        {/* 7. DEDICATED "NEW CUSTOMER REGISTRATION / EDIT" DIALOG MODAL */}
        {showFormDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-xs font-sans animate-fade-in">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-white shadow-2xl overflow-hidden flex flex-col">
              {/* Form Titlebar */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">
                      {editingCustomer
                        ? `Edit Customer Profile #${editingCustomer.id}`
                        : 'New Customer Profile Registration'}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Enterprise Khata &amp; FBR Compliant Registration
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFormDialog}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body with Clear Sections */}
              <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/40">
                {/* Form Error Banner */}
                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: Business Identity & Contact */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Building2 className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      1. Business &amp; Contact Details
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-800">
                      Customer / Business Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Haji Usman Hardware Store / Faisal Khan"
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Phone / WhatsApp No.
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Assigned Branch
                      </label>
                      <select
                        value={formBranchId ?? ''}
                        onChange={(e) => setFormBranchId(e.target.value ? Number(e.target.value) : null)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      >
                        <option value="">All Branches (Shared Khata)</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} - {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: FBR Compliance & Tax Information */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      2. FBR Compliance &amp; Tax Information
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        CNIC Number (Identity)
                      </label>
                      <input
                        type="text"
                        value={formCnic}
                        onChange={(e) => setFormCnic(e.target.value)}
                        placeholder="13302-XXXXXXX-X"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        NTN / STRN Number
                      </label>
                      <input
                        type="text"
                        value={formNtn}
                        onChange={(e) => setFormNtn(e.target.value)}
                        placeholder="e.g. 2891042-3"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Location & Delivery Address */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      3. City &amp; Delivery Address
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        City / Region
                      </label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="Haripur / Timergara / Swat"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Account Category
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormAccountType('RETAIL')}
                          className={`rounded-lg py-1.5 text-xs font-bold border transition ${
                            formAccountType === 'RETAIL'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          Khata Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormAccountType('WALKIN')}
                          className={`rounded-lg py-1.5 text-xs font-bold border transition ${
                            formAccountType === 'WALKIN'
                              ? 'border-amber-500 bg-amber-50 text-amber-800'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          Walk-in Cash
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Complete Shop / Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. Shop #14, Main Circular Road, Near Standard Chartered Bank, Haripur"
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Footer Action Buttons */}
              <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={handleCloseFormDialog}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel (Esc)
                </button>

                <div className="flex items-center gap-2">
                  {/* Save & Select in POS Sale Button */}
                  {isPosModalOpen && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveCustomer(true)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 active:scale-95 disabled:opacity-50"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Save &amp; Bill in POS</span>
                    </button>
                  )}

                  {/* Primary Save Button */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveCustomer(false)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Profile (Ctrl+S)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
