import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { jsonError, jsonOk } from '../../../../lib/api-utils.ts';
import { getDb } from '../../../../lib/db.ts';
import { getInvoiceDetail, submitInvoiceToFbr } from '../../../../lib/pos-service.ts';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const invoice = getInvoiceDetail(db, id);
    if (!invoice) {
      return jsonError(new Error('Invoice not found'), 404);
    }
    const qrDataUrl = await QRCode.toDataURL(invoice.fbr_qr_payload, {
      width: 180,
      margin: 1,
    });
    return jsonOk({ invoice, qrDataUrl });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const existing = getInvoiceDetail(db, id);
    if (!existing) {
      return jsonError(new Error('Invoice not found'), 404);
    }
    const invoice = await submitInvoiceToFbr(db, existing.id);
    const qrDataUrl = await QRCode.toDataURL(invoice.fbr_qr_payload, {
      width: 180,
      margin: 1,
    });
    return jsonOk({ invoice, qrDataUrl });
  } catch (err) {
    return jsonError(err, 400);
  }
}

