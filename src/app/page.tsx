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
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
} from 'lucide-react';
import { FbrStatusBadge } from '@/components/FbrStatusBadge';
import { InvoiceModal } from '@/components/InvoiceModal';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getDateRangeForPreset, getLocalIsoDate } from '@/lib/format';
import type { DashboardSummary, PeriodPreset } from '@/lib/types';

export default function MainDashboardPage() {
  const { branches, activeBranchId, settings, refreshNonce } = usePosContext();

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
      ? "Today's Net Sales"
      : period === 'yesterday'
        ? "Yesterday's Net Sales"
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
    return {
      total,
      cashPct: Math.round((cash / total) * 100),
      cardPct: Math.round((card / total) * 100),
      bankPct: Math.max(0, 100 - Math.round((cash / total) * 100) - Math.round((card / total) * 100)),
    };
  }, [summary]);

  const totalBranchSale = useMemo(() => {
    const list = summary?.branch_breakdown ?? [];
    return list.reduce((sum, b) => sum + Math.max(0, b.total_sale), 0) || 1;
  }, [summary]);

  return (
    <div className="space-y-5">
      {/* Executive Title + Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Executive Sales &amp; FBR Overview
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Live telemetry for <span className="font-semibold text-slate-700">{selectedBranchLabel}</span> •{' '}
              <span>{periodLabelMap[period]}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {(
              [
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePeriodChange(preset.key)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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

        <div className="mt-3.5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-sky-600" />
            <label htmlFor="branch-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Branch
            </label>
            <select
              id="branch-filter"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="ALL">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <label htmlFor="period-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Period
            </label>
            <select
              id="period-filter"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodPreset)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            <label htmlFor="from-date" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPeriod('custom');
                setFromDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <label htmlFor="to-date" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setPeriod('custom');
                setToDate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {syncMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
          {syncMessage}
        </div>
      )}

      {/* 4 Executive KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Net Sales */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {saleCardTitle}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="tabular-nums mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {summary ? formatCurrency(summary.total_sale, settings.currency_symbol) : 'Loading...'}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-500">
            <span>
              Avg Bill:{' '}
              <strong className="tabular-nums text-slate-700">
                {summary ? formatCurrency(summary.avg_ticket, settings.currency_symbol) : '-'}
              </strong>
            </span>
            <span>
              GST:{' '}
              <strong className="tabular-nums text-slate-700">
                {summary ? formatCurrency(summary.tax_collected, settings.currency_symbol) : '-'}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 2: Total Invoices */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Invoices
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <div className="tabular-nums mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {summary ? summary.total_invoices : '-'}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-500">
            <span>
              FBR Verified:{' '}
              <strong className="tabular-nums text-emerald-700">
                {summary ? summary.fbr_submitted : '-'}
              </strong>
            </span>
            <span>
              Returns:{' '}
              <strong className="tabular-nums text-rose-600">
                {summary ? formatCurrency(summary.total_returns, settings.currency_symbol) : '-'}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 3: Cash & Collections */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cash Received
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Banknote className="h-4 w-4" />
            </span>
          </div>
          <div className="tabular-nums mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {summary
              ? formatCurrency(summary.cash_received, settings.currency_symbol)
              : 'Loading...'}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-slate-400" />
              Card:{' '}
              <strong className="tabular-nums text-slate-700">
                {summary ? formatCurrency(summary.card_received, settings.currency_symbol) : '-'}
              </strong>
            </span>
            <span>
              Bank:{' '}
              <strong className="tabular-nums text-slate-700">
                {summary ? formatCurrency(summary.bank_received, settings.currency_symbol) : '-'}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 4: FBR Compliance Status */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              summary && summary.fbr_pending > 0
                ? 'bg-gradient-to-r from-red-600 to-rose-500'
                : 'bg-gradient-to-r from-emerald-500 to-green-400'
            }`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              FBR Sync Queue
            </span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                summary && summary.fbr_pending > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <CloudUpload className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="tabular-nums text-2xl font-extrabold tracking-tight text-slate-900">
              {summary ? summary.fbr_pending : '-'}
            </span>
            <span className="text-xs font-medium text-slate-500">pending invoices</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            {summary && summary.fbr_pending > 0 ? (
              <button
                type="button"
                disabled={syncingFbr}
                onClick={handleSyncAllPending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${syncingFbr ? 'animate-spin' : ''}`} />
                {syncingFbr ? 'Syncing...' : 'Attention — Sync Now'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                All Synced with FBR
              </span>
            )}
            <Link
              href="/reports"
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
            >
              Logs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Executive Analytics Row: Sales Trend + Branch & Payment Breakdown */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sales Revenue Trend Chart */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {fromDate === toDate ? 'Hourly Sales Velocity' : 'Daily Revenue Trend'}
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {summary?.sales_trend.length ?? 0} active intervals
            </span>
          </div>

          {!summary || summary.sales_trend.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              No sales data recorded in this period.
            </div>
          ) : (
            <div className="mt-5 flex h-48 items-end gap-2 sm:gap-3">
              {summary.sales_trend.map((pt) => {
                const heightPct = Math.max(8, Math.round((Math.max(0, pt.sale_amount) / maxTrendSale) * 100));
                return (
                  <div
                    key={pt.label}
                    className="group relative flex flex-1 flex-col items-center justify-end h-full"
                  >
                    <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md group-hover:block">
                      {formatCurrency(pt.sale_amount, settings.currency_symbol)} ({pt.invoice_count} bills)
                    </div>
                    <div className="mb-1 text-[10px] font-semibold text-slate-500 tabular-nums">
                      {pt.invoice_count}
                    </div>
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-slate-800 via-emerald-600 to-emerald-400 transition-all duration-300 group-hover:from-emerald-700 group-hover:to-emerald-300"
                      />
                    </div>
                    <span className="mt-2 truncate text-[10px] font-semibold text-slate-500">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Branch Performance & Payment Split */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Branch Revenue Share</h2>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {summary?.branch_breakdown.length ?? 0} outlets
              </span>
            </div>

            <div className="mt-3.5 space-y-3">
              {summary?.branch_breakdown.map((b) => {
                const pct = Math.min(100, Math.round((Math.max(0, b.total_sale) / totalBranchSale) * 100));
                return (
                  <div key={b.branch_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{b.branch_name}</span>
                      <span className="tabular-nums font-bold text-slate-900">
                        {formatCurrency(b.total_sale, settings.currency_symbol)}{' '}
                        <span className="font-medium text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{b.invoice_count} invoices</span>
                      {b.fbr_pending > 0 ? (
                        <span className="font-semibold text-red-600">{b.fbr_pending} FBR pending</span>
                      ) : (
                        <span className="text-emerald-700">FBR synced</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Payment Channel Mix</span>
              <span className="tabular-nums text-[11px] text-slate-500">
                Cash {paymentMix.cashPct}% • Card {paymentMix.cardPct}% • Bank {paymentMix.bankPct}%
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
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

      {/* Bottom Workspace Row: Recent Invoices + Stock Watch / Quick Actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Recent Invoices Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
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
                  className="w-48 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Full Register</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">FBR</th>
                  <th className="px-4 py-3 text-center">View</th>
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
                      No matching invoices for {periodLabelMap[period]} ({selectedBranchLabel}).
                    </td>
                  </tr>
                )}

                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-slate-50/90">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{inv.invoice_no}</span>
                        {inv.invoice_type === 'RETURN' && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            RET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200/80 bg-sky-50/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <Store className="h-3 w-3 shrink-0 text-sky-600" />
                        <span>{inv.branch_name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                      {inv.invoice_date}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                      {inv.customer_name}
                    </td>
                    <td className="tabular-nums px-4 py-3.5 text-right text-xs font-bold text-slate-900">
                      {inv.invoice_type === 'RETURN' ? '-' : ''}
                      {formatCurrency(inv.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3.5">
                      <FbrStatusBadge status={inv.fbr_status} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setViewInvoiceId(inv.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
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
        </div>

        {/* Right Side: Stock Watch & Quick Operations */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Inventory Watch (Lowest Stock)</h2>
              </div>
              <Link
                href="/settings"
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Manage
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {summary?.low_stock_items.map((item) => {
                const isLow = item.stock_qty <= 25;
                return (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{item.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{item.sku}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLow && <AlertTriangle className="h-3 w-3" />}
                      {item.stock_qty} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-slate-900 p-5 text-white shadow-sm">
            <h2 className="text-sm font-bold">Quick Counter Operations</h2>
            <p className="mt-1 text-xs text-slate-400">
              Jump directly to counter billing or shift closing.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                href="/sale"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <ShoppingCart className="h-4 w-4" />
                Open POS
              </Link>
              <Link
                href="/closing"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                <DoorOpen className="h-4 w-4 text-amber-400" />
                Day Closing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <InvoiceModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        onSynced={() => void loadDashboard()}
      />
    </div>
  );
}
