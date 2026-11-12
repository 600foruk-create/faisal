'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CreditCard,
  Landmark,
  Minus,
  PauseCircle,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
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
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-500">POS Counter Branch:</span>
            <select
              value={branchId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setBranchId(id);
                setActiveBranchId(id);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>

          {activeTerminal && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-semibold text-slate-700">
                Counter: {activeTerminal.terminal_code}
              </span>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono font-semibold text-emerald-800">
                Series: {activeTerminal.invoice_prefix}
              </span>
            </div>
          )}
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Cashier: {activeUser?.full_name ?? 'POS Cashier'}
        </span>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:col-span-7">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode or search product by name / SKU (press Enter to add)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <div className="grid max-h-[560px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProductToCart(p)}
                className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">
                      {p.sku}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.stock_qty > 10
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.stock_qty > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      Stock: {p.stock_qty} {p.unit}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{p.name}</h3>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2">
                  <span className="tabular-nums text-sm font-bold text-emerald-700">
                    {formatCurrency(p.sale_price, settings.currency_symbol)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    GST {p.tax_rate}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:col-span-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">Current Bill</h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="cursor-pointer text-xs font-semibold text-red-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Customer</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showNewCustomer ? 'Cancel' : 'Add Customer'}
                </button>
              </div>
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800"
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
                  className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5"
                >
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="CNIC / NTN"
                      value={newCustCnic}
                      onChange={(e) => setNewCustCnic(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded bg-emerald-600 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Save & Select Customer
                  </button>
                </form>
              )}
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto border-y border-slate-100 py-2">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Click any item on the left or scan barcode to add to bill.
                </p>
              ) : (
                cart.map((item) => {
                  const gross = roundMoney(item.unitPrice * item.quantity);
                  const net = roundMoney(Math.max(0, gross - item.discountAmount));
                  const tax = roundMoney((net * item.taxRate) / 100);
                  const lineTotal = roundMoney(net + tax);

                  return (
                    <div
                      key={item.productId}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
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
                          className="cursor-pointer text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
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
                            className="w-12 border-x border-slate-200 py-0.5 text-center text-xs font-bold"
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

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
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
                            className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right text-xs"
                          />
                        </div>

                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(lineTotal, settings.currency_symbol)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal, settings.currency_symbol)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Extra Invoice Discount</span>
                <input
                  type="number"
                  min={0}
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right text-xs"
                />
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Sales Tax</span>
                <span>{formatCurrency(totals.taxTotal, settings.currency_symbol)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span>{formatCurrency(totals.grandTotal, settings.currency_symbol)}</span>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Payment Mode
              </span>
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
                    className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-semibold transition ${
                      paymentMode === mode
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  <label className="mb-1 block font-medium text-slate-600">Cash Tendered</label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(totals.grandTotal)}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Change Due</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-bold text-emerald-700">
                    {formatCurrency(changeDue, settings.currency_symbol)}
                  </div>
                </div>
              </div>
            )}

            {paymentMode === 'SPLIT' && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="mb-1 block text-slate-600">Cash</label>
                  <input
                    type="number"
                    min={0}
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-600">Card</label>
                  <input
                    type="number"
                    min={0}
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-600">Bank</label>
                  <input
                    type="number"
                    min={0}
                    value={splitBank}
                    onChange={(e) => setSplitBank(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Optional bill note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleHoldBill}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
              >
                <PauseCircle className="h-4 w-4" />
                Hold Bill
              </button>
              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={handleCompleteSale}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
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

