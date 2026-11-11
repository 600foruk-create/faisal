'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Calendar,
  Clock,
  CloudUpload,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
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
      ? 'All Branches'
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

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <section className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-sky-600" />
            <label htmlFor="branch-filter" className="text-sm font-medium text-slate-600">
              Branch:
            </label>
            <select
              id="branch-filter"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-amber-600 focus:outline-none"
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
            <label htmlFor="period-filter" className="text-sm font-medium text-slate-600">
              Period:
            </label>
            <select
              id="period-filter"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodPreset)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-amber-600 focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            <label htmlFor="from-date" className="text-sm font-medium text-slate-600">
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
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <label htmlFor="to-date" className="text-sm font-medium text-slate-600">
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
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-amber-600 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {syncMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
          {syncMessage}
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span>{saleCardTitle}</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {summary
              ? formatCurrency(summary.total_sale, settings.currency_symbol)
              : 'Loading...'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <FileText className="h-4 w-4 text-amber-500" />
            <span>Total Invoices</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {summary ? summary.total_invoices : '-'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Banknote className="h-4 w-4 text-amber-600" />
            <span>Cash Received</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {summary
              ? formatCurrency(summary.cash_received, settings.currency_symbol)
              : 'Loading...'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <CloudUpload className="h-4 w-4 text-amber-500" />
            <span>FBR Pending</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {summary ? summary.fbr_pending : '-'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {summary && summary.fbr_pending > 0 ? (
              <button
                type="button"
                disabled={syncingFbr}
                onClick={handleSyncAllPending}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-red-600 px-3 py-0.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${syncingFbr ? 'animate-spin' : ''}`} />
                {syncingFbr ? 'Syncing...' : 'Attention — Sync Now'}
              </button>
            ) : (
              <span className="inline-flex items-center rounded-full bg-red-600/90 px-3 py-0.5 text-xs font-semibold text-white">
                Attention
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Recent Invoices Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border-b-2 border-amber-400 pb-1">
              <FileText className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Showing {periodLabelMap[period]} ({selectedBranchLabel})
            </span>
          </div>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4b5563] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#374151]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View Full Register</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50/90 text-xs font-semibold text-slate-600">
                <th className="px-5 py-3">Invoice No</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">FBR Status</th>
                <th className="px-5 py-3 text-center">Action</th>
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

              {!loading && summary && summary.recent_invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No invoices found for {periodLabelMap[period]} ({selectedBranchLabel}).
                  </td>
                </tr>
              )}

              {summary?.recent_invoices.map((inv) => (
                <tr key={inv.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{inv.invoice_no}</span>
                      {inv.invoice_type === 'RETURN' && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          RETURN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-xs font-semibold text-slate-800">
                      <Store className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                      <span>{inv.branch_display_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                    {inv.invoice_date}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{inv.customer_name}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                    {inv.invoice_type === 'RETURN' ? '-' : ''}
                    {formatCurrency(inv.total_amount, settings.currency_symbol)}
                  </td>
                  <td className="px-4 py-3.5">
                    <FbrStatusBadge status={inv.fbr_status} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setViewInvoiceId(inv.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
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

      <InvoiceModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        onSynced={() => void loadDashboard()}
      />
    </div>
  );
}

