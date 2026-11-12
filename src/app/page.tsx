'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CloudUpload,
  CreditCard,
  DoorOpen,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  List,
  Package,
  PackageCheck,
  PauseCircle,
  PlusCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
  Undo2,
  UserPlus,
} from 'lucide-react';
import { FbrStatusBadge } from '@/components/FbrStatusBadge';
import { InvoiceModal } from '@/components/InvoiceModal';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getDateRangeForPreset, getLocalIsoDate, roundMoney } from '@/lib/format';
import type { DashboardSummary, PeriodPreset } from '@/lib/types';

export default function MainDashboardPage() {
  const { branches, activeBranchId, activeUser, settings, refreshNonce } = usePosContext();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [period, setPeriod] = useState<PeriodPreset>('today');
  const [fromDate, setFromDate] = useState<string>(() => getLocalIsoDate());
  const [toDate, setToDate] = useState<string>(() => getLocalIsoDate());
  const [tableSearch, setTableSearch] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingFbr, setSyncingFbr] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);

  const isCashier = activeUser?.role === 'CASHIER';

  useEffect(() => {
    setSelectedBranchId(activeBranchId ? String(activeBranchId) : 'ALL');
  }, [activeBranchId]);

  const handlePeriodChange = (nextPeriod: PeriodPreset) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      const range = getDateRangeForPreset(nextPeriod);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: selectedBranchId,
        fromDate,
        toDate,
        limit: '15',
      });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as DashboardSummary;
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshNonce]);

  const handleSyncAllPending = async () => {
    setSyncingFbr(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/fbr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchId === 'ALL' ? null : Number(selectedBranchId),
        }),
      });
      const data = (await res.json()) as {
        attempted: number;
        succeeded: number;
        failed: number;
      };
      setSyncMessage(
        data.attempted === 0
          ? 'No pending FBR invoices found.'
          : `FBR Sync: ${data.succeeded}/${data.attempted} submitted${
              data.failed > 0 ? `, ${data.failed} failed` : ''
            }.`
      );
      await loadDashboard();
    } finally {
      setSyncingFbr(false);
    }
  };

  const selectedBranchLabel =
    selectedBranchId === 'ALL'
      ? 'All Branches (Consolidated)'
      : branches.find((b) => String(b.id) === selectedBranchId)?.name ?? 'Selected Branch';

  const periodLabelMap: Record<PeriodPreset, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This Week',
    month: 'This Month',
    custom: `${fromDate} to ${toDate}`,
  };

  const saleCardTitle =
    period === 'today'
      ? "Today's Sale"
      : period === 'yesterday'
        ? "Yesterday's Sale"
        : `${periodLabelMap[period]} Sale`;

  const filteredInvoices = useMemo(() => {
    const list = summary?.recent_invoices ?? [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (inv) =>
        inv.invoice_no.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.branch_name.toLowerCase().includes(q) ||
        (inv.fbr_invoice_no ?? '').toLowerCase().includes(q)
    );
  }, [summary, tableSearch]);

  const maxTrendSale = useMemo(() => {
    const pts = summary?.sales_trend ?? [];
    return pts.reduce((max, p) => Math.max(max, p.sale_amount), 0) || 1;
  }, [summary]);

  const paymentMix = useMemo(() => {
    if (!summary) return { total: 0, cashPct: 100, cardPct: 0, bankPct: 0 };
    const cash = Math.max(0, summary.cash_received);
    const card = Math.max(0, summary.card_received);
    const bank = Math.max(0, summary.bank_received);
    const total = cash + card + bank;
    if (total <= 0) return { total: 0, cashPct: 0, cardPct: 0, bankPct: 0 };
    const cashPct = Math.round((cash / total) * 100);
    const cardPct = Math.round((card / total) * 100);
    return {
      total,
      cashPct,
      cardPct,
      bankPct: Math.max(0, 100 - cashPct - cardPct),
    };
  }, [summary]);

  const totalBranchSale = useMemo(() => {
    const list = summary?.branch_breakdown ?? [];
    return list.reduce((sum, b) => sum + Math.max(0, b.total_sale), 0) || 1;
  }, [summary]);

  const netCashPosition = summary
    ? roundMoney(summary.opening_cash + summary.cash_received)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* LEFT SIDEBAR: Streamlined POS Record New & View */}
      <aside className="space-y-4 xl:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-[#49210a] px-3.5 py-2.5 text-xs font-bold text-white">
            <PlusCircle className="h-4 w-4 text-amber-300" />
            <span>Record New</span>
          </div>
          <nav className="divide-y divide-slate-100 text-xs font-medium">
            <Link
              href="/sale"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
              <span>POS Sale (New Bill)</span>
            </Link>
            <Link
              href="/returns"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <Undo2 className="h-3.5 w-3.5 text-amber-600" />
              <span>Sales Return</span>
            </Link>
            <Link
              href="/hold"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Hold / Recall Bill</span>
            </Link>
            <Link
              href="/closing"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <DoorOpen className="h-3.5 w-3.5 text-amber-600" />
              <span>Day Closing</span>
            </Link>
            {!isCashier && (
              <>
                <Link
                  href="/settings?tab=customers"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
                >
                  <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                  <span>Add Customer</span>
                </Link>
                <Link
                  href="/settings?tab=products"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
                >
                  <Package className="h-3.5 w-3.5 text-amber-600" />
                  <span>Add Product</span>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 bg-[#49210a] px-3.5 py-2.5 text-xs font-bold text-white">
            <Eye className="h-4 w-4 text-amber-300" />
            <span>View</span>
          </div>
          <nav className="divide-y divide-slate-100 text-xs font-medium">
            <Link
              href="/register"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <List className="h-3.5 w-3.5 text-amber-600" />
              <span>Sales Register</span>
            </Link>
            <Link
              href="/reports?tab=branches"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
              <span>Sale Summary</span>
            </Link>
            <Link
              href="/reports?tab=tax"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <FileText className="h-3.5 w-3.5 text-amber-600" />
              <span>GST / Tax Summary</span>
            </Link>
            <Link
              href="/reports?tab=fbr"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
            >
              <CloudUpload className="h-3.5 w-3.5 text-amber-600" />
              <span>FBR Sync Logs</span>
            </Link>
            {!isCashier && (
              <Link
                href="/settings?tab=products"
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 transition hover:bg-amber-50 hover:text-[#49210a]"
              >
                <PackageCheck className="h-3.5 w-3.5 text-amber-600" />
                <span>Inventory Balance</span>
              </Link>
            )}
          </nav>
        </div>
      </aside>

      {/* CENTER WORKSPACE: Filters, 4 KPI Cards, Charts, Recent Invoices */}
      <div className="space-y-4 xl:col-span-7">
        {/* Filter Bar */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                Executive Sales &amp; FBR Overview
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                <span className="font-semibold text-slate-700">{selectedBranchLabel}</span> •{' '}
                <span>{periodLabelMap[period]}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'week', label: 'Week' },
                  { key: 'month', label: 'Month' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePeriodChange(preset.key)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    period === preset.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-sky-600" />
              <label htmlFor="branch-filter" className="text-xs font-semibold text-slate-500">
                Branch:
              </label>
              <select
                id="branch-filter"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                <option value="ALL">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              <label htmlFor="period-filter" className="text-xs font-semibold text-slate-500">
                Period:
              </label>
              <select
                id="period-filter"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value as PeriodPreset)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-sky-600" />
              <label htmlFor="from-date" className="text-xs font-semibold text-slate-500">
                From:
              </label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setPeriod('custom');
                  setFromDate(e.target.value);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <label htmlFor="to-date" className="text-xs font-semibold text-slate-500">
                To:
              </label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setPeriod('custom');
                  setToDate(e.target.value);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              />
            </div>
          </div>
        </section>

        {syncMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
            {syncMessage}
          </div>
        )}

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {saleCardTitle}
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="tabular-nums mt-2 text-lg font-extrabold text-slate-900">
              {summary ? formatCurrency(summary.total_sale, settings.currency_symbol) : 'Loading...'}
            </div>
            <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500">
              Avg: <strong className="tabular-nums">{summary ? formatCurrency(summary.avg_ticket, settings.currency_symbol) : '-'}</strong>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Invoices
              </span>
              <FileText className="h-4 w-4 text-sky-600" />
            </div>
            <div className="tabular-nums mt-2 text-lg font-extrabold text-slate-900">
              {summary ? summary.total_invoices : '-'}
            </div>
            <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500">
              FBR Verified: <strong className="text-emerald-700">{summary ? summary.fbr_submitted : '-'}</strong>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Cash Received
              </span>
              <Banknote className="h-4 w-4 text-amber-600" />
            </div>
            <div className="tabular-nums mt-2 text-lg font-extrabold text-slate-900">
              {summary ? formatCurrency(summary.cash_received, settings.currency_symbol) : 'Loading...'}
            </div>
            <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500">
              Card+Bank: <strong className="tabular-nums">{summary ? formatCurrency(summary.card_received + summary.bank_received, settings.currency_symbol) : '-'}</strong>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div
              className={`absolute inset-x-0 top-0 h-1 ${
                summary && summary.fbr_pending > 0
                  ? 'bg-gradient-to-r from-red-600 to-rose-500'
                  : 'bg-gradient-to-r from-emerald-500 to-green-400'
              }`}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                FBR Pending
              </span>
              <CloudUpload className="h-4 w-4 text-amber-600" />
            </div>
            <div className="tabular-nums mt-2 text-lg font-extrabold text-slate-900">
              {summary ? summary.fbr_pending : '-'}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-1.5">
              {summary && summary.fbr_pending > 0 ? (
                <button
                  type="button"
                  disabled={syncingFbr}
                  onClick={handleSyncAllPending}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-700"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${syncingFbr ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  All Synced
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Trend & Branch Revenue Share */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {fromDate === toDate ? 'Hourly Sales Velocity' : 'Daily Revenue Trend'}
                </h2>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {summary?.sales_trend.length ?? 0} intervals
              </span>
            </div>

            {!summary || summary.sales_trend.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                No sales data recorded in this period.
              </div>
            ) : (
              <div className="mt-4 flex h-36 items-end gap-2">
                {summary.sales_trend.map((pt) => {
                  const heightPct = Math.max(
                    10,
                    Math.round((Math.max(0, pt.sale_amount) / maxTrendSale) * 100)
                  );
                  return (
                    <div
                      key={pt.label}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow group-hover:block">
                        {formatCurrency(pt.sale_amount, settings.currency_symbol)} ({pt.invoice_count})
                      </div>
                      <div className="mb-1 text-[10px] font-semibold text-slate-500">
                        {pt.invoice_count}
                      </div>
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-[#49210a] via-amber-600 to-amber-400"
                        />
                      </div>
                      <span className="mt-1.5 truncate text-[10px] font-semibold text-slate-500">
                        {pt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:col-span-5">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Layers className="h-4 w-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Branch Revenue Share</h2>
              </div>
              <div className="mt-3 space-y-2.5">
                {summary?.branch_breakdown.map((b) => {
                  const pct = Math.min(
                    100,
                    Math.round((Math.max(0, b.total_sale) / totalBranchSale) * 100)
                  );
                  return (
                    <div key={b.branch_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{b.branch_name}</span>
                        <span className="tabular-nums font-bold text-slate-900">
                          {formatCurrency(b.total_sale, settings.currency_symbol)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Payment Mix</span>
                <span className="text-slate-500">
                  Cash {paymentMix.cashPct}% • Card {paymentMix.cardPct}% • Bank {paymentMix.bankPct}%
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                {paymentMix.cashPct > 0 && (
                  <div style={{ width: `${paymentMix.cashPct}%` }} className="bg-emerald-500" />
                )}
                {paymentMix.cardPct > 0 && (
                  <div style={{ width: `${paymentMix.cardPct}%` }} className="bg-sky-500" />
                )}
                {paymentMix.bankPct > 0 && (
                  <div style={{ width: `${paymentMix.bankPct}%` }} className="bg-amber-500" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Invoices Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">Recent Invoices</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {filteredInvoices.length} shown
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter invoice or customer..."
                  className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Full Register</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">FBR</th>
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !summary && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                      Loading recent invoices...
                    </td>
                  </tr>
                )}

                {!loading && filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                      No invoices found for {periodLabelMap[period]} ({selectedBranchLabel}).
                    </td>
                  </tr>
                )}

                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.invoice_no}</span>
                        {inv.invoice_type === 'RETURN' && (
                          <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-700">
                            RET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <Store className="h-3 w-3 text-sky-600" />
                        <span>{inv.branch_name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500">
                      {inv.invoice_date}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">{inv.customer_name}</td>
                    <td className="tabular-nums px-3 py-3 text-right text-xs font-bold text-slate-900">
                      {inv.invoice_type === 'RETURN' ? '-' : ''}
                      {formatCurrency(inv.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="px-3 py-3">
                      <FbrStatusBadge status={inv.fbr_status} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setViewInvoiceId(inv.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* RIGHT SIDEBAR: Today's Summary (Cash Position, POS Activity, FBR Digital Invoicing, Stock) */}
      <aside className="space-y-4 xl:col-span-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-extrabold text-slate-900">Today&apos;s Summary</h2>
            <span className="text-[11px] font-semibold text-slate-400">
              {periodLabelMap[period]}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {/* Cash Position */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Banknote className="h-4 w-4 text-amber-600" />
                <span>Cash Position</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Opening Cash:</span>
                  <strong className="tabular-nums text-slate-800">
                    {summary ? formatCurrency(summary.opening_cash, settings.currency_symbol) : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cash Receipts:</span>
                  <strong className="tabular-nums text-emerald-700">
                    {summary ? formatCurrency(summary.cash_received, settings.currency_symbol) : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Returns:</span>
                  <strong className="tabular-nums text-rose-600">
                    {summary ? formatCurrency(summary.total_returns, settings.currency_symbol) : '-'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>Net Cash:</span>
                  <span className="tabular-nums">
                    {summary ? formatCurrency(netCashPosition, settings.currency_symbol) : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* POS Activity */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CreditCard className="h-4 w-4 text-sky-600" />
                <span>POS Activity</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Counter Bills:</span>
                  <strong className="tabular-nums text-slate-900">
                    {summary ? summary.total_invoices : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Card &amp; Bank:</span>
                  <strong className="tabular-nums text-slate-900">
                    {summary
                      ? formatCurrency(
                          summary.card_received + summary.bank_received,
                          settings.currency_symbol
                        )
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Held Bills:</span>
                  <strong className="tabular-nums text-amber-700">
                    {summary ? summary.held_carts_count : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* FBR Digital Invoicing */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <CloudUpload className="h-4 w-4 text-amber-600" />
                  <span>FBR Digital Invoicing</span>
                </div>
                {summary && summary.fbr_pending > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    Attention
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Connected
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tax Collected:</span>
                  <strong className="tabular-nums text-slate-900">
                    {summary ? formatCurrency(summary.tax_collected, settings.currency_symbol) : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>FBR Invoices:</span>
                  <strong className="tabular-nums text-emerald-700">
                    {summary ? summary.fbr_submitted : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pending Queue:</span>
                  <strong className="tabular-nums text-red-600">
                    {summary ? summary.fbr_pending : '-'}
                  </strong>
                </div>
              </div>
              <Link
                href="/reports?tab=fbr"
                className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                View FBR Sync Logs <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Inventory Watch */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <PackageCheck className="h-4 w-4 text-amber-600" />
                  <span>Inventory Watch</span>
                </div>
                {!isCashier && (
                  <Link
                    href="/settings?tab=products"
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Manage
                  </Link>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {summary?.low_stock_items.map((item) => {
                  const isLow = item.stock_qty <= 25;
                  return (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="truncate font-medium text-slate-700">{item.name}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                          isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLow && <AlertTriangle className="h-2.5 w-2.5" />}
                        {item.stock_qty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <InvoiceModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        onSynced={() => void loadDashboard()}
      />
    </div>
  );
}
