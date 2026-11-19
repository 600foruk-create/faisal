'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Printer,
  RefreshCw,
  Search,
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
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty = validNum !== r.initial_stock || r.cost_price !== r.initial_cost;
        return { ...r, stock_qty: validNum, is_dirty: dirty };
      })
    );
  };

  const handleCostChange = (productId: number, val: string) => {
    const num = parseFloat(val);
    const validNum = isNaN(num) ? 0 : num;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== productId) return r;
        const dirty = r.stock_qty !== r.initial_stock || validNum !== r.initial_cost;
        return { ...r, cost_price: validNum, is_dirty: dirty };
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

  // Overall Stats
  const modifiedCount = useMemo(() => rows.filter((r) => r.is_dirty).length, [rows]);
  const totalPhysicalUnits = useMemo(() => rows.reduce((sum, r) => sum + r.stock_qty, 0), [rows]);
  const totalCostValuation = useMemo(
    () => rows.reduce((sum, r) => sum + r.stock_qty * r.cost_price, 0),
    [rows]
  );

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
        `Successfully committed opening stock for ${currentBranch.display_name}! (${itemsToCommit.length} items recorded)`
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

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Opening Stock Qty',
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
      `Successfully applied stock for ${matchedCount} items! ${
        unmatchedCount > 0 ? `(${unmatchedCount} items not found in catalog)` : ''
      }`
    );
    showToast(`Import applied: ${matchedCount} items updated.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs">
      {/* WINDOW CONTAINER */}
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[820px] w-full max-w-[1240px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. TITLEBAR (Unified Standard Font & Executive Navy)      */}
        {/* ========================================================= */}
        <div className="flex h-11 shrink-0 items-center justify-between rounded-t-xl bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xs">
              <Boxes className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs font-bold tracking-wide text-white uppercase sm:text-sm">
                Inventory Opening Balances
              </h2>
              <span className="hidden sm:inline-block text-xs text-slate-300">
                &bull; Physical Stock &amp; Valuation
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
        {/* 2. SLIM & CLEAN CONTROL TOOLBAR (No Bulky Boxes)          */}
        {/* ========================================================= */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left Controls: Branch, Date, Category, Search */}
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
                    !window.confirm('Discard unsaved changes on this branch and switch?')
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

            {/* As-Of Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">Date:</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
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

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
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

          {/* Right Status Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_STOCK')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                statusFilter === 'IN_STOCK'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              In Stock ({rows.filter((r) => r.stock_qty > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ZERO')}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ZERO'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Zero ({rows.filter((r) => r.stock_qty === 0).length})
            </button>
            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('MODIFIED')}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'MODIFIED'
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
              title="Reload Database Stock"
              disabled={loading}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. PURE SPREADSHEET TABLE (No Bulky Inner Boxes)          */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Header */}
            <thead className="bg-[#0e1f3d] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700/80">#</th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Item SKU</th>
                <th className="py-2.5 px-3 min-w-[280px] text-center border-r border-slate-700/80">
                  Item Description &amp; Specifications
                </th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80">Category</th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-700/80">Unit</th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80 bg-emerald-950/70 text-emerald-300">
                  Opening Stock *
                </th>
                <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                  Unit Cost (Rs)
                </th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80">
                  Valuation (Rs)
                </th>
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">
                  Retail Price
                </th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500 font-semibold">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    Loading inventory opening records...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No inventory products found</p>
                    <p className="text-xs text-slate-400">
                      Adjust your search or category filter.
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
                      className={`h-8.5 transition-colors border-b border-slate-200 hover:bg-sky-50/50 ${
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

                      {/* Seamless Editable Stock Cell (Centered) */}
                      <td className="p-0 border-r border-slate-200 bg-emerald-50/20 relative focus-within:bg-emerald-100/40">
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
                          className="h-8.5 w-full bg-transparent px-3 text-center text-xs font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600 focus:bg-white"
                        />
                      </td>

                      {/* Seamless Editable Cost Cell (Centered) */}
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
                          className="h-8.5 w-full bg-transparent px-3 text-center text-xs font-semibold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:bg-white"
                        />
                      </td>

                      {/* Valuation (Centered) */}
                      <td className="py-1 px-3 text-center font-bold text-slate-900 border-r border-slate-200 tabular-nums">
                        Rs. {rowValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Retail Price (Centered) */}
                      <td className="py-1 px-3 text-center text-slate-600 border-r border-slate-200 tabular-nums">
                        Rs. {row.sale_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-1 px-2 text-center">
                        {row.stock_qty > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Zero
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
        {/* 4. CLEAN FLAT ACTION FOOTER (Integrated Summary)          */}
        {/* ========================================================= */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          {/* Left Actions: Import, Export, Print, Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 shadow-2xs cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-emerald-600" />
              <span>Import Excel / CSV</span>
            </button>

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
              onClick={handlePrintStockSheet}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-sky-700 shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-sky-600" />
              <span>Print Sheet</span>
            </button>

            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="text-xs font-semibold text-rose-600 hover:underline px-2 cursor-pointer"
              >
                Reset Edits
              </button>
            )}
          </div>

          {/* Center Summary Indicator (Integrated, No Big Boxes) */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <span>
              Total Items: <strong className="font-bold text-slate-900 tabular-nums">{rows.length}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>
              Total Stock: <strong className="font-bold text-emerald-800 tabular-nums">{totalPhysicalUnits.toLocaleString()}</strong> Units
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>
              Valuation: <strong className="font-bold text-indigo-950 tabular-nums">Rs. {totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>

          {/* Right Actions: Close & Commit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeStockOpeningModal}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              Close (Esc)
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAllBalances()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Save Balances (Ctrl+S)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. EXCEL / CSV IMPORT MODAL DRAWER                        */}
        {/* ========================================================= */}
        {showImportModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
            <div className="flex w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Import Stock from Excel / CSV
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target: {currentBranch.display_name}
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
                  Paste rows directly from Excel or CSV (Format: SKU, Quantity, UnitCost):
                </p>
                <div className="rounded-lg bg-slate-900 text-emerald-400 text-xs p-2.5 tabular-nums">
                  Example: FG-165001 , 250 , 480.00
                </div>

                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`FG-165001\t150\t450.00\nFG-165002\t80\t320.00`}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none tabular-nums"
                />
              </div>

              {importSummary && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-900">
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
                  className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs"
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
