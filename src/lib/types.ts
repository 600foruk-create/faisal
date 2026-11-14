export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export type FbrMode = 'MOCK' | 'SANDBOX' | 'PRODUCTION';

export type FbrStatus = 'SUBMITTED' | 'PENDING' | 'FAILED';

export type PaymentMode = 'CASH' | 'CARD' | 'BANK' | 'SPLIT';

export type InvoiceType = 'SALE' | 'RETURN';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface Branch {
  id: number;
  code: string;
  name: string;
  display_name: string;
  address: string;
  phone: string;
  is_active: number;
  created_at: string;
}

export interface PosTerminal {
  id: number;
  branch_id: number;
  terminal_code: string;
  invoice_prefix: string;
  next_sequence: number;
  fbr_pos_id: string;
  fbr_token: string;
  fbr_mode: FbrMode;
  is_active: number;
}

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  branch_id: number | null;
  branch_name?: string | null;
  is_active: number;
}

export interface ProductWithStock {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  hs_code?: string;
  sale_price: number;
  cost_price: number;
  tax_rate: number;
  stock_qty: number;
  is_active: number;
}

export interface Customer {
  id: number;
  branch_id: number | null;
  name: string;
  phone: string;
  cnic: string;
  ntn: string;
  address?: string;
  city?: string;
  is_walk_in: number;
}

export interface InvoiceItemRecord {
  id: number;
  invoice_id: number;
  product_id: number;
  sku: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_charged: number;
  line_total: number;
}

export interface InvoiceRecord {
  id: number;
  invoice_no: string;
  usin: string;
  invoice_type: InvoiceType;
  original_invoice_id: number | null;
  original_invoice_no?: string | null;
  branch_id: number;
  branch_name: string;
  branch_display_name: string;
  terminal_id: number;
  customer_id: number | null;
  customer_name: string;
  user_id: number | null;
  cashier_name: string;
  invoice_date: string;
  created_at: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  payment_mode: PaymentMode;
  cash_amount: number;
  card_amount: number;
  bank_amount: number;
  tendered_amount: number;
  change_amount: number;
  fbr_status: FbrStatus;
  fbr_invoice_no: string | null;
  fbr_pos_id: string | null;
  fbr_error: string | null;
  fbr_submitted_at: string | null;
  notes: string;
}

export interface InvoiceDetail extends InvoiceRecord {
  items: InvoiceItemRecord[];
  fbr_qr_payload: string;
  returned_quantities?: Record<number, number>;
}

export interface DashboardBranchBreakdown {
  branch_id: number;
  branch_name: string;
  display_name: string;
  total_sale: number;
  invoice_count: number;
  fbr_pending: number;
}

export interface DashboardTrendPoint {
  label: string;
  sale_amount: number;
  invoice_count: number;
}

export interface LowStockAlertItem {
  product_id: number;
  sku: string;
  name: string;
  unit: string;
  stock_qty: number;
}

export interface DashboardSummary {
  total_sale: number;
  total_invoices: number;
  cash_received: number;
  card_received: number;
  bank_received: number;
  tax_collected: number;
  avg_ticket: number;
  fbr_pending: number;
  fbr_submitted: number;
  total_returns: number;
  opening_cash: number;
  held_carts_count: number;
  branch_breakdown: DashboardBranchBreakdown[];
  sales_trend: DashboardTrendPoint[];
  low_stock_items: LowStockAlertItem[];
  recent_invoices: InvoiceRecord[];
}

export interface BusinessSettings {
  software_brand: string;
  business_name: string;
  logo_data_url: string;
  footer_text: string;
  ntn: string;
  strn: string;
  default_tax_rate: number;
  default_opening_cash: number;
  receipt_footer: string;
  currency_symbol: string;
}

export interface HeldCartRecord {
  id: number;
  hold_code: string;
  branch_id: number;
  branch_display_name: string;
  customer_id: number | null;
  customer_name: string;
  cashier_name: string;
  items_json: string;
  discount_total: number;
  notes: string;
  total_amount: number;
  item_count: number;
  created_at: string;
}

export interface DayClosingPreview {
  branch_id: number;
  branch_display_name: string;
  closing_date: string;
  opening_cash: number;
  gross_sales: number;
  sales_count: number;
  returns_total: number;
  returns_count: number;
  net_sales: number;
  cash_sales: number;
  cash_refunds: number;
  card_sales: number;
  bank_sales: number;
  expected_cash: number;
  already_closed: DayClosingRecord | null;
}

export interface DayClosingRecord {
  id: number;
  branch_id: number;
  branch_display_name: string;
  closing_date: string;
  closed_by_name: string;
  opening_cash: number;
  gross_sales: number;
  returns_total: number;
  net_sales: number;
  cash_received: number;
  card_received: number;
  bank_received: number;
  expected_cash: number;
  counted_cash: number;
  variance: number;
  notes: string;
  created_at: string;
}

export interface FbrSyncLogRecord {
  id: number;
  invoice_id: number;
  invoice_no: string;
  usin: string;
  fbr_pos_id: string;
  mode: FbrMode;
  http_status: number | null;
  success: number;
  fbr_invoice_no: string | null;
  error_message: string | null;
  request_payload: string;
  response_payload: string;
  created_at: string;
}

