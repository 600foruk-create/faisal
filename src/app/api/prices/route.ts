import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { getProducts, updateProductPrices } from '../../../lib/pos-service.ts';
import type { ProductPriceBatchInput } from '../../../lib/types.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId')) ?? 1;
    const search = sp.get('search') ?? '';
    const category = sp.get('category') ?? '';

    const db = getDb();
    const products = getProducts(db, { branchId, search, category, includeInactive: true });
    return jsonOk({ products });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProductPriceBatchInput;

    if (!body || !Array.isArray(body.items)) {
      return jsonError(new Error('items array is required'), 400);
    }

    const db = getDb();
    const result = updateProductPrices(db, body);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err, 400);
  }
}
