'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Maximize2,
  Medal,
  Minimize2,
  Minus,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency, getDateRangeForPreset, roundMoney } from '@/lib/format';

interface TopProductItem {
  product_id: number;
  sku: string;
  item_name: string;
  net_qty: number;
  net_revenue: number;
  net_tax: number;
}

interface ReportsPayload {
  branchComparison: unknown[];
  topProducts: TopProductItem[];
  taxSummary: unknown;
}

type SortCriterion = 'revenue' | 'quantity' | 'tax' | 'name';

export function TopProductsModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeTopProductsModal,
    openPosSale,
    setSelectedProductIdForPos,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Multi-Tenant Branch & Date Filters
  const initialBranch = activeBranchId ? String(activeBranchId) : 'ALL';
  const [branchId, setBranchId] = useState<string>(initialBranch);
  const defaultRange = getDateRangeForPreset('month');
  const [activePreset, setActivePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');
  const [fromDate, setFromDate] = useState<string>(defaultRange.from);
  const [toDate, setToDate] = useState<string>(defaultRange.to);
  const [sortBy, setSortBy] = useState<SortCriterion>('revenue');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data
  const [products, setProducts] = useState<TopProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Sync initial branch if global active branch changes
  useEffect(() => {
    if (activeBranchId) {
      setBranchId(String(activeBranchId));
    }
  }, [activeBranchId]);

  // Load Top Products Data
  const loadTopProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId,
        fromDate,
        toDate,
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as ReportsPayload;
        setProducts(data.topProducts || []);
      } else {
        showToast('Failed to load top products analytics.', 'error');
      }
    } catch {
      showToast('Network error while loading top products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, showToast]);

  useEffect(() => {
    void loadTopProducts();
  }, [loadTopProducts, refreshNonce]);

  // Date Preset Switcher
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setFromDate('2020-01-01');
      setToDate(getDateRangeForPreset('today').to);
    } else {
      const range = getDateRangeForPreset(preset);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  // Filter & Sort Products
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.item_name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          String(p.net_revenue).includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'revenue') return b.net_revenue - a.net_revenue;
      if (sortBy === 'quantity') return b.net_qty - a.net_qty;
      if (sortBy === 'tax') return b.net_tax - a.net_tax;
      if (sortBy === 'name') return a.item_name.localeCompare(b.item_name);
      return 0;
    });

    return result;
  }, [products, searchQuery, sortBy]);

  // Consolidated Summary Calculations
  const summaryTotals = useMemo(() => {
    const totalRev = processedProducts.reduce((sum, p) => sum + (p.net_revenue || 0), 0);
    const totalQty = processedProducts.reduce((sum, p) => sum + (p.net_qty || 0), 0);
    const totalTax = processedProducts.reduce((sum, p) => sum + (p.net_tax || 0), 0);
    const avgPrice = totalQty > 0 ? roundMoney(totalRev / totalQty) : 0;
    const topItem = processedProducts.length > 0 ? processedProducts[0] : null;

    return {
      totalRev: roundMoney(totalRev),
      totalQty,
      totalTax: roundMoney(totalTax),
      avgPrice,
      topItem,
    };
  }, [processedProducts]);

  // Export CSV
  const handleExportCsv = () => {
    if (processedProducts.length === 0) {
      showToast('No products data to export.', 'error');
      return;
    }
    const header = [
      'Rank',
      'SKU',
      'Product Name',
      'Net Qty Sold',
      'Net Revenue',
      'GST Tax Charged',
      'Revenue Share (%)',
      'Average Realized Price',
    ];
    const rows = processedProducts.map((p, idx) => {
      const share =
        summaryTotals.totalRev > 0
          ? ((p.net_revenue / summaryTotals.totalRev) * 100).toFixed(1)
          : '0.0';
      const avg = p.net_qty > 0 ? (p.net_revenue / p.net_qty).toFixed(2) : '0.00';
      return [
        idx + 1,
        p.sku,
        p.item_name,
        p.net_qty,
        p.net_revenue,
        p.net_tax,
        `${share}%`,
        avg,
      ];
    });

    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `top-products-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Top products data exported to CSV successfully.', 'success');
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Create POS Sale with Item
  const handleSelectProductForPos = (productId: number) => {
    closeTopProductsModal();
    setSelectedProductIdForPos(productId);
    openPosSale();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTopProductsModal();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleExportCsv();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeTopProductsModal, handlePrint, handleExportCsv]);

  // Active Branch Display
  const currentBranchLabel = useMemo(() => {
    if (branchId === 'ALL') return 'All Multi-Tenant Branches (Consolidated)';
    const found = branches.find((b) => String(b.id) === branchId);
    return found ? found.display_name : 'Selected Branch';
  }, [branchId, branches]);

  return (
    <>
      {/* Print Stylesheet for Top Products Report */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-top-products,
          #printable-top-products * {
            visibility: visible;
          }
          #printable-top-products {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* MODAL BACKDROP */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-[2px] p-2 sm:p-4">
        {/* MODAL CONTAINER */}
        <div
          className={`flex flex-col overflow-hidden rounded-2xl border border-sky-500/30 bg-white shadow-2xl transition-all duration-200 ${
            isMaximized
              ? 'h-full w-full max-w-none rounded-none'
              : 'h-[92vh] max-h-[920px] w-full max-w-[1400px]'
          }`}
        >
          {/* ========================================================================= */}
          {/* EXECUTIVE MIDNIGHT NAVY TITLE BAR                                         */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white select-none">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                <Package className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Top Products &amp; Velocity Analytics
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/30">
                    Velocity Ranking
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  Multi-Tenant Best-Selling Items, Units Sold, Realized Revenue &amp; Inventory Velocity
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
                onClick={closeTopProductsModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP MULTI-TENANT FILTER & SORTING BAR                                     */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
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

              {/* Date Presets */}
              <div className="hidden sm:flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activePreset === 'today'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('yesterday')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activePreset === 'yesterday'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('week')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activePreset === 'week'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('month')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activePreset === 'month'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activePreset === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 font-semibold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 font-semibold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Sort By Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortCriterion)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="revenue">Highest Net Revenue</option>
                  <option value="quantity">Highest Quantity Sold</option>
                  <option value="tax">Highest GST Tax Generated</option>
                  <option value="name">Product Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter product name or SKU..."
                  className="h-8 w-48 sm:w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-sky-500 focus:outline-hidden"
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
                onClick={handleExportCsv}
                title="Export Products to CSV (Ctrl+E)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print Report (Ctrl+P)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">Print Report</span>
              </button>

              <button
                type="button"
                onClick={() => void loadTopProducts()}
                disabled={loading}
                title="Refresh Top Products"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOAST MESSAGE BANNER                                                      */}
          {/* ========================================================================= */}
          {toastMessage && (
            <div
              className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold ${
                toastMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span className="flex-1">{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="rounded p-0.5 hover:bg-black/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4 HIGH-CONTRAST EXECUTIVE KPI METRIC CARDS                                */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-white p-3 sm:grid-cols-4">
            {/* Top Products Revenue */}
            <div className="flex flex-col rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 shadow-2xs">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">
                Top Products Revenue
              </span>
              <div className="mt-1 text-xl font-black text-emerald-950 tabular-nums">
                {formatCurrency(summaryTotals.totalRev, settings.currency_symbol)}
              </div>
              <span className="text-[10px] text-emerald-700">Combined revenue of listed items</span>
            </div>

            {/* Total Units Sold */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/60 p-3 shadow-2xs">
              <span className="text-[10.5px] font-bold text-sky-800 uppercase tracking-wider">
                Total Units Sold
              </span>
              <div className="mt-1 text-xl font-black text-sky-950 tabular-nums">
                {summaryTotals.totalQty} Units
              </div>
              <span className="text-[10px] text-sky-700">Net quantity delivered to customers</span>
            </div>

            {/* Average Selling Price */}
            <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 shadow-2xs">
              <span className="text-[10.5px] font-bold text-indigo-800 uppercase tracking-wider">
                Average Realized Price
              </span>
              <div className="mt-1 text-xl font-black text-indigo-950 tabular-nums">
                {formatCurrency(summaryTotals.avgPrice, settings.currency_symbol)}
              </div>
              <span className="text-[10px] text-indigo-700">Revenue per sold unit</span>
            </div>

            {/* #1 Top Best-Seller */}
            <div className="flex flex-col rounded-xl border border-amber-300 bg-amber-50/60 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider">
                  #1 Top Best-Seller
                </span>
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-1 text-base font-black text-amber-950 truncate" title={summaryTotals.topItem?.item_name || 'None'}>
                {summaryTotals.topItem ? summaryTotals.topItem.item_name : 'No sales yet'}
              </div>
              <span className="text-[10px] text-amber-800 font-semibold tabular-nums">
                {summaryTotals.topItem
                  ? `${formatCurrency(summaryTotals.topItem.net_revenue, settings.currency_symbol)} (${summaryTotals.topItem.net_qty} units)`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DATA SPREADSHEET TABLE                                                    */}
          {/* ========================================================================= */}
          <div id="printable-top-products" className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* Printable Header (Visible on print) */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {settings.business_name || 'Retail Point of Sale'}
              </h2>
              <p className="text-xs text-slate-600">
                Top Products &amp; Velocity Report • Period: {fromDate} to {toDate} • Branch: {currentBranchLabel}
              </p>
            </div>

            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                <span className="text-xs font-semibold">Analyzing product velocity and sales rankings...</span>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full border-collapse text-left text-xs">
                  {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                  <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-14">Rank</th>
                      <th className="px-3 py-2.5 text-center w-24">SKU</th>
                      <th className="px-3 py-2.5 text-center">Product Name</th>
                      <th className="px-3 py-2.5 text-center w-28">Net Qty Sold</th>
                      <th className="px-3 py-2.5 text-center w-32">Net Revenue</th>
                      <th className="px-3 py-2.5 text-center w-28">GST Charged</th>
                      <th className="px-3 py-2.5 text-center w-36">Revenue Share</th>
                      <th className="px-3 py-2.5 text-center w-28">Avg Unit Price</th>
                      <th className="no-print px-3 py-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {processedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-bold text-slate-600">No sold products found</p>
                          <p className="text-xs text-slate-400">
                            Try expanding your date range or clearing search filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      processedProducts.map((p, idx) => {
                        const rank = idx + 1;
                        const share =
                          summaryTotals.totalRev > 0
                            ? Math.max(0, (p.net_revenue / summaryTotals.totalRev) * 100)
                            : 0;
                        const avgUnitPrice = p.net_qty > 0 ? p.net_revenue / p.net_qty : 0;

                        return (
                          <tr key={p.product_id} className="hover:bg-slate-50/80 transition">
                            {/* Rank Badge */}
                            <td className="px-3 py-2.5 text-center">
                              {rank === 1 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-black text-xs ring-1 ring-amber-400/40">
                                  1
                                </span>
                              ) : rank === 2 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-800 font-black text-xs ring-1 ring-slate-400/40">
                                  2
                                </span>
                              ) : rank === 3 ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/15 text-amber-900 font-black text-xs ring-1 ring-amber-700/30">
                                  3
                                </span>
                              ) : (
                                <span className="font-bold text-slate-400 tabular-nums">
                                  {rank}
                                </span>
                              )}
                            </td>

                            {/* SKU Code */}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-600 tabular-nums">
                              {p.sku}
                            </td>

                            {/* Product Name */}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                              <div className="truncate max-w-[280px] mx-auto">
                                {p.item_name}
                              </div>
                            </td>

                            {/* Net Quantity Sold */}
                            <td className="px-3 py-2.5 text-center font-black text-slate-800 tabular-nums text-[12.5px]">
                              {p.net_qty}
                            </td>

                            {/* Net Revenue */}
                            <td className="px-3 py-2.5 text-center font-black text-emerald-800 tabular-nums text-[13px]">
                              {formatCurrency(p.net_revenue, settings.currency_symbol)}
                            </td>

                            {/* GST Charged */}
                            <td className="px-3 py-2.5 text-center tabular-nums text-sky-800 font-semibold">
                              {formatCurrency(p.net_tax, settings.currency_symbol)}
                            </td>

                            {/* Revenue Share (%) */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                                    style={{ width: `${Math.min(100, share)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 tabular-nums w-10 text-right">
                                  {share.toFixed(1)}%
                                </span>
                              </div>
                            </td>

                            {/* Average Realized Price */}
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-800 font-semibold">
                              {formatCurrency(avgUnitPrice, settings.currency_symbol)}
                            </td>

                            {/* Actions */}
                            <td className="no-print px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectProductForPos(p.product_id)}
                                title="Add to new POS sale bill"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition"
                              >
                                <ShoppingCart className="h-3 w-3 text-emerald-600" />
                                <span>Sell</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Summary Footer Row */}
                  {processedProducts.length > 0 && (
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 text-[11.5px]">
                      <tr>
                        <td className="px-3 py-2.5 text-center" colSpan={3}>
                          Grand Total (Top Listed Items)
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums font-black">
                          {summaryTotals.totalQty} Units
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-[13px] font-black text-emerald-800">
                          {formatCurrency(summaryTotals.totalRev, settings.currency_symbol)}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-sky-900">
                          {formatCurrency(summaryTotals.totalTax, settings.currency_symbol)}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          100.0%
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {formatCurrency(summaryTotals.avgPrice, settings.currency_symbol)}
                        </td>
                        <td className="no-print px-3 py-2.5 text-center">-</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Print Sign-off lines */}
            <div className="hidden print:flex justify-between pt-16 text-xs text-slate-700 border-t border-slate-300 mt-12">
              <div className="text-center w-52 border-t border-slate-400 pt-1.5 font-semibold">
                Inventory Manager Signature
              </div>
              <div className="text-center w-52 border-t border-slate-400 pt-1.5 font-semibold">
                Managing Director Signature
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ACTIONS FOOTER                                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span>
                Showing <strong className="text-slate-900">{processedProducts.length}</strong> top
                selling items
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Branch: <strong>{currentBranchLabel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTopProductsModal}
                className="h-8 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Close (Esc)
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Report (Ctrl+P)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
