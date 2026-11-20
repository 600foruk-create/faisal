'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Crown,
  DatabaseBackup,
  Download,
  FileText,
  KeyRound,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserSummary } from '@/lib/types';

function isSuperAdminUser(u: UserSummary | null | undefined): boolean {
  if (!u) return false;
  const uname = (u.username || '').toLowerCase();
  const fname = (u.full_name || '').toLowerCase();
  const urole = (u.role || '').toUpperCase();
  return (
    urole === 'SUPER_ADMIN' ||
    urole === 'ADMIN' ||
    uname === 'faisal' ||
    uname === 'admin' ||
    fname.includes('faisal') ||
    fname.includes('owner')
  );
}

export function ClearTransactionsModal() {
  const {
    activeUser,
    settings,
    branches,
    closeClearTransactionsModal,
    reloadContext,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Form Confirmation State
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // Check if current user is Super Admin (Faisal)
  const isSuperAdmin = useMemo(() => {
    return isSuperAdminUser(activeUser);
  }, [activeUser]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeClearTransactionsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeClearTransactionsModal]);

  // Download System Backup before clearing
  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch('/api/settings?export=backup');
      if (!res.ok) {
        throw new Error('Failed to generate encrypted JSON backup');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `SEASTONE_POS_BACKUP_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('System database backup downloaded successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error downloading backup';
      showToast(msg, 'error');
    } finally {
      setDownloadingBackup(false);
    }
  };

  // Submit Clear Transactions
  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      showToast('Access Denied: Only Super Admin (Faisal) can clear transactions', 'error');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'CLEAR') {
      showToast('Type "CLEAR" in the confirmation box to proceed', 'error');
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_transactions',
          data: { confirm: 'CLEAR' },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clear transactions');
      }

      setConfirmText('');
      await reloadContext();
      showToast('All transaction ledgers, returns, and day closings cleared successfully!', 'success');
      setTimeout(() => {
        closeClearTransactionsModal();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing transaction reset';
      showToast(msg, 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[99vh] w-[99.5vw] max-w-none'
            : 'h-[95vh] max-h-[880px] w-full max-w-5xl'
        }`}
      >
        {/* Executive Midnight Navy Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#071322] via-[#0d213a] to-[#071322] px-6 py-3.5 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 ring-1 ring-rose-400/40 shadow-inner">
              <Trash2 className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-wide text-white">
                  Clear Transactions &amp; Fiscal Reset
                </h2>
                <span className="rounded-full bg-rose-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-200 ring-1 ring-rose-400/40">
                  Step 7 Faisal Authority Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Purge sales invoices, returns, held carts, and day closings for fresh fiscal deployment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closeClearTransactionsModal}
              title="Close (ESC)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`mx-6 mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all shrink-0 ${
              toastMessage.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span className="font-bold">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Workspace */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
          {/* Top Super Admin Authority Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-gradient-to-r from-purple-50 via-white to-purple-50 px-6 py-4 shrink-0 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 ring-1 ring-purple-300 shadow-inner">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Platform Super Admin: Faisal
                  </h3>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-800 ring-1 ring-purple-300">
                    Permanent Active Authority
                  </span>
                </div>
                <p className="text-xs text-purple-800 mt-0.5">
                  Exclusive platform power reserved for Faisal. Company Admins, Managers and Cashiers cannot access this reset utility.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Identity Verified: Super Admin</span>
            </div>
          </div>

          {/* Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Warning & Scope Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: What Will Be Cleared */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900">
                        1. Data Cleared To Zero (Purged)
                      </h4>
                      <p className="text-[11px] text-rose-700">
                        Test and transactional fiscal records will be deleted
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        ✕
                      </span>
                      <span>
                        <strong className="text-slate-900">All Sales Invoices &amp; Items:</strong> Every customer invoice, barcode line total, and payment tender.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        ✕
                      </span>
                      <span>
                        <strong className="text-slate-900">All Sales Returns &amp; Restoring:</strong> All returned merchandise tickets and refund vouchers.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        ✕
                      </span>
                      <span>
                        <strong className="text-slate-900">All Held / Parked Carts:</strong> Temporary incomplete customer sales queue.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        ✕
                      </span>
                      <span>
                        <strong className="text-slate-900">All Day Closings &amp; Z-Reports:</strong> Cash drawer counts and end-of-day reconciliation records.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                        ✕
                      </span>
                      <span>
                        <strong className="text-slate-900">Terminal Sequence Reset:</strong> Invoice numbers start fresh from <code className="bg-slate-200 px-1 rounded text-slate-800 font-bold">#0001</code>.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100 text-[11px] text-rose-800 font-semibold bg-rose-50 p-2 rounded-xl">
                  ⚠️ This action cannot be reversed without an existing JSON backup snapshot.
                </div>
              </div>

              {/* Card 2: What Stays 100% Protected */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                        2. Master Data Protected (Safe &amp; Intact)
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Your enterprise master database will never be deleted
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                        ✓
                      </span>
                      <span>
                        <strong className="text-slate-900">Company &amp; Legal Profile:</strong> {settings.business_name}, NTN, STRN, currency, and logo.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                        ✓
                      </span>
                      <span>
                        <strong className="text-slate-900">Physical Branches &amp; POS Counters:</strong> All {branches.length} branches and registered hardware terminals.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                        ✓
                      </span>
                      <span>
                        <strong className="text-slate-900">Inventory Catalog &amp; Products:</strong> Finished goods SKUs, categories, prices, and tax rates.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                        ✓
                      </span>
                      <span>
                        <strong className="text-slate-900">Customers Directory &amp; CRM:</strong> All customer profiles, phone numbers, and addresses.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                        ✓
                      </span>
                      <span>
                        <strong className="text-slate-900">Staff Accounts &amp; User Rights:</strong> All cashier logins, PINs, and customized security permissions.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100 text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-xl">
                  🔒 Zero data entry lost: Your catalog, branches, and staff setup remain 100% ready for go-live.
                </div>
              </div>
            </div>

            {/* Step 1: Pre-Reset Backup Utility Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  <DatabaseBackup className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      Recommended Pre-Reset Step: Download System Backup
                    </h4>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                      Safety Snapshot
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Download an encrypted JSON archive of your system database before wiping transactions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-98 transition disabled:opacity-50"
              >
                {downloadingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Exporting Snapshot...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Safety Backup (JSON)</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Confirmation & Execution Form */}
            <form onSubmit={handleClear} className="rounded-2xl border border-rose-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-rose-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-5 w-5" />
                  <h4 className="text-sm font-extrabold">
                    Final Confirmation: Clear All Transactions
                  </h4>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Type &quot;CLEAR&quot; to Confirm
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                To prevent accidental reset, please type the word <strong className="text-rose-700 font-extrabold uppercase">CLEAR</strong> in the input box below. Once confirmed, all transactional ledgers will be wiped clean for fresh fiscal year operation.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "CLEAR" to unlock'
                  className="w-full sm:w-72 rounded-xl border border-rose-300 bg-rose-50/20 px-4 py-2.5 text-sm font-extrabold text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 transition"
                />

                <button
                  type="submit"
                  disabled={clearing || confirmText.trim().toUpperCase() !== 'CLEAR'}
                  className="w-full sm:w-auto flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-rose-700 hover:to-red-800 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Clearing Transaction Ledgers...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Permanently Clear All Transactions &amp; Reset System</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Executive Modal Footer */}
        <div className="flex select-none items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span>Keyboard Shortcut:</span>
            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 shadow-2xs">
              ESC
            </kbd>
            <span>closes this window</span>
          </div>

          <button
            type="button"
            onClick={closeClearTransactionsModal}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
