import type { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.ts';
import { getLocalIsoDate, getLocalIsoDateTime, roundMoney } from './format.ts';

interface SeedProductDef {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  taxRate: number;
}

const SEED_PRODUCTS: SeedProductDef[] = [
  {
    sku: 'STN-POR-6060',
    barcode: '8961001000011',
    name: 'Seastone Imperial Porcelain Tile 60x60cm (Box)',
    category: 'Porcelain Tiles',
    unit: 'Box',
    salePrice: 4400,
    costPrice: 3550,
    taxRate: 18,
  },
  {
    sku: 'STN-POR-8080',
    barcode: '8961001000028',
    name: 'Seastone Carrara Marble Gloss 80x80cm (Box)',
    category: 'Porcelain Tiles',
    unit: 'Box',
    salePrice: 6800,
    costPrice: 5400,
    taxRate: 18,
  },
  {
    sku: 'STN-WALL-3060',
    barcode: '8961001000035',
    name: 'Ceramic Wall Tile Ivory Matte 30x60cm (Box)',
    category: 'Wall Tiles',
    unit: 'Box',
    salePrice: 3100,
    costPrice: 2450,
    taxRate: 18,
  },
  {
    sku: 'STN-ADH-20KG',
    barcode: '8961001000042',
    name: 'Heavy Duty Tile Bond Adhesive 20kg Bag',
    category: 'Adhesives & Grout',
    unit: 'Bag',
    salePrice: 1250,
    costPrice: 920,
    taxRate: 18,
  },
  {
    sku: 'STN-GRT-05KG',
    barcode: '8961001000059',
    name: 'Waterproof Epoxy Tile Grout 5kg',
    category: 'Adhesives & Grout',
    unit: 'Pack',
    salePrice: 1850,
    costPrice: 1400,
    taxRate: 18,
  },
  {
    sku: 'SAN-BAS-101',
    barcode: '8961001000066',
    name: 'Modern Countertop Ceramic Wash Basin',
    category: 'Sanitary Ware',
    unit: 'Pcs',
    salePrice: 14500,
    costPrice: 11200,
    taxRate: 18,
  },
  {
    sku: 'SAN-MIX-204',
    barcode: '8961001000073',
    name: 'Brushed Steel Basin Mixer Tap',
    category: 'Fittings & Taps',
    unit: 'Pcs',
    salePrice: 8200,
    costPrice: 6300,
    taxRate: 18,
  },
  {
    sku: 'SAN-SHW-305',
    barcode: '8961001000080',
    name: 'Thermostatic Rain Shower Set Chrome',
    category: 'Fittings & Taps',
    unit: 'Set',
    salePrice: 22400,
    costPrice: 17500,
    taxRate: 18,
  },
  {
    sku: 'SAN-COM-408',
    barcode: '8961001000097',
    name: 'One-Piece Rimless Soft-Close Commode',
    category: 'Sanitary Ware',
    unit: 'Pcs',
    salePrice: 32500,
    costPrice: 25800,
    taxRate: 18,
  },
  {
    sku: 'ACC-TRM-12MM',
    barcode: '8961001000103',
    name: 'Anodized Aluminum Tile Edge Trim 2.5m',
    category: 'Accessories',
    unit: 'Pcs',
    salePrice: 950,
    costPrice: 680,
    taxRate: 18,
  },
];

function buildSampleLineItem(params: {
  productId: number;
  sku: string;
  name: string;
  qty: number;
  targetLineTotal: number;
  taxRate: number;
}) {
  const { productId, sku, name, qty, targetLineTotal, taxRate } = params;
  const subtotal = roundMoney(targetLineTotal / (1 + taxRate / 100));
  const taxCharged = roundMoney(targetLineTotal - subtotal);
  const unitPrice = roundMoney(subtotal / qty);
  return {
    productId,
    sku,
    name,
    qty,
    unitPrice,
    subtotal,
    taxRate,
    taxCharged,
    lineTotal: roundMoney(targetLineTotal),
  };
}

export function seedInitialData(db: DatabaseSync): void {
  const branchCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM branches').get() as { cnt: number };
  if (branchCountRow.cnt > 0) return;

  const nowDate = new Date();
  const today = getLocalIsoDate(nowDate);
  const yesterdayDate = new Date(nowDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalIsoDate(yesterdayDate);
  const nowTs = getLocalIsoDateTime(nowDate);

  // 1. Business Settings
  const insertSetting = db.prepare('INSERT INTO business_settings (key, value) VALUES (?, ?)');
  insertSetting.run('business_name', 'SEASTONE RETAIL OUTLET');
  insertSetting.run('ntn', '4125890-7');
  insertSetting.run('strn', '3277876124891');
  insertSetting.run('default_tax_rate', '18');
  insertSetting.run('receipt_footer', 'Thank you for shopping with Seastone Retail Outlet! Verify FBR invoice via Tax Asaan App or SMS to 9966.');
  insertSetting.run('currency_symbol', 'Rs.');

  // 2. Branches
  const insertBranch = db.prepare(
    `INSERT INTO branches (code, name, display_name, address, phone, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  const b1 = insertBranch.run(
    'SWT-A',
    'Timergara',
    'SEASTONE RETAIL OUTLET ( TIMERGARA )',
    'Main Chakdara Road, Timergara, Lower Dir',
    '0945-822140',
    nowTs
  );
  const b2 = insertBranch.run(
    'SWT-B',
    'Mingora',
    'SEASTONE RETAIL OUTLET ( MINGORA )',
    'GT Road Rahimabad, Mingora, Swat',
    '0946-712490',
    nowTs
  );
  const branch1Id = Number(b1.lastInsertRowid);
  const branch2Id = Number(b2.lastInsertRowid);

  // 3. POS Terminals
  const insertTerminal = db.prepare(
    `INSERT INTO pos_terminals (branch_id, terminal_code, invoice_prefix, next_sequence, fbr_pos_id, fbr_token, fbr_mode, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 'MOCK', 1)`
  );
  const t1 = insertTerminal.run(branch1Id, 'TERM-A1', 'SWT-A-POS', 64, '104521', 'MOCK-TOKEN-TIMERGARA');
  const t2 = insertTerminal.run(branch2Id, 'TERM-B1', 'SWT-B-POS', 74, '104522', 'MOCK-TOKEN-MINGORA');
  const term1Id = Number(t1.lastInsertRowid);
  const term2Id = Number(t2.lastInsertRowid);

  // 4. Users
  const insertUser = db.prepare(
    `INSERT INTO users (username, full_name, password_hash, role, branch_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  );
  const adminHash = hashPassword('admin123');
  const cashierHash = hashPassword('1234');
  const uAdmin = insertUser.run('admin', 'Faisal (Owner / Admin)', adminHash, 'ADMIN', null, nowTs);
  const uTimergara = insertUser.run('cashier.timergara', 'Bilal Khan (Timergara POS)', cashierHash, 'CASHIER', branch1Id, nowTs);
  const uMingora = insertUser.run('cashier.mingora', 'Hamza Ali (Mingora POS)', cashierHash, 'CASHIER', branch2Id, nowTs);
  const adminId = Number(uAdmin.lastInsertRowid);
  const cashier1Id = Number(uTimergara.lastInsertRowid);
  const cashier2Id = Number(uMingora.lastInsertRowid);

  // 5. Customers
  const insertCustomer = db.prepare(
    `INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const cWalk1 = insertCustomer.run(branch1Id, 'Walk-in (Cash) Customer ( Timergara )', '', '', '', 1, nowTs);
  const cWalk2 = insertCustomer.run(branch2Id, 'Walk-in (Cash) Customer ( Mingora )', '', '', '', 1, nowTs);
  insertCustomer.run(branch1Id, 'Al-Madina Builders & Contractors', '0300-5551234', '15302-4411223-1', '2891042-3', 0, nowTs);
  insertCustomer.run(branch2Id, 'Swat Marble & Associates', '0345-9008811', '15602-7722119-5', '3104982-1', 0, nowTs);
  const walk1Id = Number(cWalk1.lastInsertRowid);
  const walk2Id = Number(cWalk2.lastInsertRowid);

  // 6. Products + Branch Inventory
  const insertProduct = db.prepare(
    `INSERT INTO products (sku, barcode, name, category, unit, sale_price, cost_price, tax_rate, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  );
  const insertInv = db.prepare(
    `INSERT INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, ?)`
  );

  const productIds: number[] = [];
  SEED_PRODUCTS.forEach((p, idx) => {
    const res = insertProduct.run(p.sku, p.barcode, p.name, p.category, p.unit, p.salePrice, p.costPrice, p.taxRate, nowTs);
    const pid = Number(res.lastInsertRowid);
    productIds.push(pid);
    insertInv.run(branch1Id, pid, 120 + idx * 15);
    insertInv.run(branch2Id, pid, 95 + idx * 12);
  });

  // 7. Seed Invoices (Today's 6 invoices total Rs. 459,895.52 + 2 historical yesterday invoices)
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
      customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
      subtotal, discount_total, tax_total, total_amount, payment_mode,
      cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
      fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
    ) VALUES (?, ?, 'SALE', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'CASH', ?, 0, 0, ?, 0, ?, ?, ?, NULL, ?, '')`
  );
  const insertItem = db.prepare(
    `INSERT INTO invoice_items (
      invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount, tax_rate, tax_charged, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  );
  const insertFbrLog = db.prepare(
    `INSERT INTO fbr_sync_logs (
      invoice_id, invoice_no, usin, fbr_pos_id, mode, http_status, success, fbr_invoice_no,
      error_message, request_payload, response_payload, created_at
    ) VALUES (?, ?, ?, ?, 'MOCK', 200, 1, ?, NULL, ?, ?, ?)`
  );

  const seededSales = [
    {
      invoiceNo: 'SWT-A-POS-63',
      usin: `SWT-A-POS-${today}-0063`,
      branchId: branch1Id,
      termId: term1Id,
      posId: '104521',
      custId: walk1Id,
      custName: 'Walk-in (Cash) Customer ( Timergara )',
      userId: cashier1Id,
      cashierName: 'Bilal Khan',
      date: today,
      time: `${today} 14:32:10`,
      total: 61824.0,
      fbrNo: '1045212611110063',
      prodIdx: 0,
      qty: 12,
    },
    {
      invoiceNo: 'SWT-B-POS-73',
      usin: `SWT-B-POS-${today}-0073`,
      branchId: branch2Id,
      termId: term2Id,
      posId: '104522',
      custId: walk2Id,
      custName: 'Walk-in (Cash) Customer ( Mingora )',
      userId: cashier2Id,
      cashierName: 'Hamza Ali',
      date: today,
      time: `${today} 13:55:42`,
      total: 52684.8,
      fbrNo: '1045222611110073',
      prodIdx: 1,
      qty: 6,
    },
    {
      invoiceNo: 'SWT-A-POS-62',
      usin: `SWT-A-POS-${today}-0062`,
      branchId: branch1Id,
      termId: term1Id,
      posId: '104521',
      custId: walk1Id,
      custName: 'Walk-in (Cash) Customer ( Timergara )',
      userId: cashier1Id,
      cashierName: 'Bilal Khan',
      date: today,
      time: `${today} 12:41:19`,
      total: 96028.8,
      fbrNo: '1045212611110062',
      prodIdx: 7,
      qty: 4,
    },
    {
      invoiceNo: 'SWT-B-POS-72',
      usin: `SWT-B-POS-${today}-0072`,
      branchId: branch2Id,
      termId: term2Id,
      posId: '104522',
      custId: walk2Id,
      custName: 'Walk-in (Cash) Customer ( Mingora )',
      userId: cashier2Id,
      cashierName: 'Hamza Ali',
      date: today,
      time: `${today} 11:50:05`,
      total: 84512.0,
      fbrNo: '1045222611110072',
      prodIdx: 8,
      qty: 2,
    },
    {
      invoiceNo: 'SWT-A-POS-61',
      usin: `SWT-A-POS-${today}-0061`,
      branchId: branch1Id,
      termId: term1Id,
      posId: '104521',
      custId: walk1Id,
      custName: 'Walk-in (Cash) Customer ( Timergara )',
      userId: cashier1Id,
      cashierName: 'Bilal Khan',
      date: today,
      time: `${today} 10:25:14`,
      total: 78420.92,
      fbrNo: '1045212611110061',
      prodIdx: 5,
      qty: 4,
    },
    {
      invoiceNo: 'SWT-B-POS-71',
      usin: `SWT-B-POS-${today}-0071`,
      branchId: branch2Id,
      termId: term2Id,
      posId: '104522',
      custId: walk2Id,
      custName: 'Walk-in (Cash) Customer ( Mingora )',
      userId: cashier2Id,
      cashierName: 'Hamza Ali',
      date: today,
      time: `${today} 09:40:30`,
      total: 86425.0,
      fbrNo: '1045222611110071',
      prodIdx: 6,
      qty: 9,
    },
    // Historical yesterday invoices for Period filter verification
    {
      invoiceNo: 'SWT-A-POS-60',
      usin: `SWT-A-POS-${yesterday}-0060`,
      branchId: branch1Id,
      termId: term1Id,
      posId: '104521',
      custId: walk1Id,
      custName: 'Walk-in (Cash) Customer ( Timergara )',
      userId: adminId,
      cashierName: 'Faisal',
      date: yesterday,
      time: `${yesterday} 16:10:00`,
      total: 42480.0,
      fbrNo: '1045212611100060',
      prodIdx: 2,
      qty: 10,
    },
    {
      invoiceNo: 'SWT-B-POS-70',
      usin: `SWT-B-POS-${yesterday}-0070`,
      branchId: branch2Id,
      termId: term2Id,
      posId: '104522',
      custId: walk2Id,
      custName: 'Walk-in (Cash) Customer ( Mingora )',
      userId: cashier2Id,
      cashierName: 'Hamza Ali',
      date: yesterday,
      time: `${yesterday} 15:05:12`,
      total: 35400.0,
      fbrNo: '1045222611100070',
      prodIdx: 3,
      qty: 24,
    },
  ];

  for (const s of seededSales) {
    const p = SEED_PRODUCTS[s.prodIdx];
    const pid = productIds[s.prodIdx];
    const item = buildSampleLineItem({
      productId: pid,
      sku: p.sku,
      name: p.name,
      qty: s.qty,
      targetLineTotal: s.total,
      taxRate: p.taxRate,
    });

    const invRes = insertInvoice.run(
      s.invoiceNo,
      s.usin,
      s.branchId,
      s.termId,
      s.custId,
      s.custName,
      s.userId,
      s.cashierName,
      s.date,
      s.time,
      item.subtotal,
      item.taxCharged,
      item.lineTotal,
      item.lineTotal,
      item.lineTotal,
      'SUBMITTED',
      s.fbrNo,
      s.posId,
      s.time
    );
    const invoiceId = Number(invRes.lastInsertRowid);

    insertItem.run(
      invoiceId,
      item.productId,
      item.sku,
      item.name,
      item.qty,
      item.unitPrice,
      item.taxRate,
      item.taxCharged,
      item.lineTotal
    );

    insertFbrLog.run(
      invoiceId,
      s.invoiceNo,
      s.usin,
      s.posId,
      s.fbrNo,
      JSON.stringify({ USIN: s.usin, POSID: Number(s.posId), TotalBillAmount: item.lineTotal }),
      JSON.stringify({ InvoiceNumber: s.fbrNo, Code: '100', Response: 'Seeded Verified' }),
      s.time
    );
  }
}

