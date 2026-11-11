import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { deleteHeldCart, holdCart, listHeldCarts } from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const branchId = parseOptionalInt(req.nextUrl.searchParams.get('branchId'));
    const db = getDb();
    const carts = listHeldCarts(db, branchId);
    return jsonOk({ carts });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as
      | (Parameters<typeof holdCart>[1] & { action?: undefined })
      | { action: 'delete'; id: number };
    const db = getDb();
    if ('action' in body && body.action === 'delete') {
      if (!Number.isInteger(body.id) || body.id <= 0) {
        return jsonError(new Error('Valid held cart ID is required'), 400);
      }
      deleteHeldCart(db, body.id);
      return jsonOk({ deleted: true });
    }
    const cart = holdCart(db, body as Parameters<typeof holdCart>[1]);
    return jsonOk({ cart }, 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError(new Error('Valid held cart ID is required'), 400);
    }
    const db = getDb();
    deleteHeldCart(db, id);
    return jsonOk({ deleted: true });
  } catch (err) {
    return jsonError(err, 400);
  }
}

