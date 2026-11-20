'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency, roundMoney } from '@/lib/format';
import type { Branch, ProductWithStock } from '@/lib/types';

type InventoryTab = 'ledger' | 'matrix' | 'alerts';
type StockStatusFilter = 'ALL' | 'HEALTHY' | 'LOW' | 'OUT_OF_STOCK';

export function InventoryBalanceModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeInventoryBalanceModal,
    openStockOpeningModal,
    openPriceSettingsModal,
    openPosSale,
    setSelectedProductIdForPos,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Multi-Tenant Branch & Category Filters
  const initialBranch = activeBranchId ? String(activeBranchId) : 'ALL';
  const [branchId, setBranchId] = useState<string>(initialBranch);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<InventoryTab>('ledger');

  // Inventory Data
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch Inventory Products
  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        branchId !== 'ALL'
          ? `/api/products?branchId=${encodeURIComponent(branchId)}&includeInactive=true`
          : '/api/products?includeInactive=true';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = (await res.json()) as { products?: ProductWithStock[] };
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
      showToast('Error loading live inventory records', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, showToast]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory, refreshNonce]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeInventoryBalanceModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInventoryBalanceModal]);

  // Unique Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'HEALTHY' && p.stock_qty <= 25) {
        return false;
      }
      if (statusFilter === 'LOW' && (p.stock_qty <= 0 || p.stock_qty > 25)) {
        return false;
      }
      if (statusFilter === 'OUT_OF_STOCK' && p.stock_qty > 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode && !matchCat) {
          return false;
        }
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, searchQuery]);

  // Low & Out of stock lists for Alerts tab
  const alertProducts = useMemo(() => {
    return products.filter((p) => p.stock_qty <= 25);
  }, [products]);

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalItems = 0;
    let totalUnits = 0;
    let totalValuationCost = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalItems += 1;
      totalUnits += p.stock_qty;
      totalValuationCost += p.stock_qty * (p.cost_price || 0);
      totalRetailValue += p.stock_qty * (p.sale_price || 0);
      if (p.stock_qty <= 0) {
        outOfStockCount += 1;
      } else if (p.stock_qty <= 25) {
        lowStockCount += 1;
      }
    }

    const grossMarginVal = Math.max(0, totalRetailValue - totalValuationCost);
    const grossMarginPct =
      totalRetailValue > 0 ? (grossMarginVal / totalRetailValue) * 100 : 0;

    return {
      totalItems,
      totalUnits: roundMoney(totalUnits),
      totalValuationCost: roundMoney(totalValuationCost),
      totalRetailValue: roundMoney(totalRetailValue),
      grossMarginVal: roundMoney(grossMarginVal),
      grossMarginPct: roundMoney(grossMarginPct),
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Current Branch Label
  const currentBranchLabel = useMemo(() => {
    if (branchId === 'ALL') return 'All Multi-Tenant Branches (Consolidated)';
    const b = branches.find((br) => String(br.id) === branchId);
    return b ? b.display_name : `Branch #${branchId}`;
  }, [branchId, branches]);

  // Print Inventory Sheet
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      showToast('No products available to export', 'error');
      return;
    }

    const headers = [
      'Sr #',
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Cost Price',
      'Sale Price',
      'Available Stock',
      'Stock Valuation Cost',
      'Retail Valuation Sale',
      'Stock Status',
    ];

    const rows = filteredProducts.map((p, idx) => {
      const statusStr =
        p.stock_qty <= 0
          ? 'Out of Stock'
          : p.stock_qty <= 25
          ? 'Low Stock Alert'
          : 'In Stock';
      return [
        idx + 1,
        `"${p.sku}"`,
        `"${p.barcode || ''}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category || 'General'}"`,
        `"${p.unit || 'Pcs'}"`,
        p.cost_price.toFixed(2),
        p.sale_price.toFixed(2),
        p.stock_qty.toFixed(2),
        (p.stock_qty * p.cost_price).toFixed(2),
        (p.stock_qty * p.sale_price).toFixed(2),
        `"${statusStr}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Inventory_Balance_${branchId}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Inventory balance CSV exported successfully', 'success');
  };

  // Quick Action: Bill in POS
  const handleBillInPos = (productId: number) => {
    setSelectedProductIdForPos(productId);
    closeInventoryBalanceModal();
    openPosSale();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-inventory-balance,
          #printable-inventory-balance * {
            visibility: visible;
          }
          #printable-inventory-balance {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-2 sm:p-4">
        {/* Floating Modal Window */}
        <div
          className={`flex flex-col rounded-2xl bg-white shadow-2xl transition-all duration-200 border border-slate-300 overflow-hidden ${
            isMaximized
              ? 'fixed inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] max-w-none'
              : 'w-full max-w-[1420px] h-[90vh]'
          }`}
        >
          {/* ========================================================================= */}
          {/* EXECUTIVE MIDNIGHT NAVY HEADER                                            */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                <Boxes className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                    Inventory Balance &amp; Multi-Tenant Stock Valuation
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live ERP Sync
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Live Stock Levels, Multi-Branch Availability, Reorder Alerts &amp; Valuation
                </span>
              </div>
            </div>

            {/* Window Controls & Branch Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
                <Store className="h-3.5 w-3.5 text-sky-400" />
                <span className="font-semibold text-white truncate max-w-[240px]">
                  {currentBranchLabel}
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
                onClick={closeInventoryBalanceModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP MULTI-TENANT FILTER & CATEGORY BAR                                    */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Branch:</span>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="ALL">All Multi-Tenant Branches (Consolidated)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-medium text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden max-w-[200px]"
                >
                  <option value="ALL">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Pills */}
              <div className="hidden md:flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('HEALTHY')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    statusFilter === 'HEALTHY'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <PackageCheck className="h-3 w-3" />
                  <span>In Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LOW')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    statusFilter === 'LOW'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Low ({metrics.lowStockCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('OUT_OF_STOCK')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    statusFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <PackageX className="h-3 w-3" />
                  <span>Zero ({metrics.outOfStockCount})</span>
                </button>
              </div>
            </div>

            {/* Actions: Search, Refresh, Intake, CSV & Print */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, name, barcode..."
                  className="h-8 w-44 sm:w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
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
                onClick={() => void loadInventory()}
                disabled={loading}
                title="Reload live stock data"
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeInventoryBalanceModal();
                  openStockOpeningModal();
                }}
                title="Record new stock batch / opening balances"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
              >
                <PackagePlus className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Stock Intake</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                title="Export filtered stock to CSV"
                className="flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print physical stock audit sheet"
                className="flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-sky-700 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
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
          {/* 5 HIGH-CONTRAST EXECUTIVE KPI CARDS                                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Active SKUs */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Total Products (SKU)
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                {metrics.totalItems}
              </div>
              <span className="text-[9.5px] text-slate-500">Active catalog items</span>
            </div>

            {/* Total Stock Units */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Total Units On Hand
              </span>
              <div className="mt-1 text-lg font-black text-sky-950 tabular-nums">
                {metrics.totalUnits.toLocaleString()}
              </div>
              <span className="text-[9.5px] text-sky-700">Combined physical units</span>
            </div>

            {/* Stock Valuation At Cost */}
            <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Valuation (At Cost)
              </span>
              <div className="mt-1 text-lg font-black text-indigo-950 tabular-nums">
                {formatCurrency(metrics.totalValuationCost, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-indigo-700">Asset investment value</span>
            </div>

            {/* Retail Value At Sale Price */}
            <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Retail Value (At Sale)
              </span>
              <div className="mt-1 text-lg font-black text-emerald-950 tabular-nums">
                {formatCurrency(metrics.totalRetailValue, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-emerald-700">Projected revenue potential</span>
            </div>

            {/* Gross Profit Margin Potential */}
            <div className="flex flex-col rounded-xl border border-teal-200 bg-teal-50/50 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Unrealized Margin
                </span>
                <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="mt-1 text-lg font-black text-teal-950 tabular-nums">
                {metrics.grossMarginPct.toFixed(1)}%
              </div>
              <span className="text-[9.5px] text-teal-700 tabular-nums">
                +{formatCurrency(metrics.grossMarginVal, settings.currency_symbol)}
              </span>
            </div>

            {/* Stock Health Alerts Card */}
            <div
              className={`flex flex-col rounded-xl border p-2.5 shadow-2xs ${
                metrics.outOfStockCount > 0 || metrics.lowStockCount > 0
                  ? 'border-amber-300 bg-amber-50/70'
                  : 'border-emerald-200 bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                  Reorder Alerts
                </span>
                {metrics.outOfStockCount > 0 || metrics.lowStockCount > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-rose-700 tabular-nums">
                  {metrics.outOfStockCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">Zero /</span>
                <span className="text-lg font-black text-amber-700 tabular-nums">
                  {metrics.lowStockCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">Low</span>
              </div>
              <span className="text-[9.5px] text-amber-800">Require stock replenishment</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB NAVIGATION STRIP                                                      */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Boxes className="h-3.5 w-3.5 text-sky-600" />
              <span>Comprehensive Inventory Balance Ledger</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                {filteredProducts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 text-indigo-600" />
              <span>Multi-Tenant Branch Stock Matrix</span>
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] text-indigo-800 tabular-nums font-extrabold">
                {branches.length} Branches
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'alerts'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Low Stock &amp; Reorder Alerts</span>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] text-amber-900 tabular-nums font-extrabold">
                {alertProducts.length}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS & DATA TABLES                                                */}
          {/* ========================================================================= */}
          <div id="printable-inventory-balance" className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* Printable Letterhead (Visible on print) */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {settings.business_name || 'Retail Point of Sale'}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>Branch: {currentBranchLabel}</span>
                <span>As of Date: {new Date().toLocaleDateString()}</span>
                <span>Total Items: {metrics.totalItems}</span>
                <span>Total Valuation: {formatCurrency(metrics.totalValuationCost, settings.currency_symbol)}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-500">
                <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                <span className="text-xs font-semibold">Auditing inventory balance across branches...</span>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------------- */}
                {/* TAB 1: COMPREHENSIVE INVENTORY BALANCE LEDGER                        */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'ledger' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center w-28">SKU</th>
                          <th className="px-3 py-2.5 text-center">Product Name &amp; Unit</th>
                          <th className="px-3 py-2.5 text-center">Category</th>
                          <th className="px-3 py-2.5 text-center">Cost Price</th>
                          <th className="px-3 py-2.5 text-center">Sale Price</th>
                          <th className="px-3 py-2.5 text-center">Stock On Hand</th>
                          <th className="px-3 py-2.5 text-center">Cost Valuation</th>
                          <th className="px-3 py-2.5 text-center">Retail Valuation</th>
                          <th className="px-3 py-2.5 text-center">Stock Status</th>
                          <th className="no-print px-3 py-2.5 text-center w-36">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                              <Boxes className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-600">No inventory products found</p>
                              <p className="text-[11px] text-slate-400">
                                Try adjusting your search query, branch selector, or category filter.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p, idx) => {
                            const costVal = p.stock_qty * (p.cost_price || 0);
                            const saleVal = p.stock_qty * (p.sale_price || 0);
                            const isZero = p.stock_qty <= 0;
                            const isLow = !isZero && p.stock_qty <= 25;

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2 text-center font-bold text-slate-400 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-slate-800 tabular-nums">
                                  {p.sku}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="font-bold text-slate-900 inline-block text-left">
                                    <span>{p.name}</span>
                                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                                      ({p.unit || 'Pcs'})
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                                    {p.category || 'General'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums text-slate-700 font-medium">
                                  {formatCurrency(p.cost_price, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums text-slate-900 font-semibold">
                                  {formatCurrency(p.sale_price, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-black tabular-nums ${
                                      isZero
                                        ? 'bg-rose-100 text-rose-800'
                                        : isLow
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-emerald-100 text-emerald-900'
                                    }`}
                                  >
                                    {isZero ? (
                                      <PackageX className="h-3 w-3" />
                                    ) : isLow ? (
                                      <AlertTriangle className="h-3 w-3 text-amber-700" />
                                    ) : (
                                      <PackageCheck className="h-3 w-3 text-emerald-700" />
                                    )}
                                    <span>
                                      {p.stock_qty.toLocaleString()} {p.unit || 'Pcs'}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums text-indigo-900 font-bold">
                                  {formatCurrency(costVal, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums text-emerald-900 font-bold">
                                  {formatCurrency(saleVal, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {isZero ? (
                                    <span className="inline-block rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200">
                                      Out of Stock
                                    </span>
                                  ) : isLow ? (
                                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-200">
                                      Low Stock Alert
                                    </span>
                                  ) : (
                                    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                      Healthy Stock
                                    </span>
                                  )}
                                </td>
                                <td className="no-print px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleBillInPos(p.id)}
                                      title="Add to active POS Sale cart"
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10.5px] font-bold text-white hover:bg-emerald-700 transition"
                                    >
                                      <ShoppingCart className="h-3 w-3" />
                                      <span>POS</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        closeInventoryBalanceModal();
                                        openPriceSettingsModal();
                                      }}
                                      title="Edit Sale & Cost Price"
                                      className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                                    >
                                      <Settings className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* Grand Total Row */}
                      {filteredProducts.length > 0 && (
                        <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 text-[11.5px]">
                          <tr>
                            <td className="px-3 py-2.5 text-center" colSpan={3}>
                              Consolidated Summary ({filteredProducts.length} Items Displayed)
                            </td>
                            <td className="px-3 py-2.5 text-center">-</td>
                            <td className="px-3 py-2.5 text-center">-</td>
                            <td className="px-3 py-2.5 text-center">-</td>
                            <td className="px-3 py-2.5 text-center tabular-nums font-black text-sky-950">
                              {filteredProducts
                                .reduce((sum, p) => sum + p.stock_qty, 0)
                                .toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums font-black text-indigo-950">
                              {formatCurrency(
                                filteredProducts.reduce(
                                  (sum, p) => sum + p.stock_qty * (p.cost_price || 0),
                                  0
                                ),
                                settings.currency_symbol
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums font-black text-emerald-950">
                              {formatCurrency(
                                filteredProducts.reduce(
                                  (sum, p) => sum + p.stock_qty * (p.sale_price || 0),
                                  0
                                ),
                                settings.currency_symbol
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">-</td>
                            <td className="no-print px-3 py-2.5 text-center">-</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 2: MULTI-TENANT BRANCH STOCK MATRIX                             */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'matrix' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center w-28">SKU</th>
                          <th className="px-3 py-2.5 text-center">Product Name</th>
                          <th className="px-3 py-2.5 text-center">Category</th>
                          {/* Branch Columns */}
                          {branches.map((b) => (
                            <th key={b.id} className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Store className="h-3 w-3 text-sky-600" />
                                <span>{b.display_name}</span>
                              </div>
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-center font-black text-slate-900">
                            Total Units
                          </th>
                          <th className="px-3 py-2.5 text-center w-48">
                            Inter-Branch Advice
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map((p, idx) => {
                          const branchStocks = p.branch_stocks || {};
                          let minBranchQty = Infinity;
                          let maxBranchQty = -Infinity;
                          let maxBranchName = '';
                          let zeroCount = 0;

                          branches.forEach((b) => {
                            const q = branchStocks[b.id] ?? 0;
                            if (q < minBranchQty) minBranchQty = q;
                            if (q > maxBranchQty) {
                              maxBranchQty = q;
                              maxBranchName = b.display_name;
                            }
                            if (q <= 0) zeroCount += 1;
                          });

                          const needsTransfer =
                            branches.length > 1 &&
                            zeroCount > 0 &&
                            maxBranchQty >= 20;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2 text-center font-bold text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-slate-800 tabular-nums">
                                {p.sku}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-slate-900">
                                {p.name}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-600">
                                {p.category || 'General'}
                              </td>
                              {/* Branch Quantities */}
                              {branches.map((b) => {
                                const q = branchStocks[b.id] ?? 0;
                                const isBZero = q <= 0;
                                const isBLow = !isBZero && q <= 20;

                                return (
                                  <td key={b.id} className="px-3 py-2 text-center">
                                    <span
                                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                                        isBZero
                                          ? 'bg-rose-100 text-rose-800'
                                          : isBLow
                                          ? 'bg-amber-100 text-amber-900'
                                          : 'bg-slate-100 text-slate-800'
                                      }`}
                                    >
                                      {q} {p.unit || 'Pcs'}
                                    </span>
                                  </td>
                                );
                              })}
                              {/* Total Units */}
                              <td className="px-3 py-2 text-center font-black text-sky-950 tabular-nums text-xs">
                                {p.stock_qty.toLocaleString()}
                              </td>
                              {/* Inter-Branch Transfer Advice */}
                              <td className="px-3 py-2 text-center">
                                {needsTransfer ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-300">
                                    <ArrowRightLeft className="h-3 w-3 text-amber-600" />
                                    <span>Transfer from {maxBranchName}</span>
                                  </span>
                                ) : p.stock_qty <= 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-800 border border-rose-200">
                                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                                    <span>Reorder Needed</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                    <span>Balanced</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 3: LOW STOCK & REORDER ALERTS                                   */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'alerts' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center w-28">SKU</th>
                          <th className="px-3 py-2.5 text-center">Product Name</th>
                          <th className="px-3 py-2.5 text-center">Category</th>
                          <th className="px-3 py-2.5 text-center">Current Stock</th>
                          <th className="px-3 py-2.5 text-center">Urgency Level</th>
                          <th className="px-3 py-2.5 text-center">Suggested Batch Intake</th>
                          <th className="no-print px-3 py-2.5 text-center w-36">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {alertProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                              <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                              <p className="text-sm font-bold text-slate-700">All Stock Levels Optimal!</p>
                              <p className="text-xs text-slate-400">
                                No products are currently below the reorder threshold (25 units).
                              </p>
                            </td>
                          </tr>
                        ) : (
                          alertProducts.map((p, idx) => {
                            const isZero = p.stock_qty <= 0;
                            const suggestedIntake = isZero ? 100 : Math.max(50, 100 - p.stock_qty);

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-slate-800 tabular-nums">
                                  {p.sku}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                  {p.name}
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-600">
                                  {p.category || 'General'}
                                </td>
                                <td className="px-3 py-2.5 text-center font-black tabular-nums text-rose-700 text-xs">
                                  {p.stock_qty} {p.unit || 'Pcs'}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {isZero ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-extrabold text-rose-800">
                                      <PackageX className="h-3 w-3" />
                                      <span>Critical: Out of Stock</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-900">
                                      <AlertTriangle className="h-3 w-3 text-amber-700" />
                                      <span>Warning: Low Reserve</span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-800">
                                  +{suggestedIntake} {p.unit || 'Pcs'}
                                </td>
                                <td className="no-print px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeInventoryBalanceModal();
                                      openStockOpeningModal();
                                    }}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                                  >
                                    <PackagePlus className="h-3 w-3" />
                                    <span>Stock Intake</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Printable Auditor & Store Keeper Sign-Off Block */}
            <div className="hidden print:grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-slate-300 text-xs text-slate-700">
              <div className="border-t border-slate-400 pt-2 text-center font-bold">
                Store Keeper / Incharge
              </div>
              <div className="border-t border-slate-400 pt-2 text-center font-bold">
                Branch Manager Verification
              </div>
              <div className="border-t border-slate-400 pt-2 text-center font-bold">
                Internal Auditor Sign &amp; Stamp
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* WINDOW FOOTER WITH STATUS & SHORTCUTS                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">
                Active Tenant: {settings.business_name || 'Retail Point of Sale'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="tabular-nums">
                {products.length} Products Loaded
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Press <kbd className="rounded border bg-white px-1 font-mono text-[10px]">Esc</kbd> to close
              </span>
              <button
                type="button"
                onClick={closeInventoryBalanceModal}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
