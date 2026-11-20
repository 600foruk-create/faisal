'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  FileText,
  KeyRound,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import type { UserRole, UserSummary } from '@/lib/types';

interface PermissionDefinition {
  key: string;
  name: string;
  category: 'POS' | 'INVENTORY' | 'FINANCIAL' | 'ADMIN' | 'SUPER_ADMIN';
  categoryLabel: string;
  description: string;
  superAdminOnly?: boolean;
}

const ALL_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. Point of Sale & Billing
  {
    key: 'pos_billing',
    name: 'POS Express Checkout & Thermal Billing',
    category: 'POS',
    categoryLabel: 'Point of Sale',
    description: 'Create sales invoices, scan item barcodes, tender cash/card payments, and print thermal receipts.',
  },
  {
    key: 'hold_recall',
    name: 'Hold & Recall Parked Customer Carts',
    category: 'POS',
    categoryLabel: 'Point of Sale',
    description: 'Temporarily park incomplete sales tickets to prevent lane bottlenecks and resume checkout anytime.',
  },
  {
    key: 'sales_return',
    name: 'Process Sales Returns & Stock Restoring',
    category: 'POS',
    categoryLabel: 'Point of Sale',
    description: 'Accept item returns against original invoices and automatically return items back into inventory.',
  },
  {
    key: 'customer_manage',
    name: 'Customer CRM & Credit Ledger Directory',
    category: 'POS',
    categoryLabel: 'Point of Sale',
    description: 'Register regular or wholesale customer profiles, CNIC/NTN, and manage customer credit balances.',
  },

  // 2. Inventory & Catalog
  {
    key: 'inventory_view',
    name: 'View Master Catalog & Live Branch Stock',
    category: 'INVENTORY',
    categoryLabel: 'Inventory',
    description: 'Browse master catalog products, categories, SKU barcodes, and live stock quantities per branch.',
  },
  {
    key: 'inventory_manage',
    name: 'Add & Edit Master Products & Categories',
    category: 'INVENTORY',
    categoryLabel: 'Inventory',
    description: 'Create new products, modify categories, edit units, and update SKU barcodes across the catalog.',
  },
  {
    key: 'stock_opening',
    name: 'Record Physical Stock Opening Balances',
    category: 'INVENTORY',
    categoryLabel: 'Inventory',
    description: 'Commit initial physical stock opening batches and update cost valuations per branch.',
  },
  {
    key: 'price_settings',
    name: 'Edit Product Sale Prices & Profit Margins',
    category: 'INVENTORY',
    categoryLabel: 'Inventory',
    description: 'Modify retail prices, wholesale rates, and markup calculations across all catalog products.',
  },
  {
    key: 'tax_rates',
    name: 'Sales Tax Rates & FBR HS Tariff Codes',
    category: 'INVENTORY',
    categoryLabel: 'Inventory',
    description: 'Configure standard GST rates, third-schedule items, and FBR fiscal HS tariff codes.',
  },

  // 3. Financials & Reports
  {
    key: 'day_closing',
    name: 'Day Closing & Cash Drawer Reconciliation',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Submit end-of-day physical currency counts and reconcile expected vs counted cash drawer.',
  },
  {
    key: 'sales_register',
    name: 'Sales Register & Transaction Journal',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Access complete transaction ledger with invoice timestamps, cashier name, and payment modes.',
  },
  {
    key: 'sale_summary',
    name: 'Sale Summary & Revenue Analytics',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Review period gross sales, returns totals, payment mode splits, and net sales revenue.',
  },
  {
    key: 'top_products',
    name: 'Top Selling Products & Velocity Analysis',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Audit fast-moving items, revenue contribution, and depletion velocities across branches.',
  },
  {
    key: 'gst_tax_summary',
    name: 'GST Tax Summary & FBR Audit Journal',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Audit output tax collected, return tax credits, net payable, and FBR sync audit logs.',
  },
  {
    key: 'inventory_balance',
    name: 'Multi-Branch Inventory Valuation Balance',
    category: 'FINANCIAL',
    categoryLabel: 'Financials',
    description: 'Analyze cross-branch stock counts, valuation unit cost, and total stock capital worth.',
  },

  // 4. Administration & Security
  {
    key: 'user_manage',
    name: 'Manage Staff Accounts & Logins',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    description: 'Create and update staff cashier and manager login accounts for the company.',
  },
  {
    key: 'backup_export',
    name: 'Export System Database Backup Utility',
    category: 'ADMIN',
    categoryLabel: 'Administration',
    description: 'Download full encrypted system database backup in JSON format for offsite security.',
  },

  // 5. Super Admin Platform Powers (Faisal Only)
  {
    key: 'branch_manage',
    name: 'Provision Physical Branches & Terminals',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Powers',
    description: 'Register physical branches, assign FBR POS IDs, tokens, and hardware counters.',
    superAdminOnly: true,
  },
  {
    key: 'rights_manage',
    name: 'Grant User Rights & Permissions',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Powers',
    description: 'Exclusive right to customize and grant module permissions to any staff member.',
    superAdminOnly: true,
  },
  {
    key: 'company_manage',
    name: 'Register & Configure Client Tenants',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Powers',
    description: 'Multi-tenant organization provisioning and profile configuration reserved for Super Admin.',
    superAdminOnly: true,
  },
  {
    key: 'clear_data',
    name: 'Clear All Transactions & Database Reset',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Powers',
    description: 'Reset transaction ledgers for fresh fiscal year or test data purging.',
    superAdminOnly: true,
  },
];

const DEFAULT_ROLE_PRESETS: Record<UserRole, Record<string, boolean>> = {
  SUPER_ADMIN: {
    pos_billing: true,
    hold_recall: true,
    sales_return: true,
    customer_manage: true,
    inventory_view: true,
    inventory_manage: true,
    stock_opening: true,
    price_settings: true,
    tax_rates: true,
    day_closing: true,
    sales_register: true,
    sale_summary: true,
    top_products: true,
    gst_tax_summary: true,
    inventory_balance: true,
    user_manage: true,
    backup_export: true,
    branch_manage: true,
    rights_manage: true,
    company_manage: true,
    clear_data: true,
  },
  ADMIN: {
    pos_billing: true,
    hold_recall: true,
    sales_return: true,
    customer_manage: true,
    inventory_view: true,
    inventory_manage: true,
    stock_opening: true,
    price_settings: true,
    tax_rates: true,
    day_closing: true,
    sales_register: true,
    sale_summary: true,
    top_products: true,
    gst_tax_summary: true,
    inventory_balance: true,
    user_manage: true,
    backup_export: true,
    branch_manage: false,
    rights_manage: false,
    company_manage: false,
    clear_data: false,
  },
  MANAGER: {
    pos_billing: true,
    hold_recall: true,
    sales_return: true,
    customer_manage: true,
    inventory_view: true,
    inventory_manage: false,
    stock_opening: true,
    price_settings: false,
    tax_rates: false,
    day_closing: true,
    sales_register: true,
    sale_summary: true,
    top_products: true,
    gst_tax_summary: false,
    inventory_balance: true,
    user_manage: false,
    backup_export: false,
    branch_manage: false,
    rights_manage: false,
    company_manage: false,
    clear_data: false,
  },
  CASHIER: {
    pos_billing: true,
    hold_recall: true,
    sales_return: true,
    customer_manage: true,
    inventory_view: true,
    inventory_manage: false,
    stock_opening: false,
    price_settings: false,
    tax_rates: false,
    day_closing: true,
    sales_register: true,
    sale_summary: false,
    top_products: false,
    gst_tax_summary: false,
    inventory_balance: false,
    user_manage: false,
    backup_export: false,
    branch_manage: false,
    rights_manage: false,
    company_manage: false,
    clear_data: false,
  },
};

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

interface CategoryGroup {
  id: string;
  title: string;
  subtitle: string;
  color: 'emerald' | 'blue' | 'indigo' | 'amber' | 'purple';
  icon: React.ComponentType<{ className?: string }>;
  items: PermissionDefinition[];
}

export function UserRightsModal() {
  const {
    users,
    branches,
    companies,
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
  const [viewMode, setViewMode] = useState<'rights' | 'matrix'>('rights');

  // Filter 1: Company Selector (Default: SEASTONE)
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('SEASTONE');

  // Filter 2: Selected User / Staff Member
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Custom Permissions State for Selected User
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole>('CASHIER');
  const [savingRights, setSavingRights] = useState(false);

  // Collapsed state per category
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

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

  // Filter 2 User Options: Filtered strictly by selected Company
  const companyUsers = useMemo(() => {
    return users.filter((u) => {
      const isSuper = isSuperAdminUser(u);

      // Super Admin (Faisal) is available across all companies
      if (isSuper) return true;

      if (selectedCompanyCode === 'ALL') return true;

      const comp = tenantCompanies.find(
        (c) => c.company_code.toLowerCase() === selectedCompanyCode.toLowerCase()
      );
      const compName = (comp?.business_name || '').toLowerCase();
      const codeLower = selectedCompanyCode.toLowerCase();
      const bName = (u.branch_name || '').toLowerCase();

      const matchesBranch =
        bName.includes(codeLower) || (compName && bName.includes(compName));
      const isPrimarySeastone =
        codeLower === 'seastone' &&
        (bName.includes('timergara') ||
          bName.includes('mingora') ||
          bName.includes('retail') ||
          !u.branch_id);

      return matchesBranch || isPrimarySeastone;
    });
  }, [users, selectedCompanyCode, tenantCompanies]);

  // Keep selected user valid whenever company filter changes
  useEffect(() => {
    if (companyUsers.length > 0) {
      const exists = companyUsers.some((u) => u.id === selectedUserId);
      if (!exists) {
        // Prefer first staff member (e.g. Bilal Khan) so user immediately sees customizable rights
        const nonSuper = companyUsers.find((u) => !isSuperAdminUser(u));
        setSelectedUserId(nonSuper ? nonSuper.id : companyUsers[0].id);
      }
    }
  }, [companyUsers, selectedUserId]);

  const selectedUserObj = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const isSelectedUserSuper = useMemo(() => {
    return isSuperAdminUser(selectedUserObj);
  }, [selectedUserObj]);

  // Load permissions when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;
    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    const isTargetSuper = isSuperAdminUser(targetUser);
    setSelectedUserRole(isTargetSuper ? 'SUPER_ADMIN' : targetUser.role);

    const rolePreset =
      DEFAULT_ROLE_PRESETS[isTargetSuper ? 'SUPER_ADMIN' : targetUser.role] ??
      DEFAULT_ROLE_PRESETS.CASHIER;
    const saved = targetUser.permissions ?? {};
    const merged: Record<string, boolean> = { ...rolePreset, ...saved };

    // Super Admin (Faisal) has 100% full rights permanently across all 21 capabilities
    if (isTargetSuper) {
      ALL_PERMISSION_DEFINITIONS.forEach((def) => {
        merged[def.key] = true;
      });
    }

    setCustomPermissions(merged);
  }, [selectedUserId, users]);

  // Toggle single permission for regular staff (Blocked for Super Admin)
  const handleTogglePermission = (key: string) => {
    if (isSelectedUserSuper) {
      showToast('Super Admin (Faisal) has permanent 100% full rights and cannot be turned off', 'error');
      return;
    }

    setCustomPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle all permissions in a specific category
  const handleToggleCategory = (categoryItems: PermissionDefinition[]) => {
    if (isSelectedUserSuper) {
      showToast('Super Admin (Faisal) possesses permanent rights', 'error');
      return;
    }

    const availableItems = categoryItems.filter((i) => !i.superAdminOnly);
    if (availableItems.length === 0) return;

    const allCurrentlyOn = availableItems.every((i) => customPermissions[i.key]);
    const newState = !allCurrentlyOn;

    setCustomPermissions((prev) => {
      const updated = { ...prev };
      availableItems.forEach((i) => {
        updated[i.key] = newState;
      });
      return updated;
    });

    showToast(
      newState
        ? 'Enabled all capabilities in this category'
        : 'Disabled all capabilities in this category',
      'success'
    );
  };

  // Quick Action: Grant All Operational Permissions
  const handleGrantAll = () => {
    const allTrue: Record<string, boolean> = {};
    ALL_PERMISSION_DEFINITIONS.forEach((def) => {
      if (def.superAdminOnly && !isSelectedUserSuper) {
        allTrue[def.key] = false;
      } else {
        allTrue[def.key] = true;
      }
    });
    setCustomPermissions(allTrue);
    showToast('Granted all available module rights to selected staff', 'success');
  };

  // Quick Action: Cashier Billing Only
  const handleBillingOnly = () => {
    const billingOnly: Record<string, boolean> = {
      pos_billing: true,
      hold_recall: true,
      sales_return: true,
      customer_manage: true,
      inventory_view: true,
      inventory_manage: false,
      stock_opening: false,
      price_settings: false,
      tax_rates: false,
      day_closing: true,
      sales_register: false,
      sale_summary: false,
      top_products: false,
      gst_tax_summary: false,
      inventory_balance: false,
      user_manage: false,
      backup_export: false,
      branch_manage: false,
      rights_manage: false,
      company_manage: false,
      clear_data: false,
    };
    setCustomPermissions(billingOnly);
    showToast('Configured basic front-desk billing rights', 'success');
  };

  // Quick Action: Reset to Role Default Preset
  const handleResetDefault = () => {
    const preset =
      DEFAULT_ROLE_PRESETS[isSelectedUserSuper ? 'SUPER_ADMIN' : selectedUserRole] ??
      DEFAULT_ROLE_PRESETS.CASHIER;
    setCustomPermissions({ ...preset });
    showToast(`Reset rights to ${selectedUserRole} default preset`, 'success');
  };

  // Save Custom Rights to Backend
  const handleSaveUserRights = async () => {
    if (!selectedUserId || isSelectedUserSuper) return;

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    setSavingRights(true);
    try {
      if (targetUser.role !== selectedUserRole) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user_update',
            data: {
              id: targetUser.id,
              full_name: targetUser.full_name,
              role: selectedUserRole,
              branch_id: targetUser.branch_id,
              is_active: targetUser.is_active,
            },
          }),
        });
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_user_rights',
          data: {
            user_id: selectedUserId,
            permissions: customPermissions,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save customized user rights');
      }

      await reloadContext();
      showToast(
        `Rights successfully updated and saved for ${targetUser.full_name}!`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving user rights';
      showToast(msg, 'error');
    } finally {
      setSavingRights(false);
    }
  };

  // Categories formatted with rich visual metadata
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    return [
      {
        id: 'pos',
        title: 'Point of Sale & Billing Operations',
        subtitle: 'Customer checkout, barcodes, thermal billing, parked carts & returns',
        color: 'emerald',
        icon: ShoppingCart,
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'POS'),
      },
      {
        id: 'inventory',
        title: 'Inventory Catalog & Pricing Control',
        subtitle: 'Master items, categories, barcodes, stock intake, sales prices & GST rates',
        color: 'blue',
        icon: Package,
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'INVENTORY'),
      },
      {
        id: 'financial',
        title: 'Financial Ledgers & Reports',
        subtitle: 'Day end drawer closing, sales journals, revenue analytics & valuation',
        color: 'indigo',
        icon: BarChart3,
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'FINANCIAL'),
      },
      {
        id: 'admin',
        title: 'Company Administration',
        subtitle: 'Staff user accounts creation and encrypted system database backup export',
        color: 'amber',
        icon: Building2,
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'ADMIN'),
      },
      {
        id: 'super_admin',
        title: 'Super Admin Platform Powers (Faisal Only)',
        subtitle: 'Multi-tenant organization setup, physical branch provisioning & ledger reset',
        color: 'purple',
        icon: Crown,
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'SUPER_ADMIN'),
      },
    ];
  }, []);

  // Granted count for selected user
  const grantedCount = useMemo(() => {
    if (isSelectedUserSuper) return 21;
    return Object.values(customPermissions).filter(Boolean).length;
  }, [customPermissions, isSelectedUserSuper]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[99vh] w-[99.5vw] max-w-none'
            : 'h-[96vh] max-h-[940px] w-full max-w-6xl'
        }`}
      >
        {/* Executive Midnight Navy Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#071322] via-[#0d213a] to-[#071322] px-6 py-3.5 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/40 shadow-inner">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold tracking-wide text-white">
                  User Rights &amp; Access Control
                </h2>
                <span className="rounded-full bg-purple-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-200 ring-1 ring-purple-400/40">
                  Super Admin Governed
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure module privileges per employee across physical branches and client companies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Pill */}
            <div className="flex rounded-xl bg-slate-800/90 p-1 ring-1 ring-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('rights')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  viewMode === 'rights'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Configure Rights</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  viewMode === 'matrix'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Role Matrix</span>
              </button>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
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
                onClick={closeUserRightsModal}
                title="Close (ESC)"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Workspace */}
        {viewMode === 'rights' ? (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
            {/* Top Section: The 2 Connected Dropdown Filter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/90 shrink-0 shadow-xs">
              {/* Filter 1: Company Selector Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-emerald-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <span>1. Select Company / Tenant:</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Step 1
                  </span>
                </div>
                <select
                  value={selectedCompanyCode}
                  onChange={(e) => setSelectedCompanyCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-white focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="SEASTONE">
                    🏢 M/S SEASTONE PVC PIPE INDUSTRY (SEASTONE)
                  </option>
                  {tenantCompanies
                    .filter((c) => c.company_code !== 'SEASTONE')
                    .map((c) => (
                      <option key={c.id} value={c.company_code}>
                        🏢 {c.business_name} ({c.company_code})
                      </option>
                    ))}
                  <option value="ALL">🏢 All Companies (Global Directory)</option>
                </select>
              </div>

              {/* Filter 2: User Selector Card (Strictly filtered by Company above) */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-emerald-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>2. Select Staff Member / User:</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Step 2 ({companyUsers.length} Users)
                  </span>
                </div>
                <select
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-white focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  {companyUsers.map((u) => {
                    const isSuper = isSuperAdminUser(u);
                    return (
                      <option key={u.id} value={u.id}>
                        {isSuper ? '👑' : '👤'} {u.full_name} (@{u.username}) — Role: {u.role} — Branch: {u.branch_name || 'All Outlets (HQ)'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Profile Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shadow-inner ${
                    isSelectedUserSuper
                      ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300'
                      : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                  }`}
                >
                  {isSelectedUserSuper ? (
                    <Crown className="h-5 w-5 text-purple-700" />
                  ) : (
                    selectedUserObj?.full_name?.charAt(0) || 'U'
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {selectedUserObj?.full_name}
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      (@{selectedUserObj?.username})
                    </span>
                    {isSelectedUserSuper ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 ring-1 ring-purple-300">
                        Super Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300">
                        {selectedUserRole}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Branch: <span className="font-semibold text-slate-700">{selectedUserObj?.branch_name || 'All Company Outlets (Headquarters)'}</span>
                  </p>
                </div>

                {!isSelectedUserSuper && (
                  <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Base Role:</span>
                    <select
                      value={selectedUserRole}
                      onChange={(e) => setSelectedUserRole(e.target.value as UserRole)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      <option value="CASHIER">CASHIER (Front Desk)</option>
                      <option value="MANAGER">MANAGER (Store Incharge)</option>
                      <option value="ADMIN">ADMIN (Company Admin)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons: Status Badge or Presets + Primary Green Save Button */}
              <div className="flex items-center gap-2.5">
                {isSelectedUserSuper ? (
                  <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-extrabold text-purple-800 shadow-2xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>Permanent 100% Full Access (No OFF Switch)</span>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:flex items-center gap-1.5 text-xs mr-2">
                      <span className="text-slate-400 font-semibold">Presets:</span>
                      <button
                        type="button"
                        onClick={handleGrantAll}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition shadow-2xs"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={handleBillingOnly}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition shadow-2xs"
                      >
                        Billing Only
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDefault}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition shadow-2xs"
                      >
                        Reset Role
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveUserRights}
                      disabled={savingRights}
                      className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-98 transition disabled:opacity-50"
                    >
                      {savingRights ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Rights for {selectedUserObj?.full_name?.split(' ')[0] || 'User'}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Super Admin Notice Card */}
            {isSelectedUserSuper && (
              <div className="mx-6 mt-4 mb-1 flex items-center gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 p-4 text-xs text-purple-900 shadow-2xs shrink-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 ring-1 ring-purple-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold text-purple-950 text-sm">
                    Platform Super Admin (Faisal) Holds Permanent Full Authority
                  </p>
                  <p className="text-purple-800 text-xs mt-0.5">
                    As Platform Owner, all 21 system capabilities are permanently active with NO option to turn OFF. You can switch to regular employees above (e.g. Bilal Khan) to toggle individual rights.
                  </p>
                </div>
              </div>
            )}

            {/* Beautiful Categorized Permissions Workspace */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {categoryGroups.map((cat, idx) => {
                const isCollapsed = Boolean(collapsedCategories[cat.id]);
                const IconComponent = cat.icon;
                const activeCount = isSelectedUserSuper
                  ? cat.items.length
                  : cat.items.filter((i) => customPermissions[i.key]).length;

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition"
                  >
                    {/* Category Header Card */}
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-2xs ${
                            cat.color === 'emerald'
                              ? 'bg-emerald-100 text-emerald-700'
                              : cat.color === 'blue'
                              ? 'bg-blue-100 text-blue-700'
                              : cat.color === 'indigo'
                              ? 'bg-indigo-100 text-indigo-700'
                              : cat.color === 'amber'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {idx + 1}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {cat.title}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {cat.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Granted Pill */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            activeCount === cat.items.length
                              ? 'bg-emerald-100 text-emerald-800'
                              : activeCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>
                            {activeCount} / {cat.items.length} Active
                          </span>
                        </span>

                        {/* Category Bulk Toggle (for staff only) */}
                        {!isSelectedUserSuper && cat.id !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat.items)}
                            className="cursor-pointer text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                          >
                            Toggle All
                          </button>
                        )}

                        {/* Collapse Button */}
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapse(cat.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                          title={isCollapsed ? 'Expand Category' : 'Collapse Category'}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Category Items List */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {cat.items.map((def) => {
                          const overallSr =
                            ALL_PERMISSION_DEFINITIONS.findIndex(
                              (d) => d.key === def.key
                            ) + 1;
                          const isGranted = isSelectedUserSuper
                            ? true
                            : Boolean(customPermissions[def.key]);
                          const isSuperReserved = Boolean(def.superAdminOnly);

                          return (
                            <div
                              key={def.key}
                              className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                                isGranted
                                  ? 'bg-white hover:bg-emerald-50/20'
                                  : 'bg-slate-50/30 hover:bg-slate-50'
                              }`}
                            >
                              {/* Left Info */}
                              <div className="flex items-start gap-3.5 flex-1 pr-4">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 tabular-nums mt-0.5">
                                  {overallSr}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-bold text-slate-900">
                                      {def.name}
                                    </h5>
                                    {isGranted ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        Granted
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                                        <X className="h-3 w-3 text-slate-400" />
                                        Restricted
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                    {def.description}
                                  </p>
                                </div>
                              </div>

                              {/* Right Switch / Lock Badge */}
                              <div className="shrink-0 flex items-center justify-end w-44">
                                {isSelectedUserSuper ? (
                                  /* Super Admin has NO right-off option! Permanent Active badge only */
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-extrabold text-purple-800 ring-1 ring-purple-300 shadow-2xs">
                                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                                    Permanent Active
                                  </span>
                                ) : isSuperReserved ? (
                                  /* Platform Powers reserved for Faisal */
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                                    Faisal Only (Reserved)
                                  </span>
                                ) : (
                                  /* Regular Staff Smooth Toggle Switch */
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`text-xs font-bold ${
                                        isGranted
                                          ? 'text-emerald-700'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {isGranted ? 'ON' : 'OFF'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePermission(def.key)}
                                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                                        isGranted
                                          ? 'bg-emerald-600 ring-1 ring-emerald-500'
                                          : 'bg-slate-300 ring-1 ring-slate-400'
                                      }`}
                                      title={`Click to turn ${
                                        isGranted ? 'OFF' : 'ON'
                                      } ${def.name}`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                          isGranted
                                            ? 'translate-x-6'
                                            : 'translate-x-0.5'
                                        } mt-0.5`}
                                      />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Role Permissions Matrix View */
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Global Role Permissions Matrix (21 Capabilities)
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Official Multi-Tenant Governance Policy
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 select-none">
                      <th className="py-3 px-3 text-center w-12">Sr #</th>
                      <th className="py-3 px-4 text-center">System Module</th>
                      <th className="py-3 px-3 text-center w-28">Super Admin</th>
                      <th className="py-3 px-3 text-center w-28">Company Admin</th>
                      <th className="py-3 px-3 text-center w-28">Store Manager</th>
                      <th className="py-3 px-3 text-center w-28">POS Cashier</th>
                      <th className="py-3 px-4 text-center">Governance Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {ALL_PERMISSION_DEFINITIONS.map((def, idx) => {
                      const presets = DEFAULT_ROLE_PRESETS;
                      return (
                        <tr key={def.key} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 text-center font-bold text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {def.name}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                              YES (100%)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {presets.ADMIN[def.key] ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                YES
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                                RESTRICTED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {presets.MANAGER[def.key] ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                YES
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                                RESTRICTED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {presets.CASHIER[def.key] ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                YES
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                                RESTRICTED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            {def.description}
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

        {/* Executive Modal Footer with Bottom Save Option */}
        <div className="flex select-none items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span>Keyboard Shortcut:</span>
            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 shadow-2xs">
              ESC
            </kbd>
            <span>closes this window</span>
          </div>

          <div className="flex items-center gap-3">
            {!isSelectedUserSuper && (
              <button
                type="button"
                onClick={handleSaveUserRights}
                disabled={savingRights}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-98 transition disabled:opacity-50"
              >
                {savingRights ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Rights</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={closeUserRightsModal}
              className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
