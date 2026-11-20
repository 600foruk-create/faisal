'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  KeyRound,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
    name: 'POS Express Checkout & Billing',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Create sales invoices, scan item barcodes, tender cash/card payments, and print thermal receipts.',
  },
  {
    key: 'hold_recall',
    name: 'Hold & Recall Parked Carts',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Temporarily park incomplete customer sales and resume billing anytime without lane delay.',
  },
  {
    key: 'sales_return',
    name: 'Process Sales Returns & Stock Restoring',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Accept item returns against original invoices and automatically return items to branch inventory.',
  },
  {
    key: 'customer_manage',
    name: 'Customer CRM & Credit Ledger',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Register regular or wholesale customer profiles, CNIC/NTN, and manage customer credit balances.',
  },

  // 2. Inventory & Catalog
  {
    key: 'inventory_view',
    name: 'View Inventory Catalog & Stock',
    category: 'INVENTORY',
    categoryLabel: 'Inventory Catalog & Pricing',
    description: 'Browse master catalog products, categories, SKU barcodes, and live stock quantities.',
  },
  {
    key: 'inventory_manage',
    name: 'Add / Edit Products & Categories',
    category: 'INVENTORY',
    categoryLabel: 'Inventory Catalog & Pricing',
    description: 'Create new products, modify categories, edit units, and update SKU barcodes.',
  },
  {
    key: 'stock_opening',
    name: 'Record Stock Opening Balances',
    category: 'INVENTORY',
    categoryLabel: 'Inventory Catalog & Pricing',
    description: 'Commit initial physical stock opening batches and update cost valuations per branch.',
  },
  {
    key: 'price_settings',
    name: 'Edit Item Sale Prices & Margins',
    category: 'INVENTORY',
    categoryLabel: 'Inventory Catalog & Pricing',
    description: 'Modify retail prices, wholesale rates, and markup margins across all catalog products.',
  },
  {
    key: 'tax_rates',
    name: 'Sales Tax Rates & FBR HS Codes',
    category: 'INVENTORY',
    categoryLabel: 'Inventory Catalog & Pricing',
    description: 'Configure standard GST rates, third-schedule items, and FBR fiscal HS tariff codes.',
  },

  // 3. Financials & Reports
  {
    key: 'day_closing',
    name: 'Day Closing & Cash Drawer Count',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Submit end-of-day physical currency counts and reconcile expected vs counted cash drawer.',
  },
  {
    key: 'sales_register',
    name: 'View Sales Register & Invoice Journal',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Access complete transaction ledger with invoice timestamps, cashier name, and payment modes.',
  },
  {
    key: 'sale_summary',
    name: 'View Sale Summary & Revenue Analytics',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Review period gross sales, returns totals, payment mode splits, and net sales revenue.',
  },
  {
    key: 'top_products',
    name: 'View Top Selling Products Analytics',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Audit fast-moving items, revenue contribution, and depletion velocities across branches.',
  },
  {
    key: 'gst_tax_summary',
    name: 'View GST / Tax Summary & FBR Audit',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Audit output tax collected, return tax credits, net payable, and FBR sync audit logs.',
  },
  {
    key: 'inventory_balance',
    name: 'Multi-Branch Inventory Valuation Balance',
    category: 'FINANCIAL',
    categoryLabel: 'Financial Ledgers & Reports',
    description: 'Analyze cross-branch stock counts, valuation unit cost, and total stock capital worth.',
  },

  // 4. Administration & Security
  {
    key: 'user_manage',
    name: 'Manage Staff Accounts & Logins',
    category: 'ADMIN',
    categoryLabel: 'Company Administration',
    description: 'Create and update staff cashier and manager login accounts for the company.',
  },
  {
    key: 'backup_export',
    name: 'Export System Backup Utility',
    category: 'ADMIN',
    categoryLabel: 'Company Administration',
    description: 'Download full encrypted system database backup in JSON format.',
  },

  // 5. Super Admin Platform Powers (Faisal Only)
  {
    key: 'branch_manage',
    name: 'Provision Physical Branches & Terminals',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Super Admin Platform Powers',
    description: 'Register physical branches, assign FBR POS IDs, tokens, and hardware counters.',
    superAdminOnly: true,
  },
  {
    key: 'rights_manage',
    name: 'Grant User Rights & Permissions',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Super Admin Platform Powers',
    description: 'Exclusive right to customize and grant module permissions to any staff member.',
    superAdminOnly: true,
  },
  {
    key: 'company_manage',
    name: 'Register & Configure Client Tenants',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Super Admin Platform Powers',
    description: 'Multi-tenant organization provisioning and profile configuration reserved for Super Admin.',
    superAdminOnly: true,
  },
  {
    key: 'clear_data',
    name: 'Clear All Transactions & Database Reset',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Super Admin Platform Powers',
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

interface MatrixRow {
  id: number;
  module: string;
  categoryLabel: string;
  superAdmin: string;
  companyAdmin: string;
  manager: string;
  cashier: string;
  ruleNote: string;
}

const MATRIX_ROWS: MatrixRow[] = [
  {
    id: 1,
    module: 'Create Physical Branches & Terminals',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Super Admin (Faisal) exclusive authority. Physical branch creation is strictly restricted from other roles.',
  },
  {
    id: 2,
    module: 'Grant User Rights & Permissions',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Super Admin (Faisal) exclusive authority. Only Super Admin can grant or customize user rights.',
  },
  {
    id: 3,
    module: 'Register New Client Tenant / Company',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Multi-tenant organization provisioning is reserved exclusively for Super Admin (Faisal).',
  },
  {
    id: 4,
    module: 'Clear Transactions & Ledger Reset',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'RESTRICTED',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Critical reset utility requiring Super Admin confirmation to prevent accidental loss.',
  },
  {
    id: 5,
    module: 'Staff Accounts & Login Creation',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Company Admins can provision cashiers and store managers for their physical branches.',
  },
  {
    id: 6,
    module: 'Master Inventory Catalog & Categories',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Adding and editing master products, categories, SKU barcodes, and units.',
  },
  {
    id: 7,
    module: 'Edit Item Sale Prices & Margins',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Updating retail prices, wholesale rates, and markup calculations.',
  },
  {
    id: 8,
    module: 'Item Sales Tax Rates & FBR HS Codes',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Assigning GST tax percentages and tariff classifications to catalog lines.',
  },
  {
    id: 9,
    module: 'Record Stock Opening Balances',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'RESTRICTED',
    ruleNote: 'Initial stock intake and valuation adjustments per physical branch.',
  },
  {
    id: 10,
    module: 'View Inventory Catalog & Stock Levels',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Looking up product inventory quantities, barcode search, and item pricing.',
  },
  {
    id: 11,
    module: 'POS Express Checkout & Thermal Billing',
    categoryLabel: 'Point of Sale',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Standard cashier checkout, barcode scanning, payment receipt, and printing.',
  },
  {
    id: 12,
    module: 'Hold & Recall Parked Carts',
    categoryLabel: 'Point of Sale',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Temporarily parking active carts to avoid counter bottlenecks.',
  },
  {
    id: 13,
    module: 'Process Sales Returns & Stock Restoring',
    categoryLabel: 'Point of Sale',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Accepting returned items against original invoices and restoring inventory.',
  },
  {
    id: 14,
    module: 'Customer CRM & Credit Ledger',
    categoryLabel: 'Point of Sale',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Customer balance tracking and registration of regular/wholesale accounts.',
  },
  {
    id: 15,
    module: 'Day Closing & Cash Drawer Count',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Submitting day-end drawer cash reconciliation and variance reporting.',
  },
  {
    id: 16,
    module: 'View Sales Register & Invoice Journal',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Invoice history, payment details, and reprint access.',
  },
  {
    id: 17,
    module: 'View Sale Summary & Revenue Analytics',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'RESTRICTED',
    ruleNote: 'Daily, weekly, and monthly aggregate revenue breakdown.',
  },
  {
    id: 18,
    module: 'Top Selling Products Analytics',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'RESTRICTED',
    ruleNote: 'High-velocity items, depletion rates, and product performance analysis.',
  },
  {
    id: 19,
    module: 'GST Tax Summary & FBR Audit Log',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Tax collected, FBR invoice sync logs, and fiscal audit journal.',
  },
  {
    id: 20,
    module: 'Multi-Branch Inventory Valuation Balance',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'RESTRICTED',
    ruleNote: 'Cross-branch stock counts and inventory valuation totals.',
  },
  {
    id: 21,
    module: 'Export System Backup Utility',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Full JSON encrypted system backup export.',
  },
];

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

  // Window Controls & View State
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
  const [matrixSearch, setMatrixSearch] = useState('');

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

  // Filter 2 User Options: Strictly filtered by selected Company
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

  // Permission categories grouped
  const categorizedPermissions = useMemo(() => {
    return [
      {
        id: 'pos',
        title: 'Point of Sale & Billing Operations',
        description: 'Customer transactions, invoices, cart parking, and returns',
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'POS'),
      },
      {
        id: 'inventory',
        title: 'Inventory Catalog & Pricing Control',
        description: 'Master products, categories, stock opening, prices, and tax rates',
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'INVENTORY'),
      },
      {
        id: 'financial',
        title: 'Financial Ledgers & Reports',
        description: 'Day closings, sales registers, analytics summaries, and audits',
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'FINANCIAL'),
      },
      {
        id: 'admin',
        title: 'Company Administration',
        description: 'Staff account provisioning and encrypted database backup utility',
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'ADMIN'),
      },
      {
        id: 'super_admin',
        title: 'Super Admin Platform Powers (Faisal Only)',
        description: 'Exclusive multi-tenant infrastructure, branches, and ledger resets',
        items: ALL_PERMISSION_DEFINITIONS.filter((d) => d.category === 'SUPER_ADMIN'),
      },
    ];
  }, []);

  // Filtered Matrix Rows
  const filteredMatrix = useMemo(() => {
    if (!matrixSearch.trim()) return MATRIX_ROWS;
    const q = matrixSearch.toLowerCase().trim();
    return MATRIX_ROWS.filter(
      (m) =>
        m.module.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        m.ruleNote.toLowerCase().includes(q)
    );
  }, [matrixSearch]);

  // Granted count for selected user
  const grantedCount = useMemo(() => {
    if (isSelectedUserSuper) return 21;
    return Object.values(customPermissions).filter(Boolean).length;
  }, [customPermissions, isSelectedUserSuper]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs">
      <div
        className={`flex flex-col rounded-2xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-200 ${
          isMaximized
            ? 'h-[99vh] w-[99.5vw] max-w-none'
            : 'h-[95vh] max-h-[920px] w-full max-w-6xl'
        }`}
      >
        {/* Executive Midnight Navy Header */}
        <div className="flex select-none items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0a1829] via-[#0f243e] to-[#0a1829] px-5 py-3.5 text-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide">
                  User Rights &amp; Access Control
                </h2>
                <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 ring-1 ring-purple-400/30">
                  Super Admin Governed
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Grant or revoke operational module permissions per staff member across companies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Pill */}
            <div className="flex rounded-lg bg-slate-800/80 p-1 ring-1 ring-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('rights')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'rights'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Configure Rights</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'matrix'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Role Matrix</span>
              </button>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
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
            className={`mx-5 mt-2.5 flex items-center justify-between rounded-xl px-4 py-2 text-xs font-semibold shadow-md transition-all shrink-0 ${
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

        {/* Main Workspace */}
        {viewMode === 'rights' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Section: The 2 Linked Dropdown Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 bg-slate-50/95 p-4 shrink-0 shadow-2xs">
              {/* Filter 1: Company Selector */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  1. Select Company:
                </label>
                <select
                  value={selectedCompanyCode}
                  onChange={(e) => setSelectedCompanyCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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

              {/* Filter 2: User Selector (Strictly filtered by Company above) */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Users className="h-4 w-4 text-emerald-600" />
                  2. Select Staff Member / User:
                </label>
                <select
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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

            {/* Action Bar: User Details, Presets & Prominent Save Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Configuring Rights For:
                  </span>
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

              {/* Action Buttons: Super Admin Status or Staff Save & Presets */}
              <div className="flex items-center gap-2">
                {isSelectedUserSuper ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 shadow-2xs">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    Super Admin Rights Are 100% Permanently Active
                  </span>
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
                        Reset Default
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveUserRights}
                      disabled={savingRights}
                      className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
                    >
                      {savingRights ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Saving Rights...</span>
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

            {/* Super Admin Informative Banner */}
            {isSelectedUserSuper && (
              <div className="m-4 mb-1 flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs text-purple-900 shrink-0">
                <ShieldCheck className="h-5 w-5 text-purple-700 shrink-0" />
                <div>
                  <p className="font-bold">
                    Super Admin (Faisal) Possesses Permanent Full Rights
                  </p>
                  <p className="text-purple-700 text-[11px]">
                    As Platform Super Admin, all 21 capabilities are permanently active with NO option to turn OFF. Other staff members can be individually configured and toggled.
                  </p>
                </div>
              </div>
            )}

            {/* Single Full-Width Unified Capabilities Table */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 select-none">
                      <th className="py-2.5 px-3 text-center w-14">Sr #</th>
                      <th className="py-2.5 px-4 text-center">Module / Capability</th>
                      <th className="py-2.5 px-3 text-center w-40">Category</th>
                      <th className="py-2.5 px-3 text-center w-28">Status</th>
                      <th className="py-2.5 px-4 text-center w-44">Action / Switch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {categorizedPermissions.map((cat, catIdx) => (
                      <React.Fragment key={cat.id}>
                        {/* Category Section Header Divider */}
                        <tr className="bg-slate-50 border-t border-b border-slate-200">
                          <td colSpan={5} className="py-2 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                                  {catIdx + 1}
                                </span>
                                <span className="font-bold text-slate-800 text-xs">
                                  {cat.title}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {cat.items.length} Modules
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Category Module Rows */}
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
                            <tr
                              key={def.key}
                              className={`transition-colors ${
                                isGranted ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-100/50'
                              }`}
                            >
                              {/* Sr # */}
                              <td className="py-3 px-3 text-center font-bold text-slate-500 tabular-nums">
                                {overallSr}
                              </td>

                              {/* Module Title & Description */}
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 text-xs">
                                  {def.name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {def.description}
                                </div>
                              </td>

                              {/* Category Badge */}
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                                  {def.categoryLabel}
                                </span>
                              </td>

                              {/* Status Pill */}
                              <td className="py-3 px-3 text-center">
                                {isGranted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    Granted
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                    <X className="h-3 w-3 text-slate-400" />
                                    Restricted
                                  </span>
                                )}
                              </td>

                              {/* Action Column: Permanent Active for Faisal, Toggles for Staff */}
                              <td className="py-3 px-4 text-center">
                                {isSelectedUserSuper ? (
                                  /* Super Admin has NO right-off option! Permanent Active only */
                                  <div className="flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 ring-1 ring-purple-300">
                                      <Shield className="h-3.5 w-3.5 text-purple-600" />
                                      Permanent Active
                                    </span>
                                  </div>
                                ) : isSuperReserved ? (
                                  /* Platform Super Admin Reserved Powers */
                                  <div className="flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                                      <Lock className="h-3 w-3 text-slate-500" />
                                      Faisal Only (Reserved)
                                    </span>
                                  </div>
                                ) : (
                                  /* Regular staff interactive green switch */
                                  <div className="flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePermission(def.key)}
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isGranted ? 'bg-emerald-600' : 'bg-slate-300'
                                      }`}
                                      title={`Click to turn ${
                                        isGranted ? 'OFF' : 'ON'
                                      } ${def.name}`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                          isGranted ? 'translate-x-5.5' : 'translate-x-0.5'
                                        } mt-0.5`}
                                      />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Role Permissions Matrix View */
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Global Role Permissions Matrix (21 System Capabilities)
                </h3>
              </div>
              <div className="w-72 relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter matrix modules..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 select-none">
                      <th className="py-2.5 px-3 text-center w-12">Sr #</th>
                      <th className="py-2.5 px-4 text-center">System Module</th>
                      <th className="py-2.5 px-3 text-center w-28">Super Admin</th>
                      <th className="py-2.5 px-3 text-center w-28">Company Admin</th>
                      <th className="py-2.5 px-3 text-center w-28">Store Manager</th>
                      <th className="py-2.5 px-3 text-center w-28">POS Cashier</th>
                      <th className="py-2.5 px-4 text-center">Governance Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredMatrix.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-500 tabular-nums">
                          {row.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.module}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                            YES (100%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.companyAdmin === 'YES' ? (
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
                          {row.manager === 'YES' ? (
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
                          {row.cashier === 'YES' ? (
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
                          {row.ruleNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Executive Modal Footer with Bottom Save Option */}
        <div className="flex select-none items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
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
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
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
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
