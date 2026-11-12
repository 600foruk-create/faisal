'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, Search, Undo2 } from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PaymentModeBadge } from '@/components/PaymentModeBadge';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency } from '@/lib/format';
import type { InvoiceDetail, InvoiceRecord, PaymentMode } from '@/lib/types';

function SalesReturnContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('invoice') ?? '';

  const { activeBranchId, activeUser, settings, refreshNonce } = usePosContext();

  const [invoiceQuery, setInvoiceQuery] = useState(initialQuery);
  const [originalInvoice, setOriginalInvoice] = useState<InvoiceDetail | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [refundMode, setRefundMode] = useState<PaymentMode>('CASH');
  const [reason, setReason] = useState('Customer Return');
  const [recentReturns, setRecentReturns] = useState<InvoiceRecord[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);

  const loadRecentReturns = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeBranchId) params.set('branchId', String(activeBranchId));
    const res = await fetch(`/api/returns?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { invoices: InvoiceRecord[] };
      setRecentReturns(data.invoices);
    }
  }, [activeBranchId]);

  const lookupInvoice = useCallback(async (identifier: string) => {
    if (!identifier.trim()) return;
    setLoadingLookup(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(identifier.trim())}`);
      const data = (await res.json()) as { invoice?: InvoiceDetail; error?: string };
      if (!res.ok || !data.invoice) {
        setOriginalInvoice(null);
        setMessage({ type: 'error', text: data.error || 'Receipt not found' });
        return;
      }
      if (data.invoice.invoice_type !== 'SALE') {
        setOriginalInvoice(null);
        setMessage({ type: 'error', text: 'Select an original SALE receipt (not a return).' });
        return;
      }
      setOriginalInvoice(data.invoice);
      const defaults: Record<number, number> = {};
      for (const item of data.invoice.items) {
        defaults[item.product_id] = 0;
      }
      setReturnQuantities(defaults);
    } finally {
      setLoadingLookup(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentReturns();
  }, [loadRecentReturns, refreshNonce]);

  useEffect(() => {
    if (initialQuery) {
      void lookupInvoice(initialQuery);
    }
  }, [initialQuery, lookupInvoice]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalInvoice) return;

    const selectedItems = Object.entries(returnQuantities)
      .map(([productId, qty]) => ({ productId: Number(productId), quantity: Number(qty) }))
      .filter((i) => i.quantity > 0);

    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'Enter return quantity for at least one item.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: originalInvoice.id,
          userId: activeUser?.id ?? null,
          cashierName: activeUser?.full_name ?? 'POS Cashier',
          refundMode,
          reason,
          items: selectedItems,
        }),
      });
      const data = (await res.json()) as { invoice?: InvoiceDetail; error?: string };
      if (!res.ok || !data.invoice) {
        setMessage({ type: 'error', text: data.error || 'Return failed' });
        return;
      }
      setMessage({
        type: 'success',
        text: `Return ${data.invoice.invoice_no} processed & inventory stock restored.`,
      });
      setViewInvoiceId(data.invoice.id);
      await Promise.all([lookupInvoice(originalInvoice.invoice_no), loadRecentReturns()]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Undo2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              Sales Return / Refund
            </h1>
            <p className="text-xs text-slate-500">
              Look up a receipt to refund items and automatically restore branch stock
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookupInvoice(invoiceQuery);
          }}
          className="flex flex-wrap gap-2"
        >
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="Enter Original Receipt No (e.g. SWT-A-POS-63)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loadingLookup}
            className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loadingLookup ? 'Searching...' : 'Load Receipt'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs font-medium ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {originalInvoice && (
          <form onSubmit={handleSubmitReturn} className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
              <div>
                <strong>{originalInvoice.invoice_no}</strong> •{' '}
                <span>{originalInvoice.branch_display_name}</span> •{' '}
                <span>{originalInvoice.customer_name}</span>
              </div>
              <div className="font-bold text-slate-900">
                Original Total:{' '}
                {formatCurrency(originalInvoice.total_amount, settings.currency_symbol)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-right">Sold Qty</th>
                    <th className="px-3 py-2.5 text-right">Already Returned</th>
                    <th className="px-3 py-2.5 text-right">Returnable</th>
                    <th className="px-3 py-2.5 text-right">Unit Rate</th>
                    <th className="px-3 py-2.5 text-right">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {originalInvoice.items.map((item) => {
                    const returned = originalInvoice.returned_quantities?.[item.product_id] ?? 0;
                    const maxReturnable = Math.max(0, item.quantity - returned);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">{item.item_name}</div>
                          <div className="text-[11px] text-slate-400">{item.sku}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-amber-700">{returned}</td>
                        <td className="px-3 py-2.5 text-right font-bold">{maxReturnable}</td>
                        <td className="px-3 py-2.5 text-right">
                          {formatCurrency(item.unit_price, settings.currency_symbol)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={maxReturnable}
                            step="any"
                            disabled={maxReturnable === 0}
                            value={returnQuantities[item.product_id] ?? 0}
                            onChange={(e) => {
                              const val = Math.min(
                                maxReturnable,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setReturnQuantities((prev) => ({
                                ...prev,
                                [item.product_id]: val,
                              }));
                            }}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-right font-semibold disabled:bg-slate-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Refund Mode
                </label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value as PaymentMode)}
                  className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="CARD">Card Refund</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Return Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Processing Return...' : 'Confirm Return & Restore Stock'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900">Recent Sales Returns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <th className="px-4 py-3">Return No</th>
                <th className="px-4 py-3">Original Bill</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Refund Mode</th>
                <th className="px-4 py-3 text-right">Refund Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                    No returns recorded yet.
                  </td>
                </tr>
              ) : (
                recentReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-rose-700">
                      {r.invoice_no}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {r.original_invoice_no ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.branch_display_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.created_at}</td>
                    <td className="px-4 py-3">
                      <PaymentModeBadge mode={r.payment_mode} />
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right font-bold text-rose-700">
                      -{formatCurrency(r.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setViewInvoiceId(r.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
    </div>
  );
}

export default function SalesReturnPage() {
  return (
    <Suspense
      fallback={<div className="rounded-2xl bg-white p-6 text-sm">Loading returns...</div>}
    >
      <SalesReturnContent />
    </Suspense>
  );
}
