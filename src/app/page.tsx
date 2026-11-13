'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calendar,
  Coins,
  DoorOpen,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  PackageCheck,
  PauseCircle,
  PieChart,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
  Undo2,
  Wallet,
} from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { usePosContext } from '@/components/PosContext';
import {
  formatCurrency,
  formatDisplayDate,
  getDateRangeForPreset,
  getLocalIsoDate,
  roundMoney,
} from '@/lib/format';
import type { DashboardSummary, PeriodPreset } from '@/lib/types';

export default function MainDashboardPage() {
  const { branches, activeBranchId, activeUser, settings, refreshNonce } = usePosContext();

  const initialRange = getDateRangeForPreset('month');
  const todayIso = getLocalIsoDate();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [fromDate, setFromDate] = useState<string>(initialRange.from);
  const [toDate, setToDate] = useState<string>(initialRange.to);
  const [tableSearch, setTableSearch] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todaySummary, setTodaySummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
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
      const isTodaySelected = fromDate === todayIso && toDate === todayIso;
      const periodParams = new URLSearchParams({
        branchId: selectedBranchId,
        fromDate,
        toDate,
        limit: '15',
      });

      if (isTodaySelected) {
        const res = await fetch(`/api/dashboard?${periodParams.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as DashboardSummary;
          setSummary(data);
          setTodaySummary(data);
        }
      } else {
        const todayParams = new URLSearchParams({
          branchId: selectedBranchId,
          fromDate: todayIso,
          toDate: todayIso,
          limit: '5',
        });
        const [periodRes, todayRes] = await Promise.all([
          fetch(`/api/dashboard?${periodParams.toString()}`),
          fetch(`/api/dashboard?${todayParams.toString()}`),
        ]);
        if (periodRes.ok) {
          setSummary((await periodRes.json()) as DashboardSummary);
        }
        if (todayRes.ok) {
          setTodaySummary((await todayRes.json()) as DashboardSummary);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate, todayIso]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshNonce]);

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
        : `${periodLabelMap[period]} Net Sales`;

  const filteredInvoices = useMemo(() => {
    const list = summary?.recent_invoices ?? [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (inv) =>
        inv.invoice_no.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        inv.branch_name.toLowerCase().includes(q) ||
        inv.payment_mode.toLowerCase().includes(q)
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

  const lowStockCount = useMemo(
    () => (summary?.low_stock_items ?? []).filter((item) => item.stock_qty <= 25).length,
    [summary]
  );

  const netCashPosition = summary
    ? roundMoney(summary.opening_cash + summary.cash_received)
    : 0;

  const rightSummary = todaySummary ?? summary;
  const todayNetCash = rightSummary
    ? roundMoney(rightSummary.opening_cash + rightSummary.cash_received)
    : 0;
  const todayCardAndBank = rightSummary
    ? roundMoney(rightSummary.card_received + rightSummary.bank_received)
    : 0;

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:flex-row xl:overflow-hidden">
      {/* CENTER WORKSPACE (Scrollable independently) */}
      <div className="min-w-0 flex-1 space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1.5">
        {/* Filter Toolbar */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
              <h1 className="text-lg font-bold text-slate-900">Executive POS Dashboard</h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{periodLabelMap[period]}</span>{' '}
              • <span className="font-medium text-slate-600">{selectedBranchLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <select
                aria-label="Filter Branch"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 p-1">
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
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                aria-label="From date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setPeriod('custom');
                  setFromDate(e.target.value);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                aria-label="To date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setPeriod('custom');
                  setToDate(e.target.value);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* 4 Hero KPI Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-slate-600">
                {saleCardTitle}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="tabular-nums mt-2.5 truncate text-lg font-bold text-slate-900 2xl:text-[21px]">
              {summary ? formatCurrency(summary.total_sale, settings.currency_symbol) : 'Loading...'}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              <span className="truncate">
                Avg:{' '}
                <strong className="tabular-nums text-slate-800">
                  {summary ? formatCurrency(summary.avg_ticket, settings.currency_symbol) : '-'}
                </strong>
              </span>
              <span className="truncate">
                Tax:{' '}
                <strong className="tabular-nums text-slate-800">
                  {summary ? formatCurrency(summary.tax_collected, settings.currency_symbol) : '-'}
                </strong>
              </span>
            </div>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-sky-400" />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-slate-600">
                Total Invoices
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/60">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="tabular-nums mt-2.5 text-lg font-bold text-slate-900 2xl:text-[21px]">
              {summary ? summary.total_invoices : '-'}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              <span className="truncate">
                Returns:{' '}
                <strong className="tabular-nums text-rose-600">
                  {summary ? formatCurrency(summary.total_returns, settings.currency_symbol) : '-'}
                </strong>
              </span>
              <Link href="/register" className="shrink-0 font-semibold text-sky-700 hover:underline">
                Register →
              </Link>
            </div>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-slate-600">
                Cash Received
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/60">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div className="tabular-nums mt-2.5 truncate text-lg font-bold text-slate-900 2xl:text-[21px]">
              {summary
                ? formatCurrency(summary.cash_received, settings.currency_symbol)
                : 'Loading...'}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              <span className="truncate">
                Card+Bank:{' '}
                <strong className="tabular-nums text-slate-800">
                  {summary
                    ? formatCurrency(
                        summary.card_received + summary.bank_received,
                        settings.currency_symbol
                      )
                    : '-'}
                </strong>
              </span>
              <span className="truncate">
                Drawer:{' '}
                <strong className="tabular-nums text-emerald-700">
                  {summary ? formatCurrency(netCashPosition, settings.currency_symbol) : '-'}
                </strong>
              </span>
            </div>
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div
              className={`absolute inset-x-0 top-0 h-1 ${
                lowStockCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-violet-600 to-purple-400'
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-slate-600">
                Held Bills &amp; Alerts
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/60">
                <PauseCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="tabular-nums text-lg font-bold text-slate-900 2xl:text-[21px]">
                {summary ? summary.held_carts_count : '-'}
              </span>
              <span className="text-xs text-slate-500">parked bills</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[11px]">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  lowStockCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {lowStockCount > 0 ? `${lowStockCount} low stock` : 'Stock Healthy'}
              </span>
              <Link
                href="/hold"
                className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-violet-700 hover:underline"
              >
                Recall <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Analytics Row: Revenue Trend + Branch Share */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {fromDate === toDate ? 'Hourly Sales Velocity' : 'Daily Revenue Trend'}
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {summary?.sales_trend.length ?? 0} active intervals
              </span>
            </div>

            {!summary || summary.sales_trend.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <p>No sales recorded for {periodLabelMap[period]}.</p>
                {period === 'today' && (
                  <button
                    type="button"
                    onClick={() => handlePeriodChange('month')}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    View This Month&apos;s Activity
                  </button>
                )}
              </div>
            ) : (
              <div className="relative mt-4 flex h-44 items-end gap-3 border-b border-slate-100 pb-1">
                {summary.sales_trend.map((pt) => {
                  const heightPct = Math.max(
                    12,
                    Math.round((Math.max(0, pt.sale_amount) / maxTrendSale) * 100)
                  );
                  return (
                    <div
                      key={pt.label}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div className="pointer-events-none absolute -top-9 z-10 hidden rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg group-hover:block">
                        {formatCurrency(pt.sale_amount, settings.currency_symbol)} • {pt.invoice_count} bills
                      </div>
                      <span className="tabular-nums mb-1 text-[11px] font-semibold text-slate-500">
                        {formatCurrency(pt.sale_amount, '')}
                      </span>
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-emerald-700 via-emerald-500 to-teal-300 shadow-xs transition-all duration-300 group-hover:from-blue-600 group-hover:to-cyan-400"
                        />
                      </div>
                      <span className="mt-2 text-xs font-semibold text-slate-600">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-5">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Branch Revenue Share</h2>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {summary?.branch_breakdown.length ?? 0} outlets
                </span>
              </div>

              <div className="mt-3.5 space-y-3">
                {summary?.branch_breakdown.map((b) => {
                  const pct = Math.min(
                    100,
                    Math.round((Math.max(0, b.total_sale) / totalBranchSale) * 100)
                  );
                  return (
                    <div key={b.branch_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{b.branch_name}</span>
                        <span className="tabular-nums font-bold text-slate-900">
                          {formatCurrency(b.total_sale, settings.currency_symbol)}{' '}
                          <span className="font-medium text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3.5 text-xs">
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-slate-600">
                <span>Payment Mix</span>
                <span>
                  Cash {paymentMix.cashPct}% • Card {paymentMix.cardPct}% • Bank {paymentMix.bankPct}%
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                {paymentMix.cashPct > 0 && (
                  <div style={{ width: `${paymentMix.cashPct}%` }} className="bg-emerald-500" />
                )}
                {paymentMix.cardPct > 0 && (
                  <div style={{ width: `${paymentMix.cardPct}%` }} className="bg-blue-500" />
                )}
                {paymentMix.bankPct > 0 && (
                  <div style={{ width: `${paymentMix.bankPct}%` }} className="bg-amber-500" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Invoices Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Showing {periodLabelMap[period]}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search bill or customer..."
                  className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none sm:w-48"
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
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && !summary && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      Loading recent invoices...
                    </td>
                  </tr>
                )}

                {!loading && filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      No invoices found for {periodLabelMap[period]} ({selectedBranchLabel}).
                    </td>
                  </tr>
                )}

                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-3 text-xs font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.invoice_no}</span>
                        {inv.invoice_type === 'RETURN' && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            RET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200/80 bg-sky-50/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        <Store className="h-3 w-3 text-sky-600" />
                        <span>{inv.branch_name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-500">
                      {inv.invoice_date}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                      {inv.customer_name}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentModeBadge mode={inv.payment_mode} />
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right text-xs font-bold text-slate-900">
                      {inv.invoice_type === 'RETURN' ? '-' : ''}
                      {formatCurrency(inv.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setViewInvoiceId(inv.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-600" />
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

      {/* RIGHT SIDEBAR PANEL: Fixed Height, Same Width (244px) as Left Sidebar */}
      <aside className="w-full shrink-0 xl:h-full xl:w-[244px]">
        <div className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm xl:h-full xl:overflow-y-auto">
          <div className="space-y-1.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">Today&apos;s Summary</h2>
                <p className="truncate text-[10.5px] font-medium text-slate-400">
                  {formatDisplayDate(todayIso)} •{' '}
                  {selectedBranchId === 'ALL' ? 'All Branches' : selectedBranchLabel}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            {/* Cash Position */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
              <div className="flex items-center gap-1.5 border-b border-slate-200/70 pb-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-800">Cash Position</h3>
              </div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Opening:</span>
                  <strong className="tabular-nums font-semibold text-slate-900">
                    {rightSummary
                      ? formatCurrency(rightSummary.opening_cash, settings.currency_symbol)
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Receipts:</span>
                  <strong className="tabular-nums font-semibold text-emerald-700">
                    {rightSummary
                      ? formatCurrency(rightSummary.cash_received, settings.currency_symbol)
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Returns:</span>
                  <strong className="tabular-nums font-semibold text-rose-600">
                    {rightSummary
                      ? formatCurrency(rightSummary.total_returns, settings.currency_symbol)
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-0.5 text-slate-900">
                  <span className="font-bold">Net Cash:</span>
                  <strong className="tabular-nums font-bold text-slate-900">
                    {rightSummary ? formatCurrency(todayNetCash, settings.currency_symbol) : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* POS Activity */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
              <div className="flex items-center gap-1.5 border-b border-slate-200/70 pb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800">POS Activity</h3>
              </div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Today&apos;s Bills:</span>
                  <strong className="tabular-nums font-bold text-slate-900">
                    {rightSummary ? rightSummary.total_invoices : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Today&apos;s Sales:</span>
                  <strong className="tabular-nums font-semibold text-emerald-700">
                    {rightSummary
                      ? formatCurrency(rightSummary.total_sale, settings.currency_symbol)
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Card &amp; Bank:</span>
                  <strong className="tabular-nums font-semibold text-sky-700">
                    {rightSummary
                      ? formatCurrency(todayCardAndBank, settings.currency_symbol)
                      : '-'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Held Bills:</span>
                  <Link
                    href="/hold"
                    className="tabular-nums font-bold text-amber-700 hover:underline"
                  >
                    {rightSummary ? rightSummary.held_carts_count : '-'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Inventory Watch */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
                <div className="flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800">Inventory Watch</h3>
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

              <div className="mt-1 space-y-1">
                {summary?.low_stock_items.slice(0, 2).map((item) => {
                  const isLow = item.stock_qty <= 25;
                  return (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-white px-2 py-1 text-[11px] ring-1 ring-slate-200/70"
                    >
                      <span className="truncate font-medium text-slate-700">{item.name}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLow && <AlertTriangle className="h-2.5 w-2.5" />}
                        {item.stock_qty} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Counter Actions anchored inside matching sidebar height */}
          <div className="rounded-xl bg-gradient-to-br from-[#091529] via-[#0e1f3d] to-[#132952] p-2.5 text-white">
            <h3 className="text-xs font-bold">Quick Counter Actions</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Link
                href="/sale"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[11px] font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <ShoppingCart className="h-3 w-3" />
                POS Sale
              </Link>
              <Link
                href="/returns"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
              >
                <Undo2 className="h-3 w-3 text-amber-400" />
                Returns
              </Link>
              <Link
                href="/closing"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
              >
                <DoorOpen className="h-3 w-3 text-sky-400" />
                Closing
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
              >
                <BarChart3 className="h-3 w-3 text-emerald-400" />
                Reports
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <InvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
    </div>
  );
}
