'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PauseCircle, PlayCircle, Store, Trash2 } from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency } from '@/lib/format';
import type { HeldCartRecord } from '@/lib/types';

export default function HoldRecallPage() {
  const router = useRouter();
  const { activeBranchId, settings, refreshHeldCount, refreshNonce } = usePosContext();
  const [carts, setCarts] = useState<HeldCartRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCarts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeBranchId) params.set('branchId', String(activeBranchId));
      const res = await fetch(`/api/hold?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { carts: HeldCartRecord[] };
        setCarts(data.carts);
      }
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    void loadCarts();
  }, [loadCarts, refreshNonce]);

  const handleRecall = (cart: HeldCartRecord) => {
    if (typeof window !== 'undefined') {
      const items = JSON.parse(cart.items_json) as unknown[];
      window.sessionStorage.setItem(
        'pos_recall_cart',
        JSON.stringify({
          id: cart.id,
          branch_id: cart.branch_id,
          customer_id: cart.customer_id,
          discount_total: cart.discount_total,
          notes: cart.notes,
          items,
        })
      );
    }
    router.push('/sale');
  };

  const handleDiscard = async (id: number) => {
    await fetch('/api/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    await Promise.all([loadCarts(), refreshHeldCount()]);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PauseCircle className="h-5 w-5 text-amber-600" />
          <h1 className="text-lg font-bold text-slate-900">Hold / Recall Bills</h1>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          {carts.length} Parked Bills
        </span>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading held bills...</p>
      ) : carts.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No held bills found. Use &ldquo;Hold Bill&rdquo; on the Sale screen to park an invoice.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {carts.map((cart) => (
            <div
              key={cart.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {cart.hold_code}
                  </span>
                  <span className="text-[11px] text-slate-500">{cart.created_at}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                  <Store className="h-3 w-3" />
                  {cart.branch_display_name}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{cart.customer_name}</p>
                <p className="text-xs text-slate-500">
                  Cashier: {cart.cashier_name} • {cart.item_count} item(s)
                </p>
                {cart.notes && (
                  <p className="mt-1.5 rounded bg-white px-2 py-1 text-xs text-slate-600">
                    Note: {cart.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3">
                <div className="mb-2.5 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Total:</span>
                  <span>{formatCurrency(cart.total_amount, settings.currency_symbol)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDiscard(cart.id)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecall(cart)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#0fa968] py-2 text-xs font-semibold text-white hover:bg-[#0d945b]"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Recall to POS
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

