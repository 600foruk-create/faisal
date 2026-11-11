import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import {
  createSalesReturn,
  getSalesRegister,
  type CreateReturnInput,
} from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const branchId = parseOptionalInt(req.nextUrl.searchParams.get('branchId'));
    const db = getDb();
    const data = getSalesRegister(db, {
      branchId,
      invoiceType: 'RETURN',
      limit: 50,
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateReturnInput;
    const db = getDb();
    const returnInvoice = await createSalesReturn(db, body);
    return jsonOk({ invoice: returnInvoice }, 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

