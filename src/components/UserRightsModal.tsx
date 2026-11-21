'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Crown,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
  Zap,
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

interface RightItem {
  key: string;
  label: string;
  category: 'Administration' | 'Maintain' | 'Transactions' | 'Reports';
  superAdminOnly?: boolean;
}

const ERP_RIGHTS: RightItem[] = [
  // 1. Administration (Top rows matching user's reference layout)
  { key: 'my_company', label: 'My Company', category: 'Administration', superAdminOnly: true },
  { key: 'my_logo', label: 'My Logo', category: 'Administration', superAdminOnly: true },
  { key: 'companies_list', label: 'List Of Companies', category: 'Administration', superAdminOnly: true },
  { key: 'user_logins', label: 'User Logins', category: 'Administration', superAdminOnly: true },
  { key: 'user_rights', label: 'User Rights', category: 'Administration', superAdminOnly: true },
  { key: 'passwords', label: 'Passwords', category: 'Administration', superAdminOnly: true },
  { key: 'financial_year', label: 'Financial Year', category: 'Administration', superAdminOnly: true },
  { key: 'clear_transactions', label: 'Clear Transactions', category: 'Administration', superAdminOnly: true },
  { key: 'branches_counters', label: 'Branches & Counters', category: 'Administration', superAdminOnly: true },
  { key: 'system_settings', label: 'System Settings & Currency', category: 'Administration', superAdminOnly: true },
  { key: 'backup_utility', label: 'BackUp Utility', category: 'Administration', superAdminOnly: true },

  // 2. Maintain & Master Catalog
  { key: 'customers', label: 'Customers Directory & CRM', category: 'Maintain' },
  { key: 'chart_of_inventory', label: 'Chart Of Inventory (Products)', category: 'Maintain' },
  { key: 'opening_balances', label: 'Inventory Opening Balances', category: 'Maintain' },
  { key: 'price_settings', label: 'Item Price Settings', category: 'Maintain' },
  { key: 'tax_rates', label: 'Item Sales Tax Rates (FBR)', category: 'Maintain' },

  // 3. Transactions & Point of Sale
  { key: 'pos_billing', label: 'POS Express Checkout & Billing', category: 'Transactions' },
  { key: 'hold_recall', label: 'Hold & Recall Parked Carts', category: 'Transactions' },
  { key: 'sales_return', label: 'Process Sales Returns & Restoring', category: 'Transactions' },
  { key: 'day_closing', label: 'Finalize Day Closing & Float', category: 'Transactions' },

  // 4. Financials & Reports
  { key: 'sales_register', label: 'Sales Register & Invoice Ledger', category: 'Reports' },
  { key: 'sale_summary', label: 'Sale Summary & Revenue Analytics', category: 'Reports' },
  { key: 'top_products', label: 'Top Products & Velocity Reports', category: 'Reports' },
  { key: 'gst_tax_summary', label: 'GST Tax Summary & FBR Audit', category: 'Reports' },
  { key: 'stock_valuation', label: 'Stock Valuation & Inventory Balance', category: 'Reports' },
];

interface RightSetting {
  allowed: boolean;
  editor: boolean;
  viewer: boolean;
}

export function UserRightsModal() {
  const {
    users,
    companies,
    branches,
    settings,
    closeUserRightsModal,
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

  // 1. Two Connected Top Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(tenantCompanies[0]?.id ?? 1);

  // Filter 2: Users of the Selected Company
  const companyUsers = useMemo(() => {
    if (!users || users.length === 0) return [];

    const matched = users.filter((u) => {
      if (isSuperAdminUser(u)) return true;
      if (u.branch_id) {
        const branch = branches.find((b) => b.id === u.branch_id);
        if (branch) return true;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      const aIsSuper = isSuperAdminUser(a);
      const bIsSuper = isSuperAdminUser(b);
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      return (a.full_name || a.username).localeCompare(b.full_name || b.username);
    });
  }, [users, branches]);

  const [selectedUserId, setSelectedUserId] = useState<number>(() => {
    return companyUsers[0]?.id ?? 1;
  });

  useEffect(() => {
    if (companyUsers.length > 0) {
      const currentExists = companyUsers.some((u) => u.id === selectedUserId);
      if (!currentExists) {
        setSelectedUserId(companyUsers[0].id);
      }
    }
  }, [selectedCompanyId, companyUsers, selectedUserId]);

  const activeSelectedUser = useMemo(() => {
    return companyUsers.find((u) => u.id === selectedUserId) || companyUsers[0] || null;
  }, [companyUsers, selectedUserId]);

  const isSelectedSuperAdmin = useMemo(() => {
    return isSuperAdminUser(activeSelectedUser);
  }, [activeSelectedUser]);

  const [permissionsState, setPermissionsState] = useState<Record<string, RightSetting>>({});
  const [saving, setSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  useEffect(() => {
    if (!activeSelectedUser) return;

    const initial: Record<string, RightSetting> = {};

    if (isSuperAdminUser(activeSelectedUser)) {
      ERP_RIGHTS.forEach((r) => {
        initial[r.key] = { allowed: true, editor: true, viewer: true };
      });
    } else {
      const existing = activeSelectedUser.permissions || {};
      const isCashier = activeSelectedUser.role === 'CASHIER';

      ERP_RIGHTS.forEach((r) => {
        if (existing[r.key] !== undefined) {
          const val = existing[r.key];
          if (typeof val === 'boolean') {
            initial[r.key] = { allowed: val, editor: val, viewer: val };
          } else if (typeof val === 'object' && val !== null) {
            initial[r.key] = {
              allowed: Boolean((val as any).allowed),
              editor: Boolean((val as any).editor),
              viewer: Boolean((val as any).viewer),
            };
          }
        } else {
          if (r.superAdminOnly) {
            initial[r.key] = { allowed: false, editor: false, viewer: false };
          } else if (isCashier) {
            const cashierAllowed = ['pos_billing', 'hold_recall', 'sales_return', 'customers', 'chart_of_inventory', 'day_closing'].includes(r.key);
            initial[r.key] = {
              allowed: cashierAllowed,
              editor: cashierAllowed && !['chart_of_inventory'].includes(r.key),
              viewer: cashierAllowed,
            };
          } else {
            initial[r.key] = {
              allowed: !r.superAdminOnly,
              editor: !r.superAdminOnly,
              viewer: !r.superAdminOnly,
            };
          }
        }
      });
    }

    setPermissionsState(initial);
  }, [activeSelectedUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeUserRightsModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeUserRightsModal]);

  const handleToggleAllowed = (rightKey: string) => {
    if (isSelectedSuperAdmin) return;

    setPermissionsState((prev) => {
      const current = prev[rightKey] ?? { allowed: false, editor: false, viewer: false };
      const nextAllowed = !current.allowed;
      return {
        ...prev,
        [rightKey]: {
          allowed: nextAllowed,
          editor: nextAllowed,
          viewer: nextAllowed,
        },
      };
    });
  };

  const handleToggleEditor = (rightKey: string) => {
    if (isSelectedSuperAdmin) return;

    setPermissionsState((prev) => {
      const current = prev[rightKey] ?? { allowed: false, editor: false, viewer: false };
      const nextEditor = !current.editor;
      const nextAllowed = nextEditor || current.viewer;
      return {
        ...prev,
        [rightKey]: {
          allowed: nextAllowed,
          editor: nextEditor,
          viewer: current.viewer,
        },
      };
    });
  };

  const handleToggleViewer = (rightKey: string) => {
    if (isSelectedSuperAdmin) return;

    setPermissionsState((prev) => {
      const current = prev[rightKey] ?? { allowed: false, editor: false, viewer: false };
      const nextViewer = !current.viewer;
      const nextAllowed = current.editor || nextViewer;
      return {
        ...prev,
        [rightKey]: {
          allowed: nextAllowed,
          editor: current.editor,
          viewer: nextViewer,
        },
      };
    });
  };

  const applyPreset = (preset: 'ALL' | 'BILLING' | 'RESET') => {
    if (isSelectedSuperAdmin) return;

    const nextState: Record<string, RightSetting> = {};
    const isCashier = activeSelectedUser?.role === 'CASHIER';

    ERP_RIGHTS.forEach((r) => {
      if (preset === 'ALL') {
        const canGrant = !r.superAdminOnly;
        nextState[r.key] = { allowed: canGrant, editor: canGrant, viewer: canGrant };
      } else if (preset === 'BILLING') {
        const isBilling = ['pos_billing', 'hold_recall', 'sales_return', 'customers', 'day_closing'].includes(r.key);
        nextState[r.key] = { allowed: isBilling, editor: isBilling, viewer: isBilling };
      } else {
        if (r.superAdminOnly) {
          nextState[r.key] = { allowed: false, editor: false, viewer: false };
        } else if (isCashier) {
          const cashierAllowed = ['pos_billing', 'hold_recall', 'sales_return', 'customers', 'chart_of_inventory', 'day_closing'].includes(r.key);
          nextState[r.key] = {
            allowed: cashierAllowed,
            editor: cashierAllowed && !['chart_of_inventory'].includes(r.key),
            viewer: cashierAllowed,
          };
        } else {
          nextState[r.key] = { allowed: !r.superAdminOnly, editor: !r.superAdminOnly, viewer: !r.superAdminOnly };
        }
      }
    });

    setPermissionsState(nextState);
    showToast(`Applied preset: ${preset === 'ALL' ? 'Grant All Operational' : preset === 'BILLING' ? 'Billing Only' : 'Role Default'}`, 'success');
  };

  const handleSaveChanges = async () => {
    if (!activeSelectedUser) return;

    if (isSelectedSuperAdmin) {
      showToast('Super Admin (Faisal) permissions are permanently active across all modules', 'success');
      return;
    }

    setSaving(true);
    try {
      const cleanMap: Record<string, any> = {};
      Object.entries(permissionsState).forEach(([k, v]) => {
        cleanMap[k] = {
          allowed: v.allowed,
          editor: v.editor,
          viewer: v.viewer,
        };
      });

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_user_rights',
          data: {
            user_id: activeSelectedUser.id,
            permissions: cleanMap,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save customized user rights');
      }

      await reloadContext();
      showToast(`User rights successfully updated for: ${activeSelectedUser.full_name}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving user rights', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-200 ${
        isMinimized ? 'pointer-events-none opacity-0' : 'bg-slate-950/65 backdrop-blur-xs'
      }`}
    >
      <div
        className={`flex flex-col rounded-2xl bg-white shadow-2xl transition-all duration-200 border border-slate-300 overflow-hidden ${
          isMaximized
            ? 'fixed inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] max-w-none'
            : 'w-full max-w-5xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* =========================================================================
            1. Title Bar (Executive Midnight Navy — Image 2 Standard)
        ========================================================================== */}
        <div className="flex shrink-0 items-center justify-between border-b border-sky-500/25 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-white select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wide uppercase text-white sm:text-base">
                  User Rights Settings &amp; Security Matrix
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live RBAC Matrix
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Granular Module Access • Allowed Status • Editor / Viewer Permissions Control
              </span>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-1 text-xs border border-white/10 text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-white">Administrator Mode</span>
            </div>

            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title="Minimize"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Window' : 'Maximize Window'}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={closeUserRightsModal}
              title="Close (Esc)"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`flex shrink-0 items-center justify-between px-4 py-2 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-white hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            2. Two Connected Top Filters Box (Clean White & Slate)
        ========================================================================== */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 p-3 sm:p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Filter 1: Select Company */}
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-sky-600" />
                    1. Select Target Company:
                  </span>
                  <span className="rounded bg-sky-100 border border-sky-300 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                    Filter 1 of 2
                  </span>
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs transition focus:border-sky-600 focus:outline-hidden focus:ring-1 focus:ring-sky-600"
                >
                  {tenantCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name} ({c.company_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Select User */}
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    2. Select User / Employee:
                  </span>
                  <span className="rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                    Filter 2 (Linked) • {companyUsers.length} Users
                  </span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs transition focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                >
                  {companyUsers.map((u) => {
                    const isSuper = isSuperAdminUser(u);
                    return (
                      <option key={u.id} value={u.id}>
                        {isSuper ? `👑 Administrator (${u.full_name || u.username})` : `${u.full_name} (${u.role} - @${u.username})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Quick Helper Subtitle or Super Admin Banner */}
            {isSelectedSuperAdmin ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-950 shadow-2xs">
                <div className="flex items-center gap-2 font-bold">
                  <Crown className="h-4 w-4 text-amber-600" />
                  <span>👑 Super Admin: {activeSelectedUser?.full_name || 'Faisal'} — All Rights Permanently Active across All Modules</span>
                </div>
                <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                  Full Authority • Zero Restrictions
                </span>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span>Configuring Rights for:</span>
                  <span className="font-bold text-slate-900">{activeSelectedUser?.full_name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                    {activeSelectedUser?.role}
                  </span>
                </div>

                {/* Quick Preset Buttons for Staff */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('ALL')}
                    className="rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('BILLING')}
                    className="rounded-lg bg-sky-50 border border-sky-300 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100 transition cursor-pointer"
                  >
                    Billing Only
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('RESET')}
                    className="rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subtitle / Instruction Line */}
          <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 italic">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Double-click or click on <strong className="font-bold text-slate-700 not-italic">Right Allowed Status</strong> to toggle access.</span>
          </div>
        </div>

        {/* =========================================================================
            3. Scrollable Table Grid (Clean White & Slate Body)
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f8fafc]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header: Clean Slate/Sky Header */}
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-bold text-left uppercase tracking-wider text-xs">Right Type</th>
                  <th className="px-4 py-3 font-bold text-center uppercase tracking-wider text-xs">Right Allowed Status</th>
                  <th className="px-4 py-3 font-bold text-center uppercase tracking-wider text-xs">Editor</th>
                  <th className="px-4 py-3 font-bold text-center uppercase tracking-wider text-xs">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ERP_RIGHTS.map((r) => {
                  const setting = permissionsState[r.key] ?? { allowed: false, editor: false, viewer: false };
                  const isAllowed = isSelectedSuperAdmin || setting.allowed;
                  const isEditor = isSelectedSuperAdmin || setting.editor;
                  const isViewer = isSelectedSuperAdmin || setting.viewer;

                  return (
                    <tr
                      key={r.key}
                      className="hover:bg-slate-50 transition select-none"
                    >
                      {/* Column 1: Right Type */}
                      <td className="px-4 py-2.5 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{r.label}</span>
                          {r.superAdminOnly && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 border border-amber-300">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Right Allowed Status */}
                      <td
                        className={`px-4 py-2.5 text-center font-bold cursor-pointer transition select-none ${
                          isSelectedSuperAdmin ? 'cursor-default' : 'hover:opacity-80'
                        }`}
                        onClick={() => handleToggleAllowed(r.key)}
                        onDoubleClick={() => handleToggleAllowed(r.key)}
                        title={isSelectedSuperAdmin ? 'Permanently Allowed for Super Admin' : 'Click to toggle access'}
                      >
                        {isAllowed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-300">
                            <Check className="h-3 w-3 stroke-[3]" />
                            Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                            <X className="h-3 w-3 stroke-[2.5]" />
                            Not Allowed
                          </span>
                        )}
                      </td>

                      {/* Column 3: Editor Checkbox */}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isSelectedSuperAdmin}
                          onClick={() => handleToggleEditor(r.key)}
                          className={`inline-flex items-center justify-center ${
                            isSelectedSuperAdmin ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {isEditor ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white shadow-2xs">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-sm border-2 border-slate-300 bg-white hover:border-slate-400 transition" />
                          )}
                        </button>
                      </td>

                      {/* Column 4: Viewer Checkbox */}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isSelectedSuperAdmin}
                          onClick={() => handleToggleViewer(r.key)}
                          className={`inline-flex items-center justify-center ${
                            isSelectedSuperAdmin ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {isViewer ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-blue-600 text-white shadow-2xs">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-sm border-2 border-slate-300 bg-white hover:border-slate-400 transition" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            4. Bottom Action Bar (Clean White Footer)
        ========================================================================== */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Target User: <strong className="text-slate-900 font-bold">{activeSelectedUser?.full_name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-2xs hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closeUserRightsModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
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
