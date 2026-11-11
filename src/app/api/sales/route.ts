import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { createSale, getSalesRegister, type CreateSaleInput } from '../../../lib/pos-service.ts';
import type { FbrStatus, PaymentMode } from '../../../lib/types.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId'));
    const fromDate = sp.get('fromDate') || undefined;
    const toDate = sp.get('toDate') || undefined;
    const fbrStatus = (sp.get('fbrStatus') as FbrStatus | 'ALL' | null) || 'ALL';
    const paymentMode = (sp.get('paymentMode') as PaymentMode | 'ALL' | null) || 'ALL';
    const invoiceType = (sp.get('invoiceType') as 'SALE' | 'RETURN' | 'ALL' | null) || 'ALL';
    const search = sp.get('search') || undefined;
    const limit = Number(sp.get('limit') || '100') || 100;
    const offset = Number(sp.get('offset') || '0') || 0;

    const db = getDb();
    const result = getSalesRegister(db, {
      branchId,
      fromDate,
      toDate,
      fbrStatus,
      paymentMode,
      invoiceType,
      search,
      limit,
      offset,
    });
    return jsonOk(result);
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateSaleInput;
    const db = getDb();
    const invoice = await createSale(db, body);
    return jsonOk({ invoice }, 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

