import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { createCustomer, getCustomers } from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const branchId = parseOptionalInt(req.nextUrl.searchParams.get('branchId'));
    const db = getDb();
    const customers = getCustomers(db, branchId);
    return jsonOk({ customers });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      branch_id?: number | null;
      name: string;
      phone?: string;
      cnic?: string;
      ntn?: string;
    };
    if (!body.name?.trim()) {
      return jsonError(new Error('Customer name is required'), 400);
    }
    const db = getDb();
    const customer = createCustomer(db, body);
    return jsonOk({ customer }, 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

