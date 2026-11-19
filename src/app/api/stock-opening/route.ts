import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { commitStockOpeningBalances, getProducts } from '../../../lib/pos-service.ts';
import type { StockOpeningBatchInput } from '../../../lib/types.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId')) ?? 1;
    const search = sp.get('search') ?? '';
    const category = sp.get('category') ?? '';

    const db = getDb();
    const products = getProducts(db, { branchId, search, category, includeInactive: true });
    return jsonOk({ products, branch_id: branchId });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StockOpeningBatchInput;

    if (!body || !body.branch_id || !Array.isArray(body.items)) {
      return jsonError(new Error('branch_id and valid items list are required'), 400);
    }

    const db = getDb();
    const result = commitStockOpeningBalances(db, body);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err, 400);
  }
}
