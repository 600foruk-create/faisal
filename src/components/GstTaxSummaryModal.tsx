'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
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
  HelpCircle,
  Maximize2,
  Minimize2,
  Minus,
  Percent,
  Printer,
  Receipt,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency, getDateRangeForPreset, roundMoney } from '@/lib/format';
import type { FbrSyncLogRecord } from '@/lib/types';

interface BranchTaxRow {
  branch_id: number;
  display_name: string;
  invoice_count: number;
  gross_sales: number;
  returns_total: number;
  net_sales: number;
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
  branchComparison: BranchTaxRow[];
  topProducts: unknown[];
  taxSummary: TaxSummaryData;
  fbrLogs?: FbrSyncLogRecord[];
}

type TaxTab = 'branches' | 'slabs' | 'fbr_logs';

export function GstTaxSummaryModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeGstTaxSummaryModal,
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
  const [activeTab, setActiveTab] = useState<TaxTab>('branches');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data
  const [reportData, setReportData] = useState<ReportsPayload | null>(null);
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

  // Load GST Tax Summary Report
  const loadTaxData = useCallback(async () => {
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
        setReportData(data);
      } else {
        showToast('Failed to load GST tax summary report.', 'error');
      }
    } catch {
      showToast('Network error while generating tax summary.', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, showToast]);

  useEffect(() => {
    void loadTaxData();
  }, [loadTaxData, refreshNonce]);

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

  // Tax Summary Figures
  const taxSummary = useMemo<TaxSummaryData>(() => {
    if (reportData?.taxSummary) {
      return reportData.taxSummary;
    }
    return {
      taxable_sales: 0,
      output_tax: 0,
      return_taxable: 0,
      return_tax: 0,
      net_tax_payable: 0,
    };
  }, [reportData]);

  // Consolidated Branch Totals
  const branchTotals = useMemo(() => {
    if (!reportData?.branchComparison) {
      return {
        invoiceCount: 0,
        netTaxTotal: 0,
        netSalesTotal: 0,
      };
    }
    const count = reportData.branchComparison.reduce((sum, b) => sum + (b.invoice_count || 0), 0);
    const tax = reportData.branchComparison.reduce((sum, b) => sum + (b.net_tax || 0), 0);
    const sales = reportData.branchComparison.reduce((sum, b) => sum + (b.net_sales || 0), 0);

    return {
      invoiceCount: count,
      netTaxTotal: roundMoney(tax),
      netSalesTotal: roundMoney(sales),
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
        String(b.net_tax).includes(q) ||
        String(b.invoice_count).includes(q)
    );
  }, [reportData, searchQuery]);

  // Filtered FBR Logs
  const filteredFbrLogs = useMemo(() => {
    if (!reportData?.fbrLogs) return [];
    if (!searchQuery.trim()) return reportData.fbrLogs;
    const q = searchQuery.toLowerCase().trim();
    return reportData.fbrLogs.filter(
      (l) =>
        l.invoice_no.toLowerCase().includes(q) ||
        l.usin.toLowerCase().includes(q) ||
        l.fbr_pos_id.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    if (!reportData || reportData.branchComparison.length === 0) {
      showToast('No tax data to export.', 'error');
      return;
    }
    const header = [
      'Branch Name',
      'Invoices Count',
      'Gross Sales',
      'Sales Returns',
      'Net Sales',
      'Net GST Tax Payable',
      'Tax Share (%)',
    ];
    const rows = reportData.branchComparison.map((b) => {
      const share =
        branchTotals.netTaxTotal > 0
          ? ((b.net_tax / branchTotals.netTaxTotal) * 100).toFixed(1)
          : '0.0';
      return [
        b.display_name,
        b.invoice_count,
        b.gross_sales,
        b.returns_total,
        b.net_sales,
        b.net_tax,
        `${share}%`,
      ];
    });

    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gst-tax-summary-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('GST tax summary exported to CSV successfully.', 'success');
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGstTaxSummaryModal();
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
  }, [closeGstTaxSummaryModal, handlePrint, handleExportCsv]);

  // Active Branch Display
  const currentBranchLabel = useMemo(() => {
    if (branchId === 'ALL') return 'All Multi-Tenant Branches (Consolidated)';
    const found = branches.find((b) => String(b.id) === branchId);
    return found ? found.display_name : 'Selected Branch';
  }, [branchId, branches]);

  return (
    <>
      {/* Print Stylesheet for Formal FBR GST Tax Return Report */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-tax-summary,
          #printable-tax-summary * {
            visibility: visible;
          }
          #printable-tax-summary {
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
                <ReceiptText className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    GST / Sales Tax Summary &amp; FBR Fiscal Audit
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/30">
                    FBR POS Compliance
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  Multi-Tenant Output Tax, Return Credits, Net GST Liability &amp; FBR Certified USIN Audit
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
                onClick={closeGstTaxSummaryModal}
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
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter branch or invoice..."
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
                title="Export Tax Summary to CSV (Ctrl+E)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print FBR Tax Audit Report (Ctrl+P)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">Print Tax Report</span>
              </button>

              <button
                type="button"
                onClick={() => void loadTaxData()}
                disabled={loading}
                title="Refresh Tax Report"
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
          {/* VISUAL PLAIN-ENGLISH TAX FORMULA BANNER (EASY TO UNDERSTAND)              */}
          {/* ========================================================================= */}
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Percent className="h-4 w-4 text-sky-600" />
                  <span>How FBR Net Sales Tax (GST) is Calculated</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Formula: <strong>Output Tax (Sales) - Return Tax (Credits) = Net Tax Payable</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-center">
                {/* 1. Output Tax */}
                <div className="rounded-lg border border-sky-200 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-sky-800 uppercase tracking-wider">
                    1. Output Sales Tax (+)
                  </span>
                  <div className="mt-1 text-lg font-black text-sky-950 tabular-nums">
                    +{formatCurrency(taxSummary.output_tax, settings.currency_symbol)}
                  </div>
                  <span className="text-[10px] text-slate-500">Tax charged on customer sales</span>
                </div>

                {/* 2. Return Tax Credit */}
                <div className="rounded-lg border border-rose-200 bg-white p-2.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-rose-700 uppercase tracking-wider">
                    2. Return Tax Credit (-)
                  </span>
                  <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                    -{formatCurrency(taxSummary.return_tax, settings.currency_symbol)}
                  </div>
                  <span className="text-[10px] text-slate-500">Tax reversed on customer returns</span>
                </div>

                {/* 3. Net Tax Payable */}
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">
                    3. Net GST Payable to FBR (=)
                  </span>
                  <div className="mt-1 text-lg font-black text-emerald-900 tabular-nums">
                    {formatCurrency(taxSummary.net_tax_payable, settings.currency_symbol)}
                  </div>
                  <span className="text-[10px] text-emerald-700">Official net tax liability</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5 HIGH-CONTRAST EXECUTIVE FISCAL KPI METRIC CARDS                         */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Taxable Sales Base */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Taxable Sales Base
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                {formatCurrency(taxSummary.taxable_sales, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-slate-500">Net goods value subject to tax</span>
            </div>

            {/* Output Sales Tax */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Output Sales Tax
              </span>
              <div className="mt-1 text-lg font-black text-sky-950 tabular-nums">
                {formatCurrency(taxSummary.output_tax, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-sky-700">Gross tax collected on sales</span>
            </div>

            {/* Return Taxable Value */}
            <div className="flex flex-col rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                Return Taxable Base
              </span>
              <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                -{formatCurrency(taxSummary.return_taxable, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-rose-600">Goods value refunded</span>
            </div>

            {/* Return Tax Credit */}
            <div className="flex flex-col rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                Return Tax Credit
              </span>
              <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                -{formatCurrency(taxSummary.return_tax, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-rose-600">Tax deduction on returns</span>
            </div>

            {/* Net Tax Payable */}
            <div className="flex flex-col rounded-xl border border-emerald-300 bg-emerald-50/70 p-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Net GST Payable
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-lg font-black text-emerald-950 tabular-nums">
                {formatCurrency(taxSummary.net_tax_payable, settings.currency_symbol)}
              </div>
              <span className="text-[9.5px] text-emerald-700">Final FBR liability to deposit</span>
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
              <span>Multi-Tenant Branch Tax Comparison</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                {reportData?.branchComparison.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('slabs')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'slabs'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Percent className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sales Tax Slabs Breakdown</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fbr_logs')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                activeTab === 'fbr_logs'
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>FBR POS Certified USIN Logs</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 tabular-nums font-extrabold">
                {reportData?.fbrLogs?.length || 0}
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB CONTENTS & DATA TABLES                                                */}
          {/* ========================================================================= */}
          <div id="printable-tax-summary" className="flex-1 overflow-auto bg-slate-50/40 p-4">
            {/* Printable Letterhead (Visible on print) */}
            <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {settings.business_name || 'Retail Point of Sale'}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>Period: {fromDate} to {toDate}</span>
                <span>•</span>
                <span>Branch: {currentBranchLabel}</span>
                {settings.ntn && (
                  <>
                    <span>•</span>
                    <span>NTN: {settings.ntn}</span>
                  </>
                )}
                {settings.strn && (
                  <>
                    <span>•</span>
                    <span>STRN: {settings.strn}</span>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                <span className="text-xs font-semibold">Auditing GST tax liabilities across branches...</span>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------------- */}
                {/* TAB 1: MULTI-TENANT BRANCH GST COMPARISON TABLE                     */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'branches' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center">Branch / Tenant Name</th>
                          <th className="px-3 py-2.5 text-center">Invoices</th>
                          <th className="px-3 py-2.5 text-center">Taxable Sales</th>
                          <th className="px-3 py-2.5 text-center">Output Tax (+)</th>
                          <th className="px-3 py-2.5 text-center">Return Credit (-)</th>
                          <th className="px-3 py-2.5 text-center">Net GST Payable</th>
                          <th className="px-3 py-2.5 text-center w-36">Tax Contribution</th>
                          <th className="no-print px-3 py-2.5 text-center w-28">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredBranches.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                              <ReceiptText className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-600">No branch tax records found</p>
                              <p className="text-[11px] text-slate-400">
                                Expand your date range to include recorded sales.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredBranches.map((row, idx) => {
                            const share =
                              branchTotals.netTaxTotal > 0
                                ? Math.max(0, (row.net_tax / branchTotals.netTaxTotal) * 100)
                                : 0;

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
                                  {formatCurrency(row.net_sales, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-sky-800 font-semibold">
                                  +{formatCurrency(row.net_tax >= 0 ? row.net_tax : 0, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-rose-700 font-semibold">
                                  -{formatCurrency(0, settings.currency_symbol)}
                                </td>
                                <td className="px-3 py-2.5 text-center font-black text-emerald-900 tabular-nums text-[13px]">
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
                                <td className="no-print px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeGstTaxSummaryModal();
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

                      {/* Grand Total Row */}
                      {filteredBranches.length > 0 && (
                        <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 text-[11.5px]">
                          <tr>
                            <td className="px-3 py-2.5 text-center" colSpan={2}>
                              Consolidated Grand Total
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {branchTotals.invoiceCount}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {formatCurrency(taxSummary.taxable_sales, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-sky-900">
                              +{formatCurrency(taxSummary.output_tax, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-rose-700">
                              -{formatCurrency(taxSummary.return_tax, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-[13px] font-black text-emerald-800">
                              {formatCurrency(taxSummary.net_tax_payable, settings.currency_symbol)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              100.0%
                            </td>
                            <td className="no-print px-3 py-2.5 text-center">-</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 2: TAX SLABS & RATE BREAKDOWN                                   */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'slabs' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center">Tax Slab / Category</th>
                          <th className="px-3 py-2.5 text-center">Applicable Rate</th>
                          <th className="px-3 py-2.5 text-center">Taxable Sales Base</th>
                          <th className="px-3 py-2.5 text-center">Output Tax Collected</th>
                          <th className="px-3 py-2.5 text-center">Return Tax Credit</th>
                          <th className="px-3 py-2.5 text-center">Net Tax Payable</th>
                          <th className="px-3 py-2.5 text-center">Compliance Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {/* 18% Standard GST */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">1</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                            Standard Sales Tax (PVC Pipes &amp; Fittings)
                          </td>
                          <td className="px-3 py-2.5 text-center font-extrabold text-sky-800 tabular-nums">
                            {settings.default_tax_rate || 18}% GST
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-800 font-semibold">
                            {formatCurrency(taxSummary.taxable_sales, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-sky-800 font-bold">
                            +{formatCurrency(taxSummary.output_tax, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-rose-700 font-bold">
                            -{formatCurrency(taxSummary.return_tax, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums font-black text-emerald-800 text-[13px]">
                            {formatCurrency(taxSummary.net_tax_payable, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              <span>FBR Standard Rate</span>
                            </span>
                          </td>
                        </tr>

                        {/* 0% Zero-Rated / Exempt Goods */}
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">2</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                            Zero-Rated / Exempt Items (6th Schedule)
                          </td>
                          <td className="px-3 py-2.5 text-center font-extrabold text-slate-500 tabular-nums">
                            0% Exempt
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-500 font-semibold">
                            {formatCurrency(0, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-400 font-bold">
                            {formatCurrency(0, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-400 font-bold">
                            {formatCurrency(0, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums font-black text-slate-700 text-[13px]">
                            {formatCurrency(0, settings.currency_symbol)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
                              <span>Exempt</span>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ------------------------------------------------------------------- */}
                {/* TAB 3: FBR FISCAL SYNC AUDIT LOGS                                   */}
                {/* ------------------------------------------------------------------- */}
                {activeTab === 'fbr_logs' && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                          <th className="px-3 py-2.5 text-center">Invoice No</th>
                          <th className="px-3 py-2.5 text-center">FBR USIN Key</th>
                          <th className="px-3 py-2.5 text-center">FBR POS ID</th>
                          <th className="px-3 py-2.5 text-center">Fiscal Mode</th>
                          <th className="px-3 py-2.5 text-center">Certified Time</th>
                          <th className="px-3 py-2.5 text-center w-28">Sync Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredFbrLogs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                              <ShieldCheck className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-600">No FBR fiscal sync logs</p>
                              <p className="text-[11px] text-slate-400">
                                Completed sales invoices with FBR fiscal certification will log here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredFbrLogs.map((log, idx) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900 tabular-nums">
                                {log.invoice_no}
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-[10px] text-slate-600 select-all">
                                {log.usin}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-700 tabular-nums">
                                {log.fbr_pos_id}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold text-slate-600">
                                {log.mode}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                                {log.created_at}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                    log.success === 1
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {log.success === 1 ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>Fiscal Certified</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      <span>Offline Queued</span>
                                    </>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Print Sign-off lines */}
            <div className="hidden print:flex justify-between pt-16 text-xs text-slate-700 border-t border-slate-300 mt-12">
              <div className="text-center w-52 border-t border-slate-400 pt-1.5 font-semibold">
                Tax Consultant / Auditor
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
              <ReceiptText className="h-4 w-4 text-slate-400" />
              <span>
                Audited Period:{' '}
                <strong className="text-slate-900">
                  {fromDate} to {toDate}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Branch: <strong>{currentBranchLabel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeGstTaxSummaryModal}
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
                <span>Print Tax Report (Ctrl+P)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
