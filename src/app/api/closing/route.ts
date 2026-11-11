import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { getLocalIsoDate } from '../../../lib/format.ts';
import {
  getDayClosingPreview,
  listDayClosings,
  submitDayClosing,
} from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId'));
    const closingDate = sp.get('date') || getLocalIsoDate();
    const openingCash = Number(sp.get('openingCash') || '0') || 0;

    const db = getDb();
    const preview = branchId ? getDayClosingPreview(db, branchId, closingDate, openingCash) : null;
    const history = listDayClosings(db, branchId);
    return jsonOk({ preview, history });
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Parameters<typeof submitDayClosing>[1];
    const db = getDb();
    const closing = submitDayClosing(db, body);
    return jsonOk({ closing }, 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

