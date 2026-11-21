'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileImage,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';

// Official Seastone Pipe Industry Logo (Crisp Vector SVG Data URL)
const DEFAULT_SEASTONE_LOGO_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" width="160" height="110">
  <rect width="160" height="110" fill="white" rx="10"/>
  <path d="M68 20H42C33 20 28 25.6 28 33C28 40.4 33 45 42 47L58 50.6C67 52.6 72 57.6 72 65C72 73 65.6 78 56 78H30" fill="none" stroke="%23ea580c" stroke-width="10.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M84 78V26H107C118 26 125 32.6 125 42.4C125 52.2 118 58.8 107 58.8H84" fill="none" stroke="%23475569" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="80" y="94" text-anchor="middle" font-size="14" font-weight="900" fill="%23334155" font-family="Arial, sans-serif">SEASTONE</text>
  <text x="80" y="105" text-anchor="middle" font-size="8.5" font-weight="800" fill="%2364748b" font-family="Arial, sans-serif" letter-spacing="1.2">PIPE INDUSTRY</text>
</svg>`;

// Helper: Resize uploaded image to high-performance base64 data URL
function resizeLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format'));
      img.onload = () => {
        const maxSize = 280;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function CompanyLogoModal() {
  const {
    settings,
    companies,
    branches,
    closeLogoModal,
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

  // Filter 1: Selected Company
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(tenantCompanies[0]?.id ?? 1);

  // Logo Settings Form State
  const initialLogo = settings.logo_data_url || DEFAULT_SEASTONE_LOGO_DATA_URL;
  const [logoMode, setLogoMode] = useState<'SET_NEW' | 'DO_NOT_SHOW'>(
    settings.logo_data_url ? 'SET_NEW' : 'SET_NEW'
  );
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>(initialLogo);
  const [selectedFileName, setSelectedFileName] = useState<string>('seastone-logo-official.png');
  const [previewTab, setPreviewTab] = useState<'BRAND' | 'RECEIPT'>('BRAND');
  const [showCheckeredBg, setShowCheckeredBg] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Sync settings when context loads
  useEffect(() => {
    if (settings.logo_data_url) {
      setCurrentLogoUrl(settings.logo_data_url);
      setLogoMode('SET_NEW');
    }
  }, [settings.logo_data_url]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLogoModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeLogoModal]);

  // Active Company Record
  const activeCompanyRecord = useMemo(() => {
    return tenantCompanies.find((c) => c.id === selectedCompanyId) || tenantCompanies[0];
  }, [tenantCompanies, selectedCompanyId]);

  // Handle Local File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 3MB
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image file size exceeds 3MB limit. Please choose a smaller image.', 'error');
      return;
    }

    try {
      const dataUrl = await resizeLogoFileToDataUrl(file);
      setCurrentLogoUrl(dataUrl);
      setSelectedFileName(file.name);
      setLogoMode('SET_NEW');
      showToast(`Selected logo: ${file.name} (Auto-optimized for POS printing)`, 'success');
    } catch {
      showToast('Failed to process image file. Ensure valid PNG, JPG, or SVG.', 'error');
    }
  };

  // Reset to Default Official Seastone Logo
  const handleApplyDefaultLogo = () => {
    setCurrentLogoUrl(DEFAULT_SEASTONE_LOGO_DATA_URL);
    setSelectedFileName('seastone-logo-official.svg');
    setLogoMode('SET_NEW');
    showToast('Applied official Seastone Pipe Industry logo preset', 'success');
  };

  // Handle Save
  const handleSaveLogo = async () => {
    setSaving(true);
    try {
      const finalLogoPayload = logoMode === 'DO_NOT_SHOW' ? '' : currentLogoUrl;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'business',
          data: {
            logo_data_url: finalLogoPayload,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save logo settings');
      }

      await reloadContext();
      showToast(
        logoMode === 'DO_NOT_SHOW'
          ? 'Logo disabled. System will use clean typography headers.'
          : 'Company logo saved and applied across all POS terminals and receipts!',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating logo', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 transition-all duration-200 ${
        isMinimized ? 'pointer-events-none opacity-0' : 'bg-slate-950/75 backdrop-blur-sm'
      }`}
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[96vh] w-[98vw] max-w-none'
            : 'h-[92vh] max-h-[860px] w-full max-w-5xl'
        }`}
      >
        {/* =========================================================================
            1. Title Bar (Executive Midnight Navy — Hamara Wala Color Combination)
        ========================================================================== */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <ImagePlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  Logo Settings &amp; Corporate Branding
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Branding Engine
                </span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                  Administrator • Visual Identity
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Configure Company Logo for POS Thermal Receipts, Invoices, Delivery Challans, and Navigation Header
              </p>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title="Minimize"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={closeLogoModal}
              title="Close (Esc)"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`flex shrink-0 items-center justify-between px-4 py-2 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-b border-emerald-800'
                : 'bg-rose-950 text-rose-200 border-b border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs hover:underline cursor-pointer opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =========================================================================
            2. Top Scope Bar (Target Company Selection)
        ========================================================================== */}
        <div className="shrink-0 border-b border-slate-800 bg-[#0b172a] p-3 sm:p-4">
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Target Business Organization:
              </span>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {tenantCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.company_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Branding Status:</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  logoMode === 'DO_NOT_SHOW'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                }`}
              >
                {logoMode === 'DO_NOT_SHOW' ? 'Text-Only Mode' : 'Custom Logo Active'}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. Scrollable Main Content Area
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-4">
          {/* Upper Format Notice Note (Matching user's screenshot note with our styling) */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Format Notice: </span>
              <span>
                Only <code className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-200">.png</code>,{' '}
                <code className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-200">.jpg</code>,{' '}
                <code className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-200">.jpeg</code>,{' '}
                <code className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-200">.webp</code>, or{' '}
                <code className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-200">.gif</code> files can be set as logo. Transparent PNG files are recommended for crisp thermal tickets.
              </span>
            </div>
          </div>

          {/* =========================================================================
              Dual Interactive Preview Box (Brand HD vs 80mm Thermal Receipt Simulation)
          ========================================================================== */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left Column: Brand Preview Box & Display Switcher (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Corporate Logo Visual Frame
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCheckeredBg(!showCheckeredBg)}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                    title="Toggle Checkered Transparency Grid"
                  >
                    {showCheckeredBg ? 'Grid: ON' : 'Grid: OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyDefaultLogo}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    Reset Official Logo
                  </button>
                </div>
              </div>

              {/* Central Logo Box (Matching the screenshot dashed frame with elevated beauty) */}
              <div
                className={`relative flex h-52 w-full items-center justify-center rounded-xl border-2 border-dashed transition p-4 ${
                  logoMode === 'DO_NOT_SHOW'
                    ? 'border-slate-800 bg-slate-950/40 text-slate-500'
                    : 'border-emerald-500/50 bg-white/5'
                } ${
                  showCheckeredBg && logoMode !== 'DO_NOT_SHOW'
                    ? 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]'
                    : ''
                }`}
              >
                {logoMode === 'DO_NOT_SHOW' ? (
                  <div className="text-center space-y-2">
                    <EyeOff className="mx-auto h-8 w-8 text-slate-600" />
                    <div className="text-xs font-bold text-slate-400">Logo Suppressed (Text-Only Mode)</div>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      The document headers will print clean corporate typography without graphics.
                    </p>
                  </div>
                ) : currentLogoUrl ? (
                  <div className="flex flex-col items-center justify-center p-2">
                    <img
                      src={currentLogoUrl}
                      alt={activeCompanyRecord.business_name}
                      className="max-h-36 max-w-full object-contain filter drop-shadow-md transition hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-slate-600" />
                    <div className="text-xs font-bold text-slate-400">No Logo Loaded</div>
                    <p className="text-[11px] text-slate-500">
                      Choose an image below to set your company logo
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata strip */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                <span>Active File: <strong className="text-slate-200">{selectedFileName}</strong></span>
                <span>Preview Scale: <strong className="text-emerald-400">100% Vector Crisp</strong></span>
              </div>
            </div>

            {/* Right Column: 80mm POS Thermal Receipt Simulator (5 Cols - Mazai ka feature!) */}
            <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      80mm Thermal Receipt Simulation
                    </h3>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Live Ticket
                  </span>
                </div>

                {/* Simulated Thermal Paper Slip */}
                <div className="rounded-lg bg-[#ffffff] p-4 text-slate-900 shadow-inner select-none font-sans text-xs">
                  {/* Top Logo on Receipt */}
                  {logoMode !== 'DO_NOT_SHOW' && currentLogoUrl && (
                    <div className="mb-2 text-center">
                      <img
                        src={currentLogoUrl}
                        alt="Receipt Logo"
                        className="mx-auto h-12 max-w-[160px] object-contain filter grayscale contrast-125"
                      />
                    </div>
                  )}

                  {/* Company Header */}
                  <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                    <div className="font-extrabold text-sm tracking-tight text-slate-950 uppercase">
                      {activeCompanyRecord.business_name}
                    </div>
                    <div className="text-[10px] text-slate-600">Timber Market • Main Highway Timergara</div>
                    <div className="text-[10px] text-slate-600">NTN: {settings.ntn || '4125890-7'} • Phone: 0945-822140</div>
                  </div>

                  {/* Ticket Details */}
                  <div className="py-2 text-[10px] space-y-1 text-slate-700 border-b border-dashed border-slate-400">
                    <div className="flex justify-between font-semibold">
                      <span>Invoice #: SWT-A-000842</span>
                      <span>Date: 21-Nov-2026</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier: Bilal Khan</span>
                      <span>Counter: Pos #1</span>
                    </div>
                  </div>

                  {/* Sample Items */}
                  <div className="py-2 text-[10px] space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>2"X13' U-PVC Pipe (3 Pcs)</span>
                      <span>Rs. 4,800.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>PVC Elbow 2" (6 Pcs)</span>
                      <span>Rs. 960.00</span>
                    </div>
                  </div>

                  {/* Total Bar */}
                  <div className="border-t border-slate-900 pt-1.5 font-extrabold text-xs flex justify-between">
                    <span>NET TOTAL:</span>
                    <span>Rs. 5,760.00</span>
                  </div>

                  <div className="mt-2 text-center text-[9px] text-slate-500 italic">
                    Thank you for your business!
                  </div>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-400 text-center">
                Visual demonstration of thermal receipt printer output.
              </p>
            </div>
          </div>

          {/* =========================================================================
              4. Mode Selection Controls (Radio Buttons matching screenshot)
          ========================================================================== */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Logo Application Preference
            </h3>

            <div className="space-y-3">
              {/* Radio 1: Set New Logo */}
              <div
                onClick={() => setLogoMode('SET_NEW')}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                  logoMode === 'SET_NEW'
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      logoMode === 'SET_NEW'
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {logoMode === 'SET_NEW' && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Set New Logo</span>
                    <p className="text-[11px] text-slate-400">
                      Upload an official corporate graphic to print on thermal bills and invoices
                    </p>
                  </div>
                </div>

                {/* File Upload Button (Matching screenshot Choose File) */}
                <div className="flex items-center gap-2 pl-8 sm:pl-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-400" />
                    Choose File
                  </button>
                  <span className="text-xs text-slate-400 truncate max-w-[140px]">
                    {selectedFileName}
                  </span>
                </div>
              </div>

              {/* Radio 2: Do Not Show Logo */}
              <div
                onClick={() => setLogoMode('DO_NOT_SHOW')}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                  logoMode === 'DO_NOT_SHOW'
                    ? 'border-amber-500/60 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      logoMode === 'DO_NOT_SHOW'
                        ? 'border-amber-500 bg-amber-500 text-slate-950'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {logoMode === 'DO_NOT_SHOW' && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Do Not Show Logo</span>
                    <p className="text-[11px] text-slate-400">
                      Prints text-only company title without graphic image (saves thermal paper space)
                    </p>
                  </div>
                </div>

                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  Text Mode
                </span>
              </div>
            </div>
          </div>

          {/* Lower Document Sync Note (Matching screenshot info bar with our styling) */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 text-xs text-blue-200 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-300">Document Sync: </span>
              <span>
                Your selected logo will be printed on your documents, customer cash receipts, delivery challans, and system day closings automatically across all physical branches.
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. Bottom Action Bar (Executive Save & Cancel)
        ========================================================================== */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-800 bg-[#0b172a] px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ImagePlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Target: <strong className="text-white font-bold">{activeCompanyRecord.business_name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveLogo}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving Logo...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  Save Logo
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closeLogoModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5 stroke-[2.5]" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
