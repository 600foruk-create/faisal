'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
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
  condition: 'SALABLE' | 'DAMAGED';
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
  const [showInvoiceSidebar, setShowInvoiceSidebar] = useState(true);

  // Branch Selection (Multi-Tenant Ready)
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [selectedBranchId, setSelectedBranchId] = useState<number>(initialBranch);

  // Search & Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState(selectedInvoiceNoForReturn || '');
  const [recentSales, setRecentSales] = useState<InvoiceRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Loaded Invoice Data
  const [originalInvoice, setOriginalInvoice] = useState<InvoiceDetail | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [refundMode, setRefundMode] = useState<PaymentMode>('CASH');
  const [reasonTag, setReasonTag] = useState<string>('Customer Return');
  const [customReason, setCustomReason] = useState<string>('');

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

  // Fetch recent sales invoices for the left panel browser
  const loadRecentSales = useCallback(async (branchId: number) => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/sales?branchId=${branchId}&invoiceType=SALE&limit=30`);
      if (res.ok) {
        const data = (await res.json()) as { invoices?: InvoiceRecord[] };
        setRecentSales(data.invoices || []);
      }
    } catch {
      // Ignore initial network errors
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
        setBarcodeInput(inv.invoice_no);

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
            condition: 'SALABLE',
          };
        });

        setReturnItems(itemsState);
        setRefundMode(inv.payment_mode === 'CARD' ? 'CARD' : 'CASH');
        showToast(`Bill #${inv.invoice_no} loaded successfully (${itemsState.length} items).`, 'success');
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

  // Stepper increment/decrement
  const handleStepQty = useCallback((productId: number, delta: number) => {
    setReturnItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const nextQty = Math.max(0, Math.min(it.returnableQty, it.returnQty + delta));
        return {
          ...it,
          returnQty: nextQty,
        };
      })
    );
  }, []);

  // Toggle condition (Salable vs Damaged)
  const handleToggleCondition = useCallback((productId: number) => {
    setReturnItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        return {
          ...it,
          condition: it.condition === 'SALABLE' ? 'DAMAGED' : 'SALABLE',
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

  // Filtered recent bills in left sidebar
  const filteredRecentBills = useMemo(() => {
    if (!searchQuery.trim()) return recentSales;
    const q = searchQuery.toLowerCase().trim();
    return recentSales.filter(
      (b) =>
        b.invoice_no.toLowerCase().includes(q) ||
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.cashier_name && b.cashier_name.toLowerCase().includes(q)) ||
        String(b.total_amount).includes(q)
    );
  }, [recentSales, searchQuery]);

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
      showToast('Please select or look up a sale bill first.', 'error');
      return;
    }

    const selectedItems = returnItems
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.returnQty,
      }));

    if (selectedItems.length === 0) {
      showToast('Please enter return quantity for at least one item.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const conditionNotes = returnItems
        .filter((i) => i.returnQty > 0 && i.condition === 'DAMAGED')
        .map((i) => `${i.sku} (Damaged)`)
        .join(', ');

      const combinedReason = [
        reasonTag,
        customReason.trim(),
        conditionNotes ? `[Items Marked Damaged: ${conditionNotes}]` : '',
      ]
        .filter(Boolean)
        .join(' - ');

      const payload = {
        originalInvoiceId: originalInvoice.id,
        userId: activeUser?.id ?? null,
        cashierName: activeUser?.full_name ?? 'POS Cashier',
        refundMode,
        reason: combinedReason || 'Customer Return',
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
        `Sales Return #${returnInv.invoice_no} completed! Inventory stock restored to branch.`,
        'success'
      );

      triggerInventoryRefresh();
      triggerRefresh();
      setViewInvoiceId(returnInv.id);

      // Reload original invoice & recent bills
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
    reasonTag,
    customReason,
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
              : 'h-[95vh] w-full max-w-[1540px]'
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

              {/* Toggle Sidebar Button */}
              <button
                type="button"
                onClick={() => setShowInvoiceSidebar((prev) => !prev)}
                title={showInvoiceSidebar ? 'Hide Bills Browser' : 'Show Bills Browser'}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/20 hover:text-white cursor-pointer transition"
              >
                <Clock className="h-3 w-3 text-rose-300" />
                <span className="hidden md:inline">
                  {showInvoiceSidebar ? 'Hide Bills' : 'Browse Bills'}
                </span>
              </button>

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
          {/* 2. MAIN DUAL-PANEL WORKSPACE                             */}
          {/* ========================================================= */}
          <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-100">
            {/* ------------------------------------------------------- */}
            {/* LEFT PANEL: INSTANT BILLS BROWSER & LIVE SEARCH         */}
            {/* ------------------------------------------------------- */}
            {showInvoiceSidebar && (
              <div className="w-72 sm:w-80 shrink-0 border-r border-slate-300 bg-white flex flex-col select-none">
                {/* Search Header */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-rose-600" />
                      <span>Recent Sales Invoices</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      {filteredRecentBills.length}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search bill #, customer, amount..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:outline-none"
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

                {/* Bills List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                  {loadingRecent ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto text-rose-500 mb-1" />
                      <span>Loading recent sales...</span>
                    </div>
                  ) : filteredRecentBills.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <FileText className="h-6 w-6 mx-auto text-slate-300 mb-1" />
                      <span>No bills found</span>
                    </div>
                  ) : (
                    filteredRecentBills.map((inv) => {
                      const isSelected = originalInvoice?.id === inv.id;
                      return (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => void lookupInvoice(inv.invoice_no)}
                          className={`w-full text-left p-2.5 rounded-lg transition cursor-pointer mb-1 ${
                            isSelected
                              ? 'bg-rose-50 border border-rose-300 shadow-2xs'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? 'text-rose-900' : 'text-slate-900'
                              }`}
                            >
                              {inv.invoice_no}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                              Rs. {Number(inv.total_amount).toLocaleString('en-PK')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span className="truncate max-w-[170px]" title={inv.customer_name}>
                              {inv.customer_name || 'Walk-in'}
                            </span>
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9.5px] font-bold text-slate-600">
                              {inv.payment_mode}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {inv.invoice_date} • {inv.cashier_name || 'Cashier'}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* RIGHT WORKSPACE: ACTIVE RETURN DESK & SPREADSHEET TABLE */}
            {/* ------------------------------------------------------- */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Fast Barcode / Invoice Input Bar */}
              <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 max-w-xl">
                    <span className="text-xs font-bold text-slate-700 shrink-0">Scan / Enter Bill:</span>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Scan barcode or enter Bill No (e.g. SWT-A-POS-1)..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void lookupInvoice(barcodeInput);
                          }
                        }}
                        className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void lookupInvoice(barcodeInput)}
                      disabled={loadingLookup || !barcodeInput.trim()}
                      className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition shrink-0"
                    >
                      {loadingLookup ? 'Loading...' : 'Load Bill'}
                    </button>
                  </div>

                  {originalInvoice && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReturnAll}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer transition"
                      >
                        Return All Items
                      </button>
                      <button
                        type="button"
                        onClick={handleClearQuantities}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                      >
                        Reset Qty
                      </button>
                    </div>
                  )}
                </div>

                {/* Original Bill Summary Strip */}
                {originalInvoice && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200/80 bg-rose-50/50 px-3 py-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-rose-600" />
                        <span className="font-extrabold text-slate-900">{originalInvoice.invoice_no}</span>
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
                        <span>Paid Via:</span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-200">
                          {originalInvoice.payment_mode}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Original Total Bill:</span>
                      <strong className="ml-1 text-xs font-extrabold text-slate-950">
                        Rs. {originalInvoice.total_amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Pure Spreadsheet Table */}
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  {/* Table Header - DEAD CENTER & ZERO ASTERISKS */}
                  <thead className="bg-[#0e1f3d] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 select-none shadow-xs border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center border-r border-slate-700/80">#</th>
                      <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Item SKU</th>
                      <th className="py-2.5 px-3 min-w-[260px] text-center border-r border-slate-700/80">
                        Item Description &amp; Specifications
                      </th>
                      <th className="py-2.5 px-3 w-24 text-center border-r border-slate-700/80">Sold Qty</th>
                      <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">Prev. Returned</th>
                      <th className="py-2.5 px-3 w-28 text-center border-r border-slate-700/80">Returnable Qty</th>
                      <th className="py-2.5 px-3 w-32 text-center border-r border-slate-700/80">Sale Rate (Rs)</th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80 bg-rose-950/70 text-rose-300">
                        Return Qty
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-slate-700/80">Restock Condition</th>
                      <th className="py-2.5 px-3 w-32 text-center">Refund Total (Rs)</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-200">
                    {!originalInvoice ? (
                      <tr>
                        <td colSpan={10} className="py-24 text-center text-slate-500">
                          <Undo2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                          <p className="font-bold text-sm text-slate-800">Select or Scan a Sale Bill</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Pick any recent bill from the left browser or scan the receipt barcode above to load items.
                          </p>
                        </td>
                      </tr>
                    ) : returnItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-xs text-slate-700">No items found on this bill</p>
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

                            {/* Description */}
                            <td className="px-3 py-1 text-left font-semibold text-slate-900 text-xs border-r border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[320px]" title={item.itemName}>
                                  {item.itemName}
                                </span>
                                {item.returnQty > 0 && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                )}
                              </div>
                            </td>

                            {/* Sold Qty */}
                            <td className="px-3 py-1 text-center font-semibold text-slate-700 text-xs border-r border-slate-200 tabular-nums">
                              {item.soldQty}
                            </td>

                            {/* Prev Returned */}
                            <td className="px-3 py-1 text-center text-xs border-r border-slate-200 tabular-nums">
                              {item.alreadyReturnedQty > 0 ? (
                                <span className="font-bold text-amber-700">{item.alreadyReturnedQty}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            {/* Returnable Qty */}
                            <td className="px-3 py-1 text-center font-bold text-slate-900 text-xs border-r border-slate-200 tabular-nums">
                              {item.returnableQty}
                            </td>

                            {/* Sale Rate */}
                            <td className="px-3 py-1 text-right font-bold text-slate-800 text-xs border-r border-slate-200 tabular-nums">
                              Rs. {item.unitPrice.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Return Qty with Steppers & Flat Cell */}
                            <td className="px-2 py-0.5 text-center border-r border-slate-200 bg-rose-50/40">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={isExhausted || item.returnQty <= 0}
                                  onClick={() => handleStepQty(item.productId, -1)}
                                  className="h-6 w-6 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>

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
                                  className={`h-7 w-16 rounded bg-transparent px-1 text-center text-xs font-bold tabular-nums transition focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    item.returnQty > 0
                                      ? 'text-rose-900 font-extrabold bg-rose-100/90 border border-rose-300'
                                      : 'text-slate-700 hover:bg-rose-100/40'
                                  }`}
                                />

                                <button
                                  type="button"
                                  disabled={isExhausted || item.returnQty >= item.returnableQty}
                                  onClick={() => handleStepQty(item.productId, 1)}
                                  className="h-6 w-6 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>

                            {/* Restock Condition */}
                            <td className="px-2 py-1 text-center border-r border-slate-200">
                              {item.returnQty > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCondition(item.productId)}
                                  title="Click to toggle condition"
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                                    item.condition === 'SALABLE'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {item.condition === 'SALABLE' ? (
                                    <>
                                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                      <span>Good (Restock)</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldAlert className="h-3 w-3 text-amber-600" />
                                      <span>Damaged</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>

                            {/* Refund Total */}
                            <td className="px-3 py-1 text-right font-bold text-xs tabular-nums text-rose-700">
                              Rs. {lineTotal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Settlement & Refund Action Footer */}
              <div className="shrink-0 border-t border-slate-300 bg-slate-50 px-4 py-2.5 space-y-2 select-none">
                {/* Settlement Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 pb-2">
                  {/* Refund Mode Interactive Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5 text-slate-600" />
                      <span>Refund Mode:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setRefundMode('CASH')}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        refundMode === 'CASH'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      💵 Cash Drawer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMode('CARD')}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        refundMode === 'CARD'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      💳 Card Reversal
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMode('BANK')}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        refundMode === 'BANK'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      🏦 Bank Transfer
                    </button>
                  </div>

                  {/* Return Reason Quick Tags */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600">Reason:</span>
                    <select
                      value={reasonTag}
                      onChange={(e) => setReasonTag(e.target.value)}
                      className="h-7.5 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-rose-600 focus:outline-none cursor-pointer"
                    >
                      <option value="Customer Return">Customer Return / Exchange</option>
                      <option value="Defective / Damaged">Defective / Damaged Goods</option>
                      <option value="Wrong Specification">Wrong Specification Delivered</option>
                      <option value="Excess Quantity">Excess Quantity Purchased</option>
                      <option value="Order Cancelled">Order Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Final Totals & Save Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Summary Breakdown */}
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1">
                      <span>Items:</span>
                      <strong className="text-slate-900">{activeReturnLinesCount}</strong>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <span>Units:</span>
                      <strong className="text-slate-900">{totalUnitsToReturn}</strong>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <span>Refund Tax:</span>
                      <strong className="text-slate-900">
                        Rs. {returnTaxTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-semibold">Total Refund Due:</span>
                      <strong className="text-base font-black text-rose-700 ml-1">
                        Rs. {refundPayableTotal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  {/* Save Buttons */}
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
        </div>
      </div>

      {/* INVOICE MODAL POPUP (For immediately viewing & printing Credit Note) */}
      {viewInvoiceId && (
        <InvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
      )}
    </>
  );
}
