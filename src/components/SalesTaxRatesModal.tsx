'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  Minus,
  Percent,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { ProductWithStock } from '@/lib/types';

interface TaxRowState {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  hs_code: string;
  sale_price: number;
  initial_tax_rate: number;
  tax_rate: number;
  is_dirty: boolean;
}

export function SalesTaxRatesModal() {
  const {
    branches,
    activeBranchId,
    closeSalesTaxRatesModal,
    triggerInventoryRefresh,
    triggerRefresh,
  } = usePosContext();

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Branch & Filter State (Multi-Tenant Ready)
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [taxTierFilter, setTaxTierFilter] = useState<'ALL' | 'STANDARD_18' | 'REDUCED' | 'ZERO_EXEMPT' | 'MODIFIED'>('ALL');

  // Bulk Tax Adjuster State
  const [bulkPreset, setBulkPreset] = useState<'STANDARD_18' | 'REDUCED_5' | 'REDUCED_1' | 'ZERO_RATED' | 'EXEMPT' | 'CUSTOM'>('STANDARD_18');
  const [bulkCustomRate, setBulkCustomRate] = useState<string>('18');

  // Data & loading state
  const [rows, setRows] = useState<TaxRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // References for keyboard navigation
  const taxInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Show Toast notification
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch products
  const loadBranchProducts = useCallback(async (branchId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?branchId=${branchId}&includeInactive=true`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = (await res.json()) as { products?: ProductWithStock[] };
      const products = data.products ?? [];

      const initialRows: TaxRowState[] = products.map((p) => {
        const rate = typeof p.tax_rate === 'number' ? p.tax_rate : 18;
        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode || '',
          name: p.name,
          category: p.category || 'General',
          unit: p.unit || 'Pcs',
          hs_code: p.hs_code || '3917.2390',
          sale_price: Number(p.sale_price) || 0,
          initial_tax_rate: rate,
          tax_rate: rate,
          is_dirty: false,
        };
      });

      setRows(initialRows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading catalog products', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadBranchProducts(selectedBranchId);
  }, [selectedBranchId, loadBranchProducts]);

  // Handle Tax Rate edit
  const handleTaxRateChange = useCallback((id: number, rawValue: string) => {
    const parsed = parseFloat(rawValue);
    const validRate = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const dirty = Math.abs(validRate - row.initial_tax_rate) > 0.001;
        return {
          ...row,
          tax_rate: validRate,
          is_dirty: dirty,
        };
      })
    );
  }, []);

  // Quick preset selection helper
  const handlePresetSelect = (preset: typeof bulkPreset) => {
    setBulkPreset(preset);
    if (preset === 'STANDARD_18') setBulkCustomRate('18');
    else if (preset === 'REDUCED_5') setBulkCustomRate('5');
    else if (preset === 'REDUCED_1') setBulkCustomRate('1');
    else if (preset === 'ZERO_RATED' || preset === 'EXEMPT') setBulkCustomRate('0');
  };

  // Bulk Apply Tax Rate to Filtered Items
  const handleApplyBulkTax = useCallback(() => {
    const targetRate = parseFloat(bulkCustomRate);
    if (isNaN(targetRate) || targetRate < 0 || targetRate > 100) {
      showToast('Please enter a valid tax percentage between 0% and 100%', 'error');
      return;
    }

    const filteredIds = new Set(filteredRows.map((r) => r.id));

    setRows((prev) =>
      prev.map((row) => {
        if (!filteredIds.has(row.id)) return row;
        const newRate = Math.round(targetRate * 100) / 100;
        const dirty = Math.abs(newRate - row.initial_tax_rate) > 0.001;
        return {
          ...row,
          tax_rate: newRate,
          is_dirty: dirty,
        };
      })
    );

    showToast(`Applied ${targetRate}% Sales Tax Rate to ${filteredIds.size} filtered items. Click Save to commit.`, 'success');
  }, [bulkCustomRate, showToast]);

  // Reset all unsaved edits
  const handleResetEdits = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        tax_rate: r.initial_tax_rate,
        is_dirty: false,
      }))
    );
    showToast('All unsaved tax rate edits have been reset to original values.', 'success');
  }, [showToast]);

  // Save All Tax Rates to Database
  const handleSaveAllTaxRates = useCallback(async () => {
    const dirtyRows = rows.filter((r) => r.is_dirty);
    if (dirtyRows.length === 0) {
      showToast('No modified tax rates to save.', 'success');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: dirtyRows.map((r) => ({
          product_id: r.id,
          tax_rate: r.tax_rate,
        })),
      };

      const res = await fetch('/api/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || 'Failed to update sales tax rates');
      }

      // Mark saved rows as clean
      setRows((prev) =>
        prev.map((r) => {
          if (!r.is_dirty) return r;
          return {
            ...r,
            initial_tax_rate: r.tax_rate,
            is_dirty: false,
          };
        })
      );

      triggerInventoryRefresh();
      triggerRefresh();
      showToast(`Successfully saved tax rates for ${dirtyRows.length} items. All POS terminals synchronized.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save sales tax rates', 'error');
    } finally {
      setSaving(false);
    }
  }, [rows, showToast, triggerInventoryRefresh, triggerRefresh]);

  // Categories list for dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Category filter
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) {
        return false;
      }

      // Tax Tier filter
      if (taxTierFilter === 'MODIFIED') {
        if (!row.is_dirty) return false;
      } else if (taxTierFilter === 'STANDARD_18') {
        if (Math.abs(row.tax_rate - 18) > 0.01) return false;
      } else if (taxTierFilter === 'ZERO_EXEMPT') {
        if (row.tax_rate > 0.01) return false;
      } else if (taxTierFilter === 'REDUCED') {
        if (row.tax_rate <= 0.01 || Math.abs(row.tax_rate - 18) <= 0.01) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = row.sku.toLowerCase().includes(q);
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesBarcode = row.barcode.toLowerCase().includes(q);
        const matchesHs = row.hs_code.toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesBarcode && !matchesHs) {
          return false;
        }
      }

      return true;
    });
  }, [rows, categoryFilter, taxTierFilter, searchQuery]);

  // Summary counts
  const modifiedCount = useMemo(() => rows.filter((r) => r.is_dirty).length, [rows]);
  const standard18Count = useMemo(() => rows.filter((r) => Math.abs(r.tax_rate - 18) <= 0.01).length, [rows]);
  const zeroExemptCount = useMemo(() => rows.filter((r) => r.tax_rate <= 0.01).length, [rows]);
  const reducedOtherCount = useMemo(() => rows.filter((r) => r.tax_rate > 0.01 && Math.abs(r.tax_rate - 18) > 0.01).length, [rows]);

  // Export Tax Matrix to CSV
  const handleExportCsv = useCallback(() => {
    const headers = [
      'Item SKU',
      'Barcode',
      'Item Name',
      'Category',
      'Unit',
      'HS Code',
      'Retail Price (Rs)',
      'Sales Tax Rate (%)',
      'Tax Amount (Rs)',
      'Price Incl Tax (Rs)',
      'Tax Schedule',
    ];

    const csvRows = filteredRows.map((r) => {
      const taxAmt = Math.round(((r.sale_price * r.tax_rate) / 100) * 100) / 100;
      const priceIncl = Math.round((r.sale_price + taxAmt) * 100) / 100;
      const schedule =
        r.tax_rate === 18
          ? 'Standard GST (18%)'
          : r.tax_rate === 0
          ? 'Zero-Rated / Exempt (0%)'
          : `Reduced / Special (${r.tax_rate}%)`;

      return [
        `"${r.sku.replace(/"/g, '""')}"`,
        `"${r.barcode.replace(/"/g, '""')}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.category.replace(/"/g, '""')}"`,
        `"${r.unit.replace(/"/g, '""')}"`,
        `"${r.hs_code.replace(/"/g, '""')}"`,
        r.sale_price.toFixed(2),
        r.tax_rate.toFixed(2),
        taxAmt.toFixed(2),
        priceIncl.toFixed(2),
        `"${schedule}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `item_sales_tax_rates_branch_${selectedBranchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tax matrix exported to CSV successfully.', 'success');
  }, [filteredRows, selectedBranchId, showToast]);

  // Print Tax Matrix Sheet
  const handlePrintSchedule = useCallback(() => {
    window.print();
  }, []);

  // Keyboard Navigation: Ctrl+S and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAllTaxRates();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (
          modifiedCount > 0 &&
          !window.confirm('You have unsaved sales tax rate changes. Close without saving?')
        ) {
          return;
        }
        closeSalesTaxRatesModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSalesTaxRatesModal, handleSaveAllTaxRates, modifiedCount]);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || {
    id: selectedBranchId,
    display_name: 'Branch #' + selectedBranchId,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div
        className={`flex flex-col bg-white shadow-2xl transition-all duration-150 overflow-hidden border border-slate-300 rounded-xl ${
          isMaximized
            ? 'h-full w-full rounded-none'
            : isMinimized
            ? 'h-14 w-[500px] overflow-hidden'
            : 'h-[94vh] w-full max-w-[1520px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. EXECUTIVE MIDNIGHT NAVY TITLE BAR                     */}
        {/* ========================================================= */}
        <div className="flex h-11 shrink-0 items-center justify-between bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white shadow-md select-none">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <Percent className="h-4 w-4 text-emerald-400" />
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white">
              Item Sales Tax Rates &amp; FBR Tax Schedules
            </h1>
            <span className="hidden md:inline-flex items-center rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60">
              Multi-Tenant &amp; FBR Compliant
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Branch Display */}
            <span className="hidden lg:flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
              <Building2 className="h-3 w-3 text-emerald-400" />
              {currentBranch.display_name}
            </span>

            {/* Window Controls */}
            <div className="flex items-center ml-1 border-l border-white/15 pl-2 gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title="Minimize Dialog"
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore Normal Window' : 'Maximize Window'}
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    modifiedCount > 0 &&
                    !window.confirm('You have unsaved sales tax rate changes. Close without saving?')
                  ) {
                    return;
                  }
                  closeSalesTaxRatesModal();
                }}
                title="Close Dialog (Esc)"
                className="rounded p-1 text-rose-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TOAST MESSAGE ALERT */}
        {toastMessage && (
          <div
            className={`absolute top-13 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-xl border animate-fade-in ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-950/20'
                : 'bg-rose-600 text-white border-rose-700 shadow-rose-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SLIM MULTI-TENANT TOOLBAR & BULK TAX ADJUSTER          */}
        {/* ========================================================= */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Branch, Category, Tax Tier Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Selector */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">Branch:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    const nextId = parseInt(e.target.value, 10);
                    if (
                      modifiedCount > 0 &&
                      !window.confirm('Discard unsaved tax rate edits and switch branch?')
                    ) {
                      return;
                    }
                    setSelectedBranchId(nextId);
                  }}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories ({categoriesList.length})</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tax Tier Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700">Tax Tier:</label>
                <select
                  value={taxTierFilter}
                  onChange={(e) => setTaxTierFilter(e.target.value as typeof taxTierFilter)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Tax Tiers ({rows.length})</option>
                  <option value="STANDARD_18">Standard GST 18% ({standard18Count})</option>
                  <option value="ZERO_EXEMPT">Zero-Rated / Exempt 0% ({zeroExemptCount})</option>
                  <option value="REDUCED">Reduced &amp; Other Rates ({reducedOtherCount})</option>
                  {modifiedCount > 0 && (
                    <option value="MODIFIED">Pending Modified ({modifiedCount})</option>
                  )}
                </select>
              </div>
            </div>

            {/* Right Controls: Live Search & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-64 sm:w-80">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU, item name, barcode, HS Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-normal text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {modifiedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setTaxTierFilter('MODIFIED')}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    taxTierFilter === 'MODIFIED'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  Modified ({modifiedCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => void loadBranchProducts(selectedBranchId)}
                title="Reload Products"
                disabled={loading}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Bulk Tax Rate Adjuster Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Bulk Tax Adjuster:</span>
              </span>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('STANDARD_18')}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold cursor-pointer transition ${
                    bulkPreset === 'STANDARD_18'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  Standard 18% (GST)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('REDUCED_5')}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold cursor-pointer transition ${
                    bulkPreset === 'REDUCED_5'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  Reduced 5%
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('ZERO_RATED')}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold cursor-pointer transition ${
                    bulkPreset === 'ZERO_RATED'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  Zero-Rated (0%)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('EXEMPT')}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold cursor-pointer transition ${
                    bulkPreset === 'EXEMPT'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  Exempt (0%)
                </button>
              </div>

              {/* Custom Value Input */}
              <div className="flex items-center gap-1 ml-1">
                <span className="text-slate-500 font-semibold text-[11px]">Rate:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={bulkCustomRate}
                  onChange={(e) => {
                    setBulkCustomRate(e.target.value);
                    setBulkPreset('CUSTOM');
                  }}
                  placeholder="18"
                  className="h-7.5 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-bold text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>

              <button
                type="button"
                onClick={handleApplyBulkTax}
                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 text-xs font-bold shadow-2xs cursor-pointer transition"
              >
                Apply to Filtered Items ({filteredRows.length})
              </button>
            </div>

            {modifiedCount > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-md">
                {modifiedCount} items pending save
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. PURE SPREADSHEET TABLE (Dead Center Headers & Cells)   */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header - DEAD CENTER & ZERO ASTERISKS */}
            <thead className="bg-[#0e1f3d] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700/80">#</th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Item SKU</th>
                <th className="py-2.5 px-3 min-w-[280px] text-center border-r border-slate-700/80">
                  Item Description &amp; Specifications
                </th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80">Category</th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-700/80">Unit</th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                  Retail Price (Rs)
                </th>
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">
                  HS Code
                </th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80">
                  Tax Schedule
                </th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80 bg-emerald-950/70 text-emerald-300">
                  Sales Tax Rate (%)
                </th>
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">
                  Tax Amount (Rs)
                </th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                  Price Incl. Tax (Rs)
                </th>
                <th className="py-2.5 px-3 w-24 text-center">
                  Status
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span className="font-semibold text-xs">Loading item catalog and sales tax schedules...</span>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-500">
                    <Percent className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-700">No matching items found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or category filter</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const taxAmt = Math.round(((row.sale_price * row.tax_rate) / 100) * 100) / 100;
                  const priceIncl = Math.round((row.sale_price + taxAmt) * 100) / 100;

                  // Tax Schedule Classification
                  let scheduleBadge = (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      Reduced ({row.tax_rate}%)
                    </span>
                  );
                  if (Math.abs(row.tax_rate - 18) <= 0.01) {
                    scheduleBadge = (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Standard 18%
                      </span>
                    );
                  } else if (row.tax_rate <= 0.01) {
                    scheduleBadge = (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                        Zero / Exempt (0%)
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={row.id}
                      className={`h-8 transition-colors select-none ${
                        row.is_dirty
                          ? 'bg-amber-50/70 hover:bg-amber-100/70'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-sky-50/60'
                          : 'bg-slate-50/50 hover:bg-sky-50/60'
                      }`}
                    >
                      {/* # Index */}
                      <td className="px-2 py-1 text-center text-slate-500 text-xs border-r border-slate-200 tabular-nums">
                        {index + 1}
                      </td>

                      {/* SKU */}
                      <td className="px-3 py-1 text-center font-bold text-slate-800 text-xs border-r border-slate-200">
                        {row.sku}
                      </td>

                      {/* Description & Specifications */}
                      <td className="px-3 py-1 text-left font-semibold text-slate-900 text-xs border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[340px]" title={row.name}>
                            {row.name}
                          </span>
                          {row.is_dirty && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved edit" />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-1 text-center text-slate-700 text-xs border-r border-slate-200">
                        <span className="inline-block truncate max-w-[140px]" title={row.category}>
                          {row.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-2 py-1 text-center font-medium text-slate-700 text-xs border-r border-slate-200">
                        {row.unit}
                      </td>

                      {/* Retail Sale Price (Rs) */}
                      <td className="px-3 py-1 text-right font-bold text-slate-900 text-xs border-r border-slate-200 tabular-nums">
                        Rs. {row.sale_price.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* HS Code */}
                      <td className="px-3 py-1 text-center font-semibold text-slate-600 text-xs border-r border-slate-200 tabular-nums">
                        {row.hs_code}
                      </td>

                      {/* Tax Schedule / Tier */}
                      <td className="px-3 py-1 text-center border-r border-slate-200">
                        {scheduleBadge}
                      </td>

                      {/* Sales Tax Rate (%) - Editable flat spreadsheet cell */}
                      <td className="px-2 py-0.5 text-center border-r border-slate-200 bg-emerald-50/30">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            ref={(el) => {
                              if (el) taxInputRefs.current.set(row.id, el);
                              else taxInputRefs.current.delete(row.id);
                            }}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={row.tax_rate}
                            onChange={(e) => handleTaxRateChange(row.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const nextRow = filteredRows[index + 1];
                                if (nextRow) {
                                  taxInputRefs.current.get(nextRow.id)?.focus();
                                }
                              }
                            }}
                            className={`h-7 w-20 rounded bg-transparent px-1.5 text-center text-xs font-bold tabular-nums transition focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              row.is_dirty
                                ? 'text-amber-800 font-extrabold bg-amber-100/70 border border-amber-300'
                                : 'text-emerald-900 hover:bg-emerald-100/50'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-slate-500">%</span>
                        </div>
                      </td>

                      {/* Tax Amount (Rs) */}
                      <td className="px-3 py-1 text-right font-bold text-slate-800 text-xs border-r border-slate-200 tabular-nums">
                        Rs. {taxAmt.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Price Incl. Tax (Rs) */}
                      <td className="px-3 py-1 text-right font-bold text-emerald-700 text-xs border-r border-slate-200 tabular-nums">
                        Rs. {priceIncl.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-1 text-center">
                        {row.is_dirty ? (
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
                            Pending Save
                          </span>
                        ) : row.tax_rate > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            Taxable
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                            Zero-Rated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* 4. SUMMARY RIBBON & ACTION CONTROLS FOOTER                */}
        {/* ========================================================= */}
        <div className="shrink-0 border-t border-slate-300 bg-slate-50 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
          {/* Left Actions: Export, Print, Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-emerald-700 cursor-pointer disabled:opacity-50 transition"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Tax Matrix (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSchedule}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-emerald-700 cursor-pointer disabled:opacity-50 transition"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Tax Schedule</span>
            </button>

            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={handleResetEdits}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer transition"
              >
                Reset Edits ({modifiedCount})
              </button>
            )}
          </div>

          {/* Middle: Summary Stats */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">{filteredRows.length}</span>
              <span>Items Displayed</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-700">{standard18Count}</span>
              <span>Standard 18%</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sky-700">{zeroExemptCount}</span>
              <span>Zero/Exempt (0%)</span>
            </div>
          </div>

          {/* Right: Close and Save Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  modifiedCount > 0 &&
                  !window.confirm('You have unsaved sales tax rate changes. Close without saving?')
                ) {
                  return;
                }
                closeSalesTaxRatesModal();
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition"
            >
              Cancel (Esc)
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAllTaxRates()}
              disabled={saving || modifiedCount === 0}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:cursor-not-allowed ${
                modifiedCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20 active:scale-98'
                  : 'bg-slate-400 opacity-60'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Tax Rates...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>
                    Save All Tax Rates (Ctrl+S)
                    {modifiedCount > 0 ? ` (${modifiedCount})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
