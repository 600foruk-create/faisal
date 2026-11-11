'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, DoorOpen, Store } from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, getLocalIsoDate, roundMoney } from '@/lib/format';
import type { DayClosingPreview, DayClosingRecord } from '@/lib/types';

export default function DayClosingPage() {
  const { branches, activeBranchId, activeUser, settings, refreshNonce } = usePosContext();

  const [branchId, setBranchId] = useState<number>(1);
  const [closingDate, setClosingDate] = useState<string>(() => getLocalIsoDate());
  const [openingCash, setOpeningCash] = useState<string>('5000');
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<DayClosingPreview | null>(null);
  const [history, setHistory] = useState<DayClosingRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (activeBranchId) {
      setBranchId(activeBranchId);
    } else if (branches.length > 0 && !branches.some((b) => b.id === branchId)) {
      setBranchId(branches[0].id);
    }
  }, [activeBranchId, branches, branchId]);

  const loadClosing = useCallback(async () => {
    if (!branchId) return;
    const params = new URLSearchParams({
      branchId: String(branchId),
      date: closingDate,
      openingCash: openingCash || '0',
    });
    const res = await fetch(`/api/closing?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as {
        preview: DayClosingPreview | null;
        history: DayClosingRecord[];
      };
      setPreview(data.preview);
      setHistory(data.history);
      if (data.preview && !data.preview.already_closed) {
        setCountedCash(String(data.preview.expected_cash));
      }
    }
  }, [branchId, closingDate, openingCash]);

  useEffect(() => {
    void loadClosing();
  }, [loadClosing, refreshNonce]);

  const countedNum = Number(countedCash) || 0;
  const variance = preview ? roundMoney(countedNum - preview.expected_cash) : 0;

  const handleFinalizeClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || preview.already_closed) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          closingDate,
          openingCash: Number(openingCash) || 0,
          countedCash: countedNum,
          userId: activeUser?.id ?? null,
          closedByName: activeUser?.full_name ?? 'Branch Manager',
          notes,
        }),
      });
      const data = (await res.json()) as { closing?: DayClosingRecord; error?: string };
      if (!res.ok || !data.closing) {
        setMessage({ type: 'error', text: data.error || 'Failed to finalize day closing' });
        return;
      }
      setMessage({
        type: 'success',
        text: `Day closing finalized for ${data.closing.branch_display_name} (${data.closing.closing_date}).`,
      });
      setNotes('');
      await loadClosing();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">Day Closing & Cash Reconciliation</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-sky-600" />
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-medium"
            />
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-xs font-medium ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {preview && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
              <h2 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-800">
                System Summary ({preview.closing_date})
              </h2>
              <div className="flex justify-between">
                <span className="text-slate-600">Opening Cash Float:</span>
                <strong>{formatCurrency(preview.opening_cash, settings.currency_symbol)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Gross Sales ({preview.sales_count} invoices):
                </span>
                <strong>{formatCurrency(preview.gross_sales, settings.currency_symbol)}</strong>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Sales Returns ({preview.returns_count}):</span>
                <strong>-{formatCurrency(preview.returns_total, settings.currency_symbol)}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span>Net Sales:</span>
                <span>{formatCurrency(preview.net_sales, settings.currency_symbol)}</span>
              </div>
              <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>{formatCurrency(preview.cash_sales, settings.currency_symbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Refunds:</span>
                  <span>-{formatCurrency(preview.cash_refunds, settings.currency_symbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span>{formatCurrency(preview.card_sales, settings.currency_symbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank / Raast Sales:</span>
                  <span>{formatCurrency(preview.bank_sales, settings.currency_symbol)}</span>
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-emerald-800">
                <span>Expected Cash in Drawer:</span>
                <span>{formatCurrency(preview.expected_cash, settings.currency_symbol)}</span>
              </div>
            </div>

            {preview.already_closed ? (
              <div className="flex flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <h2 className="text-base font-bold">Day Already Closed</h2>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p>
                    Closed By: <strong>{preview.already_closed.closed_by_name}</strong> at{' '}
                    {preview.already_closed.created_at}
                  </p>
                  <p>
                    Counted Cash:{' '}
                    <strong>
                      {formatCurrency(
                        preview.already_closed.counted_cash,
                        settings.currency_symbol
                      )}
                    </strong>
                  </p>
                  <p>
                    Variance:{' '}
                    <strong
                      className={
                        preview.already_closed.variance === 0
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }
                    >
                      {formatCurrency(preview.already_closed.variance, settings.currency_symbol)}
                    </strong>
                  </p>
                  {preview.already_closed.notes && <p>Notes: {preview.already_closed.notes}</p>}
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleFinalizeClosing}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">
                  Drawer Count & Finalize Z-Report
                </h2>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Opening Cash Float (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Actual Counted Cash in Drawer (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
                    required
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-600">Cash Variance (Over / Short):</span>
                  <span
                    className={`text-sm font-bold ${
                      variance === 0
                        ? 'text-emerald-700'
                        : variance > 0
                          ? 'text-sky-700'
                          : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(variance, settings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Shift remarks or variance explanation..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full cursor-pointer rounded-lg bg-[#49210a] py-2.5 text-sm font-bold text-white hover:bg-[#5e2b0d] disabled:opacity-50"
                >
                  {submitting ? 'Finalizing...' : 'Finalize Day Closing'}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900">Day Closing History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Closed By</th>
                <th className="px-4 py-3 text-right">Net Sales</th>
                <th className="px-4 py-3 text-right">Expected Cash</th>
                <th className="px-4 py-3 text-right">Counted Cash</th>
                <th className="px-4 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No day closings recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 font-bold">{h.closing_date}</td>
                    <td className="px-4 py-3">{h.branch_display_name}</td>
                    <td className="px-4 py-3">{h.closed_by_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(h.net_sales, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(h.expected_cash, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(h.counted_cash, settings.currency_symbol)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(h.variance, settings.currency_symbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

