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
  Package,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { ProductWithStock } from '@/lib/types';

interface PriceRowState {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  initial_cost: number;
  cost_price: number;
  initial_sale: number;
  sale_price: number;
  initial_wholesale: number;
  wholesale_price: number;
  is_dirty: boolean;
}

export function PriceSettingsModal() {
  const {
    branches,
    activeBranchId,
    closePriceSettingsModal,
    triggerInventoryRefresh,
    triggerRefresh,
  } = usePosContext();

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Branch & Filter State
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MODIFIED'>('ALL');

  // Quick Bulk Adjuster Drawer Toggle
  const [showBulkTool, setShowBulkTool] = useState(false);
  const [bulkMode, setBulkMode] = useState<'INCREASE_PCT' | 'DECREASE_PCT' | 'TARGET_MARGIN'>('INCREASE_PCT');
  const [bulkValue, setBulkValue] = useState<string>('5');

  // Data & loading state
  const [rows, setRows] = useState<PriceRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // References for keyboard navigation
  const saleInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const wholesaleInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const costInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

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

      const initialRows: PriceRowState[] = products.map((p) => {
        const cost = Number(p.cost_price) || 0;
        const sale = Number(p.sale_price) || 0;
        const wholesale =
          Number(p.wholesale_price) || (sale > 0 ? Math.round(sale * 0.9 * 100) / 100 : 0);

        return {
          id: p.id,
          sku: p.sku || `SKU-${p.id}`,
          barcode: p.barcode || '',
          name: p.name || 'Unnamed Product',
          category: p.category || 'General',
          unit: p.unit || 'Pcs',
          initial_cost: cost,
          cost_price: cost,
          initial_sale: sale,
          sale_price: sale,
          initial_wholesale: wholesale,
          wholesale_price: wholesale,
          is_dirty: false,
        };
      });

      setRows(initialRows);
    } catch {
      showToast('Failed to load catalog products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load when selected branch changes
  useEffect(() => {
    void loadBranchProducts(selectedBranchId);
  }, [selectedBranchId, loadBranchProducts]);

  // Current branch details
  const currentBranch = useMemo(() => {
    return (
      branches.find((b) => b.id === selectedBranchId) ?? {
        id: selectedBranchId,
        name: 'Selected Branch',
        display_name: `Branch #${selectedBranchId}`,
        code: 'BR',
      }
    );
  }, [branches, selectedBranchId]);

  // Unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category) {
        const primary = r.category.includes('>') ? r.category.split('>')[0].trim() : r.category;
        set.add(primary);
      }
    }
    return Array.from(set).sort();
  }, [rows]);

  // Price change handlers
  const handleSaleChange = (productId: number, val: string) => {
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty =
          validNum !== r.initial_sale ||
          r.cost_price !== r.initial_cost ||
          r.wholesale_price !== r.initial_wholesale;
        return { ...r, sale_price: validNum, is_dirty: dirty };
      })
    );
  };

  const handleWholesaleChange = (productId: number, val: string) => {
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty =
          r.sale_price !== r.initial_sale ||
          r.cost_price !== r.initial_cost ||
          validNum !== r.initial_wholesale;
        return { ...r, wholesale_price: validNum, is_dirty: dirty };
      })
    );
  };

  const handleCostChange = (productId: number, val: string) => {
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty =
          r.sale_price !== r.initial_sale ||
          validNum !== r.initial_cost ||
          r.wholesale_price !== r.initial_wholesale;
        return { ...r, cost_price: validNum, is_dirty: dirty };
      })
    );
  };

  // Keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'sale' | 'wholesale' | 'cost'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? Math.max(0, index - 1) : index + 1;
      const targetMap =
        field === 'sale'
          ? saleInputRefs.current
          : field === 'wholesale'
          ? wholesaleInputRefs.current
          : costInputRefs.current;
      const nextEl = targetMap.get(nextIndex);
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(0, index - 1);
      const targetMap =
        field === 'sale'
          ? saleInputRefs.current
          : field === 'wholesale'
          ? wholesaleInputRefs.current
          : costInputRefs.current;
      const prevEl = targetMap.get(prevIndex);
      if (prevEl) {
        prevEl.focus();
        prevEl.select();
      }
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (query) {
        const matchSku = r.sku.toLowerCase().includes(query);
        const matchName = r.name.toLowerCase().includes(query);
        const matchBarcode = r.barcode.toLowerCase().includes(query);
        const matchCategory = r.category.toLowerCase().includes(query);
        if (!matchSku && !matchName && !matchBarcode && !matchCategory) {
          return false;
        }
      }

      if (categoryFilter !== 'ALL') {
        if (!r.category.toLowerCase().startsWith(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      if (statusFilter === 'MODIFIED' && !r.is_dirty) return false;

      return true;
    });
  }, [rows, searchQuery, categoryFilter, statusFilter]);

  // Overall stats
  const modifiedCount = useMemo(() => rows.filter((r) => r.is_dirty).length, [rows]);

  const avgMargin = useMemo(() => {
    if (rows.length === 0) return 0;
    let totalMargin = 0;
    let count = 0;
    for (const r of rows) {
      if (r.cost_price > 0) {
        totalMargin += ((r.sale_price - r.cost_price) / r.cost_price) * 100;
        count++;
      }
    }
    return count > 0 ? totalMargin / count : 0;
  }, [rows]);

  // Apply Bulk Price Adjustment
  const handleApplyBulkAdjustment = () => {
    const val = parseFloat(bulkValue);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid percentage value.', 'error');
      return;
    }

    const filteredIds = new Set(filteredRows.map((fr) => fr.id));

    setRows((prev) =>
      prev.map((r) => {
        if (!filteredIds.has(r.id)) return r;

        let newSale = r.sale_price;
        if (bulkMode === 'INCREASE_PCT') {
          newSale = Math.round(r.sale_price * (1 + val / 100) * 100) / 100;
        } else if (bulkMode === 'DECREASE_PCT') {
          newSale = Math.round(r.sale_price * (1 - val / 100) * 100) / 100;
        } else if (bulkMode === 'TARGET_MARGIN') {
          newSale = Math.round(r.cost_price * (1 + val / 100) * 100) / 100;
        }

        const newWholesale = Math.round(newSale * 0.9 * 100) / 100;
        const dirty =
          newSale !== r.initial_sale ||
          newWholesale !== r.initial_wholesale ||
          r.cost_price !== r.initial_cost;

        return {
          ...r,
          sale_price: newSale,
          wholesale_price: newWholesale,
          is_dirty: dirty,
        };
      })
    );

    setShowBulkTool(false);
    showToast(`Applied ${bulkValue}% adjustment across ${filteredRows.length} items.`);
  };

  // Save / Commit all prices
  const handleSaveAllPrices = async () => {
    setSaving(true);
    try {
      const itemsToCommit = rows.map((r) => ({
        product_id: r.id,
        sale_price: r.sale_price,
        cost_price: r.cost_price,
        wholesale_price: r.wholesale_price,
      }));

      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToCommit }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update prices');
      }

      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          initial_sale: r.sale_price,
          initial_cost: r.cost_price,
          initial_wholesale: r.wholesale_price,
          is_dirty: false,
        }))
      );

      triggerInventoryRefresh();
      triggerRefresh();
      showToast(
        `Successfully saved prices for ${itemsToCommit.length} products!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating prices';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset Changes
  const handleReset = () => {
    if (
      modifiedCount > 0 &&
      !window.confirm('Discard all unsaved price edits and reload original database prices?')
    ) {
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        sale_price: r.initial_sale,
        cost_price: r.initial_cost,
        wholesale_price: r.initial_wholesale,
        is_dirty: false,
      }))
    );
    showToast('Prices restored to original database values.');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Cost Price (Rs)',
      'Retail Price (Rs)',
      'Wholesale Price (Rs)',
      'Profit Margin (%)',
      'Profit per Unit (Rs)',
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const cleanName = `"${r.name.replace(/"/g, '""')}"`;
      const cleanCat = `"${r.category.replace(/"/g, '""')}"`;
      const margin =
        r.cost_price > 0
          ? (((r.sale_price - r.cost_price) / r.cost_price) * 100).toFixed(1)
          : '0.0';
      const profit = (r.sale_price - r.cost_price).toFixed(2);

      csvLines.push(
        [
          r.sku,
          r.barcode,
          cleanName,
          cleanCat,
          r.unit,
          r.cost_price.toFixed(2),
          r.sale_price.toFixed(2),
          r.wholesale_price.toFixed(2),
          `${margin}%`,
          profit,
        ].join(',')
      );
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price_settings_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported price list as CSV file.');
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePriceSettingsModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAllPrices();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [closePriceSettingsModal, handleSaveAllPrices]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs">
      {/* WINDOW CONTAINER - Uniform Sizing */}
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[820px] w-full max-w-[1240px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. TITLEBAR (Executive Midnight Navy #091529)             */}
        {/* ========================================================= */}
        <div className="flex h-11 shrink-0 items-center justify-between rounded-t-xl bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xs">
              <Tag className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs font-bold tracking-wide text-white uppercase sm:text-sm">
                Item Price Settings
              </h2>
              <span className="hidden sm:inline-block text-xs text-slate-300">
                &bull; Commercial Rates &amp; Margin Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live DB Synced Indicator */}
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-700/60 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live DB Synced
            </span>

            {/* Branch Badge */}
            <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-200 border border-white/15">
              <Building2 className="h-3 w-3 text-emerald-400" />
              {currentBranch.display_name}
            </span>

            {/* Window Controls */}
            <div className="flex items-center ml-1 border-l border-white/15 pl-2 gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title="Minimize Dialog"
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore Normal Window' : 'Maximize Window'}
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={closePriceSettingsModal}
                title="Close Dialog (Esc)"
                className="rounded p-1 text-rose-300 hover:bg-rose-600 hover:text-white transition"
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
        {/* 2. SINGLE CLEAN TOOLBAR (Ultra-Simple & Uncluttered)      */}
        {/* ========================================================= */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Controls: Branch, Category, Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">Branch:</label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const nextId = parseInt(e.target.value, 10);
                  if (
                    modifiedCount > 0 &&
                    !window.confirm('Discard unsaved price edits and switch branch?')
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

            {/* Search Box */}
            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU or Name..."
                className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-6 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls: Bulk Adjust Tool Toggle, Filters & Refresh */}
          <div className="flex items-center gap-2">
            {/* Quick Bulk Tool Toggle Button */}
            <button
              type="button"
              onClick={() => setShowBulkTool((prev) => !prev)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                showBulkTool
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bulk Adjust</span>
            </button>

            {/* Filter Tabs */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-md px-2.5 py-0.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({rows.length})
              </button>

              {modifiedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('MODIFIED')}
                  className={`rounded-md px-2.5 py-0.5 text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'MODIFIED'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'text-amber-800 font-extrabold'
                  }`}
                >
                  Modified ({modifiedCount})
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void loadBranchProducts(selectedBranchId)}
              title="Reload Products"
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Clean Bulk Tool Bar (Only shows when user clicks 'Bulk Adjust') */}
        {showBulkTool && (
          <div className="shrink-0 border-b border-emerald-200 bg-emerald-50/60 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 animate-fade-in text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-950">
                Bulk Price Adjustment:
              </span>

              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value as typeof bulkMode)}
                className="h-7.5 rounded-lg border border-emerald-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="INCREASE_PCT">Increase Retail Prices by %</option>
                <option value="DECREASE_PCT">Decrease Retail Prices by %</option>
                <option value="TARGET_MARGIN">Set Profit Margin % over Cost</option>
              </select>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="5"
                  className="h-7.5 w-16 rounded-lg border border-emerald-300 bg-white px-2 text-center text-xs font-bold text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                />
                <span className="font-bold text-emerald-800">%</span>
              </div>

              <button
                type="button"
                onClick={handleApplyBulkAdjustment}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 text-xs font-bold shadow-2xs cursor-pointer transition"
              >
                Apply to Filtered Items ({filteredRows.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowBulkTool(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. PURE SPREADSHEET TABLE (Dead Center Headers & Cells)   */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header - DEAD CENTER & NO ASTERISKS */}
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
                  Cost Price (Rs)
                </th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80 bg-emerald-950/70 text-emerald-300">
                  Retail Sale Price (Rs)
                </th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                  Wholesale Price (Rs)
                </th>
                <th className="py-2.5 px-3 w-32 text-center">
                  Profit Margin
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500 font-semibold">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    Loading price records...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400">
                      Adjust your search or category filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isRowDirty = row.is_dirty;
                  const netProfit = row.sale_price - row.cost_price;
                  const marginPct =
                    row.cost_price > 0 ? (netProfit / row.cost_price) * 100 : 0;

                  return (
                    <tr
                      key={row.id}
                      className={`h-9 transition-colors border-b border-slate-200 hover:bg-sky-50/50 ${
                        isRowDirty
                          ? 'bg-amber-50/60 border-l-4 border-l-amber-500'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/40'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-1 px-3 text-center text-slate-400 text-xs tabular-nums border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="py-1 px-3 text-center font-semibold text-slate-900 border-r border-slate-200 tabular-nums">
                        {row.sku}
                      </td>

                      {/* Name & Description */}
                      <td className="py-1 px-3 text-left text-slate-800 font-medium border-r border-slate-200 truncate max-w-[340px]">
                        <span title={row.name}>{row.name}</span>
                        {row.barcode && (
                          <span className="block text-[10px] text-slate-400 tabular-nums">
                            Barcode: {row.barcode}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-1 px-3 text-center text-slate-600 border-r border-slate-200 truncate max-w-[150px]">
                        {row.category}
                      </td>

                      {/* Unit */}
                      <td className="py-1 px-2 text-center text-slate-700 font-semibold border-r border-slate-200">
                        {row.unit}
                      </td>

                      {/* Seamless Editable Cost Price (Centered) */}
                      <td className="p-0 border-r border-slate-200 relative focus-within:bg-slate-100/50">
                        <input
                          ref={(el) => {
                            if (el) costInputRefs.current.set(idx, el);
                            else costInputRefs.current.delete(idx);
                          }}
                          type="number"
                          step="any"
                          value={isNaN(row.cost_price) ? '' : row.cost_price}
                          onChange={(e) => handleCostChange(row.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'cost')}
                          placeholder="0.00"
                          className="h-9 w-full bg-transparent px-3 text-center text-xs font-semibold text-slate-700 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:bg-white"
                        />
                      </td>

                      {/* Seamless Editable Retail Sale Price (Centered, Highlighted) */}
                      <td className="p-0 border-r border-slate-200 bg-emerald-50/20 relative focus-within:bg-emerald-100/40">
                        <input
                          ref={(el) => {
                            if (el) saleInputRefs.current.set(idx, el);
                            else saleInputRefs.current.delete(idx);
                          }}
                          type="number"
                          step="any"
                          value={isNaN(row.sale_price) ? '' : row.sale_price}
                          onChange={(e) => handleSaleChange(row.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'sale')}
                          placeholder="0.00"
                          className="h-9 w-full bg-transparent px-3 text-center text-xs font-bold text-slate-950 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600 focus:bg-white"
                        />
                      </td>

                      {/* Seamless Editable Wholesale Rate (Centered) */}
                      <td className="p-0 border-r border-slate-200 relative focus-within:bg-slate-100/50">
                        <input
                          ref={(el) => {
                            if (el) wholesaleInputRefs.current.set(idx, el);
                            else wholesaleInputRefs.current.delete(idx);
                          }}
                          type="number"
                          step="any"
                          value={isNaN(row.wholesale_price) ? '' : row.wholesale_price}
                          onChange={(e) => handleWholesaleChange(row.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'wholesale')}
                          placeholder="0.00"
                          className="h-9 w-full bg-transparent px-3 text-center text-xs font-semibold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 focus:bg-white"
                        />
                      </td>

                      {/* Profit Margin (Centered - Clean Percentage & Net Gain) */}
                      <td className="py-1 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {marginPct > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 tabular-nums">
                              +{marginPct.toFixed(1)}%
                            </span>
                          ) : marginPct === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                              0.0%
                            </span>
                          ) : (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 tabular-nums">
                              {marginPct.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                            (+Rs. {netProfit.toFixed(0)})
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* 4. CLEAN FLAT ACTION FOOTER                               */}
        {/* ========================================================= */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          {/* Left Actions: Export, Print, Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-indigo-700 shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-sky-700 shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-sky-600" />
              <span>Print Catalog</span>
            </button>

            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-rose-600 hover:underline px-2 cursor-pointer"
              >
                Reset Edits
              </button>
            )}
          </div>

          {/* Center Summary Indicator */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <span>
              Total Products: <strong className="font-bold text-slate-900 tabular-nums">{rows.length}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>
              Average Profit Margin:{' '}
              <strong className="font-bold text-emerald-800 tabular-nums">
                +{avgMargin.toFixed(1)}%
              </strong>
            </span>
            {modifiedCount > 0 && (
              <>
                <span className="text-slate-300">&bull;</span>
                <span className="text-amber-800 font-bold">
                  {modifiedCount} modified
                </span>
              </>
            )}
          </div>

          {/* Right Actions: Close & Commit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closePriceSettingsModal}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              Close (Esc)
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAllPrices()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Save All Prices (Ctrl+S)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
