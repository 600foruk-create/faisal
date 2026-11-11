CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  terminal_code TEXT NOT NULL UNIQUE,
  invoice_prefix TEXT NOT NULL,
  next_sequence INTEGER NOT NULL DEFAULT 1,
  fbr_pos_id TEXT NOT NULL DEFAULT '',
  fbr_token TEXT NOT NULL DEFAULT '',
  fbr_mode TEXT NOT NULL DEFAULT 'MOCK',
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CASHIER',
  branch_id INTEGER REFERENCES branches(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'Pcs',
  sale_price REAL NOT NULL,
  cost_price REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 18,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branch_inventory (
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  stock_qty REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (branch_id, product_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER REFERENCES branches(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  cnic TEXT NOT NULL DEFAULT '',
  ntn TEXT NOT NULL DEFAULT '',
  is_walk_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  usin TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'SALE',
  original_invoice_id INTEGER REFERENCES invoices(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  terminal_id INTEGER NOT NULL REFERENCES pos_terminals(id),
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  cashier_name TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_total REAL NOT NULL DEFAULT 0,
  tax_total REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'CASH',
  cash_amount REAL NOT NULL DEFAULT 0,
  card_amount REAL NOT NULL DEFAULT 0,
  bank_amount REAL NOT NULL DEFAULT 0,
  tendered_amount REAL NOT NULL DEFAULT 0,
  change_amount REAL NOT NULL DEFAULT 0,
  fbr_status TEXT NOT NULL DEFAULT 'PENDING',
  fbr_invoice_no TEXT,
  fbr_pos_id TEXT,
  fbr_error TEXT,
  fbr_submitted_at TEXT,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_charged REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS fbr_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  usin TEXT NOT NULL,
  fbr_pos_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  http_status INTEGER,
  success INTEGER NOT NULL DEFAULT 0,
  fbr_invoice_no TEXT,
  error_message TEXT,
  request_payload TEXT NOT NULL,
  response_payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS held_carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hold_code TEXT NOT NULL UNIQUE,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  cashier_name TEXT NOT NULL,
  items_json TEXT NOT NULL,
  discount_total REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  total_amount REAL NOT NULL,
  item_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_closings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  closing_date TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  closed_by_name TEXT NOT NULL,
  opening_cash REAL NOT NULL DEFAULT 0,
  gross_sales REAL NOT NULL DEFAULT 0,
  returns_total REAL NOT NULL DEFAULT 0,
  net_sales REAL NOT NULL DEFAULT 0,
  cash_received REAL NOT NULL DEFAULT 0,
  card_received REAL NOT NULL DEFAULT 0,
  bank_received REAL NOT NULL DEFAULT 0,
  expected_cash REAL NOT NULL DEFAULT 0,
  counted_cash REAL NOT NULL DEFAULT 0,
  variance REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (branch_id, closing_date)
);

CREATE TABLE IF NOT EXISTS business_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);
