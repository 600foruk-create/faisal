'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { ProductWithStock } from '@/lib/types';

interface StockRowState {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  sale_price: number;
  initial_stock: number;
  stock_qty: number;
  initial_cost: number;
  cost_price: number;
  is_dirty: boolean;
}

export function StockOpeningModal() {
  const {
    branches,
    activeBranchId,
    closeStockOpeningModal,
    triggerInventoryRefresh,
    triggerRefresh,
  } = usePosContext();

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Branch & Filter State
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);
  const [asOfDate, setAsOfDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'ZERO' | 'MODIFIED'>(
    'ALL'
  );

  // Data & loading state
  const [rows, setRows] = useState<StockRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // CSV / Excel Import Drawer Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // References for spreadsheet cell keyboard navigation
  const qtyInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const costInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Show Toast notification
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch products and branch stock
  const loadBranchProducts = useCallback(async (branchId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?branchId=${branchId}&includeInactive=true`);
      if (!res.ok) throw new Error('Failed to fetch branch stock');
      const data = (await res.json()) as { products?: ProductWithStock[] };
      const products = data.products ?? [];

      const initialRows: StockRowState[] = products.map((p) => {
        const stock = Number(p.stock_qty) || 0;
        const cost = Number(p.cost_price) || 0;
        return {
          id: p.id,
          sku: p.sku || `SKU-${p.id}`,
          barcode: p.barcode || '',
          name: p.name || 'Unnamed Product',
          category: p.category || 'General',
          unit: p.unit || 'Pcs',
          sale_price: Number(p.sale_price) || 0,
          initial_stock: stock,
          stock_qty: stock,
          initial_cost: cost,
          cost_price: cost,
          is_dirty: false,
        };
      });

      setRows(initialRows);
    } catch {
      showToast('Failed to load branch stock from database.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load when selected branch changes
  useEffect(() => {
    void loadBranchProducts(selectedBranchId);
  }, [selectedBranchId, loadBranchProducts]);

  // Current selected branch details
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

  // Unique categories list for dropdown filter
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

  // Cell Change Handlers
  const handleStockChange = (productId: number, val: string) => {
    const num = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty = num !== r.initial_stock || r.cost_price !== r.initial_cost;
        return { ...r, stock_qty: num, is_dirty: dirty };
      })
    );
  };

  const handleCostChange = (productId: number, val: string) => {
    const num = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty = r.stock_qty !== r.initial_stock || num !== r.initial_cost;
        return { ...r, cost_price: num, is_dirty: dirty };
      })
    );
  };

  // Keyboard navigation between rows
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'qty' | 'cost'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? Math.max(0, index - 1) : index + 1;
      const targetMap = field === 'qty' ? qtyInputRefs.current : costInputRefs.current;
      const nextEl = targetMap.get(nextIndex);
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(0, index - 1);
      const targetMap = field === 'qty' ? qtyInputRefs.current : costInputRefs.current;
      const prevEl = targetMap.get(prevIndex);
      if (prevEl) {
        prevEl.focus();
        prevEl.select();
      }
    }
  };

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      // Search filter
      if (query) {
        const matchSku = r.sku.toLowerCase().includes(query);
        const matchName = r.name.toLowerCase().includes(query);
        const matchBarcode = r.barcode.toLowerCase().includes(query);
        const matchCategory = r.category.toLowerCase().includes(query);
        if (!matchSku && !matchName && !matchBarcode && !matchCategory) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        if (!r.category.toLowerCase().startsWith(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'IN_STOCK' && r.stock_qty <= 0) return false;
      if (statusFilter === 'ZERO' && r.stock_qty !== 0) return false;
      if (statusFilter === 'MODIFIED' && !r.is_dirty) return false;

      return true;
    });
  }, [rows, searchQuery, categoryFilter, statusFilter]);

  // Executive KPIs
  const totalSkus = rows.length;
  const modifiedCount = useMemo(() => rows.filter((r) => r.is_dirty).length, [rows]);

  const totalPhysicalUnits = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.stock_qty, 0);
  }, [rows]);

  const totalCostValuation = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.stock_qty * r.cost_price, 0);
  }, [rows]);

  const totalRetailWorth = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.stock_qty * r.sale_price, 0);
  }, [rows]);

  // Save / Commit all opening balances to database
  const handleSaveAllBalances = async () => {
    setSaving(true);
    try {
      const itemsToCommit = rows.map((r) => ({
        product_id: r.id,
        stock_qty: r.stock_qty,
        cost_price: r.cost_price,
      }));

      const res = await fetch('/api/stock-opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          as_of_date: asOfDate,
          notes: `Opening balances committed for ${currentBranch.display_name} as of ${asOfDate}`,
          items: itemsToCommit,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save opening stock balances');
      }

      // Update initial baseline values
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          initial_stock: r.stock_qty,
          initial_cost: r.cost_price,
          is_dirty: false,
        }))
      );

      triggerInventoryRefresh();
      triggerRefresh();
      showToast(
        `✓ Successfully committed opening stock for ${currentBranch.display_name}! (${itemsToCommit.length} items recorded)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error committing opening stock';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick Action: Reset All to Database baseline
  const handleResetToBaseline = () => {
    if (
      modifiedCount > 0 &&
      !window.confirm('Discard all unsaved changes and reload original baseline stock?')
    ) {
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        stock_qty: r.initial_stock,
        cost_price: r.initial_cost,
        is_dirty: false,
      }))
    );
    showToast('Stock values restored to database baseline.');
  };

  // Quick Action: Set all zero or empty filtered items to 0
  const handleSetZeroForFiltered = () => {
    setRows((prev) =>
      prev.map((r) => {
        const isMatch = filteredRows.some((fr) => fr.id === r.id);
        if (!isMatch) return r;
        return {
          ...r,
          stock_qty: 0,
          is_dirty: 0 !== r.initial_stock || r.cost_price !== r.initial_cost,
        };
      })
    );
    showToast('Applied 0 quantity to filtered items.');
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Physical Stock Qty',
      'Unit Cost (Rs)',
      'Total Valuation (Rs)',
      'Retail Price (Rs)',
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const cleanName = `"${r.name.replace(/"/g, '""')}"`;
      const cleanCat = `"${r.category.replace(/"/g, '""')}"`;
      const valuation = (r.stock_qty * r.cost_price).toFixed(2);
      csvLines.push(
        [
          r.sku,
          r.barcode,
          cleanName,
          cleanCat,
          r.unit,
          r.stock_qty,
          r.cost_price.toFixed(2),
          valuation,
          r.sale_price.toFixed(2),
        ].join(',')
      );
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_opening_balances_${currentBranch.code}_${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported inventory worksheet as CSV file.');
  };

  // Print Stock Audit Sheet
  const handlePrintStockSheet = () => {
    window.print();
  };

  // Excel / CSV Import Parser
  const handleApplyImport = () => {
    if (!importText.trim()) {
      setImportSummary('Please paste CSV or tab-delimited Excel rows.');
      return;
    }

    const lines = importText.trim().split(/\r?\n/);
    let matchedCount = 0;
    let unmatchedCount = 0;

    const updatesBySku = new Map<string, { qty: number; cost?: number }>();

    for (const line of lines) {
      if (!line.trim()) continue;
      // Split by tab or comma
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.split(',').map((p) => p.trim());

      if (parts.length < 2) continue;
      const sku = parts[0].trim().toUpperCase();
      const qty = parseFloat(parts[1]);
      const cost = parts.length >= 3 ? parseFloat(parts[2]) : undefined;

      if (sku && !isNaN(qty)) {
        updatesBySku.set(sku, { qty, cost });
      }
    }

    setRows((prev) =>
      prev.map((r) => {
        const update = updatesBySku.get(r.sku.toUpperCase());
        if (update) {
          matchedCount++;
          const newCost =
            update.cost !== undefined && !isNaN(update.cost) ? update.cost : r.cost_price;
          const dirty = update.qty !== r.initial_stock || newCost !== r.initial_cost;
          return {
            ...r,
            stock_qty: update.qty,
            cost_price: newCost,
            is_dirty: dirty,
          };
        }
        return r;
      })
    );

    unmatchedCount = updatesBySku.size - matchedCount;
    setImportSummary(
      `✓ Successfully applied stock for ${matchedCount} SKUs! ${
        unmatchedCount > 0 ? `(${unmatchedCount} SKUs in your import were not found in catalog)` : ''
      }`
    );
    showToast(`Import applied: ${matchedCount} SKUs updated.`);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showImportModal) {
        closeStockOpeningModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAllBalances();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [closeStockOpeningModal, handleSaveAllBalances, showImportModal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs font-sans">
      {/* WINDOW CONTAINER - Symmetrical with CustomerModal & InventoryModal */}
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
              <Boxes className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs font-black tracking-wide text-white uppercase sm:text-sm">
                INVENTORY OPENING BALANCES &amp; BRANCH STOCK FLOAT
              </h2>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-400">
                &bull; Physical Stock Audit &amp; Cost Valuation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live DB Synced Indicator */}
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-700/60 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live DB Synced
            </span>

            {/* Branch Badge Pill */}
            <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-200 border border-white/15">
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
                onClick={closeStockOpeningModal}
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
            className={`absolute top-13 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xl border animate-fade-in ${
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
        {/* 2. TOP FILTER & EXECUTIVE CONTROL STRIP                   */}
        {/* ========================================================= */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Branch Selector & As-Of Date */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Selector */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Branch:</span>
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    const nextId = parseInt(e.target.value, 10);
                    if (
                      modifiedCount > 0 &&
                      !window.confirm(
                        'You have unsaved stock edits on this branch. Switching branch will discard unsaved changes. Proceed?'
                      )
                    ) {
                      return;
                    }
                    setSelectedBranchId(nextId);
                  }}
                  className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_name} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fiscal As-Of Date */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>As-Of Date:</span>
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  <span>Category:</span>
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories ({categoriesList.length})</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Controls: Search Box & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-64 sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, Barcode, Name..."
                  className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
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

              <button
                type="button"
                onClick={() => void loadBranchProducts(selectedBranchId)}
                title="Reload Database Stock"
                disabled={loading}
                className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-emerald-700 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Filter Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All SKUs ({rows.length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('IN_STOCK')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'IN_STOCK'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                In Stock ({rows.filter((r) => r.stock_qty > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ZERO')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'ZERO'
                    ? 'bg-slate-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Zero Stock ({rows.filter((r) => r.stock_qty === 0).length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('MODIFIED')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'MODIFIED'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : modifiedCount > 0
                    ? 'bg-amber-50 border border-amber-300 text-amber-900 font-extrabold animate-pulse'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Modified Unsaved ({modifiedCount})
              </button>
            </div>

            {/* Quick Bulk Utilities */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetZeroForFiltered}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Set Filtered to 0
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={handleResetToBaseline}
                disabled={modifiedCount === 0}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 disabled:opacity-40 underline cursor-pointer"
              >
                Reset Edits
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. EXECUTIVE KPI METRICS RIBBON                           */}
        {/* ========================================================= */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-white border-b border-slate-200">
          {/* KPI 1: Active Catalog Items */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 flex items-center gap-3 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Active Catalog
              </p>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {totalSkus} <span className="text-xs font-normal text-slate-500">Items</span>
              </h3>
            </div>
          </div>

          {/* KPI 2: Total Physical Float */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-2.5 flex items-center gap-3 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                Physical Float
              </p>
              <h3 className="text-sm sm:text-base font-black text-emerald-900 font-mono">
                {totalPhysicalUnits.toLocaleString()}{' '}
                <span className="text-xs font-normal text-emerald-700">Units</span>
              </h3>
            </div>
          </div>

          {/* KPI 3: Total Stock Valuation (Cost) */}
          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-2.5 flex items-center gap-3 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Tag className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-indigo-800 uppercase">
                Cost Valuation
              </p>
              <h3 className="text-sm sm:text-base font-black text-indigo-950 font-mono">
                Rs. {totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          {/* KPI 4: Retail Sales Realization */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 flex items-center gap-3 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                Retail Worth
              </p>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                Rs. {totalRetailWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. SPREADSHEET-STYLE BULK STOCK ENTRY TABLE               */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-3">
          <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              {/* Header */}
              <thead className="bg-[#091529] text-white text-[11px] font-extrabold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800">#</th>
                  <th className="py-2.5 px-3 w-32 border-r border-slate-800">Item SKU</th>
                  <th className="py-2.5 px-3 min-w-[240px] border-r border-slate-800">
                    Product Description &amp; Specifications
                  </th>
                  <th className="py-2.5 px-2.5 w-36 border-r border-slate-800">Category</th>
                  <th className="py-2.5 px-2 w-16 text-center border-r border-slate-800">UOM</th>
                  <th className="py-2.5 px-3 w-32 text-right border-r border-slate-800 bg-emerald-950/80 text-emerald-300">
                    Physical Stock *
                  </th>
                  <th className="py-2.5 px-3 w-32 text-right border-r border-slate-800">
                    Unit Cost (Rs)
                  </th>
                  <th className="py-2.5 px-3 w-36 text-right border-r border-slate-800">
                    Valuation (Rs)
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right border-r border-slate-800">
                    Retail Rate
                  </th>
                  <th className="py-2.5 px-3 w-24 text-center">Status</th>
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-semibold">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
                      Loading inventory opening records for {currentBranch.display_name}...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No inventory products found</p>
                      <p className="text-xs text-slate-400">
                        Adjust search filters or add items via Chart of Inventory.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const rowValuation = row.stock_qty * row.cost_price;
                    const isRowDirty = row.is_dirty;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors h-9 hover:bg-sky-50/60 ${
                          isRowDirty
                            ? 'bg-amber-50/70 border-l-4 border-l-amber-500 font-medium'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/50'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                          {idx + 1}
                        </td>

                        {/* SKU */}
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 flex items-center justify-between gap-1">
                          <span>{row.sku}</span>
                          {isRowDirty && (
                            <span
                              title="Unsaved modification"
                              className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                            />
                          )}
                        </td>

                        {/* Name & Dimensions */}
                        <td className="py-1.5 px-3 text-slate-900 font-semibold border-r border-slate-200 truncate max-w-[340px]">
                          <span title={row.name}>{row.name}</span>
                          {row.barcode && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              Barcode: {row.barcode}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200 truncate max-w-[150px]">
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {row.category}
                          </span>
                        </td>

                        {/* Unit of Measure */}
                        <td className="py-1.5 px-2 text-center text-slate-700 font-bold border-r border-slate-200 text-[11px]">
                          {row.unit}
                        </td>

                        {/* Physical Stock Qty Input (Fast editable spreadsheet cell) */}
                        <td className="py-1 px-2 border-r border-slate-200 bg-emerald-50/30">
                          <input
                            ref={(el) => {
                              if (el) qtyInputRefs.current.set(idx, el);
                              else qtyInputRefs.current.delete(idx);
                            }}
                            type="number"
                            step="any"
                            value={isNaN(row.stock_qty) ? '' : row.stock_qty}
                            onChange={(e) => handleStockChange(row.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleKeyDown(e, idx, 'qty')}
                            placeholder="0"
                            className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-right font-mono text-xs font-black text-slate-950 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                          />
                        </td>

                        {/* Unit Cost Rate Input */}
                        <td className="py-1 px-2 border-r border-slate-200">
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
                            className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-right font-mono text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                          />
                        </td>

                        {/* Row Total Valuation */}
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                          Rs. {rowValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Retail Rate Reference */}
                        <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                          Rs. {row.sale_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status Badge */}
                        <td className="py-1.5 px-2 text-center">
                          {row.stock_qty > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              In Stock
                            </span>
                          ) : row.stock_qty === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Zero Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              Negative
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
        </div>

        {/* ========================================================= */}
        {/* 5. ACTION FOOTER                                          */}
        {/* ========================================================= */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3 px-4">
          {/* Left Actions: Import, Export, Print */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 shadow-xs cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-emerald-600" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-indigo-700 shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStockSheet}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-sky-700 shadow-xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-sky-600" />
              <span>Print Sheet</span>
            </button>
          </div>

          {/* Center Hint */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              Enter
            </span>
            <span>Jump to Next Row</span>
            <span className="text-slate-300">&bull;</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              Ctrl+S
            </span>
            <span>Save Balances</span>
          </div>

          {/* Right Actions: Cancel & Commit */}
          <div className="flex items-center gap-2.5">
            {modifiedCount > 0 ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-lg animate-pulse">
                ⚡ {modifiedCount} items modified (Unsaved)
              </span>
            ) : (
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
                ✓ All items committed with database
              </span>
            )}

            <button
              type="button"
              onClick={closeStockOpeningModal}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs cursor-pointer"
            >
              Close (Esc)
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAllBalances()}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-5 py-2 text-xs font-extrabold shadow-md cursor-pointer transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Commit All Balances (Ctrl+S)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. EXCEL / CSV IMPORT MODAL DRAWER                        */}
        {/* ========================================================= */}
        {showImportModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
            <div className="flex w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Import Stock from Excel / CSV
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target Branch: <span className="font-bold text-slate-800">{currentBranch.display_name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportSummary(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Paste rows directly from Excel or CSV. Format required per line:
                </p>
                <div className="rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] p-2.5">
                  SKU_CODE [Tab or Comma] QUANTITY [Tab or Comma] UNIT_COST
                  <br />
                  <span className="text-slate-400">Example:</span> FG-165001 , 250 , 480.00
                </div>

                <textarea
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`FG-165001\t150\t450.00\nFG-165002\t80\t320.00`}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {importSummary && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                  {importSummary}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportSummary(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-extrabold shadow-sm"
                >
                  Apply Imported Stock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
