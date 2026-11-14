'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FolderOpen,
  Maximize2,
  Minimize2,
  Minus,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { Customer } from '@/lib/types';

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
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [ntn, setNtn] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(0);

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
      setMessage({ text: 'Error connecting to database to load customers.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  // Clear form
  const handleClear = useCallback(() => {
    setEditingId(null);
    setName('');
    setPhone('');
    setCnic('');
    setNtn('');
    setBranchId(null);
    setCity('');
    setAddress('');
    setIsWalkIn(0);
    setMessage(null);
  }, []);

  // Set form to Add New
  const handleAddNew = useCallback(() => {
    handleClear();
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [handleClear]);

  // Load customer into form for edit
  const handleEdit = useCallback((c: Customer) => {
    setEditingId(c.id);
    setName(c.name || '');
    setPhone(c.phone || '');
    setCnic(c.cnic || '');
    setNtn(c.ntn || '');
    setBranchId(c.branch_id || null);
    setCity(c.city || '');
    setAddress(c.address || '');
    setIsWalkIn(c.is_walk_in || 0);
    setMessage({ text: `Editing customer #${c.id} - ${c.name}`, type: 'success' });
    nameInputRef.current?.focus();
  }, []);

  // Save (Create or Update)
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setMessage({ text: 'Customer name is required!', type: 'error' });
      nameInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        branch_id: branchId,
        name: name.trim(),
        phone: phone.trim(),
        cnic: cnic.trim(),
        ntn: ntn.trim(),
        city: city.trim(),
        address: address.trim(),
      };

      if (editingId) {
        // PUT update
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update customer');
        }
        setMessage({ text: `Customer #${editingId} successfully updated!`, type: 'success' });
        setSelectedCustomerId(editingId);
      } else {
        // POST create
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create customer');
        }
        const newCust = data.customer as Customer;
        setMessage({ text: `Customer #${newCust.id} created successfully!`, type: 'success' });
        setSelectedCustomerId(newCust.id);
        handleClear();
      }

      await loadCustomers();
      triggerCustomerRefresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error saving customer.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [
    name,
    branchId,
    phone,
    cnic,
    ntn,
    city,
    address,
    editingId,
    loadCustomers,
    triggerCustomerRefresh,
    setSelectedCustomerId,
    handleClear,
  ]);

  // Delete customer
  const handleDelete = useCallback(
    async (idToDelete?: number) => {
      const targetId = idToDelete ?? editingId;
      if (!targetId) {
        setMessage({ text: 'Select a customer to delete.', type: 'error' });
        return;
      }
      const target = customers.find((c) => c.id === targetId);
      if (target?.is_walk_in === 1) {
        setMessage({ text: 'Walk-in cash customer cannot be deleted.', type: 'error' });
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete customer #${targetId} (${target?.name || ''})? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/customers?id=${targetId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete customer');
        }
        setMessage({ text: `Customer #${targetId} deleted successfully.`, type: 'success' });
        if (editingId === targetId) {
          handleClear();
        }
        await loadCustomers();
        triggerCustomerRefresh();
      } catch (err) {
        setMessage({
          text: err instanceof Error ? err.message : 'Error deleting customer.',
          type: 'error',
        });
      }
    },
    [editingId, customers, loadCustomers, triggerCustomerRefresh, handleClear]
  );

  // Select customer directly into POS sale
  const handleSelectForPos = useCallback(
    (c: Customer) => {
      setSelectedCustomerId(c.id);
      setMessage({ text: `Selected #${c.id} (${c.name}) for POS Sale bill.`, type: 'success' });
      // If POS sale is open, close customer modal to return focus to POS sale
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

  // Keyboard shortcuts (F2: new, Ctrl+S: save, Esc: clear/close, Del: delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleAddNew();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (editingId || name || phone) {
          handleClear();
        } else {
          closeCustomerModal();
        }
      } else if (e.key === 'Delete' && editingId && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleDelete(editingId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAddNew, handleClear, closeCustomerModal, editingId, name, phone, handleDelete]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (branchFilter !== 'ALL') {
        const bId = Number(branchFilter);
        if (c.branch_id !== null && c.branch_id !== bId) return false;
      }
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
  }, [customers, searchQuery, branchFilter]);

  // Minimized dock pill on bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-xs font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-slate-900 font-extrabold shadow-sm">
            <Users className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400">Maintain Module</p>
            <p className="text-xs font-bold text-white">Customers Directory ({customers.length})</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs font-sans">
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[780px] w-full max-w-[1140px]'
        }`}
      >
        {/* 1. TITLEBAR (Executive Midnight Navy #091529) */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-3 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Users className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase">
              Maintain • Customers Directory &amp; Khata Profiles
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live DB Ready
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

        {/* 2. TOP ACTION BUTTONS BAR */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddNew}
              className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded bg-sky-600 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-sky-700 active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Add Customer (F2)</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded bg-[#0f172a] px-3 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 active:scale-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>{saving ? 'Saving...' : editingId ? 'Update (Ctrl+S)' : 'Save (Ctrl+S)'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete()}
              disabled={!editingId || isWalkIn === 1}
              className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded bg-rose-600 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-rose-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded bg-slate-500 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-600 active:scale-95"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Clear (Esc)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded bg-teal-600 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-teal-700 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Directory</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {editingId && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                Editing ID #{editingId}
              </span>
            )}
            <button
              type="button"
              onClick={closeCustomerModal}
              className="flex h-6.5 cursor-pointer items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* 3. MESSAGE BANNER IF ACTIVE */}
        {message && (
          <div
            className={`flex shrink-0 items-center justify-between px-3 py-1 text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4. UPPER SECTION: COMPACT CUSTOMER FORM */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 p-2.5">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
            {/* Box 1 (col-span-6): Identity & Contact */}
            <div className="rounded-lg border border-slate-200/90 bg-white p-2 shadow-2xs md:col-span-6 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-700">
                  Customer ID:
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingId ? `ID #${editingId}` : '(Auto-generated on Save)'}
                  className="h-6 w-full rounded border border-slate-200 bg-slate-100 px-2 text-[11px] font-bold text-slate-600 select-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-700">
                  Customer Name *:
                </span>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haji Usman Hardware Store / Faisal Khan"
                  className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-700">
                    Phone / Mob:
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-12 shrink-0 text-[11px] font-semibold text-slate-700">
                    Branch:
                  </span>
                  <select
                    value={branchId ?? ''}
                    onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                    className="h-6 w-full rounded border border-slate-300 bg-white px-1.5 text-[11px] font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">All Branches (Shared)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box 2 (col-span-6): Tax, Location & Type */}
            <div className="rounded-lg border border-slate-200/90 bg-white p-2 shadow-2xs md:col-span-6 space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-20 shrink-0 text-[11px] font-semibold text-slate-700">
                    CNIC No:
                  </span>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="13302-xxxxxxx-x"
                    className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-700">
                    NTN / STRN:
                  </span>
                  <input
                    type="text"
                    value={ntn}
                    onChange={(e) => setNtn(e.target.value)}
                    placeholder="e.g. 1234567-8"
                    className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-20 shrink-0 text-[11px] font-semibold text-slate-700">
                    City / Region:
                  </span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Haripur / Timergara..."
                    className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-700">
                    Type:
                  </span>
                  <span
                    className={`inline-flex h-6 w-full items-center justify-center rounded px-2 text-[11px] font-bold border ${
                      isWalkIn === 1
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {isWalkIn === 1 ? 'Walk-in Cash Account' : 'Registered Khata Customer'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] font-semibold text-slate-700">
                  Address / Site:
                </span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Main Bazaar, Shop #12, Haripur..."
                  className="h-6 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. SEARCH & LIVE FILTER BAR */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by Name, Phone, CNIC, City or ID..."
                className="h-6.5 w-full rounded-md border border-slate-300 bg-[#f8fafc] pl-8 pr-2 text-xs font-normal text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-6.5 rounded border border-slate-300 bg-[#f8fafc] px-2 text-[11px] font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>

            <span className="text-[11px] font-medium text-slate-500">
              Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{' '}
              {customers.length}
            </span>

            <button
              type="button"
              onClick={loadCustomers}
              title="Refresh Customer List"
              className="flex h-6.5 w-6.5 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6. CUSTOMER DATA TABLE GRID (Phase 1 Matching Table) */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-[#091529] text-[10.5px] font-bold uppercase tracking-wider text-white">
              <tr className="h-7 border-b border-slate-700">
                <th className="w-8 border-r border-slate-700/60 text-center font-bold">#</th>
                <th className="w-20 border-r border-slate-700/60 px-2 text-center font-bold">ID</th>
                <th className="border-r border-slate-700/60 px-2 font-bold">Customer Name</th>
                <th className="w-28 border-r border-slate-700/60 px-2 font-bold">Phone / Mobile</th>
                <th className="w-28 border-r border-slate-700/60 px-2 font-bold">Branch</th>
                <th className="w-32 border-r border-slate-700/60 px-2 font-bold">CNIC / NTN</th>
                <th className="border-r border-slate-700/60 px-2 font-bold">City / Address</th>
                <th className="w-24 border-r border-slate-700/60 px-2 text-center font-bold">Type</th>
                <th className="w-32 px-2 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading customers...' : 'No customers found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const isSelected = editingId === c.id;
                  const branchObj = branches.find((b) => b.id === c.branch_id);

                  return (
                    <tr
                      key={c.id}
                      onDoubleClick={() => handleEdit(c)}
                      className={`h-7 border-b border-slate-200 transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-medium'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-sky-50/50'
                          : 'bg-slate-50/60 hover:bg-sky-50/50'
                      }`}
                    >
                      <td className="border-r border-slate-200 text-center text-[11px] font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-center text-[11px] font-mono font-bold text-slate-700">
                        {c.id}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-[11px] font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-[11px] font-mono text-slate-700">
                        {c.phone || '—'}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-[11px] text-slate-600">
                        {branchObj ? `${branchObj.code} - ${branchObj.name}` : 'All Branches'}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-[11px] font-mono text-slate-600">
                        {c.cnic || c.ntn || '—'}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-[11px] text-slate-600 truncate max-w-[200px]">
                        {c.city ? `${c.city}${c.address ? `, ${c.address}` : ''}` : c.address || '—'}
                      </td>
                      <td className="border-r border-slate-200 px-2 text-center">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            c.is_walk_in === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.is_walk_in === 1 ? 'Walk-in' : 'Registered'}
                        </span>
                      </td>
                      <td className="px-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Select for POS Sale */}
                          <button
                            type="button"
                            onClick={() => handleSelectForPos(c)}
                            title="Select in POS Sale Counter"
                            className="flex h-5 items-center gap-0.5 rounded border border-emerald-300 bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Select</span>
                          </button>
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            title="Edit customer details"
                            className="flex h-5 w-5 items-center justify-center rounded border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {/* Delete button (disabled for walk-in) */}
                          <button
                            type="button"
                            disabled={c.is_walk_in === 1}
                            onClick={() => handleDelete(c.id)}
                            title={
                              c.is_walk_in === 1
                                ? 'Walk-in cash profile cannot be deleted'
                                : 'Delete customer'
                            }
                            className="flex h-5 w-5 items-center justify-center rounded border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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

        {/* 7. BOTTOM STATUS BAR */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              Total Profiles: <strong className="text-slate-900">{customers.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Walk-in: <strong>{customers.filter((c) => c.is_walk_in === 1).length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Registered Khata: <strong>{customers.filter((c) => c.is_walk_in !== 1).length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold text-slate-700">
              F2: New
            </span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold text-slate-700">
              Ctrl+S: Save
            </span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold text-slate-700">
              Esc: Clear/Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

