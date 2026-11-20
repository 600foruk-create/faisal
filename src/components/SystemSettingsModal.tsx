'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Coins,
  DollarSign,
  FileText,
  HelpCircle,
  Maximize2,
  Minimize2,
  Minus,
  Percent,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';

export function SystemSettingsModal() {
  const {
    settings,
    companies,
    branches,
    closeSystemSettingsModal,
    reloadContext,
  } = usePosContext();

  // Multi-Tenant Companies List
  const tenantCompanies = useMemo(() => {
    if (companies && companies.length > 0) return companies;
    return [
      {
        id: 1,
        company_code: 'SEASTONE',
        business_name: settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY',
        owner_name: settings.owner_name || 'Faisal (Owner)',
        currency_symbol: settings.currency_symbol || 'Rs.',
        default_tax_rate: settings.default_tax_rate || 18,
        branch_count: branches.length,
        is_active: 1,
      },
    ];
  }, [companies, settings, branches.length]);

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Form State
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || 'Rs.');
  const [taxRate, setTaxRate] = useState<string>(String(settings.default_tax_rate ?? 18));
  const [openingCash, setOpeningCash] = useState<string>(String(settings.default_opening_cash ?? 5000));
  const [receiptFooter, setReceiptFooter] = useState(
    settings.receipt_footer ||
      settings.footer_text ||
      'Thank you for your business! Goods once sold can be returned within 3 days with original receipt.'
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Sync settings when loaded
  useEffect(() => {
    setCurrencySymbol(settings.currency_symbol || 'Rs.');
    setTaxRate(String(settings.default_tax_rate ?? 18));
    setOpeningCash(String(settings.default_opening_cash ?? 5000));
    setReceiptFooter(
      settings.receipt_footer ||
        settings.footer_text ||
        'Thank you for your business! Goods once sold can be returned within 3 days with original receipt.'
    );
  }, [settings]);

  // Keyboard shortcut: ESC to close, Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSystemSettingsModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSystemSettingsModal, currencySymbol, taxRate, openingCash, receiptFooter]);

  // Save System Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const taxNum = parseFloat(taxRate) || 0;
    const cashNum = parseFloat(openingCash) || 0;

    if (!currencySymbol.trim()) {
      showToast('Currency symbol cannot be blank', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'business',
          data: {
            currency_symbol: currencySymbol.trim(),
            default_tax_rate: taxNum,
            default_opening_cash: cashNum,
            receipt_footer: receiptFooter.trim(),
            footer_text: receiptFooter.trim(),
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update system settings');
      }

      await reloadContext();
      showToast('System settings, fiscal tax & currency updated successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating settings';
      showToast(msg, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[99vh] w-[99.5vw] max-w-none'
            : 'h-[95vh] max-h-[890px] w-full max-w-5xl'
        }`}
      >
        {/* Executive Midnight Navy Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#071322] via-[#0d213a] to-[#071322] px-6 py-3.5 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 ring-1 ring-teal-400/40 shadow-inner">
              <SlidersHorizontal className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-wide text-white">
                  System Settings &amp; Currency Configuration
                </h2>
                <span className="rounded-full bg-teal-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-200 ring-1 ring-teal-400/40">
                  Step 6 Fiscal &amp; POS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure primary billing currency, FBR default tax rate, drawer float, and thermal receipt messages
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
              onClick={closeSystemSettingsModal}
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
          {/* Top Organization Header */}
          <div className="flex items-center justify-between border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50 px-6 py-4 shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Active Client Tenant:
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {settings.business_name || 'M/S SEASTONE PVC PIPE INDUSTRY'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                {branches.length} Physical Branches Active
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                FBR Fiscal Mode: ONLINE
              </span>
            </div>
          </div>

          {/* Form Scroll Area */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Operating Currency */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Coins className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          1. Operating Currency Symbol
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Displayed across invoices, daily ledgers &amp; prices
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Required
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Currency Symbol / Code:
                    </label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="e.g. Rs. or $"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition"
                      required
                    />
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Quick Currency Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Rs.', 'PKR', '$', 'AED', 'SAR', '€', '£'].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setCurrencySymbol(sym)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                            currencySymbol === sym
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/70 p-2.5 rounded-xl">
                  <span className="text-slate-500 font-semibold">Live POS Display Preview:</span>
                  <span className="font-extrabold text-emerald-700 text-sm tabular-nums">
                    {currencySymbol} 4,850.00
                  </span>
                </div>
              </div>

              {/* Card 2: FBR Default GST Sales Tax Rate */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <Percent className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          2. Default Sales Tax / GST Rate (%)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Standard fiscal GST rate applied during checkout
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                      Fiscal Rule
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Standard GST Percentage (%):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        placeholder="18.00"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-3.5 pr-8 text-sm font-extrabold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                        required
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      FBR Pakistan Tax Schedules:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '18% Standard GST', val: '18' },
                        { label: '0% Zero-Rated', val: '0' },
                        { label: '5% Reduced Goods', val: '5' },
                        { label: '15% Provincial Services', val: '15' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setTaxRate(item.val)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                            taxRate === item.val
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/70 p-2.5 rounded-xl">
                  <span className="text-slate-500 font-semibold">18% GST on {currencySymbol} 10,000:</span>
                  <span className="font-extrabold text-blue-700 text-sm tabular-nums">
                    + {currencySymbol} {((parseFloat(taxRate) || 0) * 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Card 3: Counter Cash Float Defaults */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          3. Default Opening Cash Float
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Initial cash balance pre-filled in daily day-closing
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      Drawer Float
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Opening Drawer Cash ({currencySymbol}):
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="5000"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 transition"
                      required
                    />
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Standard Float Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['0', '2000', '5000', '10000', '20000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setOpeningCash(amt)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                            openingCash === amt
                              ? 'bg-amber-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:border-amber-500 hover:text-amber-700'
                          }`}
                        >
                          {currencySymbol} {parseInt(amt, 10).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/70 p-2.5 rounded-xl">
                  <span className="text-slate-500 font-semibold">Morning Counter Starting Cash:</span>
                  <span className="font-extrabold text-amber-800 text-sm tabular-nums">
                    {currencySymbol} {(parseFloat(openingCash) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 4: Thermal Receipt Customer Message */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                        <Printer className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          4. Thermal Receipt Footer Message
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Printed at the bottom of customer sale receipts
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                      80mm / 58mm
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Return Policy &amp; Customer Note:
                    </label>
                    <textarea
                      rows={3}
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      placeholder="e.g. Thank you for your business! No refunds without original receipt."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 transition leading-relaxed"
                    />
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setReceiptFooter(
                          'Thank you for shopping with us! Goods once sold can be returned within 3 days with original thermal receipt.'
                        )
                      }
                      className="cursor-pointer text-[11px] font-bold text-purple-700 hover:underline"
                    >
                      Use Standard Retail Note
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReceiptFooter(
                          'Quality PVC Pipes & Fittings Guaranteed. Powered by Softifyx ERP POS.'
                        )
                      }
                      className="cursor-pointer text-[11px] font-bold text-purple-700 hover:underline"
                    >
                      Use PVC Industry Note
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-0.5">
                    Thermal Ticket Output
                  </span>
                  <p className="text-[11px] font-medium text-slate-700 italic">
                    &quot;{receiptFooter}&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Apply Global System Changes
                  </h4>
                  <p className="text-xs text-slate-500">
                    Updates will immediately reflect across all POS counters, receipt printers, and invoices
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeSystemSettingsModal}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-7 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-98 transition disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving System Settings...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save System &amp; Currency Settings (Ctrl+S)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Executive Modal Footer */}
        <div className="flex select-none items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span>Keyboard Shortcuts:</span>
            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 shadow-2xs">
              Ctrl+S
            </kbd>
            <span>saves settings,</span>
            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 shadow-2xs">
              ESC
            </kbd>
            <span>closes window</span>
          </div>

          <button
            type="button"
            onClick={closeSystemSettingsModal}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
