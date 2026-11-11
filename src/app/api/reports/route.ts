import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { getLocalIsoDate } from '../../../lib/format.ts';
import { getReportsData } from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId'));
    const today = getLocalIsoDate();
    const fromDate = sp.get('fromDate') || today;
    const toDate = sp.get('toDate') || today;

    const db = getDb();
    const report = getReportsData(db, { branchId, fromDate, toDate });
    return jsonOk(report);
  } catch (err) {
    return jsonError(err, 500);
  }
}

