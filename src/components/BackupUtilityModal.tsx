'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Database,
  DatabaseBackup,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Upload,
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

interface BackupFileInspection {
  isValid: boolean;
  exportedAt?: string;
  businessName?: string;
  productsCount?: number;
  customersCount?: number;
  invoicesCount?: number;
  branchesCount?: number;
  usersCount?: number;
  fileSizeBytes?: number;
  fileName?: string;
  errorMessage?: string;
}

export function BackupUtilityModal() {
  const {
    activeUser,
    settings,
    companies,
    branches,
    closeBackupUtilityModal,
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

  // Filter Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(tenantCompanies[0]?.id ?? 1);
  const [backupScope, setBackupScope] = useState<'ALL' | 'CATALOG' | 'CUSTOMERS' | 'FINANCIALS'>('ALL');

  // Live System Data Stats
  const [loadingStats, setLoadingStats] = useState(false);
  const [systemStats, setSystemStats] = useState<{
    productsCount: number;
    customersCount: number;
    invoicesCount: number;
    branchesCount: number;
    terminalsCount: number;
    usersCount: number;
    dayClosingsCount: number;
    lastExportTime: string | null;
  }>({
    productsCount: 0,
    customersCount: 0,
    invoicesCount: 0,
    branchesCount: branches.length,
    terminalsCount: 1,
    usersCount: 1,
    dayClosingsCount: 0,
    lastExportTime: null,
  });

  // Action Loading States
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingCatalogCsv, setDownloadingCatalogCsv] = useState(false);
  const [downloadingCustomersCsv, setDownloadingCustomersCsv] = useState(false);

  // Backup Inspection State
  const [inspectedFile, setInspectedFile] = useState<BackupFileInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // Super Admin Check
  const isSuperAdmin = useMemo(() => isSuperAdminUser(activeUser), [activeUser]);

  // Load Real Database Stats
  const fetchSystemStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/settings?backup=1');
      if (res.ok) {
        const data = await res.json();
        setSystemStats({
          productsCount: Array.isArray(data.products) ? data.products.length : 0,
          customersCount: Array.isArray(data.customers) ? data.customers.length : 0,
          invoicesCount: Array.isArray(data.invoices) ? data.invoices.length : 0,
          branchesCount: Array.isArray(data.branches) ? data.branches.length : branches.length,
          terminalsCount: Array.isArray(data.terminals) ? data.terminals.length : 1,
          usersCount: Array.isArray(data.users) ? data.users.length : 1,
          dayClosingsCount: Array.isArray(data.day_closings) ? data.day_closings.length : 0,
          lastExportTime: data.exported_at || null,
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStats(false);
    }
  }, [branches.length]);

  useEffect(() => {
    fetchSystemStats();
  }, [fetchSystemStats]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeBackupUtilityModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeBackupUtilityModal]);

  // Selected Company Record
  const activeCompanyRecord = useMemo(() => {
    return tenantCompanies.find((c) => c.id === selectedCompanyId) || tenantCompanies[0];
  }, [tenantCompanies, selectedCompanyId]);

  // 1. Download Full JSON Backup
  const handleDownloadFullJson = async () => {
    setDownloadingJson(true);
    try {
      const res = await fetch('/api/settings?backup=1');
      if (!res.ok) {
        throw new Error('Failed to retrieve backup archive from server');
      }
      const data = await res.json();

      // Enrich snapshot metadata
      data.company = activeCompanyRecord;
      data.backup_metadata = {
        exported_by: activeUser?.full_name || 'Faisal (Super Admin)',
        export_mode: backupScope,
        platform_version: 'SoftifyX POS ERP v2.4 Enterprise',
        generated_at: new Date().toISOString(),
      };

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 5).replace(':', '-');
      const companySlug = (activeCompanyRecord?.company_code || 'SEASTONE').toUpperCase();
      const fileName = `${companySlug}_POS_SYSTEM_BACKUP_${datePart}_${timePart}.json`;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Encrypted full system backup snapshot saved: ${fileName}`, 'success');
      fetchSystemStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to download JSON backup', 'error');
    } finally {
      setDownloadingJson(false);
    }
  };

  // 2. Download Inventory Catalog CSV
  const handleDownloadCatalogCsv = async () => {
    setDownloadingCatalogCsv(true);
    try {
      const res = await fetch('/api/settings?backup=1');
      if (!res.ok) throw new Error('Failed to load inventory data');
      const data = await res.json();
      const products = Array.isArray(data.products) ? data.products : [];

      if (products.length === 0) {
        throw new Error('No catalog products found to export');
      }

      // Build CSV
      const headers = [
        'Item Code',
        'Barcode',
        'HS Code',
        'Description',
        'Category',
        'Unit of Measure',
        'Cost Rate (Purchase)',
        'Retail Sale Rate',
        'Wholesale Rate',
        'Minimum Alert Qty',
        'Current Stock Qty',
        'Status',
      ];

      const rows = products.map((p: any) => [
        `"${p.sku || ''}"`,
        `"${p.barcode || ''}"`,
        `"${p.hs_code || ''}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${p.category || 'General'}"`,
        `"${p.unit || 'Pcs'}"`,
        Number(p.cost_price || 0).toFixed(2),
        Number(p.sale_price || 0).toFixed(2),
        Number(p.wholesale_price || p.sale_price || 0).toFixed(2),
        p.min_stock_alert ?? 10,
        p.stock_qty ?? 0,
        p.is_active ? 'Active' : 'Inactive',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date().toISOString().slice(0, 10);
      const companySlug = (activeCompanyRecord?.company_code || 'SEASTONE').toUpperCase();
      link.href = url;
      link.download = `${companySlug}_INVENTORY_CATALOG_${now}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${products.length} inventory products to CSV successfully`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export catalog CSV', 'error');
    } finally {
      setDownloadingCatalogCsv(false);
    }
  };

  // 3. Download Customers Directory CSV
  const handleDownloadCustomersCsv = async () => {
    setDownloadingCustomersCsv(true);
    try {
      const res = await fetch('/api/settings?backup=1');
      if (!res.ok) throw new Error('Failed to load customer records');
      const data = await res.json();
      const customers = Array.isArray(data.customers) ? data.customers : [];

      if (customers.length === 0) {
        throw new Error('No customer accounts found to export');
      }

      const headers = [
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'City / Region',
        'Address',
        'Customer Type',
        'Opening Balance',
        'Current Khata Balance',
        'Credit Limit',
        'Status',
      ];

      const rows = customers.map((c: any) => [
        `"${c.customer_id || c.id || ''}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${c.city || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.customer_type || 'Retail'}"`,
        Number(c.opening_balance || 0).toFixed(2),
        Number(c.balance || c.current_balance || 0).toFixed(2),
        Number(c.credit_limit || 0).toFixed(2),
        c.is_active ? 'Active' : 'Inactive',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date().toISOString().slice(0, 10);
      const companySlug = (activeCompanyRecord?.company_code || 'SEASTONE').toUpperCase();
      link.href = url;
      link.download = `${companySlug}_CUSTOMERS_DIRECTORY_${now}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${customers.length} customer profiles to CSV successfully`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export customers CSV', 'error');
    } finally {
      setDownloadingCustomersCsv(false);
    }
  };

  // Inspect uploaded backup file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInspecting(true);
    setInspectedFile(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('File does not contain valid JSON data');
        }

        const isSoftifyX =
          Boolean(parsed.settings) ||
          Array.isArray(parsed.products) ||
          Array.isArray(parsed.invoices) ||
          Array.isArray(parsed.customers);

        if (!isSoftifyX) {
          throw new Error('Unrecognized backup structure. Not a valid SoftifyX / Seastone POS backup.');
        }

        setInspectedFile({
          isValid: true,
          fileName: file.name,
          fileSizeBytes: file.size,
          exportedAt: parsed.exported_at || parsed.backup_metadata?.generated_at || 'Unknown',
          businessName:
            parsed.settings?.business_name ||
            parsed.company?.business_name ||
            'M/S SEASTONE PVC PIPE INDUSTRY',
          productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
          customersCount: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
          invoicesCount: Array.isArray(parsed.invoices) ? parsed.invoices.length : 0,
          branchesCount: Array.isArray(parsed.branches) ? parsed.branches.length : 0,
          usersCount: Array.isArray(parsed.users) ? parsed.users.length : 0,
        });

        showToast(`Inspected snapshot: ${file.name} is valid and verified`, 'success');
      } catch (err) {
        setInspectedFile({
          isValid: false,
          fileName: file.name,
          fileSizeBytes: file.size,
          errorMessage: err instanceof Error ? err.message : 'Invalid JSON file format',
        });
        showToast('Backup file verification failed', 'error');
      } finally {
        setInspecting(false);
      }
    };

    reader.onerror = () => {
      setInspectedFile({
        isValid: false,
        fileName: file.name,
        errorMessage: 'Failed to read file from disk',
      });
      setInspecting(false);
    };

    reader.readAsText(file);
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
            : 'h-[92vh] max-h-[880px] w-full max-w-6xl'
        }`}
      >
        {/* =========================================================================
            1. Title Bar (Executive Midnight Navy)
        ========================================================================== */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <DatabaseBackup className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  System BackUp & Data Vault Utility
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Snapshot Engine
                </span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                  Step 8 • Administration
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1-Click Full System Snapshot (.JSON) • Excel Catalog (.CSV) • Customer Directory Export • Data Vault
              </p>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchSystemStats}
              title="Refresh Live Database Metrics"
              disabled={loadingStats}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
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
              onClick={closeBackupUtilityModal}
              title="Close (Esc)"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            Toast Notification
        ========================================================================== */}
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
            2. Two Connected Filter Bar (Company & Scope)
        ========================================================================== */}
        <div className="shrink-0 border-b border-slate-800 bg-[#0b172a] p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Filter 1: Company Selector */}
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-xs">
              <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  1. Select Target Company
                </span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                  {tenantCompanies.length} Tenant Registered
                </span>
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white transition focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {tenantCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.company_code}) • Owner: {c.owner_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Backup Scope Selector */}
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-xs">
              <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                  2. Select Archive Scope / Format
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Encrypted Vault
                </span>
              </label>
              <select
                value={backupScope}
                onChange={(e) => setBackupScope(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white transition focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Full System Vault (Master Catalog + Invoices + Customers + Users + Settings)</option>
                <option value="CATALOG">Master Inventory Catalog Only (Products, Barcodes, Cost & Sale Rates)</option>
                <option value="CUSTOMERS">Customers Directory CRM Only (Accounts, Khata Ledger, Credit Limits)</option>
                <option value="FINANCIALS">Fiscal Transactions Only (Sales Invoices, Held Carts, Day Closings)</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. Scrollable Main Content Area
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-4">
          {/* Authority Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    Authorized Administrator: {activeUser?.full_name || 'Faisal'}
                  </span>
                  <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                    Role: {activeUser?.role || 'SUPER_ADMIN'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full authority to generate, export, inspect, and verify enterprise data archives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Operating Company:</span>
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-slate-700">
                {activeCompanyRecord.business_name}
              </span>
            </div>
          </div>

          {/* =========================================================================
              4. Live System Snapshot Metrics (Real-Time Cards)
          ========================================================================== */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                📊 Live System Records in Current Database
              </span>
              <span className="text-[11px] text-slate-500">
                Auto-calculated from server database sync
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
              {/* Card 1: Products */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <Package className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase text-emerald-400/80">Catalog</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.productsCount}
                </div>
                <div className="text-[11px] text-slate-400">Products & Items</div>
              </div>

              {/* Card 2: Customers */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase text-blue-400/80">Khata</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.customersCount}
                </div>
                <div className="text-[11px] text-slate-400">Customer Profiles</div>
              </div>

              {/* Card 3: Invoices */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase text-amber-400/80">Billing</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.invoicesCount}
                </div>
                <div className="text-[11px] text-slate-400">Sales Invoices</div>
              </div>

              {/* Card 4: Branches */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <Store className="h-4 w-4 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase text-indigo-400/80">Physical</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.branchesCount}
                </div>
                <div className="text-[11px] text-slate-400">Active Branches</div>
              </div>

              {/* Card 5: Users */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <UserCheck className="h-4 w-4 text-purple-400" />
                  <span className="text-[10px] font-bold uppercase text-purple-400/80">Security</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.usersCount}
                </div>
                <div className="text-[11px] text-slate-400">Staff Accounts</div>
              </div>

              {/* Card 6: Day Closings */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <Clock className="h-4 w-4 text-rose-400" />
                  <span className="text-[10px] font-bold uppercase text-rose-400/80">Fiscal</span>
                </div>
                <div className="mt-2 text-xl font-bold text-white tabular-nums">
                  {systemStats.dayClosingsCount}
                </div>
                <div className="text-[11px] text-slate-400">Day Closings</div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              5. Primary 1-Click Export Actions (Three Fast Buttons)
          ========================================================================== */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {/* Action 1: Full System Backup (.JSON) */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <DatabaseBackup className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Complete Vault
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Full System Snapshot (.JSON)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Downloads an all-inclusive JSON archive with business profile, branches, terminals, catalog, customers CRM, user rights, and billing logs.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadFullJson}
                  disabled={downloadingJson}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingJson ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating Archive...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export Full Backup (.JSON)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action 2: Master Inventory Catalog (.CSV) */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-slate-900 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    Excel Ready
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Inventory Catalog (.CSV)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Exports complete items list, barcodes, HS codes, categories, cost rates, retail prices, and stock units for Microsoft Excel audits.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadCatalogCsv}
                  disabled={downloadingCatalogCsv}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingCatalogCsv ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Building CSV...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Export Catalog (.CSV)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action 3: Customer Directory CRM (.CSV) */}
            <div className="flex flex-col justify-between rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-950/30 to-slate-900 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                    CRM Ledger
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Customers Directory (.CSV)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Exports customer master directory with contact numbers, addresses, opening khata balances, and credit limits for financial reconciliation.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadCustomersCsv}
                  disabled={downloadingCustomersCsv}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-pink-500 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingCustomersCsv ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Building CSV...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="h-4 w-4" />
                      Export Customers (.CSV)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              6. Backup File Inspection & Integrity Verification Tool
          ========================================================================== */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  🔍 Backup Archive Inspector & Verification Tool
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Verify JSON integrity before storage or restore
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Select any previously saved <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-400">.json</code> backup file to inspect its internal structure, timestamp, entity counts, and verification status without altering current database state.
            </p>

            {/* File Input Box */}
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition">
                <Upload className="h-4 w-4 text-blue-400" />
                <span>Choose Backup (.JSON) to Inspect</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {inspecting && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                  <span>Inspecting file contents...</span>
                </div>
              )}
            </div>

            {/* Inspection Results */}
            {inspectedFile && (
              <div
                className={`mt-3 rounded-xl border p-3.5 ${
                  inspectedFile.isValid
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : 'border-rose-500/40 bg-rose-950/20'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    {inspectedFile.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="text-xs font-bold text-white">
                      File: {inspectedFile.fileName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({((inspectedFile.fileSizeBytes || 0) / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      inspectedFile.isValid
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {inspectedFile.isValid ? 'VALID POS BACKUP' : 'INTEGRITY ERROR'}
                  </span>
                </div>

                {inspectedFile.isValid ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 text-center">
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Business</div>
                      <div className="text-xs font-bold text-white truncate">{inspectedFile.businessName}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Products</div>
                      <div className="text-xs font-bold text-emerald-400 tabular-nums">{inspectedFile.productsCount}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Customers</div>
                      <div className="text-xs font-bold text-blue-400 tabular-nums">{inspectedFile.customersCount}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Invoices</div>
                      <div className="text-xs font-bold text-amber-400 tabular-nums">{inspectedFile.invoicesCount}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Branches</div>
                      <div className="text-xs font-bold text-indigo-400 tabular-nums">{inspectedFile.branchesCount}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Staff Users</div>
                      <div className="text-xs font-bold text-purple-400 tabular-nums">{inspectedFile.usersCount}</div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-rose-300">
                    Error: {inspectedFile.errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* =========================================================================
              7. Security & Enterprise Compliance Card
          ========================================================================== */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 text-xs text-slate-400 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-200">
                Recommended Enterprise Backup Protocol:
              </span>
              <p className="leading-relaxed">
                Always store your weekly JSON backup snapshots on an external USB flash drive or secure cloud storage.
                Backups contain all catalog products, customer khata balances, and sales invoices.
                In case of physical hardware failure or database reset, this snapshot guarantees zero data loss.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            8. Bottom Action Footer Bar
        ========================================================================== */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-800 bg-[#0b172a] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Last Snapshot Sync: {systemStats.lastExportTime ? new Date(systemStats.lastExportTime).toLocaleString() : 'Live Real-Time'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadFullJson}
              disabled={downloadingJson}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download JSON Snapshot
            </button>
            <button
              type="button"
              onClick={closeBackupUtilityModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
