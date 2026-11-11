'use client';

import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { FbrStatus } from '@/lib/types';

export function FbrStatusBadge({ status }: { status: FbrStatus }) {
  if (status === 'SUBMITTED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Submitted
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
      Failed
    </span>
  );
}

