'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { usePosContext } from './PosContext';
import { formatCurrency } from '@/lib/format';
import type { InvoiceDetail, InvoiceRecord, PaymentMode } from '@/lib/types';

interface ReturnItemState {
  productId: number;
  sku: string;
  itemName: string;
  soldQty: number;
  alreadyReturnedQty: number;
  returnableQty: number;
  unitPrice: number;
  taxRate: number;
  returnQty: number;
}

export function SalesReturnModal() {
  const {
    branches,
    activeBranchId,
    activeUser,
    settings,
    closeSalesReturnModal,
    selectedInvoiceNoForReturn,
    triggerInventoryRefresh,
    triggerRefresh,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Branch Selection (Multi-Tenant Ready)
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);

  // Search & Lookup State
  const [invoiceQuery, setInvoiceQuery] = useState(selectedInvoiceNoForReturn || '');
  const [recentSales, setRecentSales] = useState<InvoiceRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loaded Invoice Data
  const [originalInvoice, setOriginalInvoice] = useState<InvoiceDetail | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [refundMode, setRefundMode] = useState<PaymentMode>('CASH');
  const [reason, setReason] = useState('Customer Return / Exchange');

  // Input references for keyboard navigation
  const returnInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Result & Alerts
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);

  // Toast Helper
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Load Recent Sales for quick picker
  const loadRecentSales = useCallback(async (branchId: number) => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/sales?branchId=${branchId}&invoiceType=SALE&limit=15`);
      if (res.ok) {
        const data = (await res.json()) as { invoices?: InvoiceRecord[] };
        setRecentSales(data.invoices || []);
      }
    } catch {
      // Ignore network errors on initial dropdown
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentSales(selectedBranchId);
  }, [selectedBranchId, loadRecentSales]);

  // Lookup Original Sale Receipt
  const lookupInvoice = useCallback(
    async (identifier: string) => {
      const clean = identifier.trim();
      if (!clean) {
        showToast('Please enter an Invoice No or Barcode to look up', 'error');
        return;
      }

      setLoadingLookup(true);
      try {
        const res = await fetch(`/api/invoices/${encodeURIComponent(clean)}`);
        const data = (await res.json()) as { invoice?: InvoiceDetail; error?: string };

        if (!res.ok || !data.invoice) {
          setOriginalInvoice(null);
          setReturnItems([]);
          showToast(data.error || `Invoice "${clean}" not found`, 'error');
          return;
        }

        if (data.invoice.invoice_type !== 'SALE') {
          setOriginalInvoice(null);
          setReturnItems([]);
          showToast('Selected invoice is already a RETURN. Only SALE bills can be refunded.', 'error');
          return;
        }

        const inv = data.invoice;
        setOriginalInvoice(inv);

        // Map items to return state
        const itemsState: ReturnItemState[] = inv.items.map((it) => {
          const prevReturned = inv.returned_quantities?.[it.product_id] ?? 0;
          const returnable = Math.max(0, it.quantity - prevReturned);
          return {
            productId: it.product_id,
            sku: it.sku,
            itemName: it.item_name,
            soldQty: it.quantity,
            alreadyReturnedQty: prevReturned,
            returnableQty: returnable,
            unitPrice: it.unit_price,
            taxRate: it.tax_rate ?? 18,
            returnQty: 0,
          };
        });

        setReturnItems(itemsState);
        setRefundMode(inv.payment_mode === 'CARD' ? 'CARD' : 'CASH');
        showToast(`Receipt #${inv.invoice_no} loaded successfully (${itemsState.length} items).`, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error fetching receipt details', 'error');
      } finally {
        setLoadingLookup(false);
      }
    },
    [showToast]
  );

  // Auto-load if passed via context
  useEffect(() => {
    if (selectedInvoiceNoForReturn) {
      void lookupInvoice(selectedInvoiceNoForReturn);
    }
  }, [selectedInvoiceNoForReturn, lookupInvoice]);

  // Handle Return Qty Change
  const handleReturnQtyChange = useCallback((productId: number, rawVal: string) => {
    const val = parseFloat(rawVal);
    setReturnItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const validQty = isNaN(val) ? 0 : Math.max(0, Math.min(it.returnableQty, val));
        return {
          ...it,
          returnQty: validQty,
        };
      })
    );
  }, []);

  // Quick Action: Return All Remaining Items
  const handleReturnAll = useCallback(() => {
    setReturnItems((prev) =>
      prev.map((it) => ({
        ...it,
        returnQty: it.returnableQty,
      }))
    );
    showToast('All returnable quantities populated.', 'success');
  }, [showToast]);

  // Quick Action: Clear Return Quantities
  const handleClearQuantities = useCallback(() => {
    setReturnItems((prev) =>
      prev.map((it) => ({
        ...it,
        returnQty: 0,
      }))
    );
  }, []);

  // Calculate totals
  const { totalUnitsToReturn, returnSubtotal, returnTaxTotal, refundPayableTotal } = useMemo(() => {
    let units = 0;
    let sub = 0;
    let tax = 0;

    for (const it of returnItems) {
      if (it.returnQty > 0) {
        units += it.returnQty;
        const lineNet = it.returnQty * it.unitPrice;
        const lineTax = (lineNet * it.taxRate) / 100;
        sub += lineNet;
        tax += lineTax;
      }
    }

    return {
      totalUnitsToReturn: Math.round(units * 100) / 100,
      returnSubtotal: Math.round(sub * 100) / 100,
      returnTaxTotal: Math.round(tax * 100) / 100,
      refundPayableTotal: Math.round((sub + tax) * 100) / 100,
    };
  }, [returnItems]);

  const activeReturnLinesCount = useMemo(
    () => returnItems.filter((i) => i.returnQty > 0).length,
    [returnItems]
  );

  // Submit Sales Return
  const handleSubmitReturn = useCallback(async () => {
    if (!originalInvoice) {
      showToast('Please look up and load a sale invoice first.', 'error');
      return;
    }

    const selectedItems = returnItems
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.returnQty,
      }));

    if (selectedItems.length === 0) {
      showToast('Please specify return quantity greater than 0 for at least one item.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        originalInvoiceId: originalInvoice.id,
        userId: activeUser?.id ?? null,
        cashierName: activeUser?.full_name ?? 'POS Cashier',
        refundMode,
        reason,
        items: selectedItems,
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { invoice?: InvoiceDetail; error?: string };

      if (!res.ok || !data.invoice) {
        throw new Error(data.error || 'Failed to process sales return');
      }

      const returnInv = data.invoice;
      showToast(
        `Sales Return #${returnInv.invoice_no} created successfully! Inventory stock restored to branch.`,
        'success'
      );

      triggerInventoryRefresh();
      triggerRefresh();
      setViewInvoiceId(returnInv.id);

      // Reload original invoice to reflect updated returned quantities
      void lookupInvoice(originalInvoice.invoice_no);
      void loadRecentSales(selectedBranchId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error processing return', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    originalInvoice,
    returnItems,
    activeUser,
    refundMode,
    reason,
    showToast,
    triggerInventoryRefresh,
    triggerRefresh,
    lookupInvoice,
    loadRecentSales,
    selectedBranchId,
  ]);

  // Keyboard Shortcuts (Ctrl+S to save, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSubmitReturn();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (
          activeReturnLinesCount > 0 &&
          !window.confirm('You have return quantities pending. Close without completing return?')
        ) {
          return;
        }
        closeSalesReturnModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmitReturn, closeSalesReturnModal, activeReturnLinesCount]);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || {
    id: selectedBranchId,
    display_name: 'Branch #' + selectedBranchId,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
        <div
          className={`flex flex-col bg-white shadow-2xl transition-all duration-150 overflow-hidden border border-slate-300 rounded-xl ${
            isMaximized
              ? 'h-full w-full rounded-none'
              : isMinimized
              ? 'h-14 w-[500px] overflow-hidden'
              : 'h-[94vh] w-full max-w-[1480px]'
          }`}
        >
          {/* ========================================================= */}
          {/* 1. EXECUTIVE MIDNIGHT NAVY TITLE BAR                     */}
          {/* ========================================================= */}
          <div className="flex h-11 shrink-0 items-center justify-between bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white shadow-md select-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
              </span>
              <Undo2 className="h-4 w-4 text-rose-400" />
              <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white">
                Sales Return &amp; Stock Restitution (Credit Note)
              </h1>
              <span className="hidden md:inline-flex items-center rounded-full bg-rose-950/80 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-700/60">
                Multi-Tenant &amp; Inventory Sync
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Branch Display */}
              <span className="hidden lg:flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                <Building2 className="h-3 w-3 text-emerald-400" />
                {currentBranch.display_name}
              </span>

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
                  onClick={() => {
                    if (
                      activeReturnLinesCount > 0 &&
                      !window.confirm('You have return quantities pending. Close without completing return?')
                    ) {
                      return;
                    }
                    closeSalesReturnModal();
                  }}
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
          {/* 2. FAST RECEIPT LOOKUP & RECENT BILLS TOOLBAR             */}
          {/* ========================================================= */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Lookup Form: Branch, Receipt Input, Load Button */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-4xl">
                {/* Branch Switcher */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Branch:</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      const nextId = parseInt(e.target.value, 10);
                      setSelectedBranchId(nextId);
                    }}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Receipt Input Barcode-Ready */}
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Scan receipt barcode or enter Bill # (e.g. SWT-A-POS-1)..."
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void lookupInvoice(invoiceQuery);
                      }
                    }}
                    className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:outline-none"
                  />
                  {invoiceQuery && (
                    <button
                      type="button"
                      onClick={() => setInvoiceQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Load Receipt Button */}
                <button
                  type="button"
                  onClick={() => void lookupInvoice(invoiceQuery)}
                  disabled={loadingLookup || !invoiceQuery.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition"
                >
                  {loadingLookup ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5 text-rose-400" />
                      <span>Load Receipt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Quick Recent Bills Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Recent Bills:</span>
                </span>
                <select
                  onChange={(e) => {
                    const billNo = e.target.value;
                    if (billNo) {
                      setInvoiceQuery(billNo);
                      void lookupInvoice(billNo);
                    }
                  }}
                  defaultValue=""
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-rose-600 focus:outline-none cursor-pointer max-w-[220px]"
                >
                  <option value="" disabled>
                    {loadingRecent ? 'Loading recent...' : 'Pick recent invoice...'}
                  </option>
                  {recentSales.map((inv) => (
                    <option key={inv.id} value={inv.invoice_no}>
                      {inv.invoice_no} ({inv.customer_name}) - Rs. {inv.total_amount}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Original Bill Info Card (Appears once loaded) */}
            {originalInvoice && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-rose-600" />
                    <span className="font-bold text-slate-900">{originalInvoice.invoice_no}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>Customer:</span>
                    <strong className="text-slate-800">{originalInvoice.customer_name}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>Date:</span>
                    <strong className="text-slate-800">{originalInvoice.invoice_date}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Wallet className="h-3 w-3 text-slate-400" />
                    <span>Payment Mode:</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                      {originalInvoice.payment_mode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">Original Total Bill:</span>
                    <strong className="ml-1 text-sm font-extrabold text-slate-950">
                      Rs. {originalInvoice.total_amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleReturnAll}
                    className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer transition"
                  >
                    Return All Remaining
                  </button>
                  <button
                    type="button"
                    onClick={handleClearQuantities}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                  >
                    Clear Qty
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. SPREADSHEET TABLE (100% DEAD CENTER HEADERS & CELLS)   */}
          {/* ========================================================= */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              {/* Table Header - DEAD CENTER & ZERO ASTERISKS */}
              <thead className="bg-[#0e1f3d] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700/80">#</th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Item SKU</th>
                  <th className="py-2.5 px-3 min-w-[280px] text-center border-r border-slate-700/80">
                    Item Description &amp; Specifications
                  </th>
                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-700/80">
                    Sold Qty
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">
                    Prev. Returned
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">
                    Returnable Qty
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                    Sale Rate (Rs)
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80 bg-rose-950/70 text-rose-300">
                    Return Qty
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">
                    Refund Amount (Rs)
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center">
                    Stock Action
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200">
                {!originalInvoice ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-slate-500">
                      <Undo2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-sm text-slate-700">Scan or Enter Receipt Number Above</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Once an original sale receipt is loaded, purchased products will appear here with exact returnable quantities and pricing.
                      </p>
                    </td>
                  </tr>
                ) : returnItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-500">
                      <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-xs text-slate-700">No items found on this receipt</p>
                    </td>
                  </tr>
                ) : (
                  returnItems.map((item, index) => {
                    const lineNet = item.returnQty * item.unitPrice;
                    const lineTax = (lineNet * item.taxRate) / 100;
                    const lineTotal = lineNet + lineTax;
                    const isExhausted = item.returnableQty === 0;

                    return (
                      <tr
                        key={item.productId}
                        className={`h-8 transition-colors select-none ${
                          item.returnQty > 0
                            ? 'bg-rose-50/70 hover:bg-rose-100/70'
                            : isExhausted
                            ? 'bg-slate-100/60 opacity-60'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-sky-50/60'
                            : 'bg-slate-50/50 hover:bg-sky-50/60'
                        }`}
                      >
                        {/* # Index */}
                        <td className="px-2 py-1 text-center text-slate-500 text-xs border-r border-slate-200 tabular-nums">
                          {index + 1}
                        </td>

                        {/* SKU */}
                        <td className="px-3 py-1 text-center font-bold text-slate-800 text-xs border-r border-slate-200">
                          {item.sku}
                        </td>

                        {/* Description & Specifications */}
                        <td className="px-3 py-1 text-left font-semibold text-slate-900 text-xs border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[340px]" title={item.itemName}>
                              {item.itemName}
                            </span>
                            {item.returnQty > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" title="Returning item" />
                            )}
                          </div>
                        </td>

                        {/* Sold Qty */}
                        <td className="px-3 py-1 text-center font-semibold text-slate-700 text-xs border-r border-slate-200 tabular-nums">
                          {item.soldQty}
                        </td>

                        {/* Prev. Returned */}
                        <td className="px-3 py-1 text-center text-xs border-r border-slate-200 tabular-nums">
                          {item.alreadyReturnedQty > 0 ? (
                            <span className="font-bold text-amber-700">
                              {item.alreadyReturnedQty}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Returnable Qty */}
                        <td className="px-3 py-1 text-center font-bold text-slate-900 text-xs border-r border-slate-200 tabular-nums">
                          {item.returnableQty}
                        </td>

                        {/* Sale Rate (Rs) */}
                        <td className="px-3 py-1 text-right font-bold text-slate-800 text-xs border-r border-slate-200 tabular-nums">
                          Rs. {item.unitPrice.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Return Qty - Editable Flat Spreadsheet Cell */}
                        <td className="px-2 py-0.5 text-center border-r border-slate-200 bg-rose-50/40">
                          <input
                            ref={(el) => {
                              if (el) returnInputRefs.current.set(item.productId, el);
                              else returnInputRefs.current.delete(item.productId);
                            }}
                            type="number"
                            min="0"
                            max={item.returnableQty}
                            step="any"
                            disabled={isExhausted}
                            value={item.returnQty}
                            onChange={(e) => handleReturnQtyChange(item.productId, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const nextItem = returnItems[index + 1];
                                if (nextItem) {
                                  returnInputRefs.current.get(nextItem.productId)?.focus();
                                }
                              }
                            }}
                            className={`h-7 w-20 rounded bg-transparent px-1.5 text-center text-xs font-bold tabular-nums transition focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              item.returnQty > 0
                                ? 'text-rose-900 font-extrabold bg-rose-100/80 border border-rose-300'
                                : 'text-slate-700 hover:bg-rose-100/40'
                            }`}
                          />
                        </td>

                        {/* Refund Amount (Rs) */}
                        <td className="px-3 py-1 text-right font-bold text-xs border-r border-slate-200 tabular-nums text-rose-700">
                          Rs. {lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Stock Action */}
                        <td className="px-2 py-1 text-center">
                          {item.returnQty > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                              +{item.returnQty} to Stock
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ========================================================= */}
          {/* 4. REFUND MODE, REASON & ACTION CONTROLS FOOTER           */}
          {/* ========================================================= */}
          <div className="shrink-0 border-t border-slate-300 bg-slate-50 px-4 py-2.5 space-y-2 select-none">
            {/* Upper: Settlement Options */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                {/* Refund Mode Selector */}
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-slate-600" />
                    <span>Refund Mode:</span>
                  </label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value as PaymentMode)}
                    className="h-7.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-rose-600 focus:outline-none cursor-pointer"
                  >
                    <option value="CASH">Cash Drawer Refund (Deducts Today's Cash)</option>
                    <option value="CARD">Card / POS Reversal</option>
                    <option value="BANK">Bank Account Transfer</option>
                  </select>
                </div>

                {/* Return Reason */}
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-slate-700">Reason:</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-7.5 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-rose-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Customer Return / Exchange">Customer Return / Exchange</option>
                    <option value="Defective / Damaged Goods">Defective / Damaged Goods</option>
                    <option value="Wrong Specification Delivered">Wrong Specification Delivered</option>
                    <option value="Excess Quantity Purchased">Excess Quantity Purchased</option>
                    <option value="Order Cancelled">Order Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Middle: Summary Stats */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span>Return Lines:</span>
                  <strong className="text-slate-900">{activeReturnLinesCount}</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Return Units:</span>
                  <strong className="text-slate-900">{totalUnitsToReturn}</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Refund Tax:</span>
                  <strong className="text-slate-900">
                    Rs. {returnTaxTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Lower: Total Payable & Save Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Refund Amount Payable:</span>
                <span className="text-lg font-black text-rose-700 tracking-tight">
                  Rs. {refundPayableTotal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      activeReturnLinesCount > 0 &&
                      !window.confirm('You have return quantities pending. Close without completing return?')
                    ) {
                      return;
                    }
                    closeSalesReturnModal();
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancel (Esc)
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmitReturn()}
                  disabled={submitting || activeReturnLinesCount === 0 || !originalInvoice}
                  className={`flex items-center gap-1.5 rounded-lg px-5 py-1.5 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:cursor-not-allowed ${
                    activeReturnLinesCount > 0 && originalInvoice
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/20 active:scale-98'
                      : 'bg-slate-400 opacity-60'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing Return...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        Confirm Return &amp; Restore Stock (Ctrl+S)
                        {activeReturnLinesCount > 0 ? ` (${activeReturnLinesCount})` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INVOICE MODAL POPUP (For immediately viewing & printing Credit Note) */}
      {viewInvoiceId && (
        <InvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
      )}
    </>
  );
}
