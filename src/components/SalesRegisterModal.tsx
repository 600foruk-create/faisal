'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Hash,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Tag,
  Undo2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { PaymentModeBadge } from './PaymentModeBadge';
import { formatCurrency, getDateRangeForPreset } from '@/lib/format';
import type { InvoiceDetail, InvoiceRecord, PaymentMode } from '@/lib/types';

export function SalesRegisterModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeSalesRegisterModal,
    openSalesReturnModal,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Multi-Tenant Branch & Filters
  const initialBranch = activeBranchId ? String(activeBranchId) : 'ALL';
  const [branchId, setBranchId] = useState<string>(initialBranch);
  const defaultRange = getDateRangeForPreset('month');
  const [activePreset, setActivePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');
  const [fromDate, setFromDate] = useState<string>(defaultRange.from);
  const [toDate, setToDate] = useState<string>(defaultRange.to);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | 'ALL'>('ALL');
  const [invoiceType, setInvoiceType] = useState<'SALE' | 'RETURN' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  // Data State
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [totals, setTotals] = useState({
    netSale: 0,
    cashReceived: 0,
    cardReceived: 0,
    bankReceived: 0,
    pendingCount: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Active Selected Invoice & Detail View
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<InvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  // Load Register Data
  const loadRegister = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId,
        fromDate,
        toDate,
        paymentMode,
        invoiceType,
        search,
        limit: '300',
      });
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          invoices: InvoiceRecord[];
          totalCount: number;
          totals: typeof totals;
        };
        const fetched = data.invoices || [];
        setInvoices(fetched);
        setTotalCount(data.totalCount || 0);
        setTotals(
          data.totals || {
            netSale: 0,
            cashReceived: 0,
            cardReceived: 0,
            bankReceived: 0,
            pendingCount: 0,
          }
        );

        // Auto-select first invoice if current selected is invalid
        if (fetched.length > 0) {
          setSelectedInvoiceId((prev) =>
            prev && fetched.some((i) => i.id === prev) ? prev : fetched[0].id
          );
        } else {
          setSelectedInvoiceId(null);
          setSelectedDetail(null);
        }
      } else {
        showToast('Failed to load sales register.', 'error');
      }
    } catch {
      showToast('Network error loading sales ledger.', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, paymentMode, invoiceType, search, totals, showToast]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister, refreshNonce]);

  // Load Detailed Invoice info for right panel inspector
  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/invoices/${encodeURIComponent(String(selectedInvoiceId))}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load invoice');
        const data = (await res.json()) as { invoice?: InvoiceDetail };
        if (!cancelled && data.invoice) {
          setSelectedDetail(data.invoice);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedInvoiceId]);

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

  // CSV Export Handler
  const handleExportCsv = () => {
    if (invoices.length === 0) {
      showToast('No invoices to export.', 'error');
      return;
    }
    const header = [
      'Invoice No',
      'Type',
      'Branch',
      'Date',
      'Time',
      'Cashier',
      'Customer',
      'Payment Mode',
      'Subtotal',
      'Discount',
      'Tax',
      'Net Total',
      'FBR Status',
    ];
    const rows = invoices.map((i) => [
      i.invoice_no,
      i.invoice_type,
      i.branch_display_name,
      i.invoice_date,
      i.created_at,
      i.cashier_name,
      i.customer_name,
      i.payment_mode,
      i.subtotal,
      i.discount_total,
      i.tax_total,
      i.invoice_type === 'RETURN' ? -i.total_amount : i.total_amount,
      i.fbr_status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-ledger-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${invoices.length} invoices to CSV.`, 'success');
  };

  // Print Active Receipt / Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Forward to Sales Return Modal
  const handleOpenReturnForInvoice = (invNo: string) => {
    closeSalesRegisterModal();
    openSalesReturnModal(invNo);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSalesRegisterModal();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrintSlip();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleExportCsv();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSalesRegisterModal, handlePrintSlip, handleExportCsv]);

  // Active Branch Display
  const currentBranchLabel = useMemo(() => {
    if (branchId === 'ALL') return 'All Multi-Tenant Branches';
    const found = branches.find((b) => String(b.id) === branchId);
    return found ? found.display_name : 'Selected Branch';
  }, [branchId, branches]);

  return (
    <>
      {/* Print Stylesheet for 80mm / A4 Fiscal Receipt Output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-slip,
          #printable-invoice-slip * {
            visibility: visible;
          }
          #printable-invoice-slip {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px;
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
              : 'h-[92vh] max-h-[920px] w-full max-w-[1440px]'
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
                <List className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Sales Register & Fiscal Invoice Ledger
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/30">
                    Master Sales Ledger
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  Multi-Tenant Real-Time Invoice Ledger, Payment Tender Breakdown & Itemized Audit Trail
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
                onClick={closeSalesRegisterModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP MULTI-TENANT FILTER & SEARCH BAR                                      */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
            {/* Filter Inputs Grid */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Branch:</span>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="ALL">All Multi-Tenant Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Preset Buttons */}
              <div className="hidden lg:flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
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
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
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
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
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
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
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
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                    activePreset === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Date Range Inputs */}
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

              {/* Payment Mode Filter */}
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode | 'ALL')}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
              >
                <option value="ALL">All Payments</option>
                <option value="CASH">Cash Only</option>
                <option value="CARD">Card (POS)</option>
                <option value="BANK">Bank / Raast</option>
                <option value="SPLIT">Split Tender</option>
              </select>

              {/* Type Filter */}
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as 'SALE' | 'RETURN' | 'ALL')}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-slate-800 shadow-2xs focus:border-sky-500 focus:outline-hidden"
              >
                <option value="ALL">Sales &amp; Returns</option>
                <option value="SALE">Sales Only</option>
                <option value="RETURN">Returns Only</option>
              </select>
            </div>

            {/* Live Search & Export Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Bill No, Customer, Phone..."
                  className="h-8 w-52 sm:w-64 rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-sky-500 focus:outline-hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                title="Export Ledger to CSV (Ctrl+E)"
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => void loadRegister()}
                disabled={loading}
                title="Refresh Ledger"
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
            {/* Net Sales */}
            <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">
                Net Sales Revenue
              </span>
              <div className="mt-1 text-lg font-black text-emerald-800 tabular-nums">
                {formatCurrency(totals.netSale, settings.currency_symbol)}
              </div>
              <span className="text-[10px] text-emerald-700">Gross revenue minus returns</span>
            </div>

            {/* Net Cash Collected */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                Net Cash Collected
              </span>
              <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                {formatCurrency(totals.cashReceived, settings.currency_symbol)}
              </div>
              <span className="text-[10px] text-slate-500">Physical drawer cash total</span>
            </div>

            {/* Card & Bank Total */}
            <div className="flex flex-col rounded-xl border border-sky-200 bg-sky-50/50 p-2.5">
              <span className="text-[10.5px] font-bold text-sky-800 uppercase tracking-wider">
                Card &amp; Bank Terminals
              </span>
              <div className="mt-1 text-lg font-black text-sky-900 tabular-nums">
                {formatCurrency(
                  totals.cardReceived + totals.bankReceived,
                  settings.currency_symbol
                )}
              </div>
              <span className="text-[10px] text-sky-700">POS terminals &amp; Raast settlements</span>
            </div>

            {/* Total Bills Count */}
            <div className="flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5">
              <span className="text-[10.5px] font-bold text-indigo-800 uppercase tracking-wider">
                Total Receipts &amp; Returns
              </span>
              <div className="mt-1 text-lg font-black text-indigo-950 tabular-nums">
                {totalCount} Bills
              </div>
              <span className="text-[10px] text-indigo-700">Invoices matching active filters</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MASTER-DETAIL DUAL PANEL WORKSPACE                                        */}
          {/* ========================================================================= */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ----------------------------------------------------------------------- */}
            {/* LEFT MASTER PANEL: SALES LEDGER SPREADSHEET TABLE (~65% WIDTH)          */}
            {/* ----------------------------------------------------------------------- */}
            <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200 bg-white">
              {/* Ledger Table Container */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  {/* 100% Dead-Center Table Headers, Zero Asterisks */}
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">Sr #</th>
                      <th className="px-3 py-2.5 text-center">Invoice No</th>
                      <th className="px-3 py-2.5 text-center">Branch</th>
                      <th className="px-3 py-2.5 text-center">Date &amp; Time</th>
                      <th className="px-3 py-2.5 text-center">Customer</th>
                      <th className="px-3 py-2.5 text-center">Payment</th>
                      <th className="px-3 py-2.5 text-center">Type</th>
                      <th className="px-3 py-2.5 text-center">Fiscal</th>
                      <th className="px-3 py-2.5 text-center">Amount</th>
                      <th className="px-3 py-2.5 text-center w-24">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading && (
                      <tr>
                        <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="h-6 w-6 animate-spin text-sky-600" />
                            <span className="font-semibold text-xs">Loading sales ledger...</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && invoices.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                          <List className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-bold text-slate-600">No matching sales receipts</p>
                          <p className="text-xs text-slate-400">
                            Try expanding your date range or clearing search filters.
                          </p>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      invoices.map((inv, index) => {
                        const isSelected = selectedInvoiceId === inv.id;
                        const isReturn = inv.invoice_type === 'RETURN';

                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? 'bg-sky-50/90 font-medium text-slate-900 ring-1 ring-inset ring-sky-400/40'
                                : 'hover:bg-slate-50/80 text-slate-700'
                            }`}
                          >
                            {/* Sr # */}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-400 tabular-nums">
                              {index + 1}
                            </td>

                            {/* Invoice No */}
                            <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                              <span className="text-slate-900">{inv.invoice_no}</span>
                              {isReturn && inv.original_invoice_no && (
                                <div className="text-[10px] text-rose-600 font-semibold">
                                  Ref: {inv.original_invoice_no}
                                </div>
                              )}
                            </td>

                            {/* Branch */}
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                <Store className="h-3 w-3 text-sky-600" />
                                <span className="truncate max-w-[110px]">{inv.branch_name}</span>
                              </span>
                            </td>

                            {/* Date & Time */}
                            <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 text-[11.5px]">
                              <div>{inv.invoice_date}</div>
                              <div className="text-[10px] text-slate-400">{inv.created_at}</div>
                            </td>

                            {/* Customer */}
                            <td className="px-3 py-2.5 text-center font-medium text-slate-800">
                              <div className="truncate max-w-[130px] mx-auto">
                                {inv.customer_name || 'Walk-in Customer'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Cashier: {inv.cashier_name}
                              </div>
                            </td>

                            {/* Payment Tender */}
                            <td className="px-3 py-2.5 text-center">
                              <PaymentModeBadge mode={inv.payment_mode} />
                            </td>

                            {/* Type Pill */}
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                                  isReturn
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {isReturn ? 'Return' : 'Sale'}
                              </span>
                            </td>

                            {/* Fiscal / FBR Status */}
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  inv.fbr_status === 'SUBMITTED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {inv.fbr_status === 'SUBMITTED' ? (
                                  <>
                                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                    <span>Fiscal</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-amber-600" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Net Amount */}
                            <td
                              className={`px-3 py-2.5 text-center font-black tabular-nums text-[13px] ${
                                isReturn ? 'text-rose-700' : 'text-slate-900'
                              }`}
                            >
                              {isReturn ? '-' : ''}
                              {formatCurrency(inv.total_amount, settings.currency_symbol)}
                            </td>

                            {/* Row Action Buttons */}
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceId(inv.id)}
                                  title="Inspect Invoice Slip"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800 transition"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {inv.invoice_type === 'SALE' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReturnForInvoice(inv.invoice_no)}
                                    title="Process Sales Return for this bill"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 transition"
                                  >
                                    <Undo2 className="h-3.5 w-3.5 text-rose-600" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* RIGHT DETAIL PANEL: LIVE FISCAL RECEIPT INSPECTOR (~35% WIDTH)          */}
            {/* ----------------------------------------------------------------------- */}
            <div className="flex w-full flex-col overflow-y-auto border-l border-slate-200 bg-slate-50/50 sm:w-[420px] lg:w-[460px] shrink-0 p-4">
              {loadingDetail ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
                  <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                  <span className="text-xs font-semibold">Loading receipt details...</span>
                </div>
              ) : selectedDetail ? (
                <div
                  id="printable-invoice-slip"
                  className="mx-auto flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-xs"
                >
                  {/* Top Receipt Letterhead */}
                  <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                    {settings.logo_data_url && (
                      <img
                        src={settings.logo_data_url}
                        alt={settings.business_name}
                        className="mx-auto mb-1.5 h-10 w-auto object-contain"
                      />
                    )}
                    <h4 className="text-sm font-extrabold tracking-wide text-slate-900">
                      {settings.business_name || 'Retail Point of Sale'}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {selectedDetail.branch_display_name}
                    </p>
                    {settings.ntn && (
                      <p className="text-[10px] text-slate-500">NTN: {settings.ntn}</p>
                    )}
                    {settings.strn && (
                      <p className="text-[10px] text-slate-500">STRN: {settings.strn}</p>
                    )}

                    <div className="mt-2 inline-flex rounded-md bg-slate-900 px-2.5 py-0.5 text-[10.5px] font-bold text-white uppercase tracking-wider">
                      {selectedDetail.invoice_type === 'RETURN'
                        ? 'Sales Return & Refund Voucher'
                        : 'Fiscal Sales Tax Invoice'}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-3 space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Invoice / Receipt No:</span>
                      <strong className="text-slate-900 tabular-nums">
                        {selectedDetail.invoice_no}
                      </strong>
                    </div>
                    {selectedDetail.original_invoice_no && (
                      <div className="flex justify-between text-rose-700">
                        <span>Original Bill Reference:</span>
                        <strong className="tabular-nums">
                          {selectedDetail.original_invoice_no}
                        </strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Date &amp; Time:</span>
                      <span className="tabular-nums">{selectedDetail.created_at}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDetail.customer_name || 'Walk-in Customer'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>{selectedDetail.cashier_name}</span>
                    </div>
                  </div>

                  {/* Itemized Line Items Table */}
                  <div className="mt-3 border-b border-dashed border-slate-300 pb-3">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-1 text-left">Item</th>
                          <th className="py-1 text-center w-12">Qty</th>
                          <th className="py-1 text-right w-16">Price</th>
                          <th className="py-1 text-right w-18">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDetail.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 pr-1">
                              <div className="font-bold text-slate-900">{item.item_name}</div>
                              <div className="text-[9.5px] text-slate-400">{item.sku}</div>
                            </td>
                            <td className="py-1.5 text-center font-bold tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-slate-600">
                              {formatCurrency(item.unit_price, settings.currency_symbol)}
                            </td>
                            <td className="py-1.5 text-right font-bold text-slate-900 tabular-nums">
                              {formatCurrency(item.line_total, settings.currency_symbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="mt-3 space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="tabular-nums font-semibold">
                        {formatCurrency(selectedDetail.subtotal, settings.currency_symbol)}
                      </span>
                    </div>
                    {selectedDetail.discount_total > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span className="tabular-nums font-semibold">
                          -{formatCurrency(selectedDetail.discount_total, settings.currency_symbol)}
                        </span>
                      </div>
                    )}
                    {selectedDetail.tax_total > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Sales Tax / GST:</span>
                        <span className="tabular-nums font-semibold">
                          +{formatCurrency(selectedDetail.tax_total, settings.currency_symbol)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
                      <span>Total Amount:</span>
                      <span className="tabular-nums">
                        {selectedDetail.invoice_type === 'RETURN' ? '-' : ''}
                        {formatCurrency(selectedDetail.total_amount, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  {/* Tender Breakdown */}
                  <div className="mt-2.5 space-y-1 border-b border-dashed border-slate-300 pb-3 text-[10.5px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <strong className="text-slate-800">{selectedDetail.payment_mode}</strong>
                    </div>
                    {selectedDetail.payment_mode === 'CASH' && (
                      <>
                        <div className="flex justify-between">
                          <span>Cash Tendered:</span>
                          <span className="tabular-nums">
                            {formatCurrency(selectedDetail.tendered_amount, settings.currency_symbol)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Change Returned:</span>
                          <span className="tabular-nums font-bold text-slate-900">
                            {formatCurrency(selectedDetail.change_amount, settings.currency_symbol)}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedDetail.card_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Card Settled:</span>
                        <span className="tabular-nums">
                          {formatCurrency(selectedDetail.card_amount, settings.currency_symbol)}
                        </span>
                      </div>
                    )}
                    {selectedDetail.bank_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Bank / Raast Settled:</span>
                        <span className="tabular-nums">
                          {formatCurrency(selectedDetail.bank_amount, settings.currency_symbol)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* FBR Fiscal QR Code & USIN Verification */}
                  <div className="mt-3 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>FBR POS Fiscal Certified USIN</span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-slate-600 break-all select-all">
                      {selectedDetail.usin || 'OFFLINE-SYNC-QUEUE'}
                    </p>
                    <span className="mt-1 text-[9.5px] text-slate-400">
                      Status: <strong>{selectedDetail.fbr_status}</strong>
                    </span>
                  </div>

                  {/* Slip Action Buttons */}
                  <div className="no-print mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handlePrintSlip}
                      className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Receipt Slip (Ctrl+P)</span>
                    </button>

                    {selectedDetail.invoice_type === 'SALE' && (
                      <button
                        type="button"
                        onClick={() => handleOpenReturnForInvoice(selectedDetail.invoice_no)}
                        className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        <Undo2 className="h-4 w-4" />
                        <span>Process Sales Return</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
                  <FileText className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Invoice Selected</p>
                  <p className="text-xs text-slate-400">
                    Click any invoice row on the left ledger to inspect its itemized breakdown, tax details, and reprint fiscal receipt.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ACTIONS FOOTER                                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-slate-400" />
              <span>
                Showing <strong className="text-slate-900">{invoices.length}</strong> of{' '}
                <strong className="text-slate-900">{totalCount}</strong> ledger records
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Branch: <strong>{currentBranchLabel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeSalesRegisterModal}
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

              {selectedDetail && (
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Selected Slip (Ctrl+P)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
