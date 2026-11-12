import type { PaymentMode } from '@/lib/types';

const MODE_STYLE: Record<PaymentMode, string> = {
  CASH: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CARD: 'border-sky-200 bg-sky-50 text-sky-700',
  BANK: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  SPLIT: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function PaymentModeBadge({ mode }: { mode: PaymentMode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${
        MODE_STYLE[mode] ?? 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {mode}
    </span>
  );
}

