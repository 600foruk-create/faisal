'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  PieChart,
  Printer,
  Receipt,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  Undo2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency, getDateRangeForPreset, roundMoney } from '@/lib/format';

interface BranchComparisonRow {
  branch_id: number;
  display_name: string;
  invoice_count: number;
  gross_sales: number;
  returns_total: number;
  net_sales: number;
  net_tax: number;
}

interface TopProductRow {
  product_id: number;
  sku: string;
  item_name: string;
  net_qty: number;
  net_revenue: number;
  net_tax: number;
}

interface TaxSummaryData {
  taxable_sales: number;
  output_tax: number;
  return_taxable: number;
  return_tax: number;
  net_tax_payable: number;
}

interface ReportsPayload {
  branchComparison: BranchComparisonRow[];
  topProducts: TopProductRow[];
  taxSummary: TaxSummaryData;
}

type SummaryTab = 'branches' | 'products' | 'tax' | 'tenders';

export function SaleSummaryModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeSaleSummaryModal,
    openSalesRegisterModal,
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
  const [activeTab, setActiveTab] = useState<SummaryTab>('branches');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data
  const [reportData, setReportData] = useState<ReportsPayload | null>(null);
  const [tenderTotals, setTenderTotals] = useState({
    netSale: 0,
    cashReceived: 0,
    cardReceived: 0,
    bankReceived: 0,
  });
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

  // Load Sales Summary Report
  const loadSummaryData = useCallback(async () => {
    setLoading(true);
    try {
      const repParams = new URLSearchParams({
        branchId,
        fromDate,
        toDate,
      });
      const salesParams = new URLSearchParams({
        branchId,
        fromDate,
        toDate,
        limit: '1',
      });

      const [repRes, salesRes] = await Promise.all([
        fetch(`/api/reports?${repParams.toString()}`),
        fetch(`/api/sales?${salesParams.toString()}`),
      ]);

      if (repRes.ok) {
        const data = (await repRes.json()) as ReportsPayload;
        setReportData(data);
      } else {
        showToast('Failed to load sale summary report.', 'error');
      }

      if (salesRes.ok) {
        const salesData = (await salesRes.json()) as {
          totals: {
            netSale: number;
            cashReceived: number;
            cardReceived: number;
            bankReceived: number;
          };
        };
        if (salesData.totals) {
          setTenderTotals(salesData.totals);
        }
      }
    } catch {
      showToast('Network error while generating sales summary.', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, showToast]);

  useEffect(() => {
    void loadSummaryData();
  }, [loadSummaryData, refreshNonce]);

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

  // Consolidated Totals Across All Branches
  const consolidatedTotals = useMemo(() => {
    if (!reportData || !reportData.branchComparison) {
      return {
        grossSales: 0,
        returnsTotal: 0,
        netSales: 0,
        netTax: 0,
        totalInvoices: 0,
        avgOrderValue: 0,
      };
    }
    const gross = reportData.branchComparison.reduce((sum, b) => sum + (b.gross_sales || 0), 0);
    const returns = reportData.branchComparison.reduce((sum, b) => sum + (b.returns_total || 0), 0);
    const net = reportData.branchComparison.reduce((sum, b) => sum + (b.net_sales || 0), 0);
    const tax = reportData.branchComparison.reduce((sum, b) => sum + (b.net_tax || 0), 0);
    const count = reportData.branchComparison.reduce((sum, b) => sum + (b.invoice_count || 0), 0);
    const aov = count > 0 ? roundMoney(net / count) : 0;

    return {
      grossSales: roundMoney(gross),
      returnsTotal: roundMoney(returns),
      netSales: roundMoney(net),
      netTax: roundMoney(tax),
      totalInvoices: count,
      avgOrderValue: aov,
    };
  }, [reportData]);

  // Filtered Branch Rows
  const filteredBranches = useMemo(() => {
    if (!reportData?.branchComparison) return [];
    if (!searchQuery.trim()) return reportData.branchComparison;
    const q = searchQuery.toLowerCase().trim();
    return reportData.branchComparison.filter(
      (b) =>
        b.display_name.toLowerCase().includes(q) ||
        String(b.net_sales).includes(q) ||
        String(b.invoice_count).includes(q)
    );
  }, [reportData, searchQuery]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!reportData?.topProducts) return [];
    if (!searchQuery.trim()) return reportData.topProducts;
    const q = searchQuery.toLowerCase().trim();
    return reportData.topProducts.filter(
      (p) =>
        p.item_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        String(p.net_revenue).includes(q)
    );
  }, [reportData, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    if (!reportData || reportData.branchComparison.length === 0) {
      showToast('No sales data to export.', 'error');
      return;
    }
    const header = [
      'Branch Name',
      'Sale Invoices',
      'Gross Sales',
      'Sales Returns',
      'Net Sales',
      'Net GST/Tax',
      'Market Share (%)',
      'Avg Ticket Value',
    ];
    const rows = reportData.branchComparison.map((b) => {
      const share =
        consolidatedTotals.netSales > 0
          ? ((b.net_sales / consolidatedTotals.netSales) * 100).toFixed(1)
          : '0.0';
      const avg = b.invoice_count > 0 ? (b.net_sales / b.invoice_count).toFixed(2) : '0.00';
      return [
        b.display_name,
        b.invoice_count,
        b.gross_sales,
        b.returns_total,
        b.net_sales,
        b.net_tax,
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
    link.download = `sale-summary-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Sale summary exported to CSV successfully.', 'success');
  };

  // Print Summary Report
  const handlePrint = () => {
    window.print();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSaleSummaryModal();
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
  }, [closeSaleSummaryModal, handlePrint, handleExportCsv]);

  // Active Branch Display
  const currentBranchLabel = useMemo(() => {
    if (branchId === 'ALL') return 'All Multi-Tenant Branches (Consolidated)';
    const found = branches.find((b) => String(b.id) === branchId);
    return found ? found.display_name : 'Selected Branch';
  }, [branchId, branches]);

  return (
    <>
      {/* Print Stylesheet for formal Executive Sale Summary Report */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-sale-summary,
          #printable-sale-summary * {
            visibility: visible;
          }
          #printable-sale-summary {
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
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Sale Summary &amp; Revenue Analytics
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/30">
                    Executive Analytics
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  Multi-Tenant Branch Revenue Comparison, Growth &amp; Payment Settlement Audit
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
                onClick={closeSaleSummaryModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP MULTI-TENANT FILTER & DATE PRESET BAR                                 */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch / Tenant Selector */}
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
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter branch or product..."
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
                title="Export Summary to CSV (Ctrl+E)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print Summary Report (Ctrl+P)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">Print Report</span>
              </button>

              <button
                type="button"
                onClick={() => void loadSummaryData()}
                disabled={loading}
                title="Refresh Report"
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
          {/* 6 HIGH-CONTRAST EXECUTIVE KPI METRIC CARDS                                */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Net Sales */}
            <div className="flex flex-col rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Net Sales Revenue
              </span>
              <div className="mt-1 text-lg font-black text-emerald-900 tabular-nums">
                {formatCurrency(consolidatedTotals.netSales, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-emerald-700">Gross minus returns</span>
            </div>

            {/* Gross Sales */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Gross Sales
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                {formatCurrency(consolidatedTotals.grossSales, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-slate-500">Before deductions</span>
            </div>

            {/* Sales Returns */}
            <div className="flex flex-col rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                Sales Returns
              </span>
              <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                -{formatCurrency(consolidatedTotals.returnsTotal, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-rose-600">Customer refunds</span>
            </div>

            {/* Net GST / Tax */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Net Sales Tax (GST)
              </span>
              <div className="mt-1 text-lg font-black text-sky-900 tabular-nums">
                {formatCurrency(consolidatedTotals.netTax, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-sky-700">Output tax payable</span>
            </div>

            {/* Total Invoices */}
            <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Invoices Issued
              </span>
              <div className="mt-1 text-lg font-black text-indigo-950 tabular-nums">
                {consolidatedTotals.totalInvoices} Bills
              </div>
              <span className="text-[9.5px] text-indigo-700">Transactions processed</span>
            </div>

            {/* Average Order Value (AOV) */}
            <div className="flex flex-col rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Avg Ticket Value
              </span>
              <div className="mt-1 text-lg font-black text-amber-950 tabular-nums">
                {formatCurrency(consolidatedTotals.avgOrderValue, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-amber-700">Revenue per bill</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB NAVIGATION STRIP                                                      */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'branches'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 text-sky-600" />
              <span>Multi-Tenant Branch Comparison</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                {reportData?.branchComparison.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'products'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span>Top Selling Products</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                {reportData?.topProducts.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tenders')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'tenders'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Wallet className="h-3.5 w-3.5 text-amber-600" />
              <span>Payment Tender Breakdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tax')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'tax'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <ReceiptText className="h-3.5 w-3.5 text-indigo-600" />
              <span>GST / Sales Tax Audit</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS & DATA TABLES                                                */}
          {/* ========================================================================= */}
          <div id="printable-sale-summary" className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* Printable Formal Letterhead (Visible on print) */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {settings.business_name || 'Retail Point of Sale'}
              </h2>
              <p className="text-xs text-slate-600">
                Sale Summary Report • Period: {fromDate} to {toDate} • Branch: {currentBranchLabel}
              </p>
            </div>

            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                <span className="text-xs font-semibold">Generating multi-branch sale summary...</span>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------------- */}
                {/* TAB 1: MULTI-TENANT BRANCH COMPARISON TABLE                         */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'branches' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center">Branch / Tenant Name</th>
                          <th className="px-3 py-2.5 text-center">Sale Bills</th>
                          <th className="px-3 py-2.5 text-center">Gross Sales</th>
                          <th className="px-3 py-2.5 text-center">Sales Returns</th>
                          <th className="px-3 py-2.5 text-center">Net Sales</th>
                          <th className="px-3 py-2.5 text-center">Net Tax</th>
                          <th className="px-3 py-2.5 text-center w-36">Revenue Share</th>
                          <th className="px-3 py-2.5 text-center">Avg Ticket</th>
                          <th className="no-print px-3 py-2.5 text-center w-28">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredBranches.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                              <Store className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-600">No branch sales found</p>
                              <p className="text-[11px] text-slate-400">
                                Expand your date range to include recorded transactions.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredBranches.map((row, idx) => {
                            const share =
                              consolidatedTotals.netSales > 0
                                ? Math.max(0, (row.net_sales / consolidatedTotals.netSales) * 100)
                                : 0;
                            const avgTicket =
                              row.invoice_count > 0 ? row.net_sales / row.invoice_count : 0;

                            return (
                              <tr key={row.branch_id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                                    <Store className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                    <span>{row.display_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-semibold text-slate-700 tabular-nums">
                                  {row.invoice_count}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-slate-700 font-medium">
                                  {formatCurrency(row.gross_sales, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-rose-700 font-semibold">
                                  -{formatCurrency(row.returns_total, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center font-black text-slate-900 tabular-nums text-[13px]">
                                  {formatCurrency(row.net_sales, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-sky-800 font-semibold">
                                  {formatCurrency(row.net_tax, settings.currency_symbol)}
                                </td>
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
                                <td className="px-3 py-2.5 text-center tabular-nums text-slate-800 font-semibold">
                                  {formatCurrency(avgTicket, settings.currency_symbol)}
                                </td>
                                <td className="no-print px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeSaleSummaryModal();
                                      openSalesRegisterModal();
                                    }}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 transition"
                                  >
                                    <Eye className="h-3 w-3 text-sky-600" />
                                    <span>Ledger</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* Summary Footer Row */}
                      {filteredBranches.length > 0 && (
                        <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 text-[11.5px]">
                          <tr>
                            <td className="px-3 py-2.5 text-center" colSpan={2}>
                              Consolidated Grand Total
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {consolidatedTotals.totalInvoices}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {formatCurrency(consolidatedTotals.grossSales, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-rose-700">
                              -{formatCurrency(consolidatedTotals.returnsTotal, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-[13px] font-black text-emerald-800">
                              {formatCurrency(consolidatedTotals.netSales, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-sky-900">
                              {formatCurrency(consolidatedTotals.netTax, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              100.0%
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {formatCurrency(consolidatedTotals.avgOrderValue, settings.currency_symbol)}
                            </td>
                            <td className="no-print px-3 py-2.5 text-center">-</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 2: TOP SELLING PRODUCTS TABLE                                   */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'products' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center">SKU</th>
                          <th className="px-3 py-2.5 text-center">Product Name</th>
                          <th className="px-3 py-2.5 text-center">Net Qty Sold</th>
                          <th className="px-3 py-2.5 text-center">Net Revenue</th>
                          <th className="px-3 py-2.5 text-center">GST Charged</th>
                          <th className="px-3 py-2.5 text-center w-36">Revenue Contribution</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              <Package className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-600">No sold products recorded</p>
                              <p className="text-[11px] text-slate-400">
                                Product sales for this time range will appear here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p, idx) => {
                            const share =
                              consolidatedTotals.netSales > 0
                                ? Math.max(0, (p.net_revenue / consolidatedTotals.netSales) * 100)
                                : 0;

                            return (
                              <tr key={p.product_id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-slate-600 tabular-nums">
                                  {p.sku}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                  {p.item_name}
                                </td>
                                <td className="px-3 py-2.5 text-center font-black text-slate-800 tabular-nums">
                                  {p.net_qty}
                                </td>
                                <td className="px-3 py-2.5 text-center font-black text-emerald-800 tabular-nums text-[13px]">
                                  {formatCurrency(p.net_revenue, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-sky-800 font-semibold">
                                  {formatCurrency(p.net_tax, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                                        style={{ width: `${Math.min(100, share)}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 tabular-nums w-10 text-right">
                                      {share.toFixed(1)}%
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
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 3: PAYMENT TENDER BREAKDOWN CARDS & METRICS                     */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'tenders' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Cash */}
                    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          Net Cash Received
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Wallet className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-emerald-900 tabular-nums">
                        {formatCurrency(tenderTotals.cashReceived, settings.currency_symbol)}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Physical counter cash collected minus customer cash returns.
                      </p>
                    </div>

                    {/* Card (POS Terminals) */}
                    <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                          Debit / Credit Cards
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <CreditCard className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-sky-950 tabular-nums">
                        {formatCurrency(tenderTotals.cardReceived, settings.currency_symbol)}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        POS terminal swipe / chip electronic card settlements.
                      </p>
                    </div>

                    {/* Bank / Raast */}
                    <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                          Bank / Raast Transfer
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <Building2 className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-indigo-950 tabular-nums">
                        {formatCurrency(tenderTotals.bankReceived, settings.currency_symbol)}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Direct bank deposit, online IBFT &amp; Raast instant payments.
                      </p>
                    </div>

                    {/* Combined Settlements */}
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Total Settlements
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                          <Receipt className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-slate-900 tabular-nums">
                        {formatCurrency(
                          tenderTotals.cashReceived +
                            tenderTotals.cardReceived +
                            tenderTotals.bankReceived,
                          settings.currency_symbol
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Combined revenue collected across all payment channels.
                      </p>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 4: GST / SALES TAX AUDIT MATRIX                                 */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'tax' && reportData?.taxSummary && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Taxable Sales Value
                      </span>
                      <div className="mt-2 text-xl font-black text-slate-900 tabular-nums">
                        {formatCurrency(reportData.taxSummary.taxable_sales, settings.currency_symbol)}
                      </div>
                      <span className="text-[10.5px] text-slate-400">Total taxable base</span>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-2xs">
                      <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                        Output Sales Tax
                      </span>
                      <div className="mt-2 text-xl font-black text-sky-900 tabular-nums">
                        {formatCurrency(reportData.taxSummary.output_tax, settings.currency_symbol)}
                      </div>
                      <span className="text-[10.5px] text-sky-700">Tax charged on sales</span>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-2xs">
                      <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                        Return Taxable Value
                      </span>
                      <div className="mt-2 text-xl font-black text-rose-700 tabular-nums">
                        -{formatCurrency(reportData.taxSummary.return_taxable, settings.currency_symbol)}
                      </div>
                      <span className="text-[10.5px] text-rose-600">Refunded goods base</span>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-2xs">
                      <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                        Return Tax Credit
                      </span>
                      <div className="mt-2 text-xl font-black text-rose-700 tabular-nums">
                        -{formatCurrency(reportData.taxSummary.return_tax, settings.currency_symbol)}
                      </div>
                      <span className="text-[10.5px] text-rose-600">Reversed sales tax</span>
                    </div>

                    <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-2xs">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Net GST / Tax Payable
                      </span>
                      <div className="mt-2 text-2xl font-black text-emerald-900 tabular-nums">
                        {formatCurrency(reportData.taxSummary.net_tax_payable, settings.currency_symbol)}
                      </div>
                      <span className="text-[10.5px] text-emerald-700">Output tax minus return credit</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Print Sign-off lines */}
            <div className="hidden print:flex justify-between pt-16 text-xs text-slate-700 border-t border-slate-300 mt-12">
              <div className="text-center w-52 border-t border-slate-400 pt-1.5 font-semibold">
                Accounts Officer Signature
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
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <span>
                Audited Period:{' '}
                <strong className="text-slate-900">
                  {fromDate} to {toDate}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Branches Audited:{' '}
                <strong className="text-slate-900">
                  {reportData?.branchComparison.length || 0}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeSaleSummaryModal}
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
                <span>Print Summary Report (Ctrl+P)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
