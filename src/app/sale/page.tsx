'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArchiveRestore,
  Banknote,
  CheckCircle2,
  Clock,
  CloudUpload,
  CreditCard,
  Keyboard,
  Landmark,
  PauseCircle,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, formatDisplayDate, getLocalIsoDate, roundMoney } from '@/lib/format';
import type { Customer, PaymentMode, ProductWithStock } from '@/lib/types';

interface RowItem {
  id: string;
  productId: number | null;
  itemCode: string;
  hsCode: string;
  description: string;
  pieces: number;
  qty: number;
  unit: string;
  rate: number;
  taxRate: number;
  discountAmount: number;
}

interface HeldCartSummary {
  id: number;
  branch_id: number;
  customer_name: string;
  total_amount: number;
  discount_total?: number;
  item_count: number;
  created_at: string;
  notes?: string;
  items?: Array<{
    productId: number;
    sku: string;
    name: string;
    unitPrice: number;
    taxRate: number;
    quantity: number;
    discountAmount: number;
  }>;
}

const DEFAULT_ROW_COUNT = 8;

const createEmptyRow = (customId?: string): RowItem => ({
  id: customId || Math.random().toString(36).slice(2, 9),
  productId: null,
  itemCode: '',
  hsCode: '3917.2300',
  description: '',
  pieces: 0,
  qty: 0,
  unit: 'Pcs',
  rate: 0,
  taxRate: 18,
  discountAmount: 0,
});

export default function PosSalePage() {
  const {
    branches,
    terminals,
    activeBranchId,
    activeUser,
    settings,
    setActiveBranchId,
    refreshHeldCount,
    refreshNonce,
  } = usePosContext();

  const [branchId, setBranchId] = useState<number>(1);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Rows state (initial 8 rows like ERP grid)
  const [rows, setRows] = useState<RowItem[]>(() =>
    Array.from({ length: DEFAULT_ROW_COUNT }, () => createEmptyRow())
  );

  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('0');
  const [splitCard, setSplitCard] = useState<string>('0');
  const [splitBank, setSplitBank] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [heldCartId, setHeldCartId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [completedInvoiceId, setCompletedInvoiceId] = useState<number | null>(null);

  // Quick Customer modal
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCnic, setNewCustCnic] = useState('');

  // Recall dialog modal
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [heldCartsList, setHeldCartsList] = useState<HeldCartSummary[]>([]);
  const [loadingHeld, setLoadingHeld] = useState(false);

  // Checkout confirmation modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Product Autocomplete Search Dropdown state
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [rowSearchQuery, setRowSearchQuery] = useState<string>('');
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync Branch
  useEffect(() => {
    if (activeBranchId) {
      setBranchId(activeBranchId);
    } else if (branches.length > 0 && !branches.some((b) => b.id === branchId)) {
      setBranchId(branches[0].id);
    }
  }, [activeBranchId, branches, branchId]);

  // Load Products & Customers
  const loadCatalog = useCallback(async () => {
    if (!branchId) return;
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch(`/api/products?branchId=${branchId}`),
        fetch(`/api/customers?branchId=${branchId}`),
      ]);
      if (prodRes.ok) {
        const pData = (await prodRes.json()) as { products: ProductWithStock[] };
        setProducts(pData.products || []);
      }
      if (custRes.ok) {
        const cData = (await custRes.json()) as { customers: Customer[] };
        setCustomers(cData.customers || []);
        const walkIn = cData.customers?.find((c) => c.is_walk_in === 1) || cData.customers?.[0];
        if (walkIn && !selectedCustomerId) {
          setSelectedCustomerId(walkIn.id);
          setCustomerAddress(walkIn.address || walkIn.name || '');
        }
      }
    } catch {
      // transient load errors ignored
    }
  }, [branchId, selectedCustomerId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, refreshNonce]);

  // Update address when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) {
        setCustomerAddress(c.address || c.name);
      }
    }
  }, [selectedCustomerId, customers]);

  // Active terminal & branch
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const activeTerminal = terminals.find((t) => t.branch_id === branchId) ?? terminals[0];

  const generatedInvoiceNo = useMemo(() => {
    const prefix = activeTerminal?.invoice_prefix || activeBranch?.code || 'POS';
    const seq = activeTerminal?.next_sequence || 1;
    return `${prefix}-POS-${seq}`;
  }, [activeTerminal, activeBranch]);

  // Calculations for all rows
  const calculatedRows = useMemo(() => {
    return rows.map((r, idx) => {
      const isFilled = (r.productId !== null || r.itemCode.trim().length > 0) && r.qty > 0;
      const valExclTax = roundMoney(r.qty * r.rate);
      const taxAmt = roundMoney((valExclTax * r.taxRate) / 100);
      const valInclTax = roundMoney(valExclTax + taxAmt);
      return {
        ...r,
        index: idx + 1,
        isFilled,
        valExclTax,
        taxAmt,
        valInclTax,
      };
    });
  }, [rows]);

  // Grand totals
  const totals = useMemo(() => {
    let pieces = 0;
    let qty = 0;
    let subtotal = 0;
    let taxTotal = 0;

    for (const r of calculatedRows) {
      if (r.isFilled) {
        pieces += Number(r.pieces) || 0;
        qty += Number(r.qty) || 0;
        subtotal = roundMoney(subtotal + r.valExclTax);
        taxTotal = roundMoney(taxTotal + r.taxAmt);
      }
    }

    const totalAfterDiscount = roundMoney(Math.max(0, subtotal - invoiceDiscount));
    const grandTotal = roundMoney(Math.max(0, totalAfterDiscount + taxTotal));

    return {
      pieces,
      qty,
      subtotal,
      invoiceDiscount,
      totalAfterDiscount,
      taxTotal,
      grandTotal,
    };
  }, [calculatedRows, invoiceDiscount]);

  const tenderedNum = tenderedAmount.trim() ? Number(tenderedAmount) : totals.grandTotal;
  const changeDue =
    paymentMode === 'CASH' ? roundMoney(Math.max(0, tenderedNum - totals.grandTotal)) : 0;

  // Row update helpers
  const updateRow = (id: string, patch: Partial<RowItem>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addEmptyRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return filtered.length >= DEFAULT_ROW_COUNT
        ? filtered
        : [...filtered, ...Array.from({ length: DEFAULT_ROW_COUNT - filtered.length }, () => createEmptyRow())];
    });
  };

  const clearAllRows = () => {
    setRows(Array.from({ length: DEFAULT_ROW_COUNT }, () => createEmptyRow()));
    setInvoiceDiscount(0);
    setNotes('');
    setHeldCartId(null);
    setMessage(null);
  };

  // Select a product into a specific row
  const selectProductIntoRow = (rowId: string, p: ProductWithStock) => {
    updateRow(rowId, {
      productId: p.id,
      itemCode: p.sku || p.barcode,
      description: p.name,
      unit: p.unit || 'Pcs',
      rate: p.sale_price,
      taxRate: p.tax_rate ?? 18,
      qty: 1,
      pieces: 1,
    });
    setActiveSearchRowId(null);
    setRowSearchQuery('');
  };

  // Product autocomplete list
  const autocompleteProducts = useMemo(() => {
    if (!rowSearchQuery.trim()) return products.slice(0, 10);
    const q = rowSearchQuery.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [products, rowSearchQuery]);

  // Click outside autocomplete dropdown to close
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setActiveSearchRowId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: branchId,
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          cnic: newCustCnic.trim(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { customer: Customer };
        setCustomers((prev) => [...prev, data.customer]);
        setSelectedCustomerId(data.customer.id);
        setCustomerAddress(data.customer.address || data.customer.name);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustCnic('');
        setShowNewCustomer(false);
      }
    } catch {
      // ignore
    }
  };

  // Hold Sale (F6)
  const handleHoldSale = async () => {
    const filledItems = calculatedRows.filter((r) => r.isFilled);
    if (filledItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add items before parking a bill.' });
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId);
    try {
      const res = await fetch('/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          customerId: selectedCustomerId,
          customerName: cust?.name ?? `Walk-in Customer (${activeBranch?.name})`,
          userId: activeUser?.id ?? null,
          cashierName: activeUser?.full_name ?? 'POS Cashier',
          discountTotal: invoiceDiscount,
          notes,
          items: filledItems.map((c) => ({
            productId: c.productId,
            sku: c.itemCode,
            name: c.description,
            unitPrice: c.rate,
            taxRate: c.taxRate,
            quantity: c.qty,
            discountAmount: c.discountAmount,
          })),
        }),
      });

      if (res.ok) {
        clearAllRows();
        await refreshHeldCount();
        setMessage({ type: 'success', text: 'Sale successfully parked in Hold / Recall (F6).' });
      } else {
        const err = (await res.json()) as { error?: string };
        setMessage({ type: 'error', text: err.error || 'Failed to hold sale.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while parking sale.' });
    }
  };

  // Open Recall Modal (F7)
  const openRecallModal = async () => {
    setShowRecallModal(true);
    setLoadingHeld(true);
    try {
      const res = await fetch('/api/hold');
      if (res.ok) {
        const data = (await res.json()) as { carts: HeldCartSummary[] };
        setHeldCartsList(data.carts || []);
      }
    } finally {
      setLoadingHeld(false);
    }
  };

  // Load a held cart into grid
  const recallHeldCart = (cart: HeldCartSummary) => {
    setBranchId(cart.branch_id);
    setActiveBranchId(cart.branch_id);
    setInvoiceDiscount(cart.discount_total || 0);
    setNotes(cart.notes || '');
    setHeldCartId(cart.id);

    if (cart.items && cart.items.length > 0) {
      const newRows: RowItem[] = cart.items.map((it) => ({
        id: Math.random().toString(36).slice(2, 9),
        productId: it.productId,
        itemCode: it.sku,
        hsCode: '3917.2300',
        description: it.name,
        pieces: it.quantity,
        qty: it.quantity,
        unit: 'Pcs',
        rate: it.unitPrice,
        taxRate: it.taxRate ?? 18,
        discountAmount: it.discountAmount || 0,
      }));

      while (newRows.length < DEFAULT_ROW_COUNT) {
        newRows.push(createEmptyRow());
      }
      setRows(newRows);
    }

    setShowRecallModal(false);
    setMessage({ type: 'success', text: `Recalled parked cart #${cart.id} into POS Sale grid.` });
  };

  // Complete Sale (Save & Post to FBR)
  const handleSaveAndSubmitSale = async () => {
    const filledItems = calculatedRows.filter((r) => r.isFilled);
    if (filledItems.length === 0) {
      setMessage({ type: 'error', text: 'No items in sale grid to process.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          terminalId: activeTerminal?.id,
          customerId: selectedCustomerId,
          customerName: cust?.name || `Walk-in Customer (${activeBranch?.name})`,
          userId: activeUser?.id ?? null,
          cashierName: activeUser?.full_name ?? 'POS Cashier',
          paymentMode,
          cashAmount: paymentMode === 'SPLIT' ? Number(splitCash) || 0 : undefined,
          cardAmount: paymentMode === 'SPLIT' ? Number(splitCard) || 0 : undefined,
          bankAmount: paymentMode === 'SPLIT' ? Number(splitBank) || 0 : undefined,
          tenderedAmount: tenderedNum,
          invoiceDiscount,
          notes,
          heldCartId,
          items: filledItems.map((c) => ({
            productId: c.productId,
            quantity: c.qty,
            unitPrice: c.rate,
            discountAmount: c.discountAmount,
          })),
        }),
      });

      const data = (await res.json()) as {
        invoice?: { id: number; invoice_no: string };
        error?: string;
      };

      if (!res.ok || !data.invoice) {
        setMessage({ type: 'error', text: data.error || 'Failed to complete sale' });
        return;
      }

      clearAllRows();
      setShowPaymentModal(false);
      setCompletedInvoiceId(data.invoice.id);
      await Promise.all([loadCatalog(), refreshHeldCount()]);
      setMessage({
        type: 'success',
        text: `Receipt ${data.invoice.invoice_no} completed and saved to FBR database successfully.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred while submitting sale.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+S, F6, F7, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      // F6: Hold Sale
      if (e.key === 'F6') {
        e.preventDefault();
        void handleHoldSale();
      }
      // F7: Recall Sale
      if (e.key === 'F7') {
        e.preventDefault();
        void openRecallModal();
      }
      // Esc: Close modal or clear
      if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        else if (showRecallModal) setShowRecallModal(false);
        else if (showNewCustomer) setShowNewCustomer(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaymentModal, showRecallModal, showNewCustomer, calculatedRows]);

  return (
    <div className="flex flex-col gap-3 font-sans text-slate-800">
      {/* 1. TOP WINDOW BAR (POS Sale Title & Fast Action Buttons) */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs">
        {/* Left: Window title icon */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-200">
            <Keyboard className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-slate-900">POS Sale</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Retail Billing &amp; FBR Invoicing
            </p>
          </div>
        </div>

        {/* Right: Actions Buttons Row (Matching Screenshot 4 exactly) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={addEmptyRow}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            type="button"
            onClick={() => void openRecallModal()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#4338CA] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Recall (F7)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleHoldSale()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#D97706] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-amber-700"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            <span>Hold Sale (F6)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#4E1E07] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#3B1706]"
          >
            <Save className="h-3.5 w-3.5 text-amber-300" />
            <span>Save (Ctrl+S)</span>
          </button>

          <button
            type="button"
            onClick={clearAllRows}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Sale</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-black"
          >
            <Printer className="h-3.5 w-3.5 text-slate-300" />
            <span>Print</span>
          </button>
        </div>
      </section>

      {/* 2. INVOICE META HEADER BAR (Two Columns: Invoice No / Date / Location vs Customer / Address) */}
      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs lg:grid-cols-12">
        {/* Left Side (6 Cols) */}
        <div className="space-y-2 lg:col-span-6">
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-bold text-slate-600">Invoice No</span>
            <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 px-3 py-1 font-mono text-xs font-black text-amber-900 shadow-2xs">
              {generatedInvoiceNo}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-bold text-slate-600">Date</span>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800">
              {formatDisplayDate(getLocalIsoDate())}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-bold text-slate-600">Location / Branch</span>
            <select
              value={branchId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setBranchId(id);
                setActiveBranchId(id);
              }}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side (6 Cols) */}
        <div className="space-y-2 lg:col-span-6">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-bold text-slate-600">Customer</span>
            <div className="flex flex-1 items-center gap-1.5">
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                title="Add New Customer"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-bold text-slate-600">Address</span>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Customer Address / City / Notes..."
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Notification Banner */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2 text-xs font-bold ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3. CORE ERP GRID TABLE (Full Columns matching Screenshot 4) */}
      <section className="relative overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-2xs">
        <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-amber-950/80 bg-[#4E1E07] text-[11px] font-extrabold uppercase tracking-wider text-white">
              <th className="w-10 px-2.5 py-2 text-center">#</th>
              <th className="w-36 px-2.5 py-2">ITEM CODE</th>
              <th className="w-28 px-2.5 py-2">HS CODE</th>
              <th className="min-w-[180px] px-2.5 py-2">DESCRIPTION</th>
              <th className="w-20 px-2 py-2 text-right">PIECES</th>
              <th className="w-20 px-2 py-2 text-right">QTY</th>
              <th className="w-16 px-2 py-2 text-center">UNIT</th>
              <th className="w-24 px-2 py-2 text-right">RATE</th>
              <th className="w-28 px-2 py-2 text-right">VAL EXCL. TAX</th>
              <th className="w-16 px-1.5 py-2 text-center">S.T %</th>
              <th className="w-24 px-2 py-2 text-right">S.T AMT</th>
              <th className="w-28 px-2 py-2 text-right">VAL INCL. TAX</th>
              <th className="w-12 px-2 py-2 text-center">
                <Trash2 className="mx-auto h-3.5 w-3.5 opacity-80" />
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {calculatedRows.map((r, idx) => {
              const isFilled = r.isFilled;
              return (
                <tr
                  key={r.id}
                  className={`transition hover:bg-amber-50/20 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {/* # */}
                  <td className="px-2 py-1.5 text-center font-bold text-slate-500">
                    {idx + 1}
                  </td>

                  {/* ITEM CODE with Autocomplete / Barcode */}
                  <td className="relative px-2 py-1">
                    <input
                      type="text"
                      value={r.itemCode}
                      onFocus={() => {
                        setActiveSearchRowId(r.id);
                        setRowSearchQuery(r.itemCode);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(r.id, { itemCode: val });
                        setRowSearchQuery(val);
                        setActiveSearchRowId(r.id);

                        // Exact barcode scan match
                        const exact = products.find(
                          (p) =>
                            p.barcode.toLowerCase() === val.trim().toLowerCase() ||
                            p.sku.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (exact) {
                          selectProductIntoRow(r.id, exact);
                        }
                      }}
                      placeholder="Scan/Code..."
                      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 focus:border-amber-600 focus:outline-none"
                    />

                    {/* Autocomplete Dropdown */}
                    {activeSearchRowId === r.id && autocompleteProducts.length > 0 && (
                      <div
                        ref={searchDropdownRef}
                        className="absolute left-2 top-8 z-50 max-h-52 w-80 overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-2xl"
                      >
                        {autocompleteProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => selectProductIntoRow(r.id, p)}
                            className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-amber-50"
                          >
                            <div>
                              <span className="font-mono font-bold text-amber-800">{p.sku}</span>
                              <span className="ml-2 font-semibold text-slate-800">{p.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(p.sale_price, settings.currency_symbol)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* HS CODE */}
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={r.hsCode}
                      onChange={(e) => updateRow(r.id, { hsCode: e.target.value })}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-mono text-slate-700 focus:border-amber-600 focus:outline-none"
                    />
                  </td>

                  {/* DESCRIPTION */}
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(r.id, { description: val });
                        setRowSearchQuery(val);
                        setActiveSearchRowId(r.id);
                      }}
                      placeholder="Product Description..."
                      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                  </td>

                  {/* PIECES */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      value={r.pieces === 0 ? '' : r.pieces}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateRow(r.id, { pieces: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none"
                    />
                  </td>

                  {/* QTY */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      value={r.qty === 0 ? '' : r.qty}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateRow(r.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none"
                    />
                  </td>

                  {/* UNIT */}
                  <td className="px-2 py-1 text-center font-bold text-slate-600">
                    <input
                      type="text"
                      value={r.unit}
                      onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                      className="w-14 rounded border border-slate-300 bg-white py-0.5 text-center text-xs font-bold"
                    />
                  </td>

                  {/* RATE */}
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      value={r.rate === 0 ? '' : r.rate}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateRow(r.id, { rate: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-none"
                    />
                  </td>

                  {/* VAL EXCL. TAX */}
                  <td className="px-2.5 py-1 text-right font-mono text-xs font-bold text-slate-900">
                    {r.valExclTax.toFixed(2)}
                  </td>

                  {/* S.T % */}
                  <td className="px-1.5 py-1 text-center font-mono text-xs font-bold text-slate-700">
                    {r.taxRate.toFixed(2)}
                  </td>

                  {/* S.T AMT */}
                  <td className="px-2.5 py-1 text-right font-mono text-xs font-bold text-slate-900">
                    {r.taxAmt.toFixed(2)}
                  </td>

                  {/* VAL INCL. TAX */}
                  <td className="px-2.5 py-1 text-right font-mono text-xs font-black text-amber-950">
                    {r.valInclTax.toFixed(2)}
                  </td>

                  {/* Action Delete */}
                  <td className="px-2 py-1 text-center">
                    {isFilled ? (
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        className="cursor-pointer rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Delete row"
                      >
                        <Trash2 className="mx-auto h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Grid Footer: Totals Row */}
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-extrabold text-slate-900">
              <td colSpan={4} className="px-4 py-2 text-right uppercase tracking-wider">
                Totals:
              </td>
              <td className="px-2 py-2 text-right font-mono text-xs font-black">
                {totals.pieces.toFixed(2)}
              </td>
              <td className="px-2 py-2 text-right font-mono text-xs font-black">
                {totals.qty.toFixed(2)}
              </td>
              <td className="px-2 py-2 text-center text-xs">-</td>
              <td className="px-2 py-2 text-center text-xs">-</td>
              <td className="px-2.5 py-2 text-right font-mono text-xs font-black">
                {totals.subtotal.toFixed(2)}
              </td>
              <td className="px-2 py-2 text-center text-xs">-</td>
              <td className="px-2.5 py-2 text-right font-mono text-xs font-black text-amber-900">
                {totals.taxTotal.toFixed(2)}
              </td>
              <td className="px-2.5 py-2 text-right font-mono text-xs font-black text-slate-950">
                {totals.grandTotal.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* 4. BOTTOM SECTION: CASHIER ACTIONS (Left) vs FINANCIAL TOTALS BOX (Right) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Side: Cashier Action Cards (8 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs lg:col-span-8">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black tracking-wider text-amber-800 uppercase">
                ⚡ Cashier Actions
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>Status:</span>
                <span className="text-sky-700">Ready for Sale</span>
              </span>
            </div>

            {/* 4 Big Action Cards (Matching Screenshot 4) */}
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {/* Card 1: Hold Sale (F6) */}
              <button
                type="button"
                onClick={() => void handleHoldSale()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-amber-300 bg-[#FFFBEB] p-3 text-center shadow-2xs transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs">
                  <PauseCircle className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-amber-950">Hold Sale</span>
                <span className="text-[10px] font-bold text-amber-700">F6</span>
              </button>

              {/* Card 2: Recall Sale (F7) */}
              <button
                type="button"
                onClick={() => void openRecallModal()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-blue-300 bg-[#EFF6FF] p-3 text-center shadow-2xs transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-blue-950">Recall Sale</span>
                <span className="text-[10px] font-bold text-blue-700">F7</span>
              </button>

              {/* Card 3: Post to FBR */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowPaymentModal(true)}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-900 bg-[#0F1B33] p-3 text-center text-white shadow-2xs transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white shadow-2xs">
                  <CloudUpload className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-white">Post to FBR</span>
                <span className="text-[10px] font-bold text-sky-300">FBR Submit</span>
              </button>

              {/* Card 4: Clear Sale (Esc) */}
              <button
                type="button"
                onClick={clearAllRows}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-rose-300 bg-[#FEF2F2] p-3 text-center shadow-2xs transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-2xs">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-extrabold text-rose-950">Clear Sale</span>
                <span className="text-[10px] font-bold text-rose-700">Esc</span>
              </button>
            </div>
          </div>

          {/* Bottom Security / FBR Disclaimer */}
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span>
              Saved sales are stored locally in ERP database and can be edited or deleted until submitted to <strong>FBR</strong>.
            </span>
          </div>
        </div>

        {/* Right Side: Financial Totals Box (4 Cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 shadow-2xs lg:col-span-4">
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold">Gross Amount</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {totals.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold">Discount Amount</span>
              <input
                type="number"
                min={0}
                value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                placeholder="0.00"
                onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-mono text-xs font-extrabold text-slate-900 focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold">Total After Discount</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {totals.totalAfterDiscount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold">Sales Tax Amount</span>
              <span className="font-mono text-sm font-black text-amber-700">
                {totals.taxTotal.toFixed(2)}
              </span>
            </div>

            <div className="border-t-2 border-slate-300 pt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-900 uppercase">Net Total</span>
                <span className="font-mono text-2xl font-black text-slate-950">
                  {totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="mt-4 w-full cursor-pointer rounded-xl bg-[#4E1E07] py-2.5 text-center text-xs font-black tracking-wide text-white shadow-md transition hover:bg-[#3B1706]"
          >
            Checkout &amp; Print Bill (Ctrl+S)
          </button>
        </div>
      </section>

      {/* 5. CHECKOUT & PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Complete POS Payment</h3>
                <p className="text-xs text-slate-500">Bill No: {generatedInvoiceNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Payable Net Total</span>
                <div className="font-mono text-3xl font-black text-slate-950">
                  {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Payment Mode</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { mode: 'CASH', label: 'Cash', icon: Banknote },
                      { mode: 'CARD', label: 'Card', icon: CreditCard },
                      { mode: 'BANK', label: 'Bank', icon: Landmark },
                      { mode: 'SPLIT', label: 'Split', icon: ShoppingCart },
                    ] as const
                  ).map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition ${
                        paymentMode === mode
                          ? 'border-amber-600 bg-[#4E1E07] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMode === 'CASH' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Cash Received</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(totals.grandTotal)}
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Change Due</label>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-sm font-black text-emerald-800">
                      {formatCurrency(changeDue, settings.currency_symbol)}
                    </div>
                  </div>
                </div>
              )}

              {paymentMode === 'SPLIT' && (
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Cash</label>
                    <input
                      type="number"
                      min={0}
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Card</label>
                    <input
                      type="number"
                      min={0}
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Bank</label>
                    <input
                      type="number"
                      min={0}
                      value={splitBank}
                      onChange={(e) => setSplitBank(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="Optional invoice notes / remark..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSaveAndSubmitSale()}
                  className="flex-1 cursor-pointer rounded-xl bg-[#4E1E07] py-2.5 text-xs font-black text-white shadow-md hover:bg-[#3B1706] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Confirm & Print Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. RECALL SALE (F7) MODAL */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Recall Parked Bills (F7)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecallModal(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto">
              {loadingHeld ? (
                <p className="py-8 text-center text-xs text-slate-500">Loading parked bills...</p>
              ) : heldCartsList.length === 0 ? (
                <p className="py-8 text-center text-xs font-semibold text-slate-400">
                  No parked bills found in hold queue.
                </p>
              ) : (
                <div className="space-y-2">
                  {heldCartsList.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-700">
                            Parked #{c.id}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{c.customer_name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {c.item_count} items • {c.created_at}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {formatCurrency(c.total_amount, settings.currency_symbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => recallHeldCart(c)}
                          className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700"
                        >
                          Load Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK ADD CUSTOMER MODAL */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-semibold"
                  placeholder="e.g. M/S Peshawar Hardware"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Phone</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-semibold"
                  placeholder="0300-1234567"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">CNIC / NTN</label>
                <input
                  type="text"
                  value={newCustCnic}
                  onChange={(e) => setNewCustCnic(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-semibold"
                  placeholder="15302-..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 cursor-pointer rounded-xl bg-[#4E1E07] py-2 text-xs font-black text-white hover:bg-[#3B1706]"
                >
                  Save &amp; Select
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Print & FBR QR View Modal */}
      <InvoiceModal
        invoiceId={completedInvoiceId}
        onClose={() => setCompletedInvoiceId(null)}
        onSynced={() => void loadCatalog()}
      />
    </div>
  );
}
