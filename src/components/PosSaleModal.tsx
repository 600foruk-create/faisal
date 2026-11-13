'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CloudUpload,
  CreditCard,
  Keyboard,
  Landmark,
  Maximize2,
  Minimize2,
  Minus,
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
  Zap,
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

const DEFAULT_ROW_COUNT = 10;

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

export function PosSaleModal() {
  const {
    branches,
    terminals,
    activeBranchId,
    activeUser,
    settings,
    setActiveBranchId,
    refreshHeldCount,
    refreshNonce,
    closePosSale,
  } = usePosContext();

  const [branchId, setBranchId] = useState<number>(1);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerAddress, setCustomerAddress] = useState<string>('Haripur');

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Quick Barcode / Omni search
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const [barcodeQuery, setBarcodeQuery] = useState('');

  // 10 initial rows
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

  // Nested Modals
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCnic, setNewCustCnic] = useState('');

  const [showRecallModal, setShowRecallModal] = useState(false);
  const [heldCartsList, setHeldCartsList] = useState<HeldCartSummary[]>([]);
  const [loadingHeld, setLoadingHeld] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // In-grid autocomplete
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

  // Load Catalog
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
          setCustomerAddress(walkIn.phone || walkIn.name || 'Haripur');
        }
      }
    } catch {
      // transient
    }
  }, [branchId, selectedCustomerId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, refreshNonce]);

  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) {
        setCustomerAddress(c.phone || c.name || 'Haripur');
      }
    }
  }, [selectedCustomerId, customers]);

  // Active branch & terminal sequence
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const activeTerminal = terminals.find((t) => t.branch_id === branchId) ?? terminals[0];

  const generatedInvoiceNo = useMemo(() => {
    const prefix = activeTerminal?.invoice_prefix || activeBranch?.code || 'HRP';
    const seq = activeTerminal?.next_sequence || 46;
    return `${prefix}-POS-${seq}`;
  }, [activeTerminal, activeBranch]);

  // Calculated rows
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

  // Totals
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

  // Grid Actions
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

  // Quick Barcode Scan Enter Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim()) return;
    const q = barcodeQuery.trim().toLowerCase();
    const match = products.find(
      (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q || p.name.toLowerCase().includes(q)
    );

    if (match) {
      const emptyRow = rows.find((r) => !r.productId && !r.itemCode);
      if (emptyRow) {
        selectProductIntoRow(emptyRow.id, match);
      } else {
        const newR = createEmptyRow();
        setRows((prev) => [...prev, newR]);
        selectProductIntoRow(newR.id, match);
      }
      setBarcodeQuery('');
      setMessage({ type: 'success', text: `Added "${match.name}" to cart.` });
    } else {
      setMessage({ type: 'error', text: `No product found for barcode/SKU "${barcodeQuery}".` });
    }
  };

  // Autocomplete Products
  const autocompleteProducts = useMemo(() => {
    if (!rowSearchQuery.trim()) return products.slice(0, 12);
    const q = rowSearchQuery.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [products, rowSearchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setActiveSearchRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          branchId,
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          cnic: newCustCnic.trim() || undefined,
          isWalkIn: false,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { customer: Customer };
        setCustomers((prev) => [...prev, data.customer]);
        setSelectedCustomerId(data.customer.id);
        setCustomerAddress(data.customer.phone || data.customer.name || 'Haripur');
        setShowNewCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustCnic('');
        setMessage({ type: 'success', text: `Customer "${data.customer.name}" created.` });
      } else {
        const err = (await res.json()) as { error?: string };
        setMessage({ type: 'error', text: err.error || 'Failed to add customer.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error adding customer.' });
    }
  };

  // Hold Sale (F6)
  const handleHoldSale = async () => {
    const filled = calculatedRows.filter((r) => r.isFilled);
    if (filled.length === 0) {
      setMessage({ type: 'error', text: 'Cannot hold empty sale. Please add items.' });
      return;
    }

    try {
      const payload = {
        branchId,
        terminalId: activeTerminal?.id ?? 1,
        userId: activeUser?.id ?? 1,
        customerId: selectedCustomerId,
        notes: notes || `Parked counter bill ${generatedInvoiceNo}`,
        items: filled.map((r) => ({
          productId: r.productId,
          sku: r.itemCode,
          name: r.description,
          unitPrice: r.rate,
          taxRate: r.taxRate,
          quantity: r.qty,
          discountAmount: r.discountAmount,
        })),
        discountTotal: invoiceDiscount,
      };

      const res = await fetch('/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        clearAllRows();
        await refreshHeldCount();
        setMessage({ type: 'success', text: 'Sale parked to Hold queue (F6).' });
      } else {
        const err = (await res.json()) as { error?: string };
        setMessage({ type: 'error', text: err.error || 'Failed to hold sale.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error holding sale.' });
    }
  };

  // Recall Sale (F7)
  const openRecallModal = async () => {
    setLoadingHeld(true);
    setShowRecallModal(true);
    try {
      const res = await fetch(`/api/hold?branchId=${branchId}`);
      if (res.ok) {
        const data = (await res.json()) as { carts: HeldCartSummary[] };
        setHeldCartsList(data.carts || []);
      }
    } catch {
      // transient
    } finally {
      setLoadingHeld(false);
    }
  };

  const recallHeldCart = async (cart: HeldCartSummary) => {
    try {
      const res = await fetch(`/api/hold/${cart.id}`);
      if (res.ok) {
        const data = (await res.json()) as {
          cart: {
            id: number;
            branch_id: number;
            customer_id?: number;
            notes?: string;
            discount_total?: number;
            items: Array<{
              product_id: number;
              sku: string;
              name: string;
              unit_price: number;
              tax_rate: number;
              quantity: number;
              discount_amount: number;
            }>;
          };
        };

        const c = data.cart;
        if (c.items && c.items.length > 0) {
          const newRows: RowItem[] = c.items.map((it) => ({
            id: Math.random().toString(36).slice(2, 9),
            productId: it.product_id,
            itemCode: it.sku,
            hsCode: '3917.2300',
            description: it.name,
            pieces: it.quantity,
            qty: it.quantity,
            unit: 'Pcs',
            rate: it.unit_price,
            taxRate: it.tax_rate ?? 18,
            discountAmount: it.discount_amount ?? 0,
          }));

          while (newRows.length < DEFAULT_ROW_COUNT) {
            newRows.push(createEmptyRow());
          }

          setRows(newRows);
          setInvoiceDiscount(c.discount_total || 0);
          setNotes(c.notes || '');
          setHeldCartId(c.id);
          if (c.customer_id) setSelectedCustomerId(c.customer_id);

          await fetch(`/api/hold/${cart.id}`, { method: 'DELETE' });
          await refreshHeldCount();

          setShowRecallModal(false);
          setMessage({ type: 'success', text: `Held bill #${cart.id} loaded into POS Sale.` });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Error recalling bill.' });
    }
  };

  // Submit Sale
  const handleSaveAndSubmitSale = async () => {
    const filled = calculatedRows.filter((r) => r.isFilled);
    if (filled.length === 0) {
      setMessage({ type: 'error', text: 'Cannot checkout empty sale. Please add items.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        branchId,
        terminalId: activeTerminal?.id ?? 1,
        customerId: selectedCustomerId,
        invoiceType: 'SALE' as const,
        paymentMode,
        tenderedAmount: paymentMode === 'CASH' ? tenderedNum : totals.grandTotal,
        changeAmount: changeDue,
        discountTotal: invoiceDiscount,
        notes: notes || undefined,
        splitCash: paymentMode === 'SPLIT' ? Number(splitCash) || 0 : undefined,
        splitCard: paymentMode === 'SPLIT' ? Number(splitCard) || 0 : undefined,
        splitBank: paymentMode === 'SPLIT' ? Number(splitBank) || 0 : undefined,
        heldCartId: heldCartId ?? undefined,
        items: filled.map((r) => ({
          productId: r.productId,
          sku: r.itemCode,
          name: r.description,
          unitPrice: r.rate,
          taxRate: r.taxRate,
          quantity: r.qty,
          discountAmount: r.discountAmount,
        })),
      };

      const res = await fetch('/api/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { invoice: { id: number; invoice_no: string } };
        setCompletedInvoiceId(data.invoice.id);
        setShowPaymentModal(false);
        clearAllRows();
        await refreshHeldCount();
        setMessage({
          type: 'success',
          text: `Sale recorded successfully! Invoice ${data.invoice.invoice_no}`,
        });
      } else {
        const err = (await res.json()) as { error?: string };
        setMessage({ type: 'error', text: err.error || 'Failed to complete sale.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving sale.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Shortcuts (F2: barcode, F6: hold, F7: recall, F12 / Ctrl+S: checkout, Esc: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      if (e.key === 'F6') {
        e.preventDefault();
        void handleHoldSale();
      }
      if (e.key === 'F7') {
        e.preventDefault();
        void openRecallModal();
      }
      if (e.key === 'F12') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
      if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        else if (showRecallModal) setShowRecallModal(false);
        else if (showNewCustomer) setShowNewCustomer(false);
        else closePosSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaymentModal, showRecallModal, showNewCustomer, calculatedRows, closePosSale]);

  // Minimized dock pill on bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-xs font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/25" />
          <ShoppingCart className="h-4 w-4 text-emerald-400" />
          <span>POS Sale: {generatedInvoiceNo}</span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-medium">
            {totals.grandTotal > 0 ? formatCurrency(totals.grandTotal, settings.currency_symbol) : 'Ready'}
          </span>
          <Maximize2 className="ml-1 h-3.5 w-3.5 text-emerald-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-slate-950/45 backdrop-blur-[2px] transition-all font-sans">
      {/* FLOATING WINDOW CONTAINER - FIXED HEIGHT WITH INTERNAL TABLE SCROLL ONLY */}
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-[#F8FAFC] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-200 transition-all duration-200 ${
          isMaximized
            ? 'fixed inset-2 z-50 h-[calc(100vh-16px)] max-h-none'
            : 'max-w-[1460px] h-[92vh] max-h-[94vh]'
        }`}
      >
        {/* 1. SEASTONE EXECUTIVE TITLE BAR (FIXED PINNED HEADER) */}
        <div className="shrink-0 flex select-none items-center justify-between border-b-2 border-emerald-500/80 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2 text-white shadow-sm">
          {/* Left: Window Icon + Title + Live Store Badge */}
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-white sm:text-sm">
              POS Sale (New Bill)
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-white/15">
              {activeBranch?.code} • {activeBranch?.name}
            </span>
          </div>

          {/* Right: Window Controls (Minimize, Maximize/Restore, Close) */}
          <div className="flex items-center gap-1.5 text-slate-300">
            {/* Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Form to Bottom Tab"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg hover:bg-white/15 hover:text-white transition"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? 'Restore View' : 'Maximize Fullscreen'}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg hover:bg-white/15 hover:text-white transition"
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={closePosSale}
              title="Close Form (Return to Dashboard)"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg hover:bg-rose-600 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. FIXED TOP SECTION (BARCODE SCANNER, ACTIONS & INVOICE META - NEVER SCROLLS) */}
        <div className="shrink-0 space-y-2 p-2.5 sm:p-3 pb-1 bg-[#F8FAFC]">
          {/* Omni Barcode Scanner & Hotkeys Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white p-2 shadow-xs">
            {/* Omni Barcode Scanner Bar */}
            <form onSubmit={handleBarcodeSubmit} className="flex flex-1 items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  placeholder="Scan Barcode / SKU / Item Name (Press F2 to focus)..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-1 pl-9 pr-3 text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 active:scale-95 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Scan/Add</span>
              </button>
            </form>

            {/* 7 Fast Action Buttons Row (Executive Palette - Bold Text) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 1. Add Row */}
              <button
                type="button"
                onClick={addEmptyRow}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-blue-500 hover:to-indigo-500 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Row</span>
              </button>

              {/* 2. Recall (F7) */}
              <button
                type="button"
                onClick={() => void openRecallModal()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-indigo-500 hover:to-purple-500 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Recall (F7)</span>
              </button>

              {/* 3. Hold Sale (F6) */}
              <button
                type="button"
                onClick={() => void handleHoldSale()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-amber-400 hover:to-orange-400 active:scale-95"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Hold Sale (F6)</span>
              </button>

              {/* 4. Save & Checkout (Ctrl+S) - Executive Emerald */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:from-emerald-500 hover:to-teal-500 active:scale-95"
              >
                <Save className="h-3.5 w-3.5 text-emerald-200" />
                <span>Save (Ctrl+S)</span>
              </button>

              {/* 5. Delete Row */}
              <button
                type="button"
                onClick={() => {
                  const filled = rows.filter((r) => r.itemCode || r.description || r.qty > 0);
                  if (filled.length > 0) {
                    removeRow(filled[filled.length - 1].id);
                  } else if (rows.length > DEFAULT_ROW_COUNT) {
                    removeRow(rows[rows.length - 1].id);
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95"
                title="Delete last row"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              {/* 6. Clear Sale */}
              <button
                type="button"
                onClick={clearAllRows}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>

              {/* 7. Print */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#091529] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-900 active:scale-95"
              >
                <Printer className="h-3.5 w-3.5 text-slate-300" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Invoice Metadata Header Card (Clean Labels - font-normal, Values font-medium / bold where appropriate) */}
          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs lg:grid-cols-12">
            {/* Left Column (6 cols): Invoice No / Date / Location */}
            <div className="space-y-1.5 lg:col-span-6">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-normal text-slate-600">Invoice No</span>
                <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 px-2.5 py-0.5 tabular-nums text-xs font-bold text-emerald-950 shadow-2xs">
                  {generatedInvoiceNo}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-normal text-slate-600">Date</span>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                  {formatDisplayDate(getLocalIsoDate())}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-normal text-slate-600">Location</span>
                <div className="flex flex-1 items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <select
                    value={branchId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setBranchId(id);
                      setActiveBranchId(id);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column (6 cols): Customer / Address */}
            <div className="space-y-1.5 lg:col-span-6">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-normal text-slate-600">Customer</span>
                <div className="flex flex-1 items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <select
                    value={selectedCustomerId ?? ''}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs hover:bg-emerald-100"
                  >
                    <UserPlus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-normal text-slate-600">Address</span>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Customer Address / Contact..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Message Banner if active */}
          {message && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-medium shadow-2xs ${
                message.type === 'error'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} className="cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 3. SCROLLABLE MIDDLE SECTION - ONLY THIS TABLE GRID SCROLLS! (YELLOW HIGHLIGHTED AREA) */}
        <div className="flex-1 min-h-0 px-2.5 sm:px-3 py-1">
          <div className="relative h-full overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-xs [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-xs">
              {/* Sticky Table Header - BOLD UPPERCASE */}
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[11px] font-bold uppercase tracking-wider text-slate-100">
                  <th className="w-9 px-2 py-2 text-center border-b-2 border-emerald-500 border-r border-white/10 bg-[#091529]">#</th>
                  <th className="w-36 px-2 py-2 border-b-2 border-emerald-500 border-r border-white/10 bg-[#0a182e]">ITEM CODE</th>
                  <th className="w-28 px-2 py-2 border-b-2 border-emerald-500 border-r border-white/10 bg-[#0c1c36]">HS CODE</th>
                  <th className="min-w-[220px] px-2 py-2 border-b-2 border-emerald-500 border-r border-white/10 bg-[#0e1f3d]">DESCRIPTION</th>
                  <th className="w-20 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#0f2243]">PIECES</th>
                  <th className="w-20 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#10254a]">QTY</th>
                  <th className="w-16 px-1.5 py-2 text-center border-b-2 border-emerald-500 border-r border-white/10 bg-[#11264c]">UNIT</th>
                  <th className="w-24 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#12274e]">RATE</th>
                  <th className="w-28 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#132952]">VAL EXCL. TAX</th>
                  <th className="w-16 px-1.5 py-2 text-center border-b-2 border-emerald-500 border-r border-white/10 bg-[#132952]">S.T %</th>
                  <th className="w-24 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#132952]">S.T AMT</th>
                  <th className="w-28 px-2 py-2 text-right border-b-2 border-emerald-500 border-r border-white/10 bg-[#132952]">VAL INCL. TAX</th>
                  <th className="w-10 px-1 py-2 text-center border-b-2 border-emerald-500 bg-[#132952]">
                    <Trash2 className="mx-auto h-3 w-3 opacity-70" />
                  </th>
                </tr>
              </thead>

              {/* Scrollable Table Rows (Only this area swipes/scrolls! Clean regular font-normal, calculated outputs bold) */}
              <tbody className="divide-y divide-slate-200/80">
                {calculatedRows.map((r, idx) => {
                  const isFilled = r.isFilled;
                  return (
                    <tr
                      key={r.id}
                      className={`transition hover:bg-emerald-50/30 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* # (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-1 text-center font-normal text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>

                      {/* ITEM CODE with Autocomplete Dropdown (Regular font-normal) */}
                      <td className="relative border-b border-r border-slate-200/80 px-1.5 py-0.5">
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

                            const exact = products.find(
                              (p) =>
                                p.barcode.toLowerCase() === val.trim().toLowerCase() ||
                                p.sku.toLowerCase() === val.trim().toLowerCase()
                            );
                            if (exact) {
                              selectProductIntoRow(r.id, exact);
                            }
                          }}
                          placeholder=""
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-normal text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />

                        {/* Interactive Autocomplete Dropdown */}
                        {activeSearchRowId === r.id && autocompleteProducts.length > 0 && (
                          <div
                            ref={searchDropdownRef}
                            className="absolute left-1.5 top-8 z-50 max-h-56 w-88 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
                          >
                            {autocompleteProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => selectProductIntoRow(r.id, p)}
                                className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-emerald-50 transition"
                              >
                                <div>
                                  <span className="font-semibold text-emerald-700">{p.sku}</span>
                                  <span className="ml-2 font-normal text-slate-800">{p.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-slate-900 tabular-nums">
                                    {formatCurrency(p.sale_price, settings.currency_symbol)}
                                  </span>
                                  <span className="block text-[10px] text-emerald-600 font-normal">
                                    Stock: {p.stock_qty ?? 0} {p.unit || 'Pcs'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* HS CODE (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5">
                        <input
                          type="text"
                          value={r.hsCode}
                          onChange={(e) => updateRow(r.id, { hsCode: e.target.value })}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-normal text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* DESCRIPTION (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5">
                        <input
                          type="text"
                          value={r.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateRow(r.id, { description: val });
                            setRowSearchQuery(val);
                            setActiveSearchRowId(r.id);
                          }}
                          placeholder=""
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* PIECES (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5">
                        <input
                          type="number"
                          min={0}
                          value={r.pieces === 0 ? '' : r.pieces}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { pieces: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs font-normal text-slate-700 tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                        />
                      </td>

                      {/* QTY (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5">
                        <input
                          type="number"
                          min={0}
                          value={r.qty === 0 ? '' : r.qty}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs font-normal text-slate-700 tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                        />
                      </td>

                      {/* UNIT (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5 text-center">
                        <input
                          type="text"
                          value={r.unit}
                          onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                          className="w-14 rounded-md border border-slate-200 bg-white py-0.5 text-center text-xs font-normal text-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>

                      {/* RATE (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-0.5">
                        <input
                          type="number"
                          min={0}
                          value={r.rate === 0 ? '' : r.rate}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { rate: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs font-normal text-slate-700 tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                        />
                      </td>

                      {/* VAL EXCL. TAX (BOLD as in Screenshot!) */}
                      <td className="border-b border-r border-slate-200/80 px-2 py-1 text-right tabular-nums text-xs font-bold text-slate-900">
                        {r.valExclTax.toFixed(2)}
                      </td>

                      {/* S.T % (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-1.5 py-1 text-center tabular-nums text-xs font-normal text-slate-600">
                        {r.taxRate.toFixed(2)}
                      </td>

                      {/* S.T AMT (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/80 px-2 py-1 text-right tabular-nums text-xs font-normal text-slate-800">
                        {r.taxAmt.toFixed(2)}
                      </td>

                      {/* VAL INCL. TAX (BOLD AMBER as in Screenshot!) */}
                      <td className="border-b border-r border-slate-200/80 px-2 py-1 text-right tabular-nums text-xs font-bold text-amber-700">
                        {r.valInclTax.toFixed(2)}
                      </td>

                      {/* Action Delete */}
                      <td className="border-b px-1 py-1 text-center border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete row"
                        >
                          <Trash2 className="mx-auto h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Sticky Table Totals Footer (BOLD TOTALS - PINNED AT BOTTOM OF TABLE) */}
              <tfoot className="sticky bottom-0 z-20 shadow-xs">
                <tr className="bg-slate-100/98 text-slate-900 text-xs">
                  <td colSpan={4} className="border-t-2 border-r border-slate-300 px-4 py-2 text-right uppercase tracking-wider text-slate-800 font-bold bg-slate-100">
                    Totals:
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2 py-2 text-right tabular-nums text-xs font-bold text-slate-900 bg-slate-100">
                    {totals.pieces === 0 ? '0' : totals.pieces.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2 py-2 text-right tabular-nums text-xs font-bold text-slate-900 bg-slate-100">
                    {totals.qty === 0 ? '0' : totals.qty.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-1 py-2 text-center text-xs text-slate-400 font-normal bg-slate-100">-</td>
                  <td className="border-t-2 border-r border-slate-300 px-1 py-2 text-center text-xs text-slate-400 font-normal bg-slate-100">-</td>
                  <td className="border-t-2 border-r border-slate-300 px-2.5 py-2 text-right tabular-nums text-xs font-bold text-slate-950 bg-slate-100">
                    {totals.subtotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-1 py-2 text-center text-xs text-slate-400 font-normal bg-slate-100">-</td>
                  <td className="border-t-2 border-r border-slate-300 px-2.5 py-2 text-right tabular-nums text-xs font-bold text-amber-700 bg-slate-100">
                    {totals.taxTotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2.5 py-2 text-right tabular-nums text-xs font-bold text-amber-700 bg-slate-100">
                    {totals.grandTotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-slate-300 px-1 py-2 bg-slate-100" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 4. FIXED BOTTOM SECTION: CASHIER ACTIONS & FINANCIAL TOTALS (NEVER SCROLLS) */}
        <div className="shrink-0 px-2.5 sm:px-3 pt-1.5 pb-2.5 sm:pb-3 bg-[#F8FAFC]">
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
            {/* Left: Cashier Actions Box (8 Cols) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs lg:col-span-8">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#091529] uppercase">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Cashier Actions</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                    <span className="text-emerald-700 font-semibold">Ready for Sale</span>
                  </span>
                </div>

                {/* 4 Big Action Cards (Title Bold, Subtitle Regular) */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* 1: Hold Sale (F6) */}
                  <button
                    type="button"
                    onClick={() => void handleHoldSale()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-center shadow-xs transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm active:scale-95"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
                      <PauseCircle className="h-4.5 w-4.5" />
                    </div>
                    <span className="mt-1.5 text-xs font-bold text-amber-950">Hold Sale</span>
                    <span className="text-[10px] font-normal text-amber-700">F6</span>
                  </button>

                  {/* 2: Recall Sale (F7) */}
                  <button
                    type="button"
                    onClick={() => void openRecallModal()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 text-center shadow-xs transition hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-sm active:scale-95"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                      <RotateCcw className="h-4.5 w-4.5" />
                    </div>
                    <span className="mt-1.5 text-xs font-bold text-indigo-950">Recall Sale</span>
                    <span className="text-[10px] font-normal text-indigo-700">F7</span>
                  </button>

                  {/* 3: Post to FBR (Executive Midnight Navy) */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowPaymentModal(true)}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-900 bg-gradient-to-br from-[#091529] via-[#0e1f3d] to-[#132952] p-2.5 text-center text-white shadow-xs transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-sm active:scale-95"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xs">
                      <CloudUpload className="h-4.5 w-4.5" />
                    </div>
                    <span className="mt-1.5 text-xs font-bold text-white">Post to FBR</span>
                    <span className="text-[10px] font-normal text-emerald-300">FBR Submit</span>
                  </button>

                  {/* 4: Clear Sale (Esc) */}
                  <button
                    type="button"
                    onClick={clearAllRows}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-center shadow-xs transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm active:scale-95"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                      <Trash2 className="h-4.5 w-4.5" />
                    </div>
                    <span className="mt-1.5 text-xs font-bold text-rose-950">Clear Sale</span>
                    <span className="text-[10px] font-normal text-rose-700">Esc</span>
                  </button>
                </div>
              </div>

              {/* Footer FBR Disclaimer (Regular font-normal) */}
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500 font-normal">
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span>
                  Saved sales are stored locally in ERP database and can be edited or deleted until submitted to <strong className="font-semibold text-slate-700">FBR</strong>.
                </span>
              </div>
            </div>

            {/* Right: Financial Totals Box (4 Cols - Labels Regular, Outputs Medium/Bold) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs lg:col-span-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-normal text-slate-600">Gross Amount</span>
                  <span className="tabular-nums font-semibold text-slate-900">
                    {totals.subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-normal text-slate-600">Discount Amount</span>
                  <input
                    type="number"
                    min={0}
                    value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                    placeholder="0.00"
                    onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-right tabular-nums text-xs font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-normal text-slate-600">Total After Discount</span>
                  <span className="tabular-nums font-semibold text-slate-900">
                    {totals.totalAfterDiscount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-normal text-slate-600">Sales Tax Amount</span>
                  <span className="tabular-nums font-semibold text-amber-600">
                    {totals.taxTotal.toFixed(2)}
                  </span>
                </div>

                <div className="border-t-2 border-slate-200 pt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">Net Total</span>
                    <span className="tabular-nums text-2xl font-bold text-emerald-700">
                      {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete & Pay Button (Bold) */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 py-2.5 text-center text-xs font-bold tracking-wide text-white shadow-md transition hover:from-emerald-500 hover:to-teal-500 active:scale-98 uppercase"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Checkout &amp; Print Bill (Ctrl+S / F12)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. PAYMENT CHECKOUT MODAL */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Complete POS Payment</h3>
                  <p className="text-xs text-slate-500 font-normal">Bill No: {generatedInvoiceNo}</p>
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
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center">
                  <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Payable Net Total</span>
                  <div className="tabular-nums text-3xl font-bold text-emerald-950">
                    {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Payment Mode</label>
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
                        className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition ${
                          paymentMode === mode
                            ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
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
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block font-medium text-slate-600">Cash Received</label>
                        <input
                          type="number"
                          min={0}
                          placeholder={String(totals.grandTotal)}
                          value={tenderedAmount}
                          onChange={(e) => setTenderedAmount(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 tabular-nums text-sm font-normal focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-medium text-slate-600">Change Due</label>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 tabular-nums text-sm font-bold text-emerald-800">
                          {formatCurrency(changeDue, settings.currency_symbol)}
                        </div>
                      </div>
                    </div>

                    {/* Quick Cash Denomination Buttons */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[totals.grandTotal, 500, 1000, 2000, 5000].map((amt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTenderedAmount(String(amt))}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 tabular-nums text-[11px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition"
                        >
                          {idx === 0 ? 'Exact' : `Rs. ${amt}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'SPLIT' && (
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">Cash</label>
                      <input
                        type="number"
                        min={0}
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">Card</label>
                      <input
                        type="number"
                        min={0}
                        value={splitCard}
                        onChange={(e) => setSplitCard(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-600">Bank</label>
                      <input
                        type="number"
                        min={0}
                        value={splitBank}
                        onChange={(e) => setSplitBank(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Optional invoice notes / remark..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-normal focus:border-emerald-500 focus:outline-none"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSaveAndSubmitSale()}
                    className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-sans">
            <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Recall Parked Bills (F7)</h3>
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
                  <p className="py-8 text-center text-xs text-slate-500 font-normal">Loading parked bills...</p>
                ) : heldCartsList.length === 0 ? (
                  <p className="py-8 text-center text-xs font-normal text-slate-400">
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
                            <span className="text-xs font-bold text-indigo-700">
                              Parked #{c.id}
                            </span>
                            <span className="text-xs font-medium text-slate-800">{c.customer_name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal">
                            {c.item_count} items • {c.created_at}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-sm font-bold text-slate-900">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-sans">
            <form
              onSubmit={handleCreateCustomer}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
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
                  <label className="mb-1 block font-medium text-slate-700">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-normal focus:border-emerald-500"
                    placeholder="e.g. Walk-in Customer / Business Name"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-normal focus:border-emerald-500"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-700">CNIC / NTN</label>
                  <input
                    type="text"
                    value={newCustCnic}
                    onChange={(e) => setNewCustCnic(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-normal focus:border-emerald-500"
                    placeholder="15302-..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(false)}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500"
                  >
                    Save &amp; Select
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* 8. INVOICE PRINT MODAL */}
        <InvoiceModal
          invoiceId={completedInvoiceId}
          onClose={() => setCompletedInvoiceId(null)}
          onSynced={() => void loadCatalog()}
        />
      </div>
    </div>
  );
}
