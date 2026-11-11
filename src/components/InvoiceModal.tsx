'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Printer, RefreshCw, Undo2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { InvoiceDetail } from '@/lib/types';
import { FbrStatusBadge } from './FbrStatusBadge';
import { usePosContext } from './PosContext';

interface InvoiceModalProps {
  invoiceId: number | string | null;
  onClose: () => void;
  onSynced?: () => void;
}

export function InvoiceModal({ invoiceId, onClose, onSynced }: InvoiceModalProps) {
  const { settings } = usePosContext();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/invoices/${encodeURIComponent(String(invoiceId))}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          invoice?: InvoiceDetail;
          qrDataUrl?: string;
          error?: string;
        };
        if (!res.ok || !data.invoice) {
          throw new Error(data.error || 'Failed to load invoice');
        }
        const computedQr =
          data.qrDataUrl ||
          (await QRCode.toDataURL(data.invoice.fbr_qr_payload, { width: 180, margin: 1 }));
        if (!cancelled) {
          setInvoice(data.invoice);
          setQrDataUrl(computedQr);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invoice');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (!invoiceId) return null;

  const handleRetryFbr = async () => {
    if (!invoice) return;
    setSyncing(true);
    setError('');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'POST' });
      const data = (await res.json()) as {
        invoice?: InvoiceDetail;
        qrDataUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.invoice) {
        throw new Error(data.error || 'FBR sync failed');
      }
      const computedQr =
        data.qrDataUrl ||
        (await QRCode.toDataURL(data.invoice.fbr_qr_payload, { width: 180, margin: 1 }));
      setInvoice(data.invoice);
      setQrDataUrl(computedQr);
      onSynced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FBR sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {invoice ? `Invoice ${invoice.invoice_no}` : 'Loading Invoice...'}
            </h3>
            {invoice && (
              <p className="text-xs text-slate-500">
                {invoice.branch_display_name} • {invoice.created_at}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading receipt...</p>}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {invoice && (
            <div className="printable-receipt mx-auto rounded-xl border border-slate-200 bg-white p-5 text-sm">
              <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                <h4 className="text-base font-bold tracking-wide text-slate-900">
                  {settings.business_name}
                </h4>
                <p className="text-xs font-semibold text-slate-700">
                  {invoice.branch_display_name}
                </p>
                {(settings.ntn || settings.strn) && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {settings.ntn ? `NTN: ${settings.ntn}` : ''}{' '}
                    {settings.strn ? `| STRN: ${settings.strn}` : ''}
                  </p>
                )}
                <div className="mt-2 inline-block rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                  {invoice.invoice_type === 'RETURN'
                    ? `SALES RETURN / CREDIT NOTE (Ref: ${invoice.original_invoice_no ?? ''})`
                    : 'FBR FISCAL TAX INVOICE'}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">Invoice No:</span>{' '}
                  <strong className="font-mono">{invoice.invoice_no}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Date:</span>{' '}
                  <strong>{invoice.created_at}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Customer:</span>{' '}
                  <strong>{invoice.customer_name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Cashier:</span>{' '}
                  <strong>{invoice.cashier_name}</strong>
                </div>
              </div>

              <table className="mt-4 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-50 text-left text-slate-600">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">Tax</th>
                    <th className="py-2 pl-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <div className="font-medium text-slate-900">{item.item_name}</div>
                        <div className="text-[11px] text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-2 px-2 text-right">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(item.unit_price, '')}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {formatCurrency(item.tax_charged, '')}
                        <span className="block text-[10px] text-slate-400">
                          ({item.tax_rate}%)
                        </span>
                      </td>
                      <td className="py-2 pl-2 text-right font-semibold">
                        {formatCurrency(item.line_total, '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex flex-col items-end space-y-1 border-t border-dashed border-slate-300 pt-3 text-xs">
                <div className="flex w-56 justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal, settings.currency_symbol)}</span>
                </div>
                {invoice.discount_total > 0 && (
                  <div className="flex w-56 justify-between text-slate-600">
                    <span>Discount:</span>
                    <span>
                      -{formatCurrency(invoice.discount_total, settings.currency_symbol)}
                    </span>
                  </div>
                )}
                <div className="flex w-56 justify-between text-slate-600">
                  <span>Sales Tax (GST):</span>
                  <span>{formatCurrency(invoice.tax_total, settings.currency_symbol)}</span>
                </div>
                <div className="flex w-56 justify-between border-t border-slate-200 pt-1 text-sm font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(invoice.total_amount, settings.currency_symbol)}</span>
                </div>
                <div className="flex w-56 justify-between text-slate-500">
                  <span>Payment ({invoice.payment_mode}):</span>
                  <span>{formatCurrency(invoice.tendered_amount, settings.currency_symbol)}</span>
                </div>
                {invoice.change_amount > 0 && (
                  <div className="flex w-56 justify-between text-slate-500">
                    <span>Change:</span>
                    <span>{formatCurrency(invoice.change_amount, settings.currency_symbol)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">FBR Status:</span>
                    <FbrStatusBadge status={invoice.fbr_status} />
                  </div>
                  <div>
                    <span className="text-slate-500">FBR Invoice #:</span>{' '}
                    <strong className="font-mono text-slate-900">
                      {invoice.fbr_invoice_no ?? 'Pending Sync'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">POSID:</span>{' '}
                    <span className="font-mono">{invoice.fbr_pos_id ?? '-'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    USIN: <span className="font-mono">{invoice.usin}</span>
                  </div>
                  {invoice.fbr_error && (
                    <p className="text-[11px] font-medium text-red-600">{invoice.fbr_error}</p>
                  )}
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center">
                    <img
                      src={qrDataUrl}
                      alt="FBR Verification QR Code"
                      className="h-24 w-24 rounded border border-slate-200 bg-white p-1"
                    />
                    <span className="mt-1 text-[10px] font-medium text-slate-500">
                      Scan via Tax Asaan App
                    </span>
                  </div>
                )}
              </div>

              {settings.receipt_footer && (
                <p className="mt-3 text-center text-[11px] text-slate-500">
                  {settings.receipt_footer}
                </p>
              )}
            </div>
          )}

          {invoice && (
            <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {invoice.fbr_status !== 'SUBMITTED' && (
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={handleRetryFbr}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing to FBR...' : 'Retry FBR Sync'}
                  </button>
                )}
                {invoice.invoice_type === 'SALE' && (
                  <Link
                    href={`/returns?invoice=${encodeURIComponent(invoice.invoice_no)}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Process Return
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#49210a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5e2b0d]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

