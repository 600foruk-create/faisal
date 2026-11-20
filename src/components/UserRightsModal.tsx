'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  DatabaseBackup,
  KeyRound,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserRole, UserSummary } from '@/lib/types';

type RightsTab = 'matrix' | 'assignment' | 'policy';
type ModuleCategory = 'ALL' | 'POS' | 'INVENTORY' | 'FINANCIAL' | 'ADMIN';

interface PermissionRow {
  id: number;
  module: string;
  category: ModuleCategory;
  categoryLabel: string;
  superAdmin: 'YES' | 'NO' | 'AUDIT' | 'RESTRICTED';
  companyAdmin: 'YES' | 'NO' | 'AUDIT' | 'RESTRICTED' | 'VIEW_ONLY';
  manager: 'YES' | 'NO' | 'BRANCH_ONLY' | 'RESTRICTED' | 'VIEW_ONLY' | 'AUTHORIZE';
  cashier: 'YES' | 'NO' | 'SHIFT_ONLY' | 'RESTRICTED' | 'READ_POS' | 'QUICK_ADD';
  ruleNote: string;
}

const FULL_PERMISSIONS_MATRIX: PermissionRow[] = [
  {
    id: 1,
    module: 'Create Physical Branches & Counters',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Super Admin exclusive right. Branch provisioning is strictly restricted from Company Admins.',
  },
  {
    id: 2,
    module: 'Register New Client Tenant / Company',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Multi-tenant organization provisioning is reserved for Platform Root Owner (Faisal).',
  },
  {
    id: 3,
    module: 'Staff User Accounts & Logins',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Company Admins can create and manage cashier and manager logins for their company.',
  },
  {
    id: 4,
    module: 'User Rights & Permissions Matrix',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Governs role-based authorization rules across all POS desktop modules.',
  },
  {
    id: 5,
    module: 'Reset Passwords & Counter Security PIN',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Company Admin can reset counter login passwords for cashiers.',
  },
  {
    id: 6,
    module: 'My Logo & Thermal Receipt Branding',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Configures business logo, header lines, and receipt footer credits.',
  },
  {
    id: 7,
    module: 'System Settings & Currency Symbol',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Controls business legal identity, default tax rates, opening cash, and currency code.',
  },
  {
    id: 8,
    module: 'Database Backup Utility Export',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Exports complete tenant JSON backup with sanitized password hashes.',
  },
  {
    id: 9,
    module: 'Clear Transactions & Reset Ledger',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Critical reset utility requiring Super Admin confirmation to prevent accidental loss.',
  },
  {
    id: 10,
    module: 'Master Inventory Catalog & Categories',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'READ_POS',
    ruleNote: 'Adding and editing products, categories, SKU barcodes, and units.',
  },
  {
    id: 11,
    module: 'Inventory Opening Balances Batches',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Initial stock intake and valuation adjustments per physical branch.',
  },
  {
    id: 12,
    module: 'Item Price Settings & Profit Margins',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Updating retail prices, wholesale rates, and markup calculations in bulk.',
  },
  {
    id: 13,
    module: 'Item Sales Tax Rates & FBR HS Codes',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Assigning GST tax percentages and tariff classifications to catalog lines.',
  },
  {
    id: 14,
    module: 'Customer Directory & Credit Ledgers',
    category: 'POS',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'QUICK_ADD',
    ruleNote: 'Full customer CRM; cashiers can register walk-in or new clients during checkout.',
  },
  {
    id: 15,
    module: 'POS Express Checkout & Receipt Print',
    category: 'POS',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Primary daily cashier billing module with barcode scanning and thermal print.',
  },
  {
    id: 16,
    module: 'Hold / Recall Parked Carts',
    category: 'POS',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Parking bills temporarily to avoid cashier lane delays.',
  },
  {
    id: 17,
    module: 'Sales Return & Stock Restoring',
    category: 'POS',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'AUTHORIZE',
    cashier: 'YES',
    ruleNote: 'Scans original invoice and handles item returns with automatic stock restoration.',
  },
  {
    id: 18,
    module: 'Day Closing & Cash Variance Count',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'AUDIT',
    companyAdmin: 'AUDIT',
    manager: 'BRANCH_ONLY',
    cashier: 'SHIFT_ONLY',
    ruleNote: 'End of day physical cash counting and reconciliation against system expectations.',
  },
  {
    id: 19,
    module: 'Sales Register & Invoice Ledger',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'SHIFT_ONLY',
    ruleNote: 'Comprehensive fiscal transaction journal with FBR status and payment modes.',
  },
  {
    id: 20,
    module: 'GST Tax Summary & FBR Audit Log',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'FBR fiscal compliance audit, taxable revenue calculations, and sync logs.',
  },
  {
    id: 21,
    module: 'Inventory Balance & Multi-Branch Valuation',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Cross-branch stock quantities, unit cost valuation, and inventory capital totals.',
  },
];

export function UserRightsModal() {
  const {
    users,
    branches,
    settings,
    activeUser,
    closeUserRightsModal,
    reloadContext,
  } = usePosContext();

  // Window Controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<RightsTab>('matrix');
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Updating role loading state
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeUserRightsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeUserRightsModal]);

  // Filtered Matrix Rows
  const filteredMatrix = useMemo(() => {
    return FULL_PERMISSIONS_MATRIX.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.module.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.ruleNote.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, searchQuery]);

  // Handle Quick Role Assignment in Tab 2
  const handleRoleChange = async (u: UserSummary, newRole: UserRole) => {
    if (u.id === activeUser?.id && newRole !== activeUser.role) {
      const confirmChange = window.confirm(
        `You are changing your own active security role from ${u.role} to ${newRole}. This may immediately restrict your current access. Do you want to proceed?`
      );
      if (!confirmChange) return;
    }

    setUpdatingUserId(u.id);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'user_update',
          data: {
            id: u.id,
            full_name: u.full_name,
            role: newRole,
            branch_id: u.branch_id,
            is_active: u.is_active,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user role');
      }

      await reloadContext();
      showToast(`Updated role for ${u.username} to ${newRole} successfully`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating user role';
      showToast(msg, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Helper renderer for permission badge
  const renderAccessBadge = (val: string, roleName: string) => {
    if (val === 'YES') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Full Access
        </span>
      );
    }
    if (val === 'AUDIT') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          <Shield className="h-3 w-3 text-blue-600" />
          Audit All
        </span>
      );
    }
    if (val === 'BRANCH_ONLY') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <Store className="h-3 w-3 text-amber-600" />
          Branch Only
        </span>
      );
    }
    if (val === 'SHIFT_ONLY') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
          <Receipt className="h-3 w-3 text-teal-600" />
          Shift Only
        </span>
      );
    }
    if (val === 'VIEW_ONLY') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          View Only
        </span>
      );
    }
    if (val === 'READ_POS') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          POS Read
        </span>
      );
    }
    if (val === 'QUICK_ADD') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          Quick Add
        </span>
      );
    }
    if (val === 'AUTHORIZE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          Supervisor
        </span>
      );
    }
    // RESTRICTED / NO
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <span className="text-slate-300">—</span>
        <span>Restricted</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[98vh] w-[99vw] max-w-none'
            : 'h-[92vh] max-h-[880px] w-full max-w-6xl'
        }`}
      >
        {/* Executive Midnight Navy Window Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0a1829] via-[#0f243e] to-[#0a1829] px-4 py-3 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide sm:text-base">
                  User Rights &amp; Permissions Matrix
                </h2>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Role Access Control
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tenant: <span className="font-semibold text-slate-200">{settings.business_name}</span> | Multi-Tenant Authorization Rules &amp; Operational Boundaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand Window' : 'Minimize Window'}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Default Window' : 'Maximize Window'}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closeUserRightsModal}
              title="Close (ESC)"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            className={`mx-4 mt-2 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold shadow-md transition-all ${
              toastMessage.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{toastMessage.text}</span>
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

        {/* Main Content Body */}
        {!isMinimized && (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
            {/* 5 Executive KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-100/70 p-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Governed Modules</span>
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-slate-900">
                    {FULL_PERMISSIONS_MATRIX.length}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Capabilities</span>
                </div>
              </div>

              <div className="rounded-xl border border-purple-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-purple-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Super Admin</span>
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-purple-700">Exclusive</span>
                  <span className="text-[11px] font-semibold text-purple-600">Branches &amp; Tenants</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-blue-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Company Admin</span>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-blue-700">Full Catalog</span>
                  <span className="text-[11px] font-semibold text-blue-600">&amp; Staff Logins</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-amber-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Store Manager</span>
                  <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-amber-700">Branch Stock</span>
                  <span className="text-[11px] font-semibold text-amber-600">&amp; Closing</span>
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-emerald-200/80 bg-white p-3 shadow-xs sm:col-span-1">
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">POS Cashier</span>
                  <Store className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-emerald-700">Counter POS</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Express Billing</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-2">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'matrix'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Module Permissions Matrix</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold tabular-nums text-slate-700">
                    {filteredMatrix.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('assignment')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'assignment'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Staff Role Assignment &amp; Audit</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold tabular-nums text-slate-700">
                    {users.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('policy')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'policy'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Multi-Tenant Security Architecture</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => void reloadContext()}
                  title="Reload Permissions"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PERMISSIONS MATRIX */}
            {activeTab === 'matrix' && (
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                {/* Search & Category Filter Bar */}
                <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <div className="relative sm:col-span-6">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search capability, module or operational rule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-6">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                      {(
                        [
                          { key: 'ALL', label: 'All Modules' },
                          { key: 'ADMIN', label: 'Administration' },
                          { key: 'INVENTORY', label: 'Inventory & Catalog' },
                          { key: 'POS', label: 'POS & Billing' },
                          { key: 'FINANCIAL', label: 'Financials' },
                        ] as Array<{ key: ModuleCategory; label: string }>
                      ).map((cat) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setCategoryFilter(cat.key)}
                          className={`cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            categoryFilter === cat.key
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Permissions Matrix Table */}
                <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                        <th className="px-3 py-2.5 text-center">Sr #</th>
                        <th className="px-3 py-2.5 text-center">POS Module / Capability</th>
                        <th className="px-3 py-2.5 text-center">Module Scope</th>
                        <th className="px-3 py-2.5 text-center">Super Admin</th>
                        <th className="px-3 py-2.5 text-center">Company Admin</th>
                        <th className="px-3 py-2.5 text-center">Store Manager</th>
                        <th className="px-3 py-2.5 text-center">POS Cashier</th>
                        <th className="px-4 py-2.5 text-center">Access Rule &amp; Restriction Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Shield className="mx-auto mb-2 h-8 w-8 opacity-40" />
                            <p className="font-semibold">No capabilities match your search</p>
                          </td>
                        </tr>
                      ) : (
                        filteredMatrix.map((item, idx) => (
                          <tr key={item.id} className="transition hover:bg-slate-50/80">
                            {/* Sr # */}
                            <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Module Name */}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                              {item.module}
                            </td>

                            {/* Scope */}
                            <td className="px-3 py-2.5 text-center">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {item.categoryLabel}
                              </span>
                            </td>

                            {/* Super Admin */}
                            <td className="px-3 py-2.5 text-center">
                              {renderAccessBadge(item.superAdmin, 'Super Admin')}
                            </td>

                            {/* Company Admin */}
                            <td className="px-3 py-2.5 text-center">
                              {renderAccessBadge(item.companyAdmin, 'Company Admin')}
                            </td>

                            {/* Store Manager */}
                            <td className="px-3 py-2.5 text-center">
                              {renderAccessBadge(item.manager, 'Store Manager')}
                            </td>

                            {/* POS Cashier */}
                            <td className="px-3 py-2.5 text-center">
                              {renderAccessBadge(item.cashier, 'POS Cashier')}
                            </td>

                            {/* Rule Note */}
                            <td className="px-4 py-2.5 text-center text-[11px] text-slate-600">
                              {item.ruleNote}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Showing <strong className="tabular-nums text-slate-700">{filteredMatrix.length}</strong> of{' '}
                    <strong className="tabular-nums text-slate-700">{FULL_PERMISSIONS_MATRIX.length}</strong> governed capabilities
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    Strict multi-tenant role isolation active across all branches
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: STAFF ROLE ASSIGNMENT & AUDIT */}
            {activeTab === 'assignment' && (
              <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
                <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
                  {/* Top Header Card */}
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Active Staff Accounts &amp; Security Roles
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Assign or update employee roles below. Changes take effect across POS terminals immediately.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          Total Configured Users: <strong className="tabular-nums text-slate-900">{users.length}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Staff Assignment Table */}
                  <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                          <th className="px-3 py-2.5 text-center">Sr #</th>
                          <th className="px-3 py-2.5 text-center">Login ID</th>
                          <th className="px-3 py-2.5 text-center">Staff Full Name</th>
                          <th className="px-3 py-2.5 text-center">Assigned Outlet</th>
                          <th className="px-3 py-2.5 text-center">Current Role</th>
                          <th className="px-4 py-2.5 text-center">Change / Assign Role</th>
                          <th className="px-3 py-2.5 text-center">Security Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u, idx) => {
                          const isCurrentActive = activeUser?.id === u.id;
                          return (
                            <tr
                              key={u.id}
                              className={`transition hover:bg-slate-50/80 ${
                                isCurrentActive ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              {/* Sr # */}
                              <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-slate-500">
                                {idx + 1}
                              </td>

                              {/* Username */}
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-800 ring-1 ring-slate-200">
                                  {u.username}
                                </span>
                              </td>

                              {/* Full Name */}
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {u.full_name}
                              </td>

                              {/* Branch */}
                              <td className="px-3 py-2.5 text-center">
                                {u.branch_name ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                    <Store className="h-3 w-3 text-emerald-600" />
                                    {u.branch_name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 italic text-slate-500">
                                    <Building2 className="h-3 w-3 text-slate-400" />
                                    All Outlets (HQ)
                                  </span>
                                )}
                              </td>

                              {/* Current Role */}
                              <td className="px-3 py-2.5 text-center font-bold">
                                {u.role === 'SUPER_ADMIN' && (
                                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                                    Super Admin
                                  </span>
                                )}
                                {u.role === 'ADMIN' && (
                                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                    Company Admin
                                  </span>
                                )}
                                {u.role === 'MANAGER' && (
                                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                    Store Manager
                                  </span>
                                )}
                                {u.role === 'CASHIER' && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                    POS Cashier
                                  </span>
                                )}
                              </td>

                              {/* Role Selector */}
                              <td className="px-4 py-2.5 text-center">
                                <div className="inline-flex items-center gap-2">
                                  <select
                                    aria-label={`Assign role for ${u.username}`}
                                    value={u.role}
                                    disabled={updatingUserId === u.id}
                                    onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs hover:border-emerald-500 focus:outline-hidden disabled:opacity-50"
                                  >
                                    <option value="CASHIER">CASHIER (Counter Sales Only)</option>
                                    <option value="MANAGER">MANAGER (Stock &amp; Closing)</option>
                                    <option value="ADMIN">ADMIN (Full Company Access)</option>
                                    <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Root)</option>
                                  </select>
                                  {updatingUserId === u.id && (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-3 py-2.5 text-center">
                                {u.is_active === 1 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                    Disabled
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MULTI-TENANT SECURITY ARCHITECTURE */}
            {activeTab === 'policy' && (
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                  {/* Super Admin Exclusive Authority Banner */}
                  <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-5 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-2xl bg-purple-600 p-2.5 text-white shadow-md">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                            Strict Platform Policy
                          </span>
                          <span className="rounded-full bg-purple-200 px-2 py-0.2 text-[10px] font-bold text-purple-900">
                            Super Admin Exclusive
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-extrabold text-purple-950">
                          Branch &amp; Tenant Provisioning Boundary
                        </h3>
                        <p className="mt-1 text-xs text-purple-900 leading-relaxed">
                          As specified in the software architecture: <strong>Only the Super Admin (Faisal)</strong> has the authorization to create new physical branches, register new client companies, and issue FBR POS licenses. Company Admins manage catalog items, sales taxes, and staff cashiers, but cannot provision new branches.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Tier Multi-Tenant Architecture Grid */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Tier 1: Platform Level */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Tier 1: Platform Level</h4>
                          <span className="text-[10px] font-semibold text-purple-700">Super Admin (Faisal)</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Creates client tenant companies</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Provisions physical branch outlets</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Configures FBR POS IDs &amp; licenses</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Executes global safety data resets</span>
                        </li>
                      </ul>
                    </div>

                    {/* Tier 2: Tenant Level */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Tier 2: Tenant Level</h4>
                          <span className="text-[10px] font-semibold text-blue-700">Company Admin</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Manages catalog items and barcode SKU</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Configures retail pricing and GST rates</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Registers cashier and manager logins</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Reviews consolidated multi-branch audits</span>
                        </li>
                      </ul>
                    </div>

                    {/* Tier 3: Counter Level */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Tier 3: Counter Level</h4>
                          <span className="text-[10px] font-semibold text-emerald-700">POS Cashier Staff</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Locked to assigned branch POS counter</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Fast barcode scanning and sales checkout</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Prints customer receipt with FBR USIN</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Performs end-of-shift cash drawer count</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">Shortcut:</span>
            <kbd className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              ESC
            </kbd>
            <span>Closes this window</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeUserRightsModal}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
