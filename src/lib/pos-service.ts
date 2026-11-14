import type { DatabaseSync } from 'node:sqlite';
import { hashPassword, verifyPassword } from './auth.ts';
import { withTransaction } from './db.ts';
import { buildFbrInvoicePayload, buildFbrQrPayload, dispatchToFbr } from './fbr.ts';
import { getLocalIsoDate, getLocalIsoDateTime, roundMoney } from './format.ts';
import type {
  Branch,
  BusinessSettings,
  Customer,
  DashboardSummary,
  DayClosingPreview,
  DayClosingRecord,
  FbrMode,
  FbrStatus,
  FbrSyncLogRecord,
  HeldCartRecord,
  InvoiceDetail,
  InvoiceItemRecord,
  InvoiceRecord,
  PaymentMode,
  PosTerminal,
  ProductWithStock,
  UserRole,
  UserSummary,
} from './types.ts';

export function getBranchesWithTerminals(db: DatabaseSync): {
  branches: Branch[];
  terminals: PosTerminal[];
} {
  const branches = db
    .prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY id ASC')
    .all() as unknown as Branch[];
  const terminals = db
    .prepare('SELECT * FROM pos_terminals WHERE is_active = 1 ORDER BY branch_id ASC, id ASC')
    .all() as unknown as PosTerminal[];
  return { branches, terminals };
}

export function getBusinessSettings(db: DatabaseSync): BusinessSettings {
  const rows = db.prepare('SELECT key, value FROM business_settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    software_brand: map.get('software_brand') ?? 'Softifyx',
    business_name: map.get('business_name') ?? 'M/S SEASTONE PVC PIPE INDUSTRY',
    logo_data_url: map.get('logo_data_url') ?? '',
    footer_text: map.get('footer_text') ?? 'Designed & Developed by Softifyx Technologies',
    ntn: map.get('ntn') ?? '',
    strn: map.get('strn') ?? '',
    default_tax_rate: Number(map.get('default_tax_rate') ?? '18') || 18,
    default_opening_cash: Number(map.get('default_opening_cash') ?? '5000') || 0,
    receipt_footer: map.get('receipt_footer') ?? '',
    currency_symbol: map.get('currency_symbol') ?? 'Rs.',
  };
}

export function updateBusinessSettings(
  db: DatabaseSync,
  updates: Partial<BusinessSettings>
): BusinessSettings {
  const stmt = db.prepare(
    `INSERT INTO business_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  withTransaction(db, () => {
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        stmt.run(k, String(v));
      }
    }
  });
  return getBusinessSettings(db);
}

export function getProducts(
  db: DatabaseSync,
  options?: { branchId?: number | null; search?: string; category?: string; includeInactive?: boolean }
): ProductWithStock[] {
  const { branchId = null, search = '', category = '', includeInactive = false } = options ?? {};
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (!includeInactive) {
    where.push('p.is_active = 1');
  }
  if (category && category !== 'ALL') {
    where.push('p.category = ?');
    params.push(category);
  }
  if (search.trim()) {
    const q = `%${search.trim()}%`;
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.category LIKE ?)');
    params.push(q, q, q, q);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (branchId) {
    const sql = `
      SELECT p.id, p.sku, p.barcode, p.name, p.category, p.unit,
             p.sale_price, p.cost_price, p.tax_rate, p.is_active,
             COALESCE(bi.stock_qty, 0) AS stock_qty
      FROM products p
      LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = ?
      ${whereClause}
      ORDER BY p.category ASC, p.name ASC
    `;
    return db.prepare(sql).all(branchId, ...params) as unknown as ProductWithStock[];
  }

  const sql = `
    SELECT p.id, p.sku, p.barcode, p.name, p.category, p.unit,
           p.sale_price, p.cost_price, p.tax_rate, p.is_active,
           COALESCE(SUM(bi.stock_qty), 0) AS stock_qty
    FROM products p
    LEFT JOIN branch_inventory bi ON bi.product_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.category ASC, p.name ASC
  `;
  return db.prepare(sql).all(...params) as unknown as ProductWithStock[];
}

export function saveProduct(
  db: DatabaseSync,
  input: {
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
  }
): ProductWithStock {
  const now = getLocalIsoDateTime();
  return withTransaction(db, () => {
    let productId = input.id;
    if (productId) {
      db.prepare(
        `UPDATE products
         SET sku = ?, barcode = ?, name = ?, category = ?, unit = ?,
             sale_price = ?, cost_price = ?, tax_rate = ?, is_active = ?
         WHERE id = ?`
      ).run(
        input.sku.trim(),
        (input.barcode ?? '').trim(),
        input.name.trim(),
        input.category.trim() || 'General',
        input.unit.trim() || 'Pcs',
        roundMoney(input.sale_price),
        roundMoney(input.cost_price ?? 0),
        roundMoney(input.tax_rate),
        input.is_active ?? 1,
        productId
      );
    } else {
      const res = db
        .prepare(
          `INSERT INTO products (sku, barcode, name, category, unit, sale_price, cost_price, tax_rate, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
        )
        .run(
          input.sku.trim(),
          (input.barcode ?? '').trim(),
          input.name.trim(),
          input.category.trim() || 'General',
          input.unit.trim() || 'Pcs',
          roundMoney(input.sale_price),
          roundMoney(input.cost_price ?? 0),
          roundMoney(input.tax_rate),
          now
        );
      productId = Number(res.lastInsertRowid);

      const branches = db.prepare('SELECT id FROM branches').all() as Array<{ id: number }>;
      const invStmt = db.prepare(
        'INSERT OR IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)'
      );
      for (const b of branches) {
        invStmt.run(b.id, productId);
      }
    }

    if (input.branch_id && input.stock_qty !== undefined) {
      db.prepare(
        `INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
         VALUES (?, ?, ?)
         ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = excluded.stock_qty`
      ).run(input.branch_id, productId, input.stock_qty);
    }

    const row = getProducts(db, { branchId: input.branch_id ?? null, includeInactive: true }).find(
      (p) => p.id === productId
    );
    if (!row) throw new Error('Failed to load saved product');
    return row;
  });
}

export function getCustomers(db: DatabaseSync, branchId?: number | null): Customer[] {
  if (branchId) {
    return db
      .prepare(
        `SELECT id, branch_id, name, phone, cnic, ntn, city, address, is_walk_in
         FROM customers
         WHERE branch_id IS NULL OR branch_id = ?
         ORDER BY is_walk_in DESC, name ASC`
      )
      .all(branchId) as unknown as Customer[];
  }
  return db
    .prepare(
      `SELECT id, branch_id, name, phone, cnic, ntn, city, address, is_walk_in
       FROM customers
       ORDER BY is_walk_in DESC, name ASC`
    )
    .all() as unknown as Customer[];
}

export function createCustomer(
  db: DatabaseSync,
  input: {
    branch_id?: number | null;
    name: string;
    phone?: string;
    cnic?: string;
    ntn?: string;
    city?: string;
    address?: string;
  }
): Customer {
  const now = getLocalIsoDateTime();
  const res = db
    .prepare(
      `INSERT INTO customers (branch_id, name, phone, cnic, ntn, city, address, is_walk_in, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      input.branch_id ?? null,
      input.name.trim(),
      (input.phone ?? '').trim(),
      (input.cnic ?? '').trim(),
      (input.ntn ?? '').trim(),
      (input.city ?? '').trim(),
      (input.address ?? '').trim(),
      now
    );
  return db
    .prepare(
      'SELECT id, branch_id, name, phone, cnic, ntn, city, address, is_walk_in FROM customers WHERE id = ?'
    )
    .get(Number(res.lastInsertRowid)) as unknown as Customer;
}

export function updateCustomer(
  db: DatabaseSync,
  id: number,
  input: {
    branch_id?: number | null;
    name: string;
    phone?: string;
    cnic?: string;
    ntn?: string;
    city?: string;
    address?: string;
  }
): Customer {
  db.prepare(
    `UPDATE customers
     SET branch_id = ?, name = ?, phone = ?, cnic = ?, ntn = ?, city = ?, address = ?
     WHERE id = ?`
  ).run(
    input.branch_id ?? null,
    input.name.trim(),
    (input.phone ?? '').trim(),
    (input.cnic ?? '').trim(),
    (input.ntn ?? '').trim(),
    (input.city ?? '').trim(),
    (input.address ?? '').trim(),
    id
  );
  return db
    .prepare(
      'SELECT id, branch_id, name, phone, cnic, ntn, city, address, is_walk_in FROM customers WHERE id = ?'
    )
    .get(id) as unknown as Customer;
}

export function deleteCustomer(db: DatabaseSync, id: number): boolean {
  const cust = db.prepare('SELECT is_walk_in FROM customers WHERE id = ?').get(id) as
    | { is_walk_in: number }
    | undefined;
  if (!cust || cust.is_walk_in === 1) return false;
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return true;
}

export function getUsers(db: DatabaseSync): UserSummary[] {
  return db
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.role, u.branch_id, b.display_name AS branch_name, u.is_active
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       ORDER BY u.id ASC`
    )
    .all() as unknown as UserSummary[];
}

export function createUser(
  db: DatabaseSync,
  input: { username: string; full_name: string; password: string; role: UserRole; branch_id: number | null }
): UserSummary {
  const now = getLocalIsoDateTime();
  const hash = hashPassword(input.password);
  const res = db
    .prepare(
      `INSERT INTO users (username, full_name, password_hash, role, branch_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    )
    .run(input.username.trim(), input.full_name.trim(), hash, input.role, input.branch_id, now);
  return getUsers(db).find((u) => u.id === Number(res.lastInsertRowid))!;
}

export function updateUser(
  db: DatabaseSync,
  input: {
    id: number;
    full_name: string;
    role: UserRole;
    branch_id: number | null;
    is_active: number;
    password?: string;
  }
): UserSummary {
  if (input.password && input.password.trim()) {
    const hash = hashPassword(input.password.trim());
    db.prepare(
      `UPDATE users SET full_name = ?, role = ?, branch_id = ?, is_active = ?, password_hash = ? WHERE id = ?`
    ).run(input.full_name.trim(), input.role, input.branch_id, input.is_active ? 1 : 0, hash, input.id);
  } else {
    db.prepare(
      `UPDATE users SET full_name = ?, role = ?, branch_id = ?, is_active = ? WHERE id = ?`
    ).run(input.full_name.trim(), input.role, input.branch_id, input.is_active ? 1 : 0, input.id);
  }
  const updated = getUsers(db).find((u) => u.id === input.id);
  if (!updated) throw new Error('User not found');
  return updated;
}

export function exportSystemBackup(db: DatabaseSync) {
  return {
    exported_at: getLocalIsoDateTime(),
    settings: getBusinessSettings(db),
    ...getBranchesWithTerminals(db),
    users: getUsers(db),
    products: getProducts(db, { includeInactive: true }),
    customers: getCustomers(db),
    invoices: getSalesRegister(db, { limit: 1000 }).invoices,
    day_closings: listDayClosings(db),
  };
}

export function clearAllTransactions(db: DatabaseSync): { cleared: true } {
  return withTransaction(db, () => {
    db.prepare('DELETE FROM fbr_sync_logs').run();
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM invoices WHERE original_invoice_id IS NOT NULL').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM held_carts').run();
    db.prepare('DELETE FROM day_closings').run();
    db.prepare('UPDATE pos_terminals SET next_sequence = 1').run();
    return { cleared: true };
  });
}

export function authenticateUser(
  db: DatabaseSync,
  username: string,
  password: string
): UserSummary | null {
  const row = db
    .prepare(
      `SELECT u.*, b.display_name AS branch_name
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.username = ? AND u.is_active = 1`
    )
    .get(username.trim()) as
    | (UserSummary & { password_hash: string })
    | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    branch_id: row.branch_id,
    branch_name: row.branch_name ?? null,
    is_active: row.is_active,
  };
}

export function getDashboardSummary(
  db: DatabaseSync,
  filters: { branchId?: number | null; fromDate: string; toDate: string; limit?: number }
): DashboardSummary {
  const { branchId = null, fromDate, toDate, limit = 15 } = filters;

  const whereParts = ['i.invoice_date >= ?', 'i.invoice_date <= ?'];
  const params: Array<string | number> = [fromDate, toDate];
  if (branchId) {
    whereParts.push('i.branch_id = ?');
    params.push(branchId);
  }
  const whereClause = whereParts.join(' AND ');

  const agg = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS total_sale,
         COUNT(CASE WHEN i.invoice_type = 'SALE' THEN 1 END) AS total_invoices,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.cash_amount ELSE -i.cash_amount END), 0) AS cash_received,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.card_amount ELSE -i.card_amount END), 0) AS card_received,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.bank_amount ELSE -i.bank_amount END), 0) AS bank_received,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE -i.tax_total END), 0) AS tax_collected,
         COUNT(CASE WHEN i.fbr_status = 'SUBMITTED' THEN 1 END) AS fbr_submitted,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.total_amount ELSE 0 END), 0) AS total_returns
       FROM invoices i
       WHERE ${whereClause}`
    )
    .get(...params) as {
      total_sale: number;
      total_invoices: number;
      cash_received: number;
      card_received: number;
      bank_received: number;
      tax_collected: number;
      fbr_submitted: number;
      total_returns: number;
    };

  const pendingSql = branchId
    ? `SELECT COUNT(*) AS cnt FROM invoices WHERE branch_id = ? AND fbr_status IN ('PENDING', 'FAILED')`
    : `SELECT COUNT(*) AS cnt FROM invoices WHERE fbr_status IN ('PENDING', 'FAILED')`;
  const pendingRow = (
    branchId ? db.prepare(pendingSql).get(branchId) : db.prepare(pendingSql).get()
  ) as { cnt: number };

  const branchBreakdown = db
    .prepare(
      `SELECT
         b.id AS branch_id,
         b.name AS branch_name,
         b.display_name,
         COALESCE(SUM(CASE WHEN i.invoice_date >= ? AND i.invoice_date <= ?
           THEN (CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END)
           ELSE 0 END), 0) AS total_sale,
         COUNT(CASE WHEN i.invoice_date >= ? AND i.invoice_date <= ? AND i.invoice_type = 'SALE' THEN 1 END) AS invoice_count,
         COUNT(CASE WHEN i.fbr_status IN ('PENDING', 'FAILED') THEN 1 END) AS fbr_pending
       FROM branches b
       LEFT JOIN invoices i ON i.branch_id = b.id
       WHERE b.is_active = 1 ${branchId ? 'AND b.id = ?' : ''}
       GROUP BY b.id, b.name, b.display_name
       ORDER BY total_sale DESC, b.id ASC`
    )
    .all(...(branchId ? [fromDate, toDate, fromDate, toDate, branchId] : [fromDate, toDate, fromDate, toDate])) as Array<{
      branch_id: number;
      branch_name: string;
      display_name: string;
      total_sale: number;
      invoice_count: number;
      fbr_pending: number;
    }>;

  const trendRows = db
    .prepare(
      `SELECT i.invoice_date, i.created_at, i.invoice_type, i.total_amount
       FROM invoices i
       WHERE ${whereClause}
       ORDER BY i.created_at ASC`
    )
    .all(...params) as Array<{
      invoice_date: string;
      created_at: string;
      invoice_type: string;
      total_amount: number;
    }>;

  const singleDay = fromDate === toDate;
  const trendMap = new Map<string, { sale_amount: number; invoice_count: number }>();
  for (const row of trendRows) {
    const label = singleDay
      ? `${row.created_at.slice(11, 13) || '00'}:00`
      : row.invoice_date;
    const prev = trendMap.get(label) ?? { sale_amount: 0, invoice_count: 0 };
    const delta = row.invoice_type === 'SALE' ? row.total_amount : -row.total_amount;
    trendMap.set(label, {
      sale_amount: roundMoney(prev.sale_amount + delta),
      invoice_count: prev.invoice_count + (row.invoice_type === 'SALE' ? 1 : 0),
    });
  }
  const salesTrend = Array.from(trendMap.entries()).map(([label, v]) => ({
    label,
    sale_amount: v.sale_amount,
    invoice_count: v.invoice_count,
  }));

  const lowStockItems = (
    branchId
      ? db
          .prepare(
            `SELECT p.id AS product_id, p.sku, p.name, p.unit, COALESCE(bi.stock_qty, 0) AS stock_qty
             FROM products p
             LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = ?
             WHERE p.is_active = 1
             ORDER BY stock_qty ASC, p.name ASC
             LIMIT 5`
          )
          .all(branchId)
      : db
          .prepare(
            `SELECT p.id AS product_id, p.sku, p.name, p.unit, COALESCE(SUM(bi.stock_qty), 0) AS stock_qty
             FROM products p
             LEFT JOIN branch_inventory bi ON bi.product_id = p.id
             WHERE p.is_active = 1
             GROUP BY p.id, p.sku, p.name, p.unit
             ORDER BY stock_qty ASC, p.name ASC
             LIMIT 5`
          )
          .all()
  ) as Array<{
    product_id: number;
    sku: string;
    name: string;
    unit: string;
    stock_qty: number;
  }>;

  const recentInvoices = db
    .prepare(
      `SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
              orig.invoice_no AS original_invoice_no
       FROM invoices i
       JOIN branches b ON b.id = i.branch_id
       LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
       WHERE ${whereClause}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ?`
    )
    .all(...params, limit) as unknown as InvoiceRecord[];

  const totalSale = roundMoney(agg.total_sale);
  const avgTicket = agg.total_invoices > 0 ? roundMoney(totalSale / agg.total_invoices) : 0;

  const settings = getBusinessSettings(db);
  let openingCash = 0;
  if (branchId) {
    const prevClose = db
      .prepare(
        `SELECT counted_cash FROM day_closings
         WHERE branch_id = ? AND closing_date < ?
         ORDER BY closing_date DESC LIMIT 1`
      )
      .get(branchId, fromDate) as { counted_cash: number } | undefined;
    openingCash = prevClose ? roundMoney(prevClose.counted_cash) : roundMoney(settings.default_opening_cash);
  } else {
    for (const br of branchBreakdown) {
      const prevClose = db
        .prepare(
          `SELECT counted_cash FROM day_closings
           WHERE branch_id = ? AND closing_date < ?
           ORDER BY closing_date DESC LIMIT 1`
        )
        .get(br.branch_id, fromDate) as { counted_cash: number } | undefined;
      openingCash = roundMoney(
        openingCash + (prevClose ? prevClose.counted_cash : settings.default_opening_cash)
      );
    }
  }

  const heldRow = (
    branchId
      ? db.prepare('SELECT COUNT(*) AS cnt FROM held_carts WHERE branch_id = ?').get(branchId)
      : db.prepare('SELECT COUNT(*) AS cnt FROM held_carts').get()
  ) as { cnt: number };

  return {
    total_sale: totalSale,
    total_invoices: agg.total_invoices,
    cash_received: roundMoney(agg.cash_received),
    card_received: roundMoney(agg.card_received),
    bank_received: roundMoney(agg.bank_received),
    tax_collected: roundMoney(agg.tax_collected),
    avg_ticket: avgTicket,
    fbr_pending: pendingRow.cnt,
    fbr_submitted: agg.fbr_submitted,
    total_returns: roundMoney(agg.total_returns),
    opening_cash: openingCash,
    held_carts_count: heldRow.cnt,
    branch_breakdown: branchBreakdown.map((b) => ({
      ...b,
      total_sale: roundMoney(b.total_sale),
    })),
    sales_trend: salesTrend,
    low_stock_items: lowStockItems,
    recent_invoices: recentInvoices,
  };
}

export function getSalesRegister(
  db: DatabaseSync,
  filters: {
    branchId?: number | null;
    fromDate?: string;
    toDate?: string;
    fbrStatus?: FbrStatus | 'ALL';
    paymentMode?: PaymentMode | 'ALL';
    invoiceType?: 'SALE' | 'RETURN' | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  }
): {
  invoices: InvoiceRecord[];
  totalCount: number;
  totals: {
    netSale: number;
    cashReceived: number;
    cardReceived: number;
    bankReceived: number;
    pendingCount: number;
  };
} {
  const where: string[] = ['1=1'];
  const params: Array<string | number> = [];

  if (filters.branchId) {
    where.push('i.branch_id = ?');
    params.push(filters.branchId);
  }
  if (filters.fromDate) {
    where.push('i.invoice_date >= ?');
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    where.push('i.invoice_date <= ?');
    params.push(filters.toDate);
  }
  if (filters.fbrStatus && filters.fbrStatus !== 'ALL') {
    where.push('i.fbr_status = ?');
    params.push(filters.fbrStatus);
  }
  if (filters.paymentMode && filters.paymentMode !== 'ALL') {
    where.push('i.payment_mode = ?');
    params.push(filters.paymentMode);
  }
  if (filters.invoiceType && filters.invoiceType !== 'ALL') {
    where.push('i.invoice_type = ?');
    params.push(filters.invoiceType);
  }
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    where.push('(i.invoice_no LIKE ? OR i.fbr_invoice_no LIKE ? OR i.customer_name LIKE ? OR i.usin LIKE ?)');
    params.push(q, q, q, q);
  }

  const whereSql = where.join(' AND ');
  const summaryRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total_count,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS net_sale,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.cash_amount ELSE -i.cash_amount END), 0) AS cash_received,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.card_amount ELSE -i.card_amount END), 0) AS card_received,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.bank_amount ELSE -i.bank_amount END), 0) AS bank_received,
         SUM(CASE WHEN i.fbr_status IN ('PENDING', 'FAILED') THEN 1 ELSE 0 END) AS pending_count
       FROM invoices i
       WHERE ${whereSql}`
    )
    .get(...params) as {
      total_count: number;
      net_sale: number;
      cash_received: number;
      card_received: number;
      bank_received: number;
      pending_count: number;
    };

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const invoices = db
    .prepare(
      `SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
              orig.invoice_no AS original_invoice_no
       FROM invoices i
       JOIN branches b ON b.id = i.branch_id
       LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
       WHERE ${whereSql}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as unknown as InvoiceRecord[];

  return {
    invoices,
    totalCount: summaryRow.total_count,
    totals: {
      netSale: roundMoney(summaryRow.net_sale),
      cashReceived: roundMoney(summaryRow.cash_received),
      cardReceived: roundMoney(summaryRow.card_received),
      bankReceived: roundMoney(summaryRow.bank_received),
      pendingCount: summaryRow.pending_count ?? 0,
    },
  };
}

export function getInvoiceDetail(
  db: DatabaseSync,
  identifier: number | string
): InvoiceDetail | null {
  const byId = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
  const row = db
    .prepare(
      `SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
              orig.invoice_no AS original_invoice_no
       FROM invoices i
       JOIN branches b ON b.id = i.branch_id
       LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
       WHERE ${byId ? 'i.id = ?' : 'i.invoice_no = ?'}`
    )
    .get(byId ? Number(identifier) : String(identifier).trim()) as
    | InvoiceRecord
    | undefined;

  if (!row) return null;

  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC')
    .all(row.id) as unknown as InvoiceItemRecord[];

  const returnedRows = db
    .prepare(
      `SELECT ii.product_id, SUM(ii.quantity) AS returned_qty
       FROM invoice_items ii
       JOIN invoices ret ON ret.id = ii.invoice_id
       WHERE ret.original_invoice_id = ? AND ret.invoice_type = 'RETURN'
       GROUP BY ii.product_id`
    )
    .all(row.id) as Array<{ product_id: number; returned_qty: number }>;

  const returned_quantities: Record<number, number> = {};
  for (const r of returnedRows) {
    returned_quantities[r.product_id] = r.returned_qty;
  }

  return {
    ...row,
    items,
    returned_quantities,
    fbr_qr_payload: buildFbrQrPayload({
      fbrInvoiceNo: row.fbr_invoice_no,
      posId: row.fbr_pos_id,
      usin: row.usin,
      invoiceNo: row.invoice_no,
      totalAmount: row.total_amount,
      dateTime: row.created_at,
    }),
  };
}

export async function submitInvoiceToFbr(
  db: DatabaseSync,
  invoiceId: number,
  options?: { simulateOffline?: boolean }
): Promise<InvoiceDetail> {
  const detail = getInvoiceDetail(db, invoiceId);
  if (!detail) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const terminal = db
    .prepare('SELECT * FROM pos_terminals WHERE id = ?')
    .get(detail.terminal_id) as unknown as PosTerminal | undefined;
  if (!terminal) {
    throw new Error('POS Terminal not found');
  }

  const customer = detail.customer_id
    ? (db.prepare('SELECT * FROM customers WHERE id = ?').get(detail.customer_id) as unknown as Customer | undefined)
    : undefined;

  let refUsin: string | null = null;
  if (detail.original_invoice_id) {
    const orig = db
      .prepare('SELECT usin FROM invoices WHERE id = ?')
      .get(detail.original_invoice_id) as { usin: string } | undefined;
    refUsin = orig?.usin ?? null;
  }

  const payload = buildFbrInvoicePayload({
    invoice: detail,
    items: detail.items,
    posId: terminal.fbr_pos_id,
    buyerPhone: customer?.phone ?? '',
    buyerCnic: customer?.cnic ?? '',
    buyerNtn: customer?.ntn ?? '',
    refUsin,
  });

  const result = await dispatchToFbr({
    mode: terminal.fbr_mode,
    token: terminal.fbr_token,
    payload,
    simulateOffline: options?.simulateOffline,
  });

  const now = getLocalIsoDateTime();
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO fbr_sync_logs (
         invoice_id, invoice_no, usin, fbr_pos_id, mode, http_status, success,
         fbr_invoice_no, error_message, request_payload, response_payload, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      detail.id,
      detail.invoice_no,
      detail.usin,
      terminal.fbr_pos_id,
      terminal.fbr_mode,
      result.httpStatus,
      result.success ? 1 : 0,
      result.fbrInvoiceNo,
      result.errorMessage,
      JSON.stringify(result.requestPayload),
      result.responsePayload,
      now
    );

    if (result.success) {
      db.prepare(
        `UPDATE invoices
         SET fbr_status = 'SUBMITTED', fbr_invoice_no = ?, fbr_pos_id = ?, fbr_error = NULL, fbr_submitted_at = ?
         WHERE id = ?`
      ).run(result.fbrInvoiceNo, terminal.fbr_pos_id, now, detail.id);
    } else {
      const nextStatus: FbrStatus =
        result.httpStatus === null || result.httpStatus >= 500 ? 'PENDING' : 'FAILED';
      db.prepare(
        `UPDATE invoices
         SET fbr_status = ?, fbr_pos_id = ?, fbr_error = ?
         WHERE id = ?`
      ).run(nextStatus, terminal.fbr_pos_id, result.errorMessage, detail.id);
    }
  });

  return getInvoiceDetail(db, invoiceId)!;
}

export async function syncPendingFbrInvoices(
  db: DatabaseSync,
  branchId?: number | null
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const rows = (
    branchId
      ? db
          .prepare(
            `SELECT id FROM invoices WHERE branch_id = ? AND fbr_status IN ('PENDING', 'FAILED') ORDER BY id ASC`
          )
          .all(branchId)
      : db
          .prepare(`SELECT id FROM invoices WHERE fbr_status IN ('PENDING', 'FAILED') ORDER BY id ASC`)
          .all()
  ) as Array<{ id: number }>;

  let succeeded = 0;
  let failed = 0;
  for (const row of rows) {
    const updated = await submitInvoiceToFbr(db, row.id, { simulateOffline: false });
    if (updated.fbr_status === 'SUBMITTED') {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }
  return { attempted: rows.length, succeeded, failed };
}

export interface CreateSaleInput {
  branchId: number;
  terminalId?: number;
  customerId?: number | null;
  customerName?: string;
  userId?: number | null;
  cashierName?: string;
  paymentMode: PaymentMode;
  cashAmount?: number;
  cardAmount?: number;
  bankAmount?: number;
  tenderedAmount?: number;
  invoiceDiscount?: number;
  notes?: string;
  heldCartId?: number | null;
  simulateFbrOffline?: boolean;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
    discountAmount?: number;
  }>;
}

export async function createSale(db: DatabaseSync, input: CreateSaleInput): Promise<InvoiceDetail> {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one item is required to create a sale');
  }

  const nowDate = new Date();
  const invoiceDate = getLocalIsoDate(nowDate);
  const createdAt = getLocalIsoDateTime(nowDate);

  const invoiceId = withTransaction(db, () => {
    const terminal = input.terminalId
      ? (db
          .prepare('SELECT * FROM pos_terminals WHERE id = ? AND branch_id = ? AND is_active = 1')
          .get(input.terminalId, input.branchId) as unknown as PosTerminal | undefined)
      : (db
          .prepare('SELECT * FROM pos_terminals WHERE branch_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1')
          .get(input.branchId) as unknown as PosTerminal | undefined);

    if (!terminal) {
      throw new Error('Active POS terminal not found for selected branch');
    }

    const branch = db
      .prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1')
      .get(input.branchId) as unknown as Branch | undefined;
    if (!branch) {
      throw new Error('Selected branch not found');
    }

    let customerId = input.customerId ?? null;
    let customerName = input.customerName?.trim() ?? '';
    if (customerId) {
      const cust = db
        .prepare('SELECT id, name FROM customers WHERE id = ?')
        .get(customerId) as { id: number; name: string } | undefined;
      if (cust) {
        customerName = cust.name;
      }
    } else {
      const walkIn = db
        .prepare('SELECT id, name FROM customers WHERE branch_id = ? AND is_walk_in = 1 LIMIT 1')
        .get(input.branchId) as { id: number; name: string } | undefined;
      if (walkIn) {
        customerId = walkIn.id;
        if (!customerName) customerName = walkIn.name;
      }
    }
    if (!customerName) {
      customerName = `Walk-in (Cash) Customer ( ${branch.name} )`;
    }

    const seq = terminal.next_sequence;
    db.prepare('UPDATE pos_terminals SET next_sequence = next_sequence + 1 WHERE id = ?').run(terminal.id);

    const invoiceNo = `${terminal.invoice_prefix}-${seq}`;
    const usin = `${terminal.invoice_prefix}-${invoiceDate.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;

    const prodStmt = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
    const computedItems: Array<{
      productId: number;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxCharged: number;
      lineTotal: number;
      lineNetSubtotal: number;
    }> = [];

    let subtotal = 0;
    let itemDiscountSum = 0;
    let taxTotal = 0;

    for (const reqItem of input.items) {
      if (!Number.isFinite(reqItem.quantity) || reqItem.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero');
      }
      const product = prodStmt.get(reqItem.productId) as
        | {
            id: number;
            sku: string;
            name: string;
            sale_price: number;
            tax_rate: number;
          }
        | undefined;
      if (!product) {
        throw new Error(`Product ${reqItem.productId} not found`);
      }

      const unitPrice = roundMoney(reqItem.unitPrice ?? product.sale_price);
      const gross = roundMoney(unitPrice * reqItem.quantity);
      const discountAmt = roundMoney(Math.max(0, Math.min(gross, reqItem.discountAmount ?? 0)));
      const netSale = roundMoney(gross - discountAmt);
      const taxCharged = roundMoney((netSale * product.tax_rate) / 100);
      const lineTotal = roundMoney(netSale + taxCharged);

      subtotal = roundMoney(subtotal + gross);
      itemDiscountSum = roundMoney(itemDiscountSum + discountAmt);
      taxTotal = roundMoney(taxTotal + taxCharged);

      computedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: reqItem.quantity,
        unitPrice,
        discountAmount: discountAmt,
        taxRate: product.tax_rate,
        taxCharged,
        lineTotal,
        lineNetSubtotal: netSale,
      });
    }

    const extraDiscount = roundMoney(Math.max(0, input.invoiceDiscount ?? 0));
    const discountTotal = roundMoney(itemDiscountSum + extraDiscount);
    const totalAmount = roundMoney(Math.max(0, subtotal - discountTotal + taxTotal));

    let cashAmount = 0;
    let cardAmount = 0;
    let bankAmount = 0;
    let tenderedAmount = roundMoney(input.tenderedAmount ?? totalAmount);
    let changeAmount = 0;

    if (input.paymentMode === 'CASH') {
      cashAmount = totalAmount;
      if (tenderedAmount < totalAmount) tenderedAmount = totalAmount;
      changeAmount = roundMoney(Math.max(0, tenderedAmount - totalAmount));
    } else if (input.paymentMode === 'CARD') {
      cardAmount = totalAmount;
      tenderedAmount = totalAmount;
    } else if (input.paymentMode === 'BANK') {
      bankAmount = totalAmount;
      tenderedAmount = totalAmount;
    } else {
      cashAmount = roundMoney(Math.max(0, input.cashAmount ?? 0));
      cardAmount = roundMoney(Math.max(0, input.cardAmount ?? 0));
      bankAmount = roundMoney(Math.max(0, input.bankAmount ?? 0));
      const paid = roundMoney(cashAmount + cardAmount + bankAmount);
      if (paid < totalAmount) {
        cashAmount = roundMoney(cashAmount + (totalAmount - paid));
      }
      tenderedAmount = roundMoney(cashAmount + cardAmount + bankAmount);
    }

    const invRes = db
      .prepare(
        `INSERT INTO invoices (
           invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
           customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
           subtotal, discount_total, tax_total, total_amount, payment_mode,
           cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
           fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
         ) VALUES (?, ?, 'SALE', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, ?, NULL, NULL, ?)`
      )
      .run(
        invoiceNo,
        usin,
        input.branchId,
        terminal.id,
        customerId,
        customerName,
        input.userId ?? null,
        input.cashierName?.trim() || 'POS Cashier',
        invoiceDate,
        createdAt,
        subtotal,
        discountTotal,
        taxTotal,
        totalAmount,
        input.paymentMode,
        cashAmount,
        cardAmount,
        bankAmount,
        tenderedAmount,
        changeAmount,
        terminal.fbr_pos_id,
        (input.notes ?? '').trim()
      );

    const newInvoiceId = Number(invRes.lastInsertRowid);

    const itemStmt = db.prepare(
      `INSERT INTO invoice_items (
         invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount,
         tax_rate, tax_charged, line_total
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const invUpdateStmt = db.prepare(
      `INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
       VALUES (?, ?, ?)
       ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = branch_inventory.stock_qty - excluded.stock_qty`
    );

    for (const item of computedItems) {
      itemStmt.run(
        newInvoiceId,
        item.productId,
        item.sku,
        item.name,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.taxRate,
        item.taxCharged,
        item.lineTotal
      );
      invUpdateStmt.run(input.branchId, item.productId, item.quantity);
    }

    if (input.heldCartId) {
      db.prepare('DELETE FROM held_carts WHERE id = ?').run(input.heldCartId);
    }

    return newInvoiceId;
  });

  return submitInvoiceToFbr(db, invoiceId, {
    simulateOffline: input.simulateFbrOffline,
  });
}

export interface CreateReturnInput {
  originalInvoiceId: number;
  userId?: number | null;
  cashierName?: string;
  refundMode: PaymentMode;
  reason?: string;
  simulateFbrOffline?: boolean;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}

export async function createSalesReturn(
  db: DatabaseSync,
  input: CreateReturnInput
): Promise<InvoiceDetail> {
  if (!input.items || input.items.length === 0) {
    throw new Error('Select at least one item to return');
  }

  const orig = getInvoiceDetail(db, input.originalInvoiceId);
  if (!orig) {
    throw new Error('Original invoice not found');
  }
  if (orig.invoice_type !== 'SALE') {
    throw new Error('Returns can only be processed against a SALE invoice');
  }

  const nowDate = new Date();
  const invoiceDate = getLocalIsoDate(nowDate);
  const createdAt = getLocalIsoDateTime(nowDate);

  const returnId = withTransaction(db, () => {
    const terminal = db
      .prepare('SELECT * FROM pos_terminals WHERE id = ?')
      .get(orig.terminal_id) as unknown as PosTerminal | undefined;
    if (!terminal) {
      throw new Error('POS terminal not found');
    }

    const seq = terminal.next_sequence;
    db.prepare('UPDATE pos_terminals SET next_sequence = next_sequence + 1 WHERE id = ?').run(terminal.id);

    const invoiceNo = `${terminal.invoice_prefix}-${seq}-RET`;
    const usin = `${terminal.invoice_prefix}-${invoiceDate.replace(/-/g, '')}-${String(seq).padStart(4, '0')}-R`;

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalAmount = 0;

    const lineRecords: Array<{
      productId: number;
      sku: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxCharged: number;
      lineTotal: number;
    }> = [];

    for (const reqItem of input.items) {
      if (!Number.isFinite(reqItem.quantity) || reqItem.quantity <= 0) {
        throw new Error('Return quantity must be greater than zero');
      }
      const origItem = orig.items.find((i) => i.product_id === reqItem.productId);
      if (!origItem) {
        throw new Error(`Product ${reqItem.productId} is not part of original invoice`);
      }

      const alreadyReturned = orig.returned_quantities?.[reqItem.productId] ?? 0;
      const maxReturnable = roundMoney(origItem.quantity - alreadyReturned);
      if (reqItem.quantity > maxReturnable) {
        throw new Error(
          `Cannot return ${reqItem.quantity} of "${origItem.item_name}". Remaining returnable qty: ${maxReturnable}`
        );
      }

      const ratio = reqItem.quantity / origItem.quantity;
      const lineGross = roundMoney(origItem.unit_price * reqItem.quantity);
      const lineDiscount = roundMoney(origItem.discount_amount * ratio);
      const lineTax = roundMoney(origItem.tax_charged * ratio);
      const lineTotal = roundMoney(lineGross - lineDiscount + lineTax);

      subtotal = roundMoney(subtotal + lineGross);
      discountTotal = roundMoney(discountTotal + lineDiscount);
      taxTotal = roundMoney(taxTotal + lineTax);
      totalAmount = roundMoney(totalAmount + lineTotal);

      lineRecords.push({
        productId: origItem.product_id,
        sku: origItem.sku,
        itemName: origItem.item_name,
        quantity: reqItem.quantity,
        unitPrice: origItem.unit_price,
        discountAmount: lineDiscount,
        taxRate: origItem.tax_rate,
        taxCharged: lineTax,
        lineTotal,
      });
    }

    const cashAmount = input.refundMode === 'CASH' ? totalAmount : 0;
    const cardAmount = input.refundMode === 'CARD' ? totalAmount : 0;
    const bankAmount = input.refundMode === 'BANK' ? totalAmount : 0;

    const invRes = db
      .prepare(
        `INSERT INTO invoices (
           invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
           customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
           subtotal, discount_total, tax_total, total_amount, payment_mode,
           cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
           fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
         ) VALUES (?, ?, 'RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', NULL, ?, NULL, NULL, ?)`
      )
      .run(
        invoiceNo,
        usin,
        orig.id,
        orig.branch_id,
        terminal.id,
        orig.customer_id,
        orig.customer_name,
        input.userId ?? null,
        input.cashierName?.trim() || 'POS Cashier',
        invoiceDate,
        createdAt,
        subtotal,
        discountTotal,
        taxTotal,
        totalAmount,
        input.refundMode,
        cashAmount,
        cardAmount,
        bankAmount,
        totalAmount,
        terminal.fbr_pos_id,
        (input.reason ?? 'Customer Return').trim()
      );

    const newReturnId = Number(invRes.lastInsertRowid);

    const itemStmt = db.prepare(
      `INSERT INTO invoice_items (
         invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount,
         tax_rate, tax_charged, line_total
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const invRestoreStmt = db.prepare(
      `INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
       VALUES (?, ?, ?)
       ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = branch_inventory.stock_qty + excluded.stock_qty`
    );

    for (const line of lineRecords) {
      itemStmt.run(
        newReturnId,
        line.productId,
        line.sku,
        line.itemName,
        line.quantity,
        line.unitPrice,
        line.discountAmount,
        line.taxRate,
        line.taxCharged,
        line.lineTotal
      );
      invRestoreStmt.run(orig.branch_id, line.productId, line.quantity);
    }

    return newReturnId;
  });

  return submitInvoiceToFbr(db, returnId, {
    simulateOffline: input.simulateFbrOffline,
  });
}

export function holdCart(
  db: DatabaseSync,
  input: {
    branchId: number;
    customerId?: number | null;
    customerName: string;
    userId?: number | null;
    cashierName?: string;
    discountTotal?: number;
    notes?: string;
    items: Array<{
      productId: number;
      sku: string;
      name: string;
      unitPrice: number;
      taxRate: number;
      quantity: number;
      discountAmount: number;
    }>;
  }
): HeldCartRecord {
  if (!input.items.length) {
    throw new Error('Cannot hold an empty cart');
  }
  const now = getLocalIsoDateTime();
  const holdCode = `HOLD-${Date.now().toString().slice(-6)}`;
  const itemCount = input.items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsTotal = input.items.reduce((sum, i) => {
    const net = Math.max(0, i.unitPrice * i.quantity - i.discountAmount);
    return sum + net * (1 + i.taxRate / 100);
  }, 0);
  const totalAmount = roundMoney(Math.max(0, itemsTotal - (input.discountTotal ?? 0)));

  const res = db
    .prepare(
      `INSERT INTO held_carts (
         hold_code, branch_id, customer_id, customer_name, user_id, cashier_name,
         items_json, discount_total, notes, total_amount, item_count, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      holdCode,
      input.branchId,
      input.customerId ?? null,
      input.customerName,
      input.userId ?? null,
      input.cashierName ?? 'Cashier',
      JSON.stringify(input.items),
      roundMoney(input.discountTotal ?? 0),
      (input.notes ?? '').trim(),
      totalAmount,
      itemCount,
      now
    );

  return db
    .prepare(
      `SELECT h.*, b.display_name AS branch_display_name
       FROM held_carts h
       JOIN branches b ON b.id = h.branch_id
       WHERE h.id = ?`
    )
    .get(Number(res.lastInsertRowid)) as unknown as HeldCartRecord;
}

export function listHeldCarts(db: DatabaseSync, branchId?: number | null): HeldCartRecord[] {
  if (branchId) {
    return db
      .prepare(
        `SELECT h.*, b.display_name AS branch_display_name
         FROM held_carts h
         JOIN branches b ON b.id = h.branch_id
         WHERE h.branch_id = ?
         ORDER BY h.created_at DESC, h.id DESC`
      )
      .all(branchId) as unknown as HeldCartRecord[];
  }
  return db
    .prepare(
      `SELECT h.*, b.display_name AS branch_display_name
       FROM held_carts h
       JOIN branches b ON b.id = h.branch_id
       ORDER BY h.created_at DESC, h.id DESC`
    )
    .all() as unknown as HeldCartRecord[];
}

export function deleteHeldCart(db: DatabaseSync, id: number): void {
  db.prepare('DELETE FROM held_carts WHERE id = ?').run(id);
}

export function getDayClosingPreview(
  db: DatabaseSync,
  branchId: number,
  closingDate: string,
  openingCash = 0
): DayClosingPreview {
  const branch = db
    .prepare('SELECT id, display_name FROM branches WHERE id = ?')
    .get(branchId) as { id: number; display_name: string } | undefined;
  if (!branch) {
    throw new Error('Branch not found');
  }

  const agg = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN total_amount ELSE 0 END), 0) AS gross_sales,
         COUNT(CASE WHEN invoice_type = 'SALE' THEN 1 END) AS sales_count,
         COALESCE(SUM(CASE WHEN invoice_type = 'RETURN' THEN total_amount ELSE 0 END), 0) AS returns_total,
         COUNT(CASE WHEN invoice_type = 'RETURN' THEN 1 END) AS returns_count,
         COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN cash_amount ELSE 0 END), 0) AS cash_sales,
         COALESCE(SUM(CASE WHEN invoice_type = 'RETURN' THEN cash_amount ELSE 0 END), 0) AS cash_refunds,
         COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN card_amount ELSE -card_amount END), 0) AS card_sales,
         COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN bank_amount ELSE -bank_amount END), 0) AS bank_sales
       FROM invoices
       WHERE branch_id = ? AND invoice_date = ?`
    )
    .get(branchId, closingDate) as {
      gross_sales: number;
      sales_count: number;
      returns_total: number;
      returns_count: number;
      cash_sales: number;
      cash_refunds: number;
      card_sales: number;
      bank_sales: number;
    };

  const existing = db
    .prepare(
      `SELECT dc.*, b.display_name AS branch_display_name
       FROM day_closings dc
       JOIN branches b ON b.id = dc.branch_id
       WHERE dc.branch_id = ? AND dc.closing_date = ?`
    )
    .get(branchId, closingDate) as unknown as DayClosingRecord | undefined;

  const netSales = roundMoney(agg.gross_sales - agg.returns_total);
  const effectiveOpening = existing ? existing.opening_cash : roundMoney(openingCash);
  const expectedCash = roundMoney(effectiveOpening + agg.cash_sales - agg.cash_refunds);

  return {
    branch_id: branch.id,
    branch_display_name: branch.display_name,
    closing_date: closingDate,
    opening_cash: effectiveOpening,
    gross_sales: roundMoney(agg.gross_sales),
    sales_count: agg.sales_count,
    returns_total: roundMoney(agg.returns_total),
    returns_count: agg.returns_count,
    net_sales: netSales,
    cash_sales: roundMoney(agg.cash_sales),
    cash_refunds: roundMoney(agg.cash_refunds),
    card_sales: roundMoney(agg.card_sales),
    bank_sales: roundMoney(agg.bank_sales),
    expected_cash: expectedCash,
    already_closed: existing ?? null,
  };
}

export function submitDayClosing(
  db: DatabaseSync,
  input: {
    branchId: number;
    closingDate: string;
    openingCash: number;
    countedCash: number;
    userId?: number | null;
    closedByName?: string;
    notes?: string;
  }
): DayClosingRecord {
  const preview = getDayClosingPreview(db, input.branchId, input.closingDate, input.openingCash);
  if (preview.already_closed) {
    throw new Error(`Day closing for ${input.closingDate} is already finalized.`);
  }

  const now = getLocalIsoDateTime();
  const netCash = roundMoney(preview.cash_sales - preview.cash_refunds);
  const counted = roundMoney(input.countedCash);
  const variance = roundMoney(counted - preview.expected_cash);

  const res = db
    .prepare(
      `INSERT INTO day_closings (
         branch_id, closing_date, user_id, closed_by_name, opening_cash,
         gross_sales, returns_total, net_sales, cash_received, card_received, bank_received,
         expected_cash, counted_cash, variance, notes, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.branchId,
      input.closingDate,
      input.userId ?? null,
      input.closedByName?.trim() || 'Manager',
      roundMoney(input.openingCash),
      preview.gross_sales,
      preview.returns_total,
      preview.net_sales,
      netCash,
      preview.card_sales,
      preview.bank_sales,
      preview.expected_cash,
      counted,
      variance,
      (input.notes ?? '').trim(),
      now
    );

  return db
    .prepare(
      `SELECT dc.*, b.display_name AS branch_display_name
       FROM day_closings dc
       JOIN branches b ON b.id = dc.branch_id
       WHERE dc.id = ?`
    )
    .get(Number(res.lastInsertRowid)) as unknown as DayClosingRecord;
}

export function listDayClosings(db: DatabaseSync, branchId?: number | null): DayClosingRecord[] {
  if (branchId) {
    return db
      .prepare(
        `SELECT dc.*, b.display_name AS branch_display_name
         FROM day_closings dc
         JOIN branches b ON b.id = dc.branch_id
         WHERE dc.branch_id = ?
         ORDER BY dc.closing_date DESC, dc.id DESC`
      )
      .all(branchId) as unknown as DayClosingRecord[];
  }
  return db
    .prepare(
      `SELECT dc.*, b.display_name AS branch_display_name
       FROM day_closings dc
       JOIN branches b ON b.id = dc.branch_id
       ORDER BY dc.closing_date DESC, dc.id DESC`
    )
    .all() as unknown as DayClosingRecord[];
}

export function getReportsData(
  db: DatabaseSync,
  filters: { branchId?: number | null; fromDate: string; toDate: string }
) {
  const { branchId = null, fromDate, toDate } = filters;
  const branchWhere = branchId ? 'AND i.branch_id = ?' : '';
  const baseParams: Array<string | number> = branchId ? [fromDate, toDate, branchId] : [fromDate, toDate];

  const branchComparison = db
    .prepare(
      `SELECT
         b.id AS branch_id,
         b.display_name,
         COUNT(CASE WHEN i.invoice_type = 'SALE' THEN 1 END) AS invoice_count,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE 0 END), 0) AS gross_sales,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.total_amount ELSE 0 END), 0) AS returns_total,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS net_sales,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE -i.tax_total END), 0) AS net_tax
       FROM branches b
       LEFT JOIN invoices i
         ON i.branch_id = b.id AND i.invoice_date >= ? AND i.invoice_date <= ?
       WHERE b.is_active = 1 ${branchId ? 'AND b.id = ?' : ''}
       GROUP BY b.id
       ORDER BY net_sales DESC`
    )
    .all(...(branchId ? [fromDate, toDate, branchId] : [fromDate, toDate])) as Array<{
      branch_id: number;
      display_name: string;
      invoice_count: number;
      gross_sales: number;
      returns_total: number;
      net_sales: number;
      net_tax: number;
    }>;

  const topProducts = db
    .prepare(
      `SELECT
         ii.product_id,
         ii.sku,
         ii.item_name,
         SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.quantity ELSE -ii.quantity END) AS net_qty,
         SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.line_total ELSE -ii.line_total END) AS net_revenue,
         SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.tax_charged ELSE -ii.tax_charged END) AS net_tax
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.invoice_date >= ? AND i.invoice_date <= ? ${branchWhere}
       GROUP BY ii.product_id, ii.sku, ii.item_name
       ORDER BY net_revenue DESC
       LIMIT 20`
    )
    .all(...baseParams) as Array<{
      product_id: number;
      sku: string;
      item_name: string;
      net_qty: number;
      net_revenue: number;
      net_tax: number;
    }>;

  const taxSummary = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (i.subtotal - i.discount_total) ELSE 0 END), 0) AS taxable_sales,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE 0 END), 0) AS output_tax,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN (i.subtotal - i.discount_total) ELSE 0 END), 0) AS return_taxable,
         COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.tax_total ELSE 0 END), 0) AS return_tax
       FROM invoices i
       WHERE i.invoice_date >= ? AND i.invoice_date <= ? ${branchWhere}`
    )
    .get(...baseParams) as {
      taxable_sales: number;
      output_tax: number;
      return_taxable: number;
      return_tax: number;
    };

  const fbrLogs = db
    .prepare(
      `SELECT l.*
       FROM fbr_sync_logs l
       JOIN invoices i ON i.id = l.invoice_id
       WHERE 1=1 ${branchId ? 'AND i.branch_id = ?' : ''}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 50`
    )
    .all(...(branchId ? [branchId] : [])) as unknown as FbrSyncLogRecord[];

  return {
    branchComparison,
    topProducts,
    taxSummary: {
      taxable_sales: roundMoney(taxSummary.taxable_sales),
      output_tax: roundMoney(taxSummary.output_tax),
      return_taxable: roundMoney(taxSummary.return_taxable),
      return_tax: roundMoney(taxSummary.return_tax),
      net_tax_payable: roundMoney(taxSummary.output_tax - taxSummary.return_tax),
    },
    fbrLogs,
  };
}

export function saveBranchAndTerminal(
  db: DatabaseSync,
  input: {
    branchId?: number;
    code: string;
    name: string;
    address: string;
    phone: string;
    terminalId?: number;
    terminalCode: string;
    invoicePrefix: string;
    fbrPosId: string;
    fbrToken: string;
    fbrMode: FbrMode;
  }
) {
  const now = getLocalIsoDateTime();
  const displayName = `SEASTONE RETAIL OUTLET ( ${input.name.trim().toUpperCase()} )`;

  return withTransaction(db, () => {
    let branchId = input.branchId;
    if (branchId) {
      db.prepare(
        `UPDATE branches SET code = ?, name = ?, display_name = ?, address = ?, phone = ? WHERE id = ?`
      ).run(input.code.trim(), input.name.trim(), displayName, input.address.trim(), input.phone.trim(), branchId);
    } else {
      const bRes = db
        .prepare(
          `INSERT INTO branches (code, name, display_name, address, phone, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`
        )
        .run(input.code.trim(), input.name.trim(), displayName, input.address.trim(), input.phone.trim(), now);
      branchId = Number(bRes.lastInsertRowid);

      db.prepare(
        `INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
         VALUES (?, ?, '', '', '', 1, ?)`
      ).run(branchId, `Walk-in (Cash) Customer ( ${input.name.trim()} )`, now);

      const products = db.prepare('SELECT id FROM products').all() as Array<{ id: number }>;
      const invStmt = db.prepare(
        'INSERT OR IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)'
      );
      for (const p of products) {
        invStmt.run(branchId, p.id);
      }
    }

    if (input.terminalId) {
      db.prepare(
        `UPDATE pos_terminals
         SET terminal_code = ?, invoice_prefix = ?, fbr_pos_id = ?, fbr_token = ?, fbr_mode = ?
         WHERE id = ?`
      ).run(
        input.terminalCode.trim(),
        input.invoicePrefix.trim(),
        input.fbrPosId.trim(),
        input.fbrToken.trim(),
        input.fbrMode,
        input.terminalId
      );
    } else {
      db.prepare(
        `INSERT INTO pos_terminals (branch_id, terminal_code, invoice_prefix, next_sequence, fbr_pos_id, fbr_token, fbr_mode, is_active)
         VALUES (?, ?, ?, 1, ?, ?, ?, 1)`
      ).run(
        branchId,
        input.terminalCode.trim(),
        input.invoicePrefix.trim(),
        input.fbrPosId.trim(),
        input.fbrToken.trim(),
        input.fbrMode
      );
    }

    return getBranchesWithTerminals(db);
  });
}

