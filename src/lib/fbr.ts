import { roundMoney } from './format.ts';
import type { FbrMode, InvoiceItemRecord, InvoiceRecord, PaymentMode } from './types.ts';

export const FBR_ENDPOINTS: Record<Exclude<FbrMode, 'MOCK'>, string> = {
  SANDBOX: 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb',
  PRODUCTION: 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata',
};

export interface FbrItemPayload {
  ItemCode: string;
  ItemName: string;
  Quantity: number;
  SaleValue: number;
  TaxRate: number;
  TaxCharged: number;
  Discount: number;
  TotalAmount: number;
  InvoiceType: number;
}

export interface FbrInvoicePayload {
  InvoiceNumber: string;
  POSID: number | string;
  USIN: string;
  DateTime: string;
  BuyerNTN: string;
  BuyerCNIC: string;
  BuyerName: string;
  BuyerPhoneNumber: string;
  TotalBillAmount: number;
  TotalQuantity: number;
  TotalSaleValue: number;
  TotalTaxCharged: number;
  Discount: number;
  FurtherTax: number;
  PaymentMode: number;
  InvoiceType: number;
  RefUSIN: string | null;
  Items: FbrItemPayload[];
}

export interface FbrSubmitResult {
  success: boolean;
  httpStatus: number | null;
  fbrInvoiceNo: string | null;
  errorMessage: string | null;
  requestPayload: FbrInvoicePayload;
  responsePayload: string;
}

function mapPaymentModeToFbr(mode: PaymentMode): number {
  switch (mode) {
    case 'CASH':
      return 1;
    case 'CARD':
      return 2;
    case 'BANK':
      return 6;
    case 'SPLIT':
      return 5;
    default:
      return 1;
  }
}

export function buildFbrInvoicePayload(params: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  posId: string;
  buyerPhone?: string;
  buyerCnic?: string;
  buyerNtn?: string;
  refUsin?: string | null;
}): FbrInvoicePayload {
  const { invoice, items, posId, buyerPhone = '', buyerCnic = '', buyerNtn = '', refUsin = null } = params;
  const isReturn = invoice.invoice_type === 'RETURN';
  const fbrInvoiceType = isReturn ? 3 : 1;

  const totalQty = roundMoney(items.reduce((sum, item) => sum + Math.abs(item.quantity), 0));
  const totalSaleValue = roundMoney(
    items.reduce((sum, item) => sum + Math.abs(item.quantity * item.unit_price - item.discount_amount), 0)
  );
  const totalTax = roundMoney(items.reduce((sum, item) => sum + Math.abs(item.tax_charged), 0));
  const totalBill = roundMoney(Math.abs(invoice.total_amount));

  const mappedItems: FbrItemPayload[] = items.map((item) => {
    const netSale = roundMoney(Math.abs(item.quantity * item.unit_price - item.discount_amount));
    const tax = roundMoney(Math.abs(item.tax_charged));
    return {
      ItemCode: item.sku,
      ItemName: item.item_name,
      Quantity: Math.abs(item.quantity),
      SaleValue: netSale,
      TaxRate: item.tax_rate,
      TaxCharged: tax,
      Discount: roundMoney(Math.abs(item.discount_amount)),
      TotalAmount: roundMoney(netSale + tax),
      InvoiceType: fbrInvoiceType,
    };
  });

  const numericPosId = /^\d+$/.test(posId) ? Number(posId) : posId;

  return {
    InvoiceNumber: '',
    POSID: numericPosId,
    USIN: invoice.usin,
    DateTime: invoice.created_at.slice(0, 19).replace('T', ' '),
    BuyerNTN: buyerNtn,
    BuyerCNIC: buyerCnic,
    BuyerName: invoice.customer_name,
    BuyerPhoneNumber: buyerPhone,
    TotalBillAmount: totalBill,
    TotalQuantity: totalQty,
    TotalSaleValue: totalSaleValue,
    TotalTaxCharged: totalTax,
    Discount: roundMoney(Math.abs(invoice.discount_total)),
    FurtherTax: 0,
    PaymentMode: mapPaymentModeToFbr(invoice.payment_mode),
    InvoiceType: fbrInvoiceType,
    RefUSIN: refUsin,
    Items: mappedItems,
  };
}

export function buildFbrQrPayload(params: {
  fbrInvoiceNo: string | null;
  posId: string | null;
  usin: string;
  invoiceNo: string;
  totalAmount: number;
  dateTime: string;
}): string {
  const { fbrInvoiceNo, posId, usin, invoiceNo, totalAmount, dateTime } = params;
  if (fbrInvoiceNo) {
    return JSON.stringify({
      FBRInvoiceNumber: fbrInvoiceNo,
      POSID: posId ?? '',
      USIN: usin,
      InvoiceNo: invoiceNo,
      Total: roundMoney(totalAmount),
      DateTime: dateTime,
    });
  }
  return `PENDING_FBR|POSID=${posId ?? ''}|USIN=${usin}|INV=${invoiceNo}|TOTAL=${roundMoney(totalAmount)}`;
}

export async function dispatchToFbr(params: {
  mode: FbrMode;
  token: string;
  payload: FbrInvoicePayload;
  simulateOffline?: boolean;
}): Promise<FbrSubmitResult> {
  const { mode, token, payload, simulateOffline = false } = params;

  if (simulateOffline) {
    return {
      success: false,
      httpStatus: 503,
      fbrInvoiceNo: null,
      errorMessage: 'Simulated offline / FBR gateway timeout. Queued for retry.',
      requestPayload: payload,
      responsePayload: JSON.stringify({ Code: '503', Response: 'Offline simulation active' }),
    };
  }

  if (mode === 'MOCK') {
    const suffix = String(Date.now()).slice(-8);
    const posStr = String(payload.POSID || '100001').replace(/\D/g, '').slice(0, 6) || '100001';
    const generatedNo = `${posStr}${payload.DateTime.slice(2, 10).replace(/-/g, '')}${suffix}`;
    const mockBody = {
      InvoiceNumber: generatedNo,
      Code: '100',
      Response: 'Invoice received successfully (Mock FBR Mode)',
      Errors: '',
    };
    return {
      success: true,
      httpStatus: 200,
      fbrInvoiceNo: generatedNo,
      errorMessage: null,
      requestPayload: payload,
      responsePayload: JSON.stringify(mockBody),
    };
  }

  const endpoint = FBR_ENDPOINTS[mode];
  if (!token.trim()) {
    return {
      success: false,
      httpStatus: 401,
      fbrInvoiceNo: null,
      errorMessage: `FBR ${mode} Bearer Token is not configured for this terminal.`,
      requestPayload: payload,
      responsePayload: JSON.stringify({ error: 'Missing FBR Bearer Token' }),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rawText = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = { raw: rawText };
    }

    const invoiceNo =
      typeof parsed.InvoiceNumber === 'string' && parsed.InvoiceNumber.trim()
        ? parsed.InvoiceNumber.trim()
        : null;
    const code = parsed.Code != null ? String(parsed.Code) : '';

    if (res.ok && invoiceNo && (!code || code === '100')) {
      return {
        success: true,
        httpStatus: res.status,
        fbrInvoiceNo: invoiceNo,
        errorMessage: null,
        requestPayload: payload,
        responsePayload: rawText,
      };
    }

    const msg =
      (typeof parsed.Response === 'string' && parsed.Response) ||
      (typeof parsed.Errors === 'string' && parsed.Errors) ||
      `FBR returned HTTP ${res.status}`;

    return {
      success: false,
      httpStatus: res.status,
      fbrInvoiceNo: null,
      errorMessage: msg,
      requestPayload: payload,
      responsePayload: rawText,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error contacting FBR';
    return {
      success: false,
      httpStatus: null,
      fbrInvoiceNo: null,
      errorMessage: message,
      requestPayload: payload,
      responsePayload: JSON.stringify({ error: message }),
    };
  }
}

