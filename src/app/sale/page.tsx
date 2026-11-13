'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Landmark,
  Minus,
  PauseCircle,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { InvoiceModal } from '@/components/InvoiceModal';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency, roundMoney } from '@/lib/format';
import type { Customer, PaymentMode, ProductWithStock } from '@/lib/types';

interface CartItem {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  discountAmount: number;
}

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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('0');
  const [splitCard, setSplitCard] = useState<string>('0');
  const [splitBank, setSplitBank] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [heldCartId, setHeldCartId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [completedInvoiceId, setCompletedInvoiceId] = useState<number | null>(null);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCnic, setNewCustCnic] = useState('');

  useEffect(() => {
    if (activeBranchId) {
      setBranchId(activeBranchId);
    } else if (branches.length > 0 && !branches.some((b) => b.id === branchId)) {
      setBranchId(branches[0].id);
    }
  }, [activeBranchId, branches, branchId]);

  const loadCatalog = useCallback(async () => {
    if (!branchId) return;
    const [prodRes, custRes] = await Promise.all([
      fetch(`/api/products?branchId=${branchId}`),
      fetch(`/api/customers?branchId=${branchId}`),
    ]);
    if (prodRes.ok) {
      const pData = (await prodRes.json()) as { products: ProductWithStock[] };
      setProducts(pData.products);
    }
    if (custRes.ok) {
      const cData = (await custRes.json()) as { customers: Customer[] };
      setCustomers(cData.customers);
      const walkIn = cData.customers.find((c) => c.is_walk_in === 1);
      if (walkIn) setSelectedCustomerId(walkIn.id);
    }
  }, [branchId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, refreshNonce]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem('pos_recall_cart');
    if (!raw) return;
    window.sessionStorage.removeItem('pos_recall_cart');
    try {
      const parsed = JSON.parse(raw) as {
        id: number;
        branch_id: number;
        customer_id: number | null;
        discount_total: number;
        notes: string;
        items: Array<{
          productId: number;
          sku: string;
          name: string;
          unitPrice: number;
          taxRate: number;
          quantity: number;
          discountAmount: number;
        }>;
      };
      setBranchId(parsed.branch_id);
      setActiveBranchId(parsed.branch_id);
      if (parsed.customer_id) setSelectedCustomerId(parsed.customer_id);
      setInvoiceDiscount(parsed.discount_total || 0);
      setNotes(parsed.notes || '');
      setHeldCartId(parsed.id);
      setCart(parsed.items.map((item) => ({ ...item, unit: 'Pcs' })));
      setMessage({ type: 'success', text: 'Held cart recalled into POS billing screen.' });
    } catch {
      // ignore invalid JSON
    }
  }, [setActiveBranchId]);

  const activeBranch = branches.find((b) => b.id === branchId);
  const activeTerminal = terminals.find((t) => t.branch_id === branchId);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, search, selectedCategory]);

  const addProductToCart = (product: ProductWithStock) => {
    setMessage(null);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitPrice: product.sale_price,
          taxRate: product.tax_rate,
          quantity: 1,
          discountAmount: 0,
        },
      ];
    });
  };

  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = products.find(
      (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q
    );
    if (exact) {
      addProductToCart(exact);
      setSearch('');
    } else if (filteredProducts.length === 1) {
      addProductToCart(filteredProducts[0]);
      setSearch('');
    }
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let itemDiscount = 0;
    let taxTotal = 0;
    for (const item of cart) {
      const gross = roundMoney(item.unitPrice * item.quantity);
      const disc = roundMoney(Math.min(gross, Math.max(0, item.discountAmount)));
      const net = roundMoney(gross - disc);
      const tax = roundMoney((net * item.taxRate) / 100);
      subtotal = roundMoney(subtotal + gross);
      itemDiscount = roundMoney(itemDiscount + disc);
      taxTotal = roundMoney(taxTotal + tax);
    }
    const discountTotal = roundMoney(itemDiscount + Math.max(0, invoiceDiscount));
    const grandTotal = roundMoney(Math.max(0, subtotal - discountTotal + taxTotal));
    return { subtotal, discountTotal, taxTotal, grandTotal };
  }, [cart, invoiceDiscount]);

  const tenderedNum = tenderedAmount.trim() ? Number(tenderedAmount) : totals.grandTotal;
  const changeDue =
    paymentMode === 'CASH' ? roundMoney(Math.max(0, tenderedNum - totals.grandTotal)) : 0;

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        name: newCustName,
        phone: newCustPhone,
        cnic: newCustCnic,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { customer: Customer };
      setCustomers((prev) => [...prev, data.customer]);
      setSelectedCustomerId(data.customer.id);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustCnic('');
      setShowNewCustomer(false);
    }
  };

  const handleHoldBill = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Add items to cart before holding a bill.' });
      return;
    }
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const res = await fetch('/api/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId,
        customerId: selectedCustomerId,
        customerName: cust?.name ?? `Walk-in (Cash) Customer ( ${activeBranch?.name ?? ''} )`,
        userId: activeUser?.id ?? null,
        cashierName: activeUser?.full_name ?? 'Cashier',
        discountTotal: invoiceDiscount,
        notes,
        items: cart.map((c) => ({
          productId: c.productId,
          sku: c.sku,
          name: c.name,
          unitPrice: c.unitPrice,
          taxRate: c.taxRate,
          quantity: c.quantity,
          discountAmount: c.discountAmount,
        })),
      }),
    });
    if (res.ok) {
      setCart([]);
      setInvoiceDiscount(0);
      setNotes('');
      setHeldCartId(null);
      await refreshHeldCount();
      setMessage({ type: 'success', text: 'Bill parked in Hold / Recall successfully.' });
    } else {
      const err = (await res.json()) as { error?: string };
      setMessage({ type: 'error', text: err.error || 'Failed to hold bill' });
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty.' });
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
          customerName: cust?.name,
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
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discountAmount: c.discountAmount,
          })),
        }),
      });
      const data = (await res.json()) as {
        invoice?: { id: number; invoice_no: string };
        error?: string;
      };
      if (!res.ok || !data.invoice) {
        setMessage({ type: 'error', text: data.error || 'Failed to save sale' });
        return;
      }

      setCart([]);
      setInvoiceDiscount(0);
      setTenderedAmount('');
      setNotes('');
      setHeldCartId(null);
      setCompletedInvoiceId(data.invoice.id);
      await Promise.all([loadCatalog(), refreshHeldCount()]);
      setMessage({
        type: 'success',
        text: `Receipt ${data.invoice.invoice_no} completed successfully.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Counter Bar (Softifyx Executive Brand Aesthetic) */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50/50 px-2.5 py-1">
            <Store className="h-4 w-4 text-amber-700" />
            <span className="text-xs font-bold text-amber-950">Counter Branch:</span>
            <select
              value={branchId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setBranchId(id);
                setActiveBranchId(id);
              }}
              className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>

          {activeTerminal && (
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-lg border border-amber-950/40 bg-gradient-to-r from-[#2B1206] to-[#3A1808] px-2.5 py-1 font-mono font-bold text-amber-200 shadow-2xs">
                Counter: {activeTerminal.terminal_code}
              </span>
              <span className="rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 font-mono font-bold text-amber-900">
                Series: {activeTerminal.invoice_prefix}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* FBR Live status badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>FBR Ready</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800">
            <UserCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>Cashier: {activeUser?.full_name ?? 'POS Cashier'}</span>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Counter Workspace */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Side: Product Catalog & Instant Barcode Search (7 Cols) */}
        <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm lg:col-span-7">
          {/* Barcode / Product Search Bar */}
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-500">
            <Barcode className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode or search item by name / SKU (press Enter to add)..."
              className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 bg-[#5C240A] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#4E1E07]"
            >
              Scan
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-[#5C240A] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid max-h-[540px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProductToCart(p)}
                className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-2xs transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50/20 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-amber-800">
                      {p.sku}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        p.stock_qty > 10
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                          : p.stock_qty > 0
                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/60'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
                      }`}
                    >
                      Stock: {p.stock_qty} {p.unit}
                    </span>
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-amber-950">
                    {p.name}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="tabular-nums text-sm font-black text-slate-900">
                    {formatCurrency(p.sale_price, settings.currency_symbol)}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    GST {p.tax_rate}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Right Side: Current Bill / Cart & Checkout (5 Cols) */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm lg:col-span-5">
          <div className="space-y-3">
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-extrabold text-slate-900">Current Bill</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {cart.length} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="cursor-pointer text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">Customer</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-amber-800 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                  {showNewCustomer ? 'Cancel' : '+ Add Customer'}
                </button>
              </div>
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {showNewCustomer && (
                <form
                  onSubmit={handleCreateQuickCustomer}
                  className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-2.5"
                >
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium"
                    />
                    <input
                      type="text"
                      placeholder="CNIC / NTN"
                      value={newCustCnic}
                      onChange={(e) => setNewCustCnic(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-lg bg-[#5C240A] py-1 text-xs font-bold text-white transition hover:bg-[#4E1E07]"
                  >
                    Save &amp; Select Customer
                  </button>
                </form>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-56 space-y-2 overflow-y-auto border-y border-slate-100 py-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs font-medium text-slate-400">
                  Click any item or scan barcode to add to bill.
                </div>
              ) : (
                cart.map((item) => {
                  const gross = roundMoney(item.unitPrice * item.quantity);
                  const net = roundMoney(Math.max(0, gross - item.discountAmount));
                  const tax = roundMoney((net * item.taxRate) / 100);
                  const lineTotal = roundMoney(net + tax);

                  return (
                    <div
                      key={item.productId}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatCurrency(item.unitPrice, settings.currency_symbol)} + {item.taxRate}% GST
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) => prev.filter((c) => c.productId !== item.productId))
                          }
                          className="cursor-pointer text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((c) =>
                                  c.productId === item.productId
                                    ? { ...c, quantity: Math.max(1, c.quantity - 1) }
                                    : c
                                )
                              )
                            }
                            className="cursor-pointer px-2 py-1 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setCart((prev) =>
                                prev.map((c) =>
                                  c.productId === item.productId ? { ...c, quantity: val } : c
                                )
                              );
                            }}
                            className="w-10 border-x border-slate-200 py-0.5 text-center text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((c) =>
                                  c.productId === item.productId
                                    ? { ...c, quantity: c.quantity + 1 }
                                    : c
                                )
                              )
                            }
                            className="cursor-pointer px-2 py-1 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <span>Disc:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.discountAmount}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setCart((prev) =>
                                prev.map((c) =>
                                  c.productId === item.productId
                                    ? { ...c, discountAmount: val }
                                    : c
                                )
                              );
                            }}
                            className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-xs font-semibold"
                          />
                        </div>

                        <span className="tabular-nums text-xs font-extrabold text-slate-900">
                          {formatCurrency(lineTotal, settings.currency_symbol)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Totals & Payment Section */}
          <div className="mt-3 space-y-2.5">
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(totals.subtotal, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Invoice Discount</span>
                <input
                  type="number"
                  min={0}
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-0.5 text-right text-xs font-semibold"
                />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Sales Tax</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(totals.taxTotal, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-black text-slate-900">
                <span>Grand Total</span>
                <span className="tabular-nums text-emerald-700">
                  {formatCurrency(totals.grandTotal, settings.currency_symbol)}
                </span>
              </div>
            </div>

            {/* Payment Mode Toggles */}
            <div>
              <span className="mb-1 block text-xs font-bold text-slate-600">
                Payment Mode
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { mode: 'CASH', label: 'Cash', icon: Banknote },
                    { mode: 'CARD', label: 'Card', icon: CreditCard },
                    { mode: 'BANK', label: 'Bank', icon: Landmark },
                    { mode: 'SPLIT', label: 'Split', icon: Receipt },
                  ] as const
                ).map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-bold transition ${
                      paymentMode === mode
                        ? 'border-amber-600 bg-[#5C240A] text-white shadow-2xs'
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
                  <label className="mb-1 block font-bold text-slate-600">Cash Tendered</label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(totals.grandTotal)}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-600">Change Due</label>
                  <div className="tabular-nums rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800">
                    {formatCurrency(changeDue, settings.currency_symbol)}
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'SPLIT' && (
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <div>
                  <label className="mb-0.5 block font-bold text-slate-600">Cash</label>
                  <input
                    type="number"
                    min={0}
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-bold text-slate-600">Card</label>
                  <input
                    type="number"
                    min={0}
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-bold text-slate-600">Bank</label>
                  <input
                    type="number"
                    min={0}
                    value={splitBank}
                    onChange={(e) => setSplitBank(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Optional bill note / reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium placeholder:text-slate-400"
            />

            {/* Action Buttons: Hold & Complete Sale */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleHoldBill}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
              >
                <PauseCircle className="h-4 w-4 text-amber-700" />
                Hold Bill
              </button>
              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={handleCompleteSale}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#5C240A] py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#4E1E07] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 text-amber-300" />
                {submitting ? 'Saving Sale...' : 'Complete Sale & Print'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <InvoiceModal
        invoiceId={completedInvoiceId}
        onClose={() => setCompletedInvoiceId(null)}
        onSynced={() => void loadCatalog()}
      />
    </div>
  );
}
