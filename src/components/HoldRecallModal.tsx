'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  PauseCircle,
  Play,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency } from '@/lib/format';
import type { HeldCartRecord } from '@/lib/types';

interface ParsedCartItem {
  productId?: number;
  product_id?: number;
  sku: string;
  name?: string;
  itemName?: string;
  quantity: number;
  unitPrice?: number;
  unit_price?: number;
  discountAmount?: number;
  discount_amount?: number;
  taxRate?: number;
  tax_rate?: number;
}

export function HoldRecallModal() {
  const {
    branches,
    activeBranchId,
    settings,
    closeHoldRecallModal,
    openPosSale,
    setRecalledCartForPos,
    refreshHeldCount,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Branch Selector (Multi-Tenant Ready)
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);

  // Data & State
  const [carts, setCarts] = useState<HeldCartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCartId, setSelectedCartId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Toast Helper
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch held carts for selected branch
  const loadCarts = useCallback(async (branchId?: number | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', String(branchId));
      const res = await fetch(`/api/hold?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { carts?: HeldCartRecord[] };
        const fetched = data.carts || [];
        setCarts(fetched);
        if (fetched.length > 0) {
          setSelectedCartId((prev) => (prev && fetched.some((c) => c.id === prev) ? prev : fetched[0].id));
        } else {
          setSelectedCartId(null);
        }
      }
    } catch {
      showToast('Error loading parked bills queue.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadCarts(selectedBranchId);
  }, [selectedBranchId, loadCarts]);

  // Filtered carts
  const filteredCarts = useMemo(() => {
    if (!searchQuery.trim()) return carts;
    const q = searchQuery.toLowerCase().trim();
    return carts.filter(
      (c) =>
        c.hold_code.toLowerCase().includes(q) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.cashier_name && c.cashier_name.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        String(c.total_amount).includes(q)
    );
  }, [carts, searchQuery]);

  // Active selected cart
  const activeCart = useMemo(
    () => carts.find((c) => c.id === selectedCartId) || null,
    [carts, selectedCartId]
  );

  // Parsed items of active cart
  const activeCartItems = useMemo<ParsedCartItem[]>(() => {
    if (!activeCart || !activeCart.items_json) return [];
    try {
      const parsed = JSON.parse(activeCart.items_json) as ParsedCartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeCart]);

  // Resume / Load Cart into POS Sale
  const handleResumeCart = useCallback(
    async (cart: HeldCartRecord) => {
      setActionLoading(true);
      try {
        // Delete held cart from database
        await fetch('/api/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: cart.id }),
        });

        // Set in context to load into PosSaleModal
        setRecalledCartForPos(cart);

        await refreshHeldCount();
        closeHoldRecallModal();
        openPosSale();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error recalling parked cart', 'error');
        setActionLoading(false);
      }
    },
    [setRecalledCartForPos, refreshHeldCount, closeHoldRecallModal, openPosSale, showToast]
  );

  // Discard / Delete Cart
  const handleDiscardCart = useCallback(
    async (cartId: number) => {
      if (!window.confirm('Are you sure you want to discard this parked bill permanently?')) {
        return;
      }

      setActionLoading(true);
      try {
        const res = await fetch('/api/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: cartId }),
        });

        if (!res.ok) throw new Error('Failed to discard parked bill');

        showToast('Parked bill discarded successfully.', 'success');
        await Promise.all([loadCarts(selectedBranchId), refreshHeldCount()]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error discarding bill', 'error');
      } finally {
        setActionLoading(false);
      }
    },
    [selectedBranchId, loadCarts, refreshHeldCount, showToast]
  );

  // Print Token Holding Slip
  const handlePrintToken = useCallback(() => {
    window.print();
  }, []);

  // Keyboard Navigation: Enter to resume, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && activeCart && !actionLoading) {
        e.preventDefault();
        void handleResumeCart(activeCart);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeHoldRecallModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCart, actionLoading, handleResumeCart, closeHoldRecallModal]);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || {
    id: selectedBranchId,
    display_name: 'Branch #' + selectedBranchId,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div
        className={`flex flex-col bg-white shadow-2xl transition-all duration-150 overflow-hidden border border-slate-300 rounded-xl ${
          isMaximized
            ? 'h-full w-full rounded-none'
            : isMinimized
            ? 'h-14 w-[500px] overflow-hidden'
            : 'h-[92vh] w-full max-w-[1440px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. EXECUTIVE MIDNIGHT NAVY TITLE BAR                     */}
        {/* ========================================================= */}
        <div className="flex h-11 shrink-0 items-center justify-between bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white shadow-md select-none">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            </span>
            <PauseCircle className="h-4 w-4 text-amber-400" />
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white">
              Parked Bills &amp; Cart Recall Manager
            </h1>
            <span className="hidden md:inline-flex items-center rounded-full bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-700/60">
              Multi-Tenant Cart Queue
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Branch Switcher & Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
              <Building2 className="h-3 w-3 text-emerald-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const nextId = parseInt(e.target.value, 10);
                  setSelectedBranchId(nextId);
                }}
                className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900 bg-white">
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Window Controls */}
            <div className="flex items-center ml-1 border-l border-white/15 pl-2 gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title="Minimize Dialog"
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore Normal Window' : 'Maximize Window'}
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={closeHoldRecallModal}
                title="Close Dialog (Esc)"
                className="rounded p-1 text-rose-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TOAST MESSAGE ALERT */}
        {toastMessage && (
          <div
            className={`absolute top-13 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-xl border animate-fade-in ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-950/20'
                : 'bg-rose-600 text-white border-rose-700 shadow-rose-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. DUAL-PANEL WORKSPACE: QUEUE LIST (LEFT) & PREVIEW (RIGHT)*/}
        {/* ========================================================= */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-100">
          {/* ------------------------------------------------------- */}
          {/* LEFT PANEL: PARKED BILLS QUEUE LIST                     */}
          {/* ------------------------------------------------------- */}
          <div className="w-80 sm:w-96 shrink-0 border-r border-slate-300 bg-white flex flex-col select-none">
            {/* Search Header */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Parked Carts Queue</span>
                </span>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  {filteredCarts.length} Bills Waiting
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search hold code, customer, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Parked Carts Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-amber-500 mb-2" />
                  <span>Loading parked bills...</span>
                </div>
              ) : filteredCarts.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs px-4">
                  <PauseCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No Parked Bills</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Press <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[10px]">F6 (Hold)</kbd> on the POS Sale counter to temporarily park a bill.
                  </p>
                </div>
              ) : (
                filteredCarts.map((c) => {
                  const isSelected = selectedCartId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCartId(c.id)}
                      className={`w-full text-left p-3 rounded-xl transition cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-400 shadow-xs ring-1 ring-amber-400/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md">
                          {c.hold_code}
                        </span>
                        <span className="text-xs font-black text-slate-900 tabular-nums">
                          Rs. {Number(c.total_amount).toLocaleString('en-PK')}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{c.customer_name || 'Walk-in Cash Customer'}</span>
                      </div>

                      {c.notes && (
                        <p className="mt-1 text-[11px] text-slate-600 bg-slate-100/70 rounded px-2 py-0.5 line-clamp-1 italic">
                          &ldquo;{c.notes}&rdquo;
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-slate-400" />
                          <span>{c.item_count} item(s)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{c.created_at}</span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT PANEL: CART INSPECTION & RESUME DESK              */}
          {/* ------------------------------------------------------- */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {!activeCart ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <ShoppingCart className="h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-800">Select a Parked Bill from Left</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Click on any parked cart in the queue to inspect its contents, print a customer holding token, or resume it directly into POS Sale.
                </p>
              </div>
            ) : (
              <>
                {/* Active Cart Header Information Card */}
                <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-extrabold text-sm text-slate-900">{activeCart.hold_code}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Customer:</span>
                        <strong className="text-slate-800 font-bold">{activeCart.customer_name}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Parked:</span>
                        <strong className="text-slate-800 font-semibold">{activeCart.created_at}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Store className="h-3.5 w-3.5 text-slate-400" />
                        <span>Cashier:</span>
                        <strong className="text-slate-800 font-semibold">{activeCart.cashier_name}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 font-medium">Cart Total:</span>
                      <span className="ml-1 text-base font-black text-emerald-700 tabular-nums">
                        Rs. {Number(activeCart.total_amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {activeCart.notes && (
                    <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 text-xs text-amber-900 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span><strong>Hold Note:</strong> {activeCart.notes}</span>
                    </div>
                  )}
                </div>

                {/* Items Spreadsheet Table */}
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    {/* DEAD CENTER HEADERS & ZERO ASTERISKS */}
                    <thead className="bg-[#0e1f3d] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700/80">#</th>
                        <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Item SKU</th>
                        <th className="py-2.5 px-3 min-w-[260px] text-center border-r border-slate-700/80">
                          Item Description &amp; Specifications
                        </th>
                        <th className="py-2.5 px-3 w-24 text-center border-r border-slate-700/80">Quantity</th>
                        <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Unit Rate (Rs)</th>
                        <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">Discount (Rs)</th>
                        <th className="py-2.5 px-3 w-24 text-center border-r border-slate-700/80">Tax Rate</th>
                        <th className="py-2.5 px-3 w-32 text-center">Line Total (Rs)</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {activeCartItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-500">
                            No product details found inside this cart payload.
                          </td>
                        </tr>
                      ) : (
                        activeCartItems.map((item, index) => {
                          const rate = item.unitPrice ?? item.unit_price ?? 0;
                          const qty = item.quantity ?? 1;
                          const disc = item.discountAmount ?? item.discount_amount ?? 0;
                          const taxRate = item.taxRate ?? item.tax_rate ?? 18;
                          const net = Math.max(0, rate * qty - disc);
                          const total = net * (1 + taxRate / 100);

                          return (
                            <tr
                              key={index}
                              className={`h-8 transition-colors select-none ${
                                index % 2 === 0 ? 'bg-white hover:bg-sky-50/60' : 'bg-slate-50/50 hover:bg-sky-50/60'
                              }`}
                            >
                              {/* # */}
                              <td className="px-2 py-1 text-center text-slate-500 text-xs border-r border-slate-200 tabular-nums">
                                {index + 1}
                              </td>

                              {/* SKU */}
                              <td className="px-3 py-1 text-center font-bold text-slate-800 text-xs border-r border-slate-200">
                                {item.sku}
                              </td>

                              {/* Description */}
                              <td className="px-3 py-1 text-left font-semibold text-slate-900 text-xs border-r border-slate-200">
                                <span className="truncate max-w-[320px] block" title={item.name || item.itemName}>
                                  {item.name || item.itemName}
                                </span>
                              </td>

                              {/* Qty */}
                              <td className="px-3 py-1 text-center font-extrabold text-slate-900 text-xs border-r border-slate-200 tabular-nums">
                                {qty}
                              </td>

                              {/* Rate */}
                              <td className="px-3 py-1 text-right font-bold text-slate-800 text-xs border-r border-slate-200 tabular-nums">
                                Rs. {rate.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Discount */}
                              <td className="px-3 py-1 text-right text-xs border-r border-slate-200 tabular-nums">
                                {disc > 0 ? (
                                  <span className="font-bold text-rose-700">
                                    -Rs. {disc.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0.00</span>
                                )}
                              </td>

                              {/* Tax */}
                              <td className="px-3 py-1 text-center font-semibold text-slate-700 text-xs border-r border-slate-200 tabular-nums">
                                {taxRate}%
                              </td>

                              {/* Line Total */}
                              <td className="px-3 py-1 text-right font-bold text-slate-900 text-xs tabular-nums">
                                Rs. {total.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Ribbon */}
                <div className="shrink-0 border-t border-slate-300 bg-slate-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                  {/* Left Actions: Discard & Print Token */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDiscardCart(activeCart.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      <span>Discard Parked Bill</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintToken}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition shadow-2xs"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" />
                      <span>Print Token Slip</span>
                    </button>
                  </div>

                  {/* Right Actions: Cancel & Resume into POS */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeHoldRecallModal}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                    >
                      Cancel (Esc)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResumeCart(activeCart)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 active:scale-98 cursor-pointer disabled:opacity-50 transition"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Loading POS Cart...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Resume Bill in POS (Enter)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
