'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  Receipt,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
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
  hsCode: '',
  description: '',
  pieces: 0,
  qty: 0,
  unit: '',
  rate: 0,
  taxRate: 18,
  discountAmount: 0,
});

export function PosSaleModal() {
  const {
    branches,
    terminals,
    activeBranchId,
    activeTerminalId,
    activeUser,
    settings,
    setActiveBranchId,
    refreshHeldCount,
    refreshNonce,
    closePosSale,
    openCustomerModal,
    selectedCustomerId: contextCustomerId,
    customerRefreshNonce,
    inventoryRefreshNonce,
    selectedProductIdForPos,
    setSelectedProductIdForPos,
    recalledCartForPos,
    setRecalledCartForPos,
  } = usePosContext();

  const router = useRouter();
  const pathname = usePathname();

  const handleClose = useCallback(() => {
    closePosSale();
    if (
      pathname === '/sale' ||
      (typeof window !== 'undefined' &&
        (window.location.pathname === '/sale' || window.location.pathname.endsWith('/sale')))
    ) {
      router.push('/');
    }
  }, [closePosSale, pathname, router]);

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
  }, [loadCatalog, refreshNonce, customerRefreshNonce, inventoryRefreshNonce]);

  useEffect(() => {
    if (selectedProductIdForPos && products.length > 0) {
      const prod = products.find((p) => p.id === selectedProductIdForPos);
      if (prod) {
        setRows((prev) => {
          const emptyIdx = prev.findIndex((r) => !r.productId && !r.itemCode.trim());
          const targetIdx = emptyIdx >= 0 ? emptyIdx : prev.length;
          const next = [...prev];
          const newRow: RowItem = {
            id: next[targetIdx]?.id || crypto.randomUUID(),
            productId: prod.id,
            itemCode: prod.sku,
            hsCode: prod.hs_code || '3917.2390',
            description: prod.name,
            pieces: 1,
            qty: 1,
            unit: prod.unit,
            rate: prod.sale_price,
            discountAmount: 0,
            taxRate: prod.tax_rate ?? 18,
          };
          if (targetIdx < next.length) {
            next[targetIdx] = newRow;
          } else {
            next.push(newRow);
          }
          return next;
        });
        setSelectedProductIdForPos(null);
      }
    }
  }, [selectedProductIdForPos, products, setSelectedProductIdForPos]);

  useEffect(() => {
    if (!recalledCartForPos) return;
    try {
      const items =
        (JSON.parse(recalledCartForPos.items_json) as Array<{
          productId?: number;
          product_id?: number;
          sku?: string;
          name?: string;
          itemName?: string;
          unitPrice?: number;
          unit_price?: number;
          quantity?: number;
          discountAmount?: number;
          discount_amount?: number;
          taxRate?: number;
          tax_rate?: number;
        }>) || [];

      if (items.length > 0) {
        const newRows: RowItem[] = items.map((it) => {
          const pid = it.productId ?? it.product_id ?? 0;
          const matched = products.find((p) => p.id === pid || (it.sku && p.sku === it.sku));
          const qty = it.quantity ?? 1;
          const rate = it.unitPrice ?? it.unit_price ?? matched?.sale_price ?? 0;
          return {
            id: Math.random().toString(36).slice(2, 9),
            productId: pid,
            itemCode: it.sku || matched?.sku || '',
            hsCode: matched?.hs_code || '3917.2390',
            description: it.name || it.itemName || matched?.name || '',
            pieces: qty,
            qty: qty,
            unit: matched?.unit || 'Pcs',
            rate: rate,
            taxRate: it.taxRate ?? it.tax_rate ?? matched?.tax_rate ?? 18,
            discountAmount: it.discountAmount ?? it.discount_amount ?? 0,
          };
        });

        while (newRows.length < DEFAULT_ROW_COUNT) {
          newRows.push(createEmptyRow());
        }

        setRows(newRows);
        setInvoiceDiscount(recalledCartForPos.discount_total || 0);
        setNotes(recalledCartForPos.notes || '');
        setHeldCartId(recalledCartForPos.id);
        if (recalledCartForPos.customer_id) {
          setSelectedCustomerId(recalledCartForPos.customer_id);
        }
        setMessage({
          type: 'success',
          text: `Parked bill ${recalledCartForPos.hold_code} loaded into POS Sale.`,
        });
      }
    } catch {
      // ignore JSON parse errors
    } finally {
      setRecalledCartForPos(null);
    }
  }, [recalledCartForPos, products, setRecalledCartForPos]);

  useEffect(() => {
    if (contextCustomerId) {
      setSelectedCustomerId(contextCustomerId);
    }
  }, [contextCustomerId]);

  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) {
        setCustomerAddress(c.address || c.phone || c.name || 'Haripur');
      }
    }
  }, [selectedCustomerId, customers]);

  // Active branch & terminal sequence
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const activeTerminal =
    (activeTerminalId ? terminals.find((t) => t.id === activeTerminalId) : null) ??
    terminals.find((t) => t.branch_id === branchId) ??
    terminals[0];

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
      hsCode: (p as unknown as { hs_code?: string; hsCode?: string }).hs_code || (p as unknown as { hs_code?: string; hsCode?: string }).hsCode || '3917.2390',
      description: p.name,
      unit: p.unit || '',
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
          const newRows: RowItem[] = c.items.map((it) => {
            const matched = products.find((p) => p.id === it.product_id || p.sku === it.sku);
            return {
              id: Math.random().toString(36).slice(2, 9),
              productId: it.product_id,
              itemCode: it.sku,
              hsCode:
                (matched as unknown as { hs_code?: string; hsCode?: string })?.hs_code ||
                '3917.2390',
              description: it.name,
              pieces: it.quantity,
              qty: it.quantity,
              unit: matched?.unit || '',
              rate: it.unit_price,
              taxRate: it.tax_rate ?? 18,
              discountAmount: it.discount_amount ?? 0,
            };
          });

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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
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
        else handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaymentModal, showRecallModal, showNewCustomer, calculatedRows, handleClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-slate-950/65 backdrop-blur-xs transition-all font-sans overflow-y-auto">
      {/* =========================================================================
          FLOATING WINDOW CONTAINER — SIGNATURE STYLE 2 (EXECUTIVE MIDNIGHT NAVY + CRISP WHITE ERP)
      ========================================================================== */}
      <div
        className={`flex w-full flex-col rounded-2xl bg-white shadow-2xl border border-slate-300 transition-all duration-200 overflow-hidden ${
          isMaximized
            ? 'fixed inset-1.5 z-50 h-[calc(100vh-12px)] max-h-none'
            : 'w-[98vw] max-w-[1360px] h-[92vh] max-h-[920px] my-auto'
        }`}
      >
        {/* =========================================================================
            1. Title Bar (Executive Midnight Navy — Image 2/4 Standard)
        ========================================================================== */}
        <div className="shrink-0 flex select-none items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white shadow-2xs">
          {/* Left: Window Icon + Title + Live Status Badge + Subtitle */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                  POS Sale &amp; Billing Terminal
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Billing Engine
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Express Invoicing • FBR Certified POS Terminal • 80mm Thermal Receipt Ready
              </span>
            </div>
          </div>

          {/* Right: Window Controls & Active Branch / Terminal Badge */}
          <div className="flex items-center gap-1.5">
            <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
              <Store className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-white">
                {activeBranch?.code || 'HRP'} • {activeTerminal?.terminal_code || 'POS-01'}
              </span>
            </div>

            {/* Minimize */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Form to Bottom Tab"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? 'Restore Window' : 'Maximize Window'}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
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
              onClick={handleClose}
              title="Close Form (Return to Dashboard)"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. Top Executive POS KPI Cards Ribbon (Matching Image 4 Standard)
        ========================================================================== */}
        <div className="shrink-0 grid grid-cols-2 gap-2 border-b border-slate-200 bg-white p-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {/* Card 1: Current Invoice & Date */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Current Invoice
              </span>
              <Receipt className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="my-0.5 text-base font-black text-slate-900 tabular-nums">
              {generatedInvoiceNo}
            </div>
            <span className="text-[9.5px] font-medium text-slate-500">
              Date: {formatDisplayDate(getLocalIsoDate())}
            </span>
          </div>

          {/* Card 2: Operating Branch */}
          <div className="flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/50 p-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Operating Branch
              </span>
              <Store className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <select
              value={branchId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setBranchId(id);
                setActiveBranchId(id);
              }}
              className="my-0.5 w-full rounded-lg border border-sky-300 bg-white px-2 py-0.5 text-xs font-bold text-sky-950 shadow-2xs focus:border-sky-600 focus:outline-hidden"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
            <span className="text-[9.5px] font-medium text-sky-700">
              Counter: {activeTerminal?.terminal_code || 'POS-01'}
            </span>
          </div>

          {/* Card 3: Customer Account & Address */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Customer Account
              </span>
              <User className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="my-0.5 flex items-center gap-1">
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openCustomerModal}
                title="Open Customers Directory"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-2xs transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-[9.5px] font-medium text-emerald-700 truncate">
              Address: {customerAddress || 'Haripur'}
            </span>
          </div>

          {/* Card 4: FBR Fiscal Status */}
          <div className="flex flex-col justify-between rounded-xl border border-teal-200 bg-teal-50/50 p-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                Fiscal Certification
              </span>
              <CloudUpload className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <div className="my-0.5 text-sm font-black text-teal-950 truncate">
              {activeTerminal?.fbr_pos_id ? `POS-${activeTerminal.fbr_pos_id}` : 'FBR Verified'}
            </div>
            <span className="text-[9.5px] font-medium text-teal-700">
              Real-Time Fiscal Synchronization
            </span>
          </div>

          {/* Card 5: Active Basket Summary */}
          <div className="flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Active Basket
              </span>
              <Zap className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="my-0.5 text-base font-black text-amber-950 tabular-nums">
              {totals.qty} Qty • {totals.pieces} Pcs
            </div>
            <span className="text-[9.5px] font-medium text-amber-800">
              {calculatedRows.filter((r) => r.isFilled).length} Items in Current Cart
            </span>
          </div>
        </div>

        {/* =========================================================================
            3. Dedicated Scope & Fast Action Bar (Omni Scanner + Unified Action Buttons)
        ========================================================================== */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 sm:px-4 py-2 shadow-2xs">
          {/* Left: Barcode / SKU Scanner Form */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
            <div className="relative">
              <Barcode className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Scan Barcode / SKU (F2)..."
                className="h-7.5 w-52 sm:w-60 rounded-lg border border-slate-300 bg-white py-0 pl-8 pr-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-3 text-xs font-bold text-white shadow-2xs transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Scan</span>
            </button>
          </form>

          {/* Right: Unified Action Buttons Group (Style 2 Standard) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. Add Row */}
            <button
              type="button"
              onClick={addEmptyRow}
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-700 px-3 text-xs font-bold text-white shadow-2xs transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </button>

            {/* 2. Recall (F7) */}
            <button
              type="button"
              onClick={() => void openRecallModal()}
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 px-3 text-xs font-bold shadow-2xs transition active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
              <span>Recall (F7)</span>
            </button>

            {/* 3. Hold Sale (F6) */}
            <button
              type="button"
              onClick={() => void handleHoldSale()}
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 px-3 text-xs font-bold shadow-2xs transition active:scale-95"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Hold (F6)</span>
            </button>

            {/* 4. Delete Row */}
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
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-800 px-2.5 text-xs font-bold shadow-2xs transition active:scale-95"
              title="Delete last row"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Delete</span>
            </button>

            {/* 5. Clear Sale */}
            <button
              type="button"
              onClick={clearAllRows}
              className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 text-xs font-bold shadow-2xs transition active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Clear</span>
            </button>

            {/* 6. Checkout & Pay */}
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-3.5 text-xs font-bold text-white shadow-2xs transition active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Checkout (Ctrl+S)</span>
            </button>
          </div>
        </div>

        {/* Message Banner if active */}
        {message && (
          <div
            className={`mx-3 mt-1.5 flex shrink-0 items-center justify-between rounded-xl border p-2 text-xs font-semibold shadow-2xs ${
              message.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'error' ? (
                <Trash2 className="h-4 w-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            4. TABLE SECTION (Light Gray Executive Header — Image 4 Standard)
        ========================================================================== */}
        <div className="mx-3 my-1.5 flex-1 min-h-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
            <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-left text-xs">
              {/* Sticky Table Header — Light Slate Executive Style Matching Image 4 */}
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-slate-100 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-700">
                  <th className="w-8 px-1 py-1.5 text-center border-b border-r border-slate-200 bg-slate-100">#</th>
                  <th className="w-32 px-2 py-1.5 text-left border-b border-r border-slate-200 bg-slate-100">ITEM CODE</th>
                  <th className="w-24 px-2 py-1.5 text-left border-b border-r border-slate-200 bg-slate-100">HS CODE</th>
                  <th className="min-w-[220px] px-2 py-1.5 text-left border-b border-r border-slate-200 bg-slate-100">DESCRIPTION</th>
                  <th className="w-20 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">PIECES</th>
                  <th className="w-20 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">QTY</th>
                  <th className="w-16 px-1 py-1.5 text-center border-b border-r border-slate-200 bg-slate-100">UNIT</th>
                  <th className="w-24 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">RATE</th>
                  <th className="w-28 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">VAL EXCL. TAX</th>
                  <th className="w-16 px-1 py-1.5 text-center border-b border-r border-slate-200 bg-slate-100">S.T %</th>
                  <th className="w-24 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">S.T AMT</th>
                  <th className="w-28 px-2 py-1.5 text-right border-b border-r border-slate-200 bg-slate-100">VAL INCL. TAX</th>
                  <th className="w-10 px-1 py-1.5 text-center border-b border-slate-200 bg-slate-100">
                    <Trash2 className="mx-auto h-3 w-3 text-slate-400" />
                  </th>
                </tr>
              </thead>

              {/* Scrollable Table Rows (Alternating White & Slate-50) */}
              <tbody className="divide-y divide-slate-200">
                {calculatedRows.map((r, idx) => {
                  return (
                    <tr
                      key={r.id}
                      className={`h-6 transition-colors hover:bg-sky-50/60 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* # (Regular font-normal) */}
                      <td className="border-b border-r border-slate-200/90 px-1 py-0 text-center font-normal text-slate-500 tabular-nums text-[10.5px]">
                        {idx + 1}
                      </td>

                      {/* ITEM CODE with Autocomplete Dropdown (Seamless Table Cell) */}
                      <td className="relative border-b border-r border-slate-200/90 p-0">
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
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-[11px] font-semibold text-slate-800 outline-none ring-0 focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 transition-colors"
                        />

                        {/* Interactive Autocomplete Dropdown */}
                        {activeSearchRowId === r.id && autocompleteProducts.length > 0 && (
                          <div
                            ref={searchDropdownRef}
                            className="absolute left-0 top-6.5 z-50 max-h-52 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
                          >
                            {autocompleteProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => selectProductIntoRow(r.id, p)}
                                className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-emerald-50 transition"
                              >
                                <div>
                                  <span className="font-bold text-emerald-700">{p.sku}</span>
                                  <span className="ml-2 font-medium text-slate-800">{p.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(p.sale_price, settings.currency_symbol)}
                                  </span>
                                  <span className="block text-[10px] text-emerald-600 font-medium">
                                    Stock: {p.stock_qty ?? 0} {p.unit || ''}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* HS CODE (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0">
                        <input
                          type="text"
                          value={r.hsCode}
                          onChange={(e) => updateRow(r.id, { hsCode: e.target.value })}
                          placeholder=""
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-[11px] font-medium text-slate-600 outline-none ring-0 focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 transition-colors"
                        />
                      </td>

                      {/* DESCRIPTION (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0">
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
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-[11px] font-bold text-slate-900 outline-none ring-0 focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 transition-colors"
                        />
                      </td>

                      {/* PIECES (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0">
                        <input
                          type="number"
                          min={0}
                          value={r.pieces === 0 ? '' : r.pieces}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { pieces: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-right text-[11px] font-medium text-slate-800 tabular-nums outline-none ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 placeholder:text-slate-400 transition-colors"
                        />
                      </td>

                      {/* QTY (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0">
                        <input
                          type="number"
                          min={0}
                          value={r.qty === 0 ? '' : r.qty}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-right text-[11px] font-bold text-slate-900 tabular-nums outline-none ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 placeholder:text-slate-400 transition-colors"
                        />
                      </td>

                      {/* UNIT (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0 text-center">
                        <input
                          type="text"
                          value={r.unit}
                          onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                          placeholder=""
                          className="h-6 w-full border-0 bg-transparent px-1 py-0 text-center text-[11px] font-bold text-slate-800 outline-none ring-0 focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 transition-colors"
                        />
                      </td>

                      {/* RATE (Seamless Table Cell) */}
                      <td className="border-b border-r border-slate-200/90 p-0">
                        <input
                          type="number"
                          min={0}
                          value={r.rate === 0 ? '' : r.rate}
                          placeholder="0.00"
                          onChange={(e) =>
                            updateRow(r.id, { rate: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="h-6 w-full border-0 bg-transparent px-2 py-0 text-right text-[11px] font-bold text-slate-900 tabular-nums outline-none ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-sky-100/70 focus:ring-1 focus:ring-inset focus:ring-sky-500 placeholder:text-slate-400 transition-colors"
                        />
                      </td>

                      {/* VAL EXCL. TAX */}
                      <td className="border-b border-r border-slate-200/90 px-2 py-0 text-right tabular-nums text-[11px] font-bold text-slate-900">
                        {r.valExclTax.toFixed(2)}
                      </td>

                      {/* S.T % */}
                      <td className="border-b border-r border-slate-200/90 px-1 py-0 text-center tabular-nums text-[11px] font-semibold text-slate-600">
                        {r.taxRate.toFixed(2)}
                      </td>

                      {/* S.T AMT */}
                      <td className="border-b border-r border-slate-200/90 px-2 py-0 text-right tabular-nums text-[11px] font-bold text-slate-800">
                        {r.taxAmt.toFixed(2)}
                      </td>

                      {/* VAL INCL. TAX */}
                      <td className="border-b border-r border-slate-200/90 px-2 py-0 text-right tabular-nums text-[11px] font-black text-amber-700">
                        {r.valInclTax.toFixed(2)}
                      </td>

                      {/* Action Delete */}
                      <td className="border-b border-slate-200/90 p-0 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="flex h-5 w-5 mx-auto items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 hover:text-rose-700 active:scale-90 cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="mx-auto h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Sticky Table Totals Footer (Light Slate Bar Matching Image 4) */}
              <tfoot className="sticky bottom-0 z-20 shadow-xs">
                <tr className="bg-slate-100 text-slate-900 text-[11px] font-black h-7">
                  <td colSpan={4} className="border-t-2 border-r border-slate-300 px-2 py-1 text-right uppercase tracking-wider text-slate-800 bg-slate-100">
                    Totals:
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2 py-1 text-right tabular-nums text-slate-900 bg-slate-100">
                    {totals.pieces === 0 ? '0' : totals.pieces.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2 py-1 text-right tabular-nums text-slate-900 bg-slate-100">
                    {totals.qty === 0 ? '0' : totals.qty.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-1 py-1 text-center text-slate-400 bg-slate-100" />
                  <td className="border-t-2 border-r border-slate-300 px-1 py-1 text-center text-slate-400 bg-slate-100" />
                  <td className="border-t-2 border-r border-slate-300 px-2 py-1 text-right tabular-nums text-slate-950 font-black bg-slate-100">
                    {totals.subtotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-1 py-1 text-center text-slate-400 bg-slate-100" />
                  <td className="border-t-2 border-r border-slate-300 px-2 py-1 text-right tabular-nums text-amber-700 font-bold bg-slate-100">
                    {totals.taxTotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-r border-slate-300 px-2 py-1 text-right tabular-nums text-emerald-800 font-black bg-slate-100">
                    {totals.grandTotal.toFixed(2)}
                  </td>
                  <td className="border-t-2 border-slate-300 px-1 py-1 bg-slate-100" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            5. FIXED BOTTOM SECTION: CASHIER ACTIONS & FINANCIAL TOTALS (STYLE 2 SYMMETRY)
        ========================================================================== */}
        <div className="shrink-0 px-3 pb-2 pt-0.5 bg-white">
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
            {/* Left: Cashier Actions Box (8 Cols - Style 2 Unified Pastel Cards) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 shadow-2xs lg:col-span-8">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-slate-800 uppercase">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Cashier Quick Actions</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
                    <span className="text-emerald-700">Status: Ready for Sale</span>
                  </span>
                </div>

                {/* 4 Unified Action Cards (Clean Executive Pastel Aesthetic) */}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* 1: Hold Sale (F6) */}
                  <button
                    type="button"
                    onClick={() => void handleHoldSale()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-left shadow-2xs transition hover:bg-amber-100/80 active:scale-95"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
                      <PauseCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-amber-950">Hold Sale</span>
                      <span className="text-[9.5px] font-semibold text-amber-700">F6 - Park</span>
                    </div>
                  </button>

                  {/* 2: Recall Sale (F7) */}
                  <button
                    type="button"
                    onClick={() => void openRecallModal()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2 text-left shadow-2xs transition hover:bg-indigo-100/80 active:scale-95"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-indigo-950">Recall Sale</span>
                      <span className="text-[9.5px] font-semibold text-indigo-700">F7 - Load</span>
                    </div>
                  </button>

                  {/* 3: Post to FBR (Clean Sky Blue Executive Card) */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowPaymentModal(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-2 text-left shadow-2xs transition hover:bg-sky-100/80 active:scale-95"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs">
                      <CloudUpload className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-sky-950">Post to FBR</span>
                      <span className="text-[9.5px] font-semibold text-sky-700">FBR Submit</span>
                    </div>
                  </button>

                  {/* 4: Clear Sale (Esc) */}
                  <button
                    type="button"
                    onClick={clearAllRows}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-2 text-left shadow-2xs transition hover:bg-rose-100/80 active:scale-95"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-rose-950">Clear Sale</span>
                      <span className="text-[9.5px] font-semibold text-rose-700">Esc - Reset</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer FBR Compliance Disclaimer */}
              <div className="mt-2 flex items-center gap-2 border-t border-slate-200/80 pt-1.5 text-[10px] text-slate-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span>
                  Saved sales are stored locally in ERP database and can be edited or deleted until submitted to <strong className="font-bold text-slate-700">FBR</strong>.
                </span>
              </div>
            </div>

            {/* Right: Financial Totals Box (4 Cols - Clean White Card) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs lg:col-span-4">
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-600 text-[11px]">Gross Amount</span>
                  <span className="tabular-nums font-bold text-slate-900">
                    {totals.subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-600 text-[11px]">Discount Amount</span>
                  <input
                    type="number"
                    min={0}
                    value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                    placeholder="0.00"
                    onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="h-6 w-24 rounded-lg border border-slate-300 bg-white px-2 py-0 text-right tabular-nums text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-600 text-[11px]">Total After Discount</span>
                  <span className="tabular-nums font-bold text-slate-900">
                    {totals.totalAfterDiscount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-600 text-[11px]">Sales Tax Amount</span>
                  <span className="tabular-nums font-bold text-amber-700">
                    {totals.taxTotal.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-1 mt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Net Total</span>
                    <span className="tabular-nums text-xl font-black text-emerald-950">
                      {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PRINT & CHECKOUT BUTTON (Signature Emerald Green Gradient) */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2.5 text-center text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-95 transition"
              >
                <Printer className="h-4 w-4" />
                <span>Save &amp; Print (Ctrl+P / Ctrl+S)</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. Modal Window Footer Status Bar (Matching Image 4 Standard)
        ========================================================================== */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50/90 px-4 py-2 text-xs text-slate-500 select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              Authority: Billing Terminal ({activeTerminal?.terminal_code || 'POS-01'})
            </span>
            <span className="text-slate-300">•</span>
            <span>Multi-Tenant Commercial License Active</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Press <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-2xs">Esc</kbd> to close
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* =========================================================================
            7. PAYMENT CHECKOUT MODAL (Executive Midnight Navy Header + Crisp White Body)
        ========================================================================== */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden">
              <div className="flex items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                    <Printer className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                      Complete POS Payment
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Bill No: {generatedInvoiceNo} • {activeBranch?.code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 bg-[#f8fafc]">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-center shadow-2xs">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Payable Net Total
                  </span>
                  <div className="tabular-nums text-3xl font-black text-emerald-950">
                    {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment Mode
                  </label>
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
                        className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border py-2 text-xs font-bold transition shadow-2xs ${
                          paymentMode === mode
                            ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
                        <label className="mb-1 block font-bold text-slate-700">Cash Received</label>
                        <input
                          type="number"
                          min={0}
                          placeholder={String(totals.grandTotal)}
                          value={tenderedAmount}
                          onChange={(e) => setTenderedAmount(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 tabular-nums text-sm font-bold text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-slate-700">Change Due</label>
                        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 tabular-nums text-sm font-black text-emerald-900 shadow-2xs">
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
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 tabular-nums text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition shadow-2xs cursor-pointer"
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
                      <label className="mb-1 block font-bold text-slate-700">Cash</label>
                      <input
                        type="number"
                        min={0}
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Card</label>
                      <input
                        type="number"
                        min={0}
                        value={splitCard}
                        onChange={(e) => setSplitCard(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Bank</label>
                      <input
                        type="number"
                        min={0}
                        value={splitBank}
                        onChange={(e) => setSplitBank(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Optional invoice notes / remark..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-hidden shadow-2xs"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSaveAndSubmitSale()}
                    className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition active:scale-95"
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Print Invoice'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. RECALL SALE (F7) MODAL (Executive Midnight Navy Header + Crisp White Body)
        ========================================================================== */}
        {showRecallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs font-sans">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden">
              <div className="flex items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                    <RotateCcw className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                      Recall Parked Bills (F7)
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Select a suspended ticket to restore into current checkout session
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecallModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 bg-[#f8fafc] max-h-80 overflow-y-auto">
                {loadingHeld ? (
                  <p className="py-8 text-center text-xs font-bold text-slate-500">Loading parked bills...</p>
                ) : heldCartsList.length === 0 ? (
                  <p className="py-8 text-center text-xs font-bold text-slate-400">
                    No parked bills found in hold queue.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {heldCartsList.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-indigo-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-xs font-black text-indigo-700">
                              Parked #{c.id}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{c.customer_name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {c.item_count} items • {c.created_at}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="tabular-nums text-sm font-black text-slate-900">
                            {formatCurrency(c.total_amount, settings.currency_symbol)}
                          </span>
                          <button
                            type="button"
                            onClick={() => recallHeldCart(c)}
                            className="cursor-pointer rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs active:scale-95 transition"
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

        {/* =========================================================================
            9. QUICK ADD CUSTOMER MODAL (Executive Midnight Navy Header + Crisp White Body)
        ========================================================================== */}
        {showNewCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs font-sans">
            <form
              onSubmit={handleCreateCustomer}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                    <UserPlus className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                      Add New Customer
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Create customer profile for POS Ledger &amp; Invoicing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs bg-[#f8fafc]">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Customer Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
                    placeholder="e.g. Walk-in Customer / Business Name"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    CNIC / NTN Number
                  </label>
                  <input
                    type="text"
                    value={newCustCnic}
                    onChange={(e) => setNewCustCnic(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
                    placeholder="15302-..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(false)}
                    className="flex-1 cursor-pointer rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 transition active:scale-95"
                  >
                    Save &amp; Select
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            10. INVOICE PRINT MODAL
        ========================================================================== */}
        <InvoiceModal
          invoiceId={completedInvoiceId}
          onClose={() => setCompletedInvoiceId(null)}
          onSynced={() => void loadCatalog()}
        />
      </div>
    </div>
  );
}
