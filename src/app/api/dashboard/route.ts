import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { getLocalIsoDate } from '../../../lib/format.ts';
import { getDashboardSummary } from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId'));
    const today = getLocalIsoDate();
    const fromDate = sp.get('fromDate') || today;
    const toDate = sp.get('toDate') || today;
    const limit = Number(sp.get('limit') || '15') || 15;

    const db = getDb();
    const summary = getDashboardSummary(db, { branchId, fromDate, toDate, limit });
    return jsonOk(summary);
  } catch (err) {
    return jsonError(err, 500);
  }
}

