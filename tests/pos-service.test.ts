import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInMemoryDb } from '../src/lib/db.ts';
import { getLocalIsoDate } from '../src/lib/format.ts';
import {
  authenticateUser,
  createSale,
  createSalesReturn,
  getBranchesWithTerminals,
  getDashboardSummary,
  getDayClosingPreview,
  getInvoiceDetail,
  getProducts,
  holdCart,
  listHeldCarts,
  submitDayClosing,
  syncPendingFbrInvoices,
} from '../src/lib/pos-service.ts';

describe('Multi-Branch POS & FBR Integration Service', () => {
  it('seeds consolidated today metrics matching reference dashboard', () => {
    const db = createInMemoryDb(true);
    const today = getLocalIsoDate();
    const summary = getDashboardSummary(db, {
      branchId: null,
      fromDate: today,
      toDate: today,
    });

    assert.equal(summary.total_invoices, 6);
    assert.equal(summary.total_sale, 459895.52);
    assert.equal(summary.cash_received, 459895.52);
    assert.equal(summary.fbr_pending, 0);
    assert.equal(summary.fbr_submitted, 6);
    assert.ok(summary.avg_ticket > 0);
    assert.ok(summary.tax_collected > 0);
    assert.equal(summary.branch_breakdown.length, 2);
    assert.ok(summary.sales_trend.length >= 1);
    assert.equal(summary.low_stock_items.length, 5);
    assert.equal(summary.recent_invoices.length, 6);
    assert.equal(summary.recent_invoices[0].invoice_no, 'SWT-A-POS-63');
  });

  it('creates a sale, deducts branch stock, and fiscalizes with Mock FBR', async () => {
    const db = createInMemoryDb(true);
    const { branches } = getBranchesWithTerminals(db);
    const timergara = branches[0];
    const beforeProducts = getProducts(db, { branchId: timergara.id });
    const item = beforeProducts[0];

    const invoice = await createSale(db, {
      branchId: timergara.id,
      paymentMode: 'CASH',
      tenderedAmount: 15000,
      items: [{ productId: item.id, quantity: 2 }],
    });

    assert.equal(invoice.invoice_no, 'SWT-A-POS-64');
    assert.equal(invoice.fbr_status, 'SUBMITTED');
    assert.ok(invoice.fbr_invoice_no);
    assert.equal(invoice.items.length, 1);
    assert.equal(invoice.subtotal, item.sale_price * 2);

    const afterProducts = getProducts(db, { branchId: timergara.id });
    const updatedItem = afterProducts.find((p) => p.id === item.id)!;
    assert.equal(updatedItem.stock_qty, item.stock_qty - 2);
  });

  it('queues offline FBR invoice as PENDING and syncs it later', async () => {
    const db = createInMemoryDb(true);
    const { branches } = getBranchesWithTerminals(db);
    const mingora = branches[1];
    const products = getProducts(db, { branchId: mingora.id });
    const today = getLocalIsoDate();

    const invoice = await createSale(db, {
      branchId: mingora.id,
      paymentMode: 'CASH',
      simulateFbrOffline: true,
      items: [{ productId: products[0].id, quantity: 1 }],
    });

    assert.equal(invoice.fbr_status, 'PENDING');
    assert.equal(invoice.fbr_invoice_no, null);

    const beforeSync = getDashboardSummary(db, {
      branchId: mingora.id,
      fromDate: today,
      toDate: today,
    });
    assert.equal(beforeSync.fbr_pending, 1);

    const syncRes = await syncPendingFbrInvoices(db, mingora.id);
    assert.equal(syncRes.attempted, 1);
    assert.equal(syncRes.succeeded, 1);
    assert.equal(syncRes.failed, 0);

    const afterSync = getDashboardSummary(db, {
      branchId: mingora.id,
      fromDate: today,
      toDate: today,
    });
    assert.equal(afterSync.fbr_pending, 0);
  });

  it('processes partial sales return, restores stock, and blocks over-returning', async () => {
    const db = createInMemoryDb(true);
    const { branches } = getBranchesWithTerminals(db);
    const branchId = branches[0].id;
    const products = getProducts(db, { branchId });
    const targetProduct = products[2];
    const initialStock = targetProduct.stock_qty;

    const sale = await createSale(db, {
      branchId,
      paymentMode: 'CASH',
      items: [{ productId: targetProduct.id, quantity: 3 }],
    });

    const ret = await createSalesReturn(db, {
      originalInvoiceId: sale.id,
      refundMode: 'CASH',
      reason: 'Damaged tiles',
      items: [{ productId: targetProduct.id, quantity: 2 }],
    });

    assert.equal(ret.invoice_type, 'RETURN');
    assert.equal(ret.fbr_status, 'SUBMITTED');

    const afterStock = getProducts(db, { branchId }).find((p) => p.id === targetProduct.id)!.stock_qty;
    assert.equal(afterStock, initialStock - 3 + 2);

    const refreshedSale = getInvoiceDetail(db, sale.id)!;
    assert.equal(refreshedSale.returned_quantities?.[targetProduct.id], 2);

    await assert.rejects(
      () =>
        createSalesReturn(db, {
          originalInvoiceId: sale.id,
          refundMode: 'CASH',
          items: [{ productId: targetProduct.id, quantity: 2 }],
        }),
      /Remaining returnable qty: 1/
    );
  });

  it('holds and recalls a cart and finalizes day closing accurately', async () => {
    const db = createInMemoryDb(true);
    const { branches } = getBranchesWithTerminals(db);
    const branchId = branches[0].id;
    const products = getProducts(db, { branchId });
    const today = getLocalIsoDate();

    const held = holdCart(db, {
      branchId,
      customerName: 'Walk-in Test',
      items: [
        {
          productId: products[0].id,
          sku: products[0].sku,
          name: products[0].name,
          unitPrice: products[0].sale_price,
          taxRate: products[0].tax_rate,
          quantity: 1,
          discountAmount: 0,
        },
      ],
    });
    assert.equal(listHeldCarts(db, branchId).length, 1);

    await createSale(db, {
      branchId,
      paymentMode: 'CASH',
      heldCartId: held.id,
      items: [{ productId: products[0].id, quantity: 1 }],
    });
    assert.equal(listHeldCarts(db, branchId).length, 0);

    const preview = getDayClosingPreview(db, branchId, today, 5000);
    assert.equal(preview.already_closed, null);

    const closing = submitDayClosing(db, {
      branchId,
      closingDate: today,
      openingCash: 5000,
      countedCash: preview.expected_cash - 100,
      notes: 'Short by 100',
    });
    assert.equal(closing.variance, -100);

    assert.throws(() =>
      submitDayClosing(db, {
        branchId,
        closingDate: today,
        openingCash: 5000,
        countedCash: preview.expected_cash,
      })
    );
  });

  it('authenticates seeded admin and cashier accounts', () => {
    const db = createInMemoryDb(true);
    const admin = authenticateUser(db, 'admin', 'admin123');
    assert.ok(admin);
    assert.equal(admin.role, 'ADMIN');

    const bad = authenticateUser(db, 'admin', 'wrongpass');
    assert.equal(bad, null);
  });
});

