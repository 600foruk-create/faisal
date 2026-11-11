import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../../lib/api-utils.ts';
import { getDb } from '../../../../lib/db.ts';
import { syncPendingFbrInvoices } from '../../../../lib/pos-service.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { branchId?: number | string | null };
    const branchId =
      typeof body.branchId === 'number'
        ? body.branchId
        : parseOptionalInt(body.branchId ? String(body.branchId) : null);
    const db = getDb();
    const summary = await syncPendingFbrInvoices(db, branchId);
    return jsonOk(summary);
  } catch (err) {
    return jsonError(err, 500);
  }
}

