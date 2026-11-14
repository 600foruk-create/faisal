import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseOptionalInt } from '../../../lib/api-utils.ts';
import { getDb } from '../../../lib/db.ts';
import { deleteProduct, getProducts, saveProduct } from '../../../lib/pos-service.ts';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const branchId = parseOptionalInt(sp.get('branchId'));
    const search = sp.get('search') ?? '';
    const category = sp.get('category') ?? '';
    const includeInactive = sp.get('includeInactive') === 'true';

    const db = getDb();
    const products = getProducts(db, { branchId, search, category, includeInactive });
    return jsonOk({ products });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id?: number;
      sku: string;
      barcode?: string;
      name: string;
      category: string;
      unit: string;
      sale_price: number;
      cost_price?: number;
      tax_rate: number;
      branch_id?: number;
      stock_qty?: number;
      is_active?: number;
    };
    if (!body.sku?.trim() || !body.name?.trim()) {
      return jsonError(new Error('SKU and product name are required'), 400);
    }
    const db = getDb();
    const product = saveProduct(db, body);
    return jsonOk({ product }, body.id ? 200 : 201);
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: number;
      sku: string;
      barcode?: string;
      name: string;
      category: string;
      unit: string;
      sale_price: number;
      cost_price?: number;
      tax_rate: number;
      branch_id?: number;
      stock_qty?: number;
      is_active?: number;
    };
    if (!body.id || !body.sku?.trim() || !body.name?.trim()) {
      return jsonError(new Error('Product ID, SKU, and name are required'), 400);
    }
    const db = getDb();
    const product = saveProduct(db, body);
    return jsonOk({ product }, 200);
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = parseOptionalInt(req.nextUrl.searchParams.get('id'));
    if (!id) {
      return jsonError(new Error('Product ID is required'), 400);
    }
    const db = getDb();
    const ok = deleteProduct(db, id);
    return jsonOk({ success: ok });
  } catch (err) {
    return jsonError(err, 400);
  }
}
