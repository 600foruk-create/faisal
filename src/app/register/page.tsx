'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Download, Eye, List, Search, Store, Undo2 } from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getDateRangeForPreset } from '@/lib/format';
import type { InvoiceRecord, PaymentMode } from '@/lib/types';

function SalesRegisterContent() {
  const { branches, activeBranchId, settings, refreshNonce } = usePosContext();

  const defaultRange = getDateRangeForPreset('month');
  const [branchId, setBranchId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | 'ALL'>('ALL');
  const [invoiceType, setInvoiceType] = useState<'SALE' | 'RETURN' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [totals, setTotals] = useState({
    netSale: 0,
    cashReceived: 0,
    cardReceived: 0,
    bankReceived: 0,
    pendingCount: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    setBranchId(activeBranchId ? String(activeBranchId) : 'ALL');
  }, [activeBranchId]);

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
        limit: '200',
      });
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          invoices: InvoiceRecord[];
          totalCount: number;
          totals: typeof totals;
        };
        setInvoices(data.invoices);
        setTotalCount(data.totalCount);
        setTotals(data.totals);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, paymentMode, invoiceType, search]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister, refreshNonce]);

  const handleExportCsv = () => {
    const header = [
      'Receipt No',
      'Type',
      'Branch',
      'Date',
      'Customer',
      'Payment Mode',
      'Subtotal',
      'Discount',
      'Tax',
      'Total Amount',
    ];
    const rows = invoices.map((i) => [
      i.invoice_no,
      i.invoice_type,
      i.branch_display_name,
      i.invoice_date,
      i.customer_name,
      i.payment_mode,
      i.subtotal,
      i.discount_total,
      i.tax_total,
      i.invoice_type === 'RETURN' ? -i.total_amount : i.total_amount,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-register-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <List className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Sales Register
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {totalCount} Bills
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Complete history of completed POS bills and customer returns
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Receipt No or Customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as PaymentMode | 'ALL')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
          >
            <option value="ALL">All Payments</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
            <option value="SPLIT">Split</option>
          </select>

          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as 'SALE' | 'RETURN' | 'ALL')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
          >
            <option value="ALL">Sales &amp; Returns</option>
            <option value="SALE">Sales Only</option>
            <option value="RETURN">Returns Only</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-600">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1"
            />
          </label>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1"
            />
          </label>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Net Sales Total</p>
          <p className="tabular-nums mt-1 text-lg font-extrabold text-slate-900">
            {formatCurrency(totals.netSale, settings.currency_symbol)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Net Cash</p>
          <p className="tabular-nums mt-1 text-lg font-extrabold text-emerald-700">
            {formatCurrency(totals.cashReceived, settings.currency_symbol)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Card + Bank</p>
          <p className="tabular-nums mt-1 text-lg font-extrabold text-sky-700">
            {formatCurrency(totals.cardReceived + totals.bankReceived, settings.currency_symbol)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Receipts</p>
          <p className="tabular-nums mt-1 text-lg font-extrabold text-slate-900">{totalCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-4 py-3">Receipt No</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Date &amp; Cashier</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Loading register...
                  </td>
                </tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No matching receipts found.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                    <div>{inv.invoice_no}</div>
                    {inv.invoice_type === 'RETURN' && inv.original_invoice_no && (
                      <div className="text-[10px] font-medium text-rose-600">
                        Ref: {inv.original_invoice_no}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-slate-800">
                      <Store className="h-3 w-3 text-sky-600" />
                      {inv.branch_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{inv.created_at}</div>
                    <div className="text-[11px] text-slate-400">{inv.cashier_name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">
                    {inv.customer_name}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentModeBadge mode={inv.payment_mode} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        inv.invoice_type === 'RETURN'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {inv.invoice_type === 'RETURN' ? 'Return' : 'Completed'}
                    </span>
                  </td>
                  <td className="tabular-nums px-4 py-3 text-right font-bold text-slate-900">
                    {inv.invoice_type === 'RETURN' ? '-' : ''}
                    {formatCurrency(inv.total_amount, settings.currency_symbol)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewInvoiceId(inv.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        View
                      </button>
                      {inv.invoice_type === 'SALE' && (
                        <Link
                          href={`/returns?invoice=${encodeURIComponent(inv.invoice_no)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Undo2 className="h-3 w-3" />
                          Return
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <InvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
    </div>
  );
}

export default function SalesRegisterPage() {
  return (
    <Suspense
      fallback={<div className="rounded-2xl bg-white p-6 text-sm">Loading register...</div>}
    >
      <SalesRegisterContent />
    </Suspense>
  );
}
