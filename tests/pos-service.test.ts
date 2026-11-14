import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInMemoryDb } from '../src/lib/db.ts';
import { getLocalIsoDate } from '../src/lib/format.ts';
import {
  authenticateUser,
  clearAllTransactions,
  createCustomer,
  createSale,
  createSalesReturn,
  deleteCategory,
  deleteCustomer,
  deleteProduct,
  exportSystemBackup,
  getBranchesWithTerminals,
  getBusinessSettings,
  getCategories,
  getCustomers,
  getDashboardSummary,
  getDayClosingPreview,
  getInvoiceDetail,
  getProducts,
  getUsers,
  holdCart,
  listHeldCarts,
  saveCategory,
  saveProduct,
  submitDayClosing,
  syncPendingFbrInvoices,
  updateBusinessSettings,
  updateCustomer,
  updateUser,
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

  it('updates branding settings, user roles/passwords, and exports backup without hashes', () => {
    const db = createInMemoryDb(true);
    const updatedSettings = updateBusinessSettings(db, {
      software_brand: 'Softifyx Pro',
      business_name: 'M/S SEASTONE PVC PIPE INDUSTRY',
      logo_data_url: 'data:image/png;base64,AAAA',
      footer_text: 'Powered by Softifyx',
      default_opening_cash: 7500,
    });
    assert.equal(updatedSettings.software_brand, 'Softifyx Pro');
    assert.equal(updatedSettings.logo_data_url, 'data:image/png;base64,AAAA');
    assert.equal(getBusinessSettings(db).default_opening_cash, 7500);

    const users = getUsers(db);
    const cashier = users.find((u) => u.username === 'cashier.timergara')!;
    const promoted = updateUser(db, {
      id: cashier.id,
      full_name: 'Bilal Khan (Manager)',
      role: 'MANAGER',
      branch_id: cashier.branch_id,
      is_active: 1,
      password: 'newpass99',
    });
    assert.equal(promoted.role, 'MANAGER');
    assert.ok(authenticateUser(db, 'cashier.timergara', 'newpass99'));

    const today = getLocalIsoDate();
    const dash = getDashboardSummary(db, { branchId: 1, fromDate: today, toDate: today });
    assert.equal(dash.opening_cash, 7500);
    assert.equal(dash.held_carts_count, 0);

    const backup = exportSystemBackup(db);
    assert.equal(backup.settings.software_brand, 'Softifyx Pro');
    assert.equal(backup.branches.length, 2);
    for (const u of backup.users as unknown as Array<Record<string, unknown>>) {
      assert.equal('password_hash' in u, false);
    }
  });

  it('clears transactions while keeping company settings, branches, users, and products', () => {
    const db = createInMemoryDb(true);
    assert.ok(getDashboardSummary(db, { fromDate: '2000-01-01', toDate: '2099-12-31' }).total_invoices > 0);

    const res = clearAllTransactions(db);
    assert.equal(res.cleared, true);

    const after = getDashboardSummary(db, { fromDate: '2000-01-01', toDate: '2099-12-31' });
    assert.equal(after.total_invoices, 0);
    assert.equal(after.held_carts_count, 0);
    assert.equal(getUsers(db).length >= 3, true);
    assert.equal(getProducts(db, { includeInactive: true }).length > 0, true);
  });

  it('creates, updates, and deletes customers while protecting walk-in profile', () => {
    const db = createInMemoryDb(true);
    const initial = getCustomers(db);
    const walkIn = initial.find((c) => c.is_walk_in === 1)!;
    assert.ok(walkIn);

    // Walk-in deletion should fail
    const cannotDeleteWalkIn = deleteCustomer(db, walkIn.id);
    assert.equal(cannotDeleteWalkIn, false);

    // Create new customer
    const created = createCustomer(db, {
      branch_id: 1,
      name: 'Haji Usman Hardware',
      phone: '0300-9876543',
      cnic: '13302-1234567-1',
      ntn: '1234567-8',
    });
    assert.equal(created.name, 'Haji Usman Hardware');
    assert.equal(created.phone, '0300-9876543');
    assert.equal(created.is_walk_in, 0);

    // Update customer
    const updated = updateCustomer(db, created.id, {
      branch_id: 2,
      name: 'Haji Usman Hardware & Sanitary',
      phone: '0300-9876544',
      cnic: '13302-1234567-1',
      ntn: '9999999-9',
    });
    assert.equal(updated.name, 'Haji Usman Hardware & Sanitary');
    assert.equal(updated.phone, '0300-9876544');
    assert.equal(updated.branch_id, 2);

    // Delete customer
    const deleted = deleteCustomer(db, created.id);
    assert.equal(deleted, true);

    const remaining = getCustomers(db);
    assert.equal(remaining.some((c) => c.id === created.id), false);
  });

  it('registers, updates, and deletes inventory catalog products', () => {
    const db = createInMemoryDb(true);
    const initial = getProducts(db, { includeInactive: true });
    assert.ok(initial.length > 0);

    // Register new finished goods item
    const created = saveProduct(db, {
      sku: 'FG-999999',
      barcode: '896999999999',
      name: '4" Heavy Duty Pressure Pipe',
      category: 'PVC Pipes',
      unit: 'Kgs',
      sale_price: 1850,
      cost_price: 1400,
      tax_rate: 18,
      branch_id: 1,
      stock_qty: 250,
      is_active: 1,
    });
    assert.equal(created.sku, 'FG-999999');
    assert.equal(created.sale_price, 1850);
    assert.equal(created.stock_qty, 250);

    // Update product
    const updated = saveProduct(db, {
      id: created.id,
      sku: 'FG-999999',
      name: '4" Heavy Duty Pressure Pipe - Class D',
      category: 'PVC Pipes',
      unit: 'Kgs',
      sale_price: 1950,
      cost_price: 1450,
      tax_rate: 18,
      is_active: 1,
    });
    assert.equal(updated.name, '4" Heavy Duty Pressure Pipe - Class D');
    assert.equal(updated.sale_price, 1950);

    // Delete product (no sales history, so it gets removed)
    const deleted = deleteProduct(db, created.id);
    assert.equal(deleted, true);

    const after = getProducts(db, { includeInactive: true });
    assert.equal(after.some((p) => p.id === created.id), false);
  });

  it('manages 3-tier inventory categories and subcategories', () => {
    const db = createInMemoryDb(true);
    const initial = getCategories(db);
    assert.ok(initial.length > 0);

    // Save new main category
    const main = saveCategory(db, {
      code: 'TENANT-1',
      name: 'ELECTRONICS & MOTORS',
      category_type: 'Finish Goods',
    });
    assert.equal(main.code, 'TENANT-1');
    assert.equal(main.name, 'ELECTRONICS & MOTORS');

    // Save subcategory under main
    const sub = saveCategory(db, {
      code: 'TENANT-101',
      name: 'SUBMERSIBLE PUMPS',
      category_type: 'Finish Goods',
      parent_code: 'TENANT-1',
    });
    assert.equal(sub.code, 'TENANT-101');
    assert.equal(sub.parent_code, 'TENANT-1');

    // Verify retrieval
    const cats = getCategories(db);
    assert.ok(cats.some((c) => c.code === 'TENANT-1'));
    assert.ok(cats.some((c) => c.code === 'TENANT-101'));

    // Delete category
    const deleted = deleteCategory(db, 'TENANT-1');
    assert.equal(deleted, true);
    const remaining = getCategories(db);
    assert.equal(remaining.some((c) => c.code === 'TENANT-1'), false);
  });
});

