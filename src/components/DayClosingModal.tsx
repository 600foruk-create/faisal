'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileText,
  HelpCircle,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency, getLocalIsoDate, roundMoney } from '@/lib/format';
import type { DayClosingPreview, DayClosingRecord } from '@/lib/types';

interface DenominationCounts {
  n5000: number;
  n1000: number;
  n500: number;
  n100: number;
  n50: number;
  n20: number;
  n10: number;
  coins: number;
}

const DEFAULT_DENOMINATIONS: DenominationCounts = {
  n5000: 0,
  n1000: 0,
  n500: 0,
  n100: 0,
  n50: 0,
  n20: 0,
  n10: 0,
  coins: 0,
};

export function DayClosingModal() {
  const {
    branches,
    activeBranchId,
    activeUser,
    settings,
    closeDayClosingModal,
    refreshNonce,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Multi-Tenant Branch Selection
  const initialBranch = activeBranchId ?? branches[0]?.id ?? 1;
  const [branchId, setBranchId] = useState<number>(initialBranch);
  const [closingDate, setClosingDate] = useState<string>(() => getLocalIsoDate());
  const [openingCash, setOpeningCash] = useState<string>('5000');
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Currency Denomination Calculator
  const [showDenomCalc, setShowDenomCalc] = useState(true);
  const [denoms, setDenoms] = useState<DenominationCounts>(DEFAULT_DENOMINATIONS);

  // Preview & History State
  const [preview, setPreview] = useState<DayClosingPreview | null>(null);
  const [history, setHistory] = useState<DayClosingRecord[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DayClosingRecord | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  // Update selected branch when global active branch changes
  useEffect(() => {
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) {
      setBranchId(activeBranchId);
    }
  }, [activeBranchId, branches]);

  // Load preview and closing history for selected branch & date
  const loadClosingData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branchId: String(branchId),
        date: closingDate,
        openingCash: openingCash || '0',
      });
      const res = await fetch(`/api/closing?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          preview: DayClosingPreview | null;
          history: DayClosingRecord[];
        };
        setPreview(data.preview);
        setHistory(data.history || []);

        // If today's closing is open, auto-suggest expected cash
        if (data.preview && !data.preview.already_closed && !countedCash) {
          setCountedCash(String(data.preview.expected_cash));
        }
      } else {
        showToast('Failed to load day closing data from server.', 'error');
      }
    } catch {
      showToast('Network error while loading closing details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [branchId, closingDate, openingCash, countedCash, showToast]);

  useEffect(() => {
    void loadClosingData();
  }, [loadClosingData, refreshNonce]);

  // Denominations Total Calculation
  const denomTotal = useMemo(() => {
    return (
      denoms.n5000 * 5000 +
      denoms.n1000 * 1000 +
      denoms.n500 * 500 +
      denoms.n100 * 100 +
      denoms.n50 * 50 +
      denoms.n20 * 20 +
      denoms.n10 * 10 +
      denoms.coins
    );
  }, [denoms]);

  // Apply denomination count changes
  const updateDenom = (field: keyof DenominationCounts, delta: number) => {
    setDenoms((prev) => {
      const newVal = Math.max(0, (prev[field] || 0) + delta);
      const updated = { ...prev, [field]: newVal };
      // Auto-update counted cash
      const newTotal =
        updated.n5000 * 5000 +
        updated.n1000 * 1000 +
        updated.n500 * 500 +
        updated.n100 * 100 +
        updated.n50 * 50 +
        updated.n20 * 20 +
        updated.n10 * 10 +
        updated.coins;
      setCountedCash(String(newTotal));
      return updated;
    });
  };

  const setDenomDirect = (field: keyof DenominationCounts, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDenoms((prev) => {
      const updated = { ...prev, [field]: num };
      const newTotal =
        updated.n5000 * 5000 +
        updated.n1000 * 1000 +
        updated.n500 * 500 +
        updated.n100 * 100 +
        updated.n50 * 50 +
        updated.n20 * 20 +
        updated.n10 * 10 +
        updated.coins;
      setCountedCash(String(newTotal));
      return updated;
    });
  };

  const resetDenominations = () => {
    setDenoms(DEFAULT_DENOMINATIONS);
  };

  // Current Variance Calculation
  const countedNum = Number(countedCash) || 0;
  const currentExpectedCash = preview ? preview.expected_cash : 0;
  const liveVariance = preview ? roundMoney(countedNum - currentExpectedCash) : 0;

  // Active Branch Record
  const activeBranch = branches.find((b) => b.id === branchId) || {
    id: branchId,
    code: 'HQ',
    display_name: 'Main Branch',
  };

  // Filtered History list
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase().trim();
    return history.filter(
      (h) =>
        h.closing_date.includes(q) ||
        h.branch_display_name.toLowerCase().includes(q) ||
        h.closed_by_name.toLowerCase().includes(q) ||
        (h.notes && h.notes.toLowerCase().includes(q)) ||
        String(h.net_sales).includes(q) ||
        String(h.counted_cash).includes(q)
    );
  }, [history, historySearch]);

  // Handle Finalize Day Closing
  const handleFinalizeClosing = async () => {
    if (!preview || preview.already_closed) return;
    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          closingDate,
          openingCash: Number(openingCash) || 0,
          countedCash: countedNum,
          userId: activeUser?.id ?? null,
          closedByName: activeUser?.full_name ?? 'Branch Manager',
          notes,
        }),
      });

      const data = (await res.json()) as { closing?: DayClosingRecord; error?: string };
      if (!res.ok || !data.closing) {
        showToast(data.error || 'Failed to finalize day closing.', 'error');
        return;
      }

      showToast(
        `Day closing finalized successfully for ${data.closing.branch_display_name} (${data.closing.closing_date}).`,
        'success'
      );
      setNotes('');
      resetDenominations();
      await loadClosingData();
    } catch {
      showToast('Network error finalizing day closing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Printable Z-Report
  const handlePrintZReport = () => {
    window.print();
  };

  // Keyboard navigation: Escape to close, Ctrl+S to finalize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else {
          closeDayClosingModal();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (preview && !preview.already_closed && !selectedHistoryItem && !submitting) {
          setShowConfirmModal(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrintZReport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showConfirmModal,
    closeDayClosingModal,
    preview,
    selectedHistoryItem,
    submitting,
  ]);

  // Determine whether we are viewing a finalized past record
  const viewingClosedRecord: DayClosingRecord | null =
    selectedHistoryItem || (preview?.already_closed ?? null);

  return (
    <>
      {/* Print Stylesheet for clean thermal / A4 Z-Report output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-z-report,
          #printable-z-report * {
            visibility: visible;
          }
          #printable-z-report {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* MODAL BACKDROP */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-[2px] p-2 sm:p-4">
        {/* MODAL CONTAINER */}
        <div
          className={`flex flex-col overflow-hidden rounded-2xl border border-sky-500/30 bg-white shadow-2xl transition-all duration-200 ${
            isMaximized
              ? 'h-full w-full max-w-none rounded-none'
              : 'h-[92vh] max-h-[900px] w-full max-w-[1400px]'
          }`}
        >
          {/* ========================================================================= */}
          {/* EXECUTIVE MIDNIGHT NAVY TITLE BAR                                         */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white select-none">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    viewingClosedRecord ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    viewingClosedRecord ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                <DoorOpen className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tracking-wide text-white">
                    Day Closing & Cash Reconciliation (Z-Report)
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/30">
                    Fiscal Z-Audit
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  Multi-Tenant End-of-Day Balancing, Currency Denominations & Formal Z-Report Archive
                </span>
              </div>
            </div>

            {/* Title Bar Actions & Window Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
                <Store className="h-3.5 w-3.5 text-sky-400" />
                <span className="font-semibold text-white truncate max-w-[220px]">
                  {activeBranch.display_name}
                </span>
              </div>

              {/* Minimize / Maximize / Close Buttons */}
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Collapse view'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restore Window' : 'Maximize Window'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={closeDayClosingModal}
                title="Close (Esc)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOP MULTI-TENANT FILTER & SHIFT STATUS BAR                                */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch / Tenant Switcher */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Branch / Tenant:</span>
                <div className="relative">
                  <select
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(Number(e.target.value));
                      setSelectedHistoryItem(null);
                    }}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 pr-7 font-bold text-slate-800 shadow-xs focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Closing Date:</span>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => {
                    setClosingDate(e.target.value);
                    setSelectedHistoryItem(null);
                  }}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 font-bold text-slate-800 shadow-xs focus:border-sky-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setClosingDate(getLocalIsoDate());
                    setSelectedHistoryItem(null);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
                >
                  Today
                </button>
              </div>

              {/* Opening Cash Float */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Float:</span>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-400 font-bold">
                    {settings.currency_symbol}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    disabled={Boolean(preview?.already_closed || selectedHistoryItem)}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="5000"
                    className="h-8 w-24 rounded-lg border border-slate-300 bg-white pl-7 pr-2 font-bold tabular-nums text-slate-800 shadow-xs focus:border-sky-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Status & Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {viewingClosedRecord ? (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Day Finalized (Z-Report Closed)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 font-bold text-amber-900">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Open Shift (Reconciliation Pending)</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadClosingData()}
                disabled={loading}
                title="Refresh Day Data"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TOAST MESSAGE BANNER                                                      */}
          {/* ========================================================================= */}
          {toastMessage && (
            <div
              className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold ${
                toastMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span className="flex-1">{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="rounded p-0.5 hover:bg-black/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DUAL-PANEL WORKSPACE                                                      */}
          {/* ========================================================================= */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* ----------------------------------------------------------------------- */}
            {/* LEFT MASTER PANEL: CLOSING ARCHIVE & AUDIT TRAIL (~30% WIDTH)           */}
            {/* ----------------------------------------------------------------------- */}
            <div className="flex w-full flex-col border-r border-slate-200 bg-slate-50/70 sm:w-[360px] lg:w-[380px] shrink-0">
              {/* History Search Header */}
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Closing Archive
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 tabular-nums">
                    {history.length} Closings
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search date, manager, amount..."
                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-hidden"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Return to Live Today Button */}
                {selectedHistoryItem && (
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(null)}
                    className="flex h-7 items-center justify-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200 px-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Return to Live Shift ({closingDate})</span>
                  </button>
                )}
              </div>

              {/* Scrollable History List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <DoorOpen className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No day closings found</p>
                    <p className="text-[11px] text-slate-400">
                      Finalized shift closings will appear in this archive.
                    </p>
                  </div>
                ) : (
                  filteredHistory.map((h) => {
                    const isSelected = selectedHistoryItem?.id === h.id;
                    const isZeroVariance = h.variance === 0;
                    const isNegative = h.variance < 0;

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHistoryItem(h)}
                        className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 text-left transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-1 ring-sky-500/20'
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Calendar className="h-3.5 w-3.5 text-sky-600" />
                            <span>{h.closing_date}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              #{h.id}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums ${
                              isZeroVariance
                                ? 'bg-emerald-100 text-emerald-800'
                                : isNegative
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isZeroVariance
                              ? 'Balanced'
                              : isNegative
                                ? `Short: ${formatCurrency(h.variance, settings.currency_symbol)}`
                                : `Over: +${formatCurrency(h.variance, settings.currency_symbol)}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <div className="flex items-center gap-1 truncate max-w-[170px]">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="truncate">{h.closed_by_name}</span>
                          </div>
                          <div className="font-bold text-slate-900 tabular-nums">
                            Net: {formatCurrency(h.net_sales, settings.currency_symbol)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] text-slate-500 border-t border-slate-100 pt-1">
                          <span>
                            Expected:{' '}
                            <strong className="text-slate-700 tabular-nums">
                              {formatCurrency(h.expected_cash, settings.currency_symbol)}
                            </strong>
                          </span>
                          <span>
                            Counted:{' '}
                            <strong className="text-slate-900 tabular-nums">
                              {formatCurrency(h.counted_cash, settings.currency_symbol)}
                            </strong>
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* RIGHT DETAIL PANEL: RECONCILIATION & Z-REPORT WORKSPACE                 */}
            {/* ----------------------------------------------------------------------- */}
            <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50/40 p-4 sm:p-5">
              {/* ===================================================================== */}
              {/* VIEW 1: HISTORICAL OR ALREADY FINALIZED OFFICIAL Z-REPORT             */}
              {/* ===================================================================== */}
              {viewingClosedRecord ? (
                <div
                  id="printable-z-report"
                  className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {/* Z-Report Formal Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-white uppercase">
                          Official Fiscal Audit
                        </span>
                        <span className="text-xs text-slate-500">
                          Z-Report Serial: #{viewingClosedRecord.id}
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                        {settings.business_name || 'Retail Point of Sale'}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Store className="h-3.5 w-3.5 text-sky-600" />
                          {viewingClosedRecord.branch_display_name}
                        </span>
                        {settings.ntn && (
                          <>
                            <span>•</span>
                            <span>NTN: <strong>{settings.ntn}</strong></span>
                          </>
                        )}
                        {settings.strn && (
                          <>
                            <span>•</span>
                            <span>STRN: <strong>{settings.strn}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Date: <strong>{viewingClosedRecord.closing_date}</strong></span>
                        <span>•</span>
                        <span>
                          Finalized At:{' '}
                          <strong className="tabular-nums">
                            {viewingClosedRecord.created_at}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="no-print flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrintZReport}
                        className="flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print Z-Report Slip (Ctrl+P)</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Executive Highlight KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Gross Sales
                      </span>
                      <div className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                        {formatCurrency(
                          viewingClosedRecord.gross_sales,
                          settings.currency_symbol
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                        Sales Returns
                      </span>
                      <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                        -{formatCurrency(
                          viewingClosedRecord.returns_total,
                          settings.currency_symbol
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
                      <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                        Net Sales Revenue
                      </span>
                      <div className="mt-1 text-lg font-black text-sky-900 tabular-nums">
                        {formatCurrency(
                          viewingClosedRecord.net_sales,
                          settings.currency_symbol
                        )}
                      </div>
                    </div>

                    <div
                      className={`rounded-xl border p-3.5 ${
                        viewingClosedRecord.variance === 0
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : viewingClosedRecord.variance < 0
                            ? 'border-rose-200 bg-rose-50/70'
                            : 'border-sky-200 bg-sky-50/70'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          viewingClosedRecord.variance === 0
                            ? 'text-emerald-800'
                            : viewingClosedRecord.variance < 0
                              ? 'text-rose-800'
                              : 'text-sky-800'
                        }`}
                      >
                        Cash Variance
                      </span>
                      <div
                        className={`mt-1 text-lg font-black tabular-nums ${
                          viewingClosedRecord.variance === 0
                            ? 'text-emerald-700'
                            : viewingClosedRecord.variance < 0
                              ? 'text-rose-700'
                              : 'text-sky-700'
                        }`}
                      >
                        {formatCurrency(
                          viewingClosedRecord.variance,
                          settings.currency_symbol
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Tables Grid */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* Tender & Inflow Settlement Audit */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-800 border-b border-slate-200">
                        Payment Tender Breakdown
                      </div>
                      <div className="p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Net Cash Received:</span>
                          <strong className="text-slate-900 tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.cash_received,
                              settings.currency_symbol
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Card / POS Terminals:</span>
                          <strong className="text-slate-900 tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.card_received,
                              settings.currency_symbol
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Bank Transfer / Raast:</span>
                          <strong className="text-slate-900 tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.bank_received,
                              settings.currency_symbol
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                          <span>Total Settlements:</span>
                          <span className="tabular-nums">
                            {formatCurrency(
                              roundMoney(
                                viewingClosedRecord.cash_received +
                                viewingClosedRecord.card_received +
                                viewingClosedRecord.bank_received
                              ),
                              settings.currency_symbol
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cash Drawer Reconciliation Summary */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-800 border-b border-slate-200">
                        Cash Drawer Reconciliation
                      </div>
                      <div className="p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Opening Float:</span>
                          <strong className="text-slate-800 tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.opening_cash,
                              settings.currency_symbol
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Net Cash Collected:</span>
                          <strong className="text-slate-800 tabular-nums">
                            +{formatCurrency(
                              viewingClosedRecord.cash_received,
                              settings.currency_symbol
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                          <span>Expected Cash in Drawer:</span>
                          <span className="tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.expected_cash,
                              settings.currency_symbol
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Actual Physical Count:</span>
                          <span className="text-sky-700 tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.counted_cash,
                              settings.currency_symbol
                            )}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between border-t border-slate-300 pt-2 text-sm font-extrabold ${
                            viewingClosedRecord.variance === 0
                              ? 'text-emerald-700'
                              : viewingClosedRecord.variance < 0
                                ? 'text-rose-700'
                                : 'text-sky-700'
                          }`}
                        >
                          <span>Cash Variance:</span>
                          <span className="tabular-nums">
                            {formatCurrency(
                              viewingClosedRecord.variance,
                              settings.currency_symbol
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auditor Notes & Signatures */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span>Shift Notes & Audit Remarks</span>
                    </div>
                    <p className="mt-1 text-slate-600 italic">
                      {viewingClosedRecord.notes || 'No closing notes recorded.'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-3 text-slate-600">
                      <div>
                        Closed & Verified By:{' '}
                        <strong className="text-slate-900">
                          {viewingClosedRecord.closed_by_name}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Reconciliation Locked & Audited</span>
                      </div>
                    </div>
                  </div>

                  {/* Print-Only Signature Lines */}
                  <div className="hidden print:flex justify-between pt-16 text-xs text-slate-700 border-t border-slate-300 mt-8">
                    <div className="text-center w-48 border-t border-slate-400 pt-1">
                      Cashier Signature
                    </div>
                    <div className="text-center w-48 border-t border-slate-400 pt-1">
                      Branch Manager Signature
                    </div>
                  </div>
                </div>
              ) : (
                /* ===================================================================== */
                /* VIEW 2: PERFORM LIVE RECONCILIATION & CLOSING (OPEN SHIFT)            */
                /* ===================================================================== */
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                  {/* Top Live System Sales Audit Grid */}
                  {preview && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {/* Gross Sales */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Gross Invoices ({preview.sales_count})
                        </span>
                        <div className="mt-1.5 text-xl font-black text-slate-900 tabular-nums">
                          {formatCurrency(preview.gross_sales, settings.currency_symbol)}
                        </div>
                        <span className="text-[10px] text-slate-400">Total bills issued</span>
                      </div>

                      {/* Returns */}
                      <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-2xs">
                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                          Returns & Refunds ({preview.returns_count})
                        </span>
                        <div className="mt-1.5 text-xl font-black text-rose-700 tabular-nums">
                          -{formatCurrency(preview.returns_total, settings.currency_symbol)}
                        </div>
                        <span className="text-[10px] text-slate-400">Total customer returns</span>
                      </div>

                      {/* Net Sales */}
                      <div className="rounded-xl border border-sky-200 bg-white p-4 shadow-2xs">
                        <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                          Net Sales Revenue
                        </span>
                        <div className="mt-1.5 text-xl font-black text-sky-900 tabular-nums">
                          {formatCurrency(preview.net_sales, settings.currency_symbol)}
                        </div>
                        <span className="text-[10px] text-slate-400">Gross minus returns</span>
                      </div>

                      {/* Expected Cash in Drawer */}
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 shadow-2xs">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          Expected Cash in Drawer
                        </span>
                        <div className="mt-1.5 text-xl font-black text-emerald-800 tabular-nums">
                          {formatCurrency(preview.expected_cash, settings.currency_symbol)}
                        </div>
                        <span className="text-[10px] text-emerald-700">Float + Cash - Refunds</span>
                      </div>
                    </div>
                  )}

                  {/* Cash Flow Summary & Expected Cash Formula Banner */}
                  {preview && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-slate-800">
                            Cash Drawer Calculation Breakdown
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span>
                            Card Sales: <strong>{formatCurrency(preview.card_sales, settings.currency_symbol)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Bank / Raast: <strong>{formatCurrency(preview.bank_sales, settings.currency_symbol)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            1. Opening Float
                          </span>
                          <div className="mt-1 font-bold text-slate-800 tabular-nums text-sm">
                            {formatCurrency(preview.opening_cash, settings.currency_symbol)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-emerald-700">
                            2. + Cash Sales
                          </span>
                          <div className="mt-1 font-bold text-emerald-800 tabular-nums text-sm">
                            +{formatCurrency(preview.cash_sales, settings.currency_symbol)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-rose-50 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-rose-700">
                            3. - Cash Refunds
                          </span>
                          <div className="mt-1 font-bold text-rose-800 tabular-nums text-sm">
                            -{formatCurrency(preview.cash_refunds, settings.currency_symbol)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-sky-50 border border-sky-200 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-sky-800">
                            = Expected in Drawer
                          </span>
                          <div className="mt-1 font-black text-sky-900 tabular-nums text-sm">
                            {formatCurrency(preview.expected_cash, settings.currency_symbol)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Physical Count & Currency Denomination Calculator Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-sky-600" />
                          <span>Actual Counted Cash & Currency Denominations</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Count physical currency notes or enter total cash directly to calculate drawer variance.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDenomCalc((prev) => !prev)}
                          className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          {showDenomCalc ? 'Hide Calculator' : 'Show Denominations'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (preview) {
                              setCountedCash(String(preview.expected_cash));
                            }
                          }}
                          className="h-8 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                        >
                          Match Expected ({formatCurrency(currentExpectedCash, settings.currency_symbol)})
                        </button>
                      </div>
                    </div>

                    {/* Denomination Counter Matrix */}
                    {showDenomCalc && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            Pakistani Currency Notes Breakdown:
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500">
                              Denominations Total:{' '}
                              <strong className="text-slate-900 font-extrabold tabular-nums">
                                {formatCurrency(denomTotal, settings.currency_symbol)}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={resetDenominations}
                              className="text-[11px] text-rose-600 hover:underline font-semibold"
                            >
                              Reset Notes
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-4">
                          {/* 5000 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 5,000</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n5000', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n5000 || ''}
                                onChange={(e) => setDenomDirect('n5000', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n5000', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 1000 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 1,000</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n1000', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n1000 || ''}
                                onChange={(e) => setDenomDirect('n1000', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n1000', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 500 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 500</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n500', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n500 || ''}
                                onChange={(e) => setDenomDirect('n500', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n500', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 100 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 100</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n100', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n100 || ''}
                                onChange={(e) => setDenomDirect('n100', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n100', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 50 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 50</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n50', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n50 || ''}
                                onChange={(e) => setDenomDirect('n50', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n50', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 20 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 20</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n20', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n20 || ''}
                                onChange={(e) => setDenomDirect('n20', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n20', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 10 */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Rs. 10</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateDenom('n10', -1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={denoms.n10 || ''}
                                onChange={(e) => setDenomDirect('n10', e.target.value)}
                                className="h-6 w-12 rounded border border-slate-200 text-center font-bold tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => updateDenom('n10', 1)}
                                className="h-6 w-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Coins / Small Change */}
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                            <span className="font-bold text-slate-800 w-12">Coins / Change</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={denoms.coins || ''}
                                onChange={(e) => setDenomDirect('coins', e.target.value)}
                                placeholder="0"
                                className="h-6 w-20 rounded border border-slate-200 text-right pr-2 font-bold tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Direct Counted Cash Input & Live Real-Time Variance */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Actual Counted Cash in Drawer ({settings.currency_symbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-base">
                            {settings.currency_symbol}
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={countedCash}
                            onChange={(e) => setCountedCash(e.target.value)}
                            placeholder="0.00"
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-lg font-black text-slate-900 tabular-nums shadow-xs focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                            required
                          />
                        </div>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Total physical currency counted in register before safe deposit.
                        </span>
                      </div>

                      {/* Live Variance Callout */}
                      <div
                        className={`flex flex-col justify-center rounded-xl border p-3.5 ${
                          liveVariance === 0
                            ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                            : liveVariance < 0
                              ? 'border-rose-300 bg-rose-50/80 text-rose-900'
                              : 'border-sky-300 bg-sky-50/80 text-sky-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Cash Variance Status
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              liveVariance === 0
                                ? 'bg-emerald-200 text-emerald-900'
                                : liveVariance < 0
                                  ? 'bg-rose-200 text-rose-900'
                                  : 'bg-sky-200 text-sky-900'
                            }`}
                          >
                            {liveVariance === 0
                              ? 'Balanced'
                              : liveVariance < 0
                                ? 'Deficit / Shortage'
                                : 'Surplus / Excess'}
                          </span>
                        </div>
                        <div className="mt-1.5 text-2xl font-black tabular-nums">
                          {formatCurrency(liveVariance, settings.currency_symbol)}
                        </div>
                        <span className="text-[11px] font-medium opacity-85">
                          {liveVariance === 0
                            ? 'Physical cash perfectly matches expected sales.'
                            : liveVariance < 0
                              ? `Register is short by ${formatCurrency(Math.abs(liveVariance), settings.currency_symbol)}.`
                              : `Register has ${formatCurrency(liveVariance, settings.currency_symbol)} in excess cash.`}
                        </span>
                      </div>
                    </div>

                    {/* Shift Remarks & Manager Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Shift Remarks / Variance Explanation
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Evening shift closing completed by Tariq. Safe drop deposit voucher #488 attached..."
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ACTIONS FOOTER                                                     */}
          {/* ========================================================================= */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User className="h-4 w-4 text-slate-400" />
              <span>
                Auditor:{' '}
                <strong className="text-slate-800">
                  {activeUser?.full_name ?? 'Branch Manager'}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Branch: <strong>{activeBranch.display_name}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={closeDayClosingModal}
                className="h-9 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Close (Esc)
              </button>

              <button
                type="button"
                onClick={handlePrintZReport}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>Print Slip (Ctrl+P)</span>
              </button>

              {!viewingClosedRecord && (
                <button
                  type="button"
                  disabled={submitting || !preview}
                  onClick={() => setShowConfirmModal(true)}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 text-xs font-extrabold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 transition disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {submitting ? 'Finalizing...' : 'Finalize Day Closing (Ctrl+S)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINALIZATION CONFIRMATION MODAL                                           */}
      {/* ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Day Closing
                </h3>
                <span className="text-xs text-slate-500">
                  {activeBranch.display_name} • {closingDate}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to finalize the day closing for{' '}
              <strong className="text-slate-900">{closingDate}</strong>? Once closed, this
              reconciliation will be permanently recorded in the fiscal audit log and a Z-Report
              will be locked.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Expected Cash:</span>
                <strong className="text-slate-900 tabular-nums">
                  {formatCurrency(currentExpectedCash, settings.currency_symbol)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Counted Cash:</span>
                <strong className="text-slate-900 tabular-nums">
                  {formatCurrency(countedNum, settings.currency_symbol)}
                </strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-600">Variance:</span>
                <span
                  className={
                    liveVariance === 0
                      ? 'text-emerald-700 tabular-nums'
                      : liveVariance < 0
                        ? 'text-rose-700 tabular-nums'
                        : 'text-sky-700 tabular-nums'
                  }
                >
                  {formatCurrency(liveVariance, settings.currency_symbol)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-9 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinalizeClosing()}
                className="h-9 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? 'Finalizing...' : 'Yes, Finalize Day Closing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
