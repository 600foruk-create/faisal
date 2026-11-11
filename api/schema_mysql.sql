CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  address VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_terminals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  terminal_code VARCHAR(64) NOT NULL UNIQUE,
  invoice_prefix VARCHAR(64) NOT NULL,
  next_sequence INT NOT NULL DEFAULT 1,
  fbr_pos_id VARCHAR(64) NOT NULL DEFAULT '',
  fbr_token VARCHAR(255) NOT NULL DEFAULT '',
  fbr_mode VARCHAR(20) NOT NULL DEFAULT 'MOCK',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_terminals_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'CASHIER',
  branch_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  barcode VARCHAR(64) NOT NULL DEFAULT '',
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  unit VARCHAR(32) NOT NULL DEFAULT 'Pcs',
  sale_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(6,2) NOT NULL DEFAULT 18.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branch_inventory (
  branch_id INT NOT NULL,
  product_id INT NOT NULL,
  stock_qty DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (branch_id, product_id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NULL,
  name VARCHAR(180) NOT NULL,
  phone VARCHAR(64) NOT NULL DEFAULT '',
  cnic VARCHAR(64) NOT NULL DEFAULT '',
  ntn VARCHAR(64) NOT NULL DEFAULT '',
  is_walk_in TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT fk_customers_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(80) NOT NULL UNIQUE,
  usin VARCHAR(120) NOT NULL UNIQUE,
  invoice_type VARCHAR(16) NOT NULL DEFAULT 'SALE',
  original_invoice_id INT NULL,
  branch_id INT NOT NULL,
  terminal_id INT NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(180) NOT NULL,
  user_id INT NULL,
  cashier_name VARCHAR(120) NOT NULL,
  invoice_date VARCHAR(16) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_mode VARCHAR(16) NOT NULL DEFAULT 'CASH',
  cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  card_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  bank_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tendered_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  change_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fbr_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  fbr_invoice_no VARCHAR(120) NULL,
  fbr_pos_id VARCHAR(64) NULL,
  fbr_error TEXT NULL,
  fbr_submitted_at VARCHAR(32) NULL,
  notes TEXT NOT NULL,
  INDEX idx_invoices_date_branch (invoice_date, branch_id),
  INDEX idx_invoices_fbr_status (fbr_status),
  CONSTRAINT fk_invoices_orig FOREIGN KEY (original_invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_invoices_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_invoices_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  sku VARCHAR(64) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  tax_charged DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL,
  INDEX idx_invoice_items_invoice_id (invoice_id),
  CONSTRAINT fk_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fbr_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  invoice_no VARCHAR(80) NOT NULL,
  usin VARCHAR(120) NOT NULL,
  fbr_pos_id VARCHAR(64) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  http_status INT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  fbr_invoice_no VARCHAR(120) NULL,
  error_message TEXT NULL,
  request_payload LONGTEXT NOT NULL,
  response_payload LONGTEXT NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT fk_fbr_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS held_carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hold_code VARCHAR(64) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(180) NOT NULL,
  user_id INT NULL,
  cashier_name VARCHAR(120) NOT NULL,
  items_json LONGTEXT NOT NULL,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  item_count INT NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT fk_held_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS day_closings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  closing_date VARCHAR(16) NOT NULL,
  user_id INT NULL,
  closed_by_name VARCHAR(120) NOT NULL,
  opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gross_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  returns_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cash_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  card_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  bank_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  expected_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  counted_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  variance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  UNIQUE KEY uniq_branch_date (branch_id, closing_date),
  CONSTRAINT fk_closing_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

