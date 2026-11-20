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
  Save,
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

type RightsTab = 'custom_rights' | 'matrix' | 'policy';
type ModuleCategory = 'ALL' | 'POS' | 'INVENTORY' | 'FINANCIAL' | 'ADMIN';

interface PermissionDefinition {
  key: string;
  name: string;
  category: 'POS' | 'INVENTORY' | 'FINANCIAL' | 'ADMIN' | 'SUPER_ADMIN';
  categoryLabel: string;
  description: string;
  superAdminOnly?: boolean;
}

const ALL_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. Point of Sale & Front Desk
  {
    key: 'pos_billing',
    name: 'POS Express Checkout & Billing',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Create sales invoices, scan barcodes, tender payments, and print thermal receipts.',
  },
  {
    key: 'hold_recall',
    name: 'Hold & Recall Parked Carts',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Temporarily park incomplete customer sales and resume billing anytime.',
  },
  {
    key: 'sales_return',
    name: 'Process Sales Returns & Stock Restoring',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Accept item returns against original invoices and automatically return items to branch stock.',
  },
  {
    key: 'customer_manage',
    name: 'Customer CRM & Credit Ledger',
    category: 'POS',
    categoryLabel: 'Point of Sale & Billing',
    description: 'Register regular or wholesale customer profiles, CNIC/NTN, and manage credit ledgers.',
  },

  // 2. Inventory & Catalog
  {
    key: 'inventory_view',
    name: 'View Inventory Catalog & Stock',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    description: 'Browse master catalog products, categories, SKU barcodes, and live stock quantities.',
  },
  {
    key: 'inventory_manage',
    name: 'Add / Edit Products & Categories',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    description: 'Create new products, modify categories, edit units, and update SKU barcodes.',
  },
  {
    key: 'stock_opening',
    name: 'Record Stock Opening Balances',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    description: 'Commit initial physical stock opening batches and update cost valuations per branch.',
  },
  {
    key: 'price_settings',
    name: 'Edit Item Sale Prices & Margins',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    description: 'Modify retail prices, wholesale rates, and markup margins across all catalog products.',
  },
  {
    key: 'tax_rates',
    name: 'Sales Tax Rates & FBR HS Codes',
    category: 'INVENTORY',
    categoryLabel: 'Inventory & Catalog',
    description: 'Configure standard GST rates, third-schedule items, and FBR fiscal HS codes.',
  },

  // 3. Financials & Reports
  {
    key: 'day_closing',
    name: 'Day Closing & Cash Drawer Count',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Submit end-of-day physical currency counts and reconcile expected vs counted cash.',
  },
  {
    key: 'sales_register',
    name: 'View Sales Register & Invoice Journal',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Access complete transaction ledger with invoice timestamps, cashier name, and FBR status.',
  },
  {
    key: 'sale_summary',
    name: 'View Sale Summary & Revenue Analytics',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Review period gross sales, returns totals, payment mode splits, and net sales revenue.',
  },
  {
    key: 'top_products',
    name: 'View Top Selling Products Analytics',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Audit fast-moving items, revenue contribution, and depletion velocities.',
  },
  {
    key: 'gst_tax_summary',
    name: 'View GST / Tax Summary & FBR Audit',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Audit output tax collected, return tax credits, net payable, and FBR sync logs.',
  },
  {
    key: 'inventory_balance',
    name: 'Multi-Branch Inventory Valuation Balance',
    category: 'FINANCIAL',
    categoryLabel: 'Financials & Reports',
    description: 'Analyze cross-branch stock counts, valuation unit cost, and total stock capital worth.',
  },

  // 4. Administration & Security
  {
    key: 'user_manage',
    name: 'Manage Staff Accounts & Logins',
    category: 'ADMIN',
    categoryLabel: 'Tenant Administration',
    description: 'Create and update staff cashier and manager login accounts for the company.',
  },
  {
    key: 'backup_export',
    name: 'Export System Backup Utility',
    category: 'ADMIN',
    categoryLabel: 'Tenant Administration',
    description: 'Download full encrypted system database backup in JSON format.',
  },

  // 5. Super Admin Platform Powers
  {
    key: 'branch_manage',
    name: 'Provision Physical Branches & Terminals',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Super Admin',
    description: 'Register physical branches, assign FBR POS IDs, tokens, and hardware counters.',
    superAdminOnly: true,
  },
  {
    key: 'rights_manage',
    name: 'Grant User Rights & Security Permissions',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Super Admin',
    description: 'Exclusive right to customize and grant module permissions to any staff member.',
    superAdminOnly: true,
  },
  {
    key: 'clear_data',
    name: 'Clear All Transactions & Database Reset',
    category: 'SUPER_ADMIN',
    categoryLabel: 'Platform Super Admin',
    description: 'Reset transaction ledgers for fresh fiscal year or test data purging.',
    superAdminOnly: true,
  },
];

// Default permission presets per role
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
    clear_data: false,
  },
};

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
    ruleNote: 'Super Admin (Faisal) exclusive right. Branch provisioning is strictly restricted from Company Admins.',
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
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Company Admins can provision cashiers and store managers for their physical branches.',
  },
  {
    id: 6,
    module: 'Reset Passwords & Counter Security PIN',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Company Admin can reset counter login passwords for cashiers.',
  },
  {
    id: 7,
    module: 'Database Backup Utility Export',
    categoryLabel: 'Administration',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'RESTRICTED',
    cashier: 'RESTRICTED',
    ruleNote: 'Exports complete tenant JSON backup with sanitized password hashes.',
  },
  {
    id: 8,
    module: 'Master Inventory Catalog & Categories',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'READ_POS',
    ruleNote: 'Adding and editing products, categories, SKU barcodes, and units.',
  },
  {
    id: 9,
    module: 'Inventory Opening Balances Batches',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Initial stock intake and valuation adjustments per physical branch.',
  },
  {
    id: 10,
    module: 'Item Price Settings & Profit Margins',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Updating retail prices, wholesale rates, and markup calculations in bulk.',
  },
  {
    id: 11,
    module: 'Item Sales Tax Rates & FBR HS Codes',
    categoryLabel: 'Inventory & Catalog',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'VIEW_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Assigning GST tax percentages and tariff classifications to catalog lines.',
  },
  {
    id: 12,
    module: 'Customer Directory & Credit Ledgers',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'QUICK_ADD',
    ruleNote: 'Full customer CRM; cashiers can register walk-in or new clients during checkout.',
  },
  {
    id: 13,
    module: 'POS Express Checkout & Receipt Print',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Primary daily cashier billing module with barcode scanning and thermal print.',
  },
  {
    id: 14,
    module: 'Hold / Recall Parked Carts',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'YES',
    cashier: 'YES',
    ruleNote: 'Parking bills temporarily to avoid cashier lane delays.',
  },
  {
    id: 15,
    module: 'Sales Return & Stock Restoring',
    categoryLabel: 'POS & Billing',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'AUTHORIZE',
    cashier: 'YES',
    ruleNote: 'Scans original invoice and handles item returns with automatic stock restoration.',
  },
  {
    id: 16,
    module: 'Day Closing & Cash Variance Count',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'AUDIT',
    manager: 'BRANCH_ONLY',
    cashier: 'SHIFT_ONLY',
    ruleNote: 'End of day physical cash counting and reconciliation against system expectations.',
  },
  {
    id: 17,
    module: 'Sales Register & Invoice Ledger',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'SHIFT_ONLY',
    ruleNote: 'Comprehensive fiscal transaction journal with FBR status and payment modes.',
  },
  {
    id: 18,
    module: 'Sales Summary & Revenue Analytics',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'Review period gross sales, net revenue, payment split breakdowns.',
  },
  {
    id: 19,
    module: 'Top Selling Products Analytics',
    categoryLabel: 'Financials & Reports',
    superAdmin: 'YES',
    companyAdmin: 'YES',
    manager: 'BRANCH_ONLY',
    cashier: 'RESTRICTED',
    ruleNote: 'High-velocity items, stock depletion, sales revenue contribution.',
  },
  {
    id: 20,
    module: 'GST Tax Summary & FBR Audit Log',
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
  const [activeTab, setActiveTab] = useState<RightsTab>('custom_rights');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Selected User for Custom Rights Assignment
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole>('CASHIER');
  const [savingRights, setSavingRights] = useState(false);

  // Check if current user is Super Admin (Faisal)
  const isSuperAdmin = useMemo(() => {
    if (!activeUser) return false;
    return (
      activeUser.role === 'SUPER_ADMIN' ||
      activeUser.username.toLowerCase() === 'faisal'
    );
  }, [activeUser]);

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

  // Set initial selected user to first non-super admin (or first user)
  useEffect(() => {
    if (users.length > 0 && selectedUserId === null) {
      const nonSuper = users.find((u) => u.role !== 'SUPER_ADMIN') ?? users[0];
      setSelectedUserId(nonSuper.id);
    }
  }, [users, selectedUserId]);

  // Load custom permissions when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;
    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    setSelectedUserRole(targetUser.role);

    // If user has saved custom permissions in DB/object, use them; otherwise use role default
    const rolePreset = DEFAULT_ROLE_PRESETS[targetUser.role] ?? DEFAULT_ROLE_PRESETS.CASHIER;
    const saved = targetUser.permissions ?? {};
    const merged: Record<string, boolean> = { ...rolePreset, ...saved };

    // If user is Super Admin, ensure ALL permissions are TRUE
    if (targetUser.role === 'SUPER_ADMIN' || targetUser.username.toLowerCase() === 'faisal') {
      ALL_PERMISSION_DEFINITIONS.forEach((def) => {
        merged[def.key] = true;
      });
    }

    setCustomPermissions(merged);
  }, [selectedUserId, users]);

  // Toggle single permission for selected user
  const handleTogglePermission = (key: string) => {
    if (!isSuperAdmin) {
      showToast('Access Denied: Only Super Admin (Faisal) can grant or modify user rights', 'error');
      return;
    }
    const targetUser = users.find((u) => u.id === selectedUserId);
    if (targetUser?.role === 'SUPER_ADMIN' || targetUser?.username.toLowerCase() === 'faisal') {
      showToast('Super Admin (Faisal) possesses permanent 100% full rights and cannot be restricted', 'error');
      return;
    }

    setCustomPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick Action: Grant All Permissions
  const handleGrantAll = () => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin (Faisal) can grant user rights', 'error');
      return;
    }
    const allTrue: Record<string, boolean> = {};
    ALL_PERMISSION_DEFINITIONS.forEach((def) => {
      // Branch manage, rights manage, clear data are Super Admin exclusive
      if (def.superAdminOnly) {
        allTrue[def.key] = false;
      } else {
        allTrue[def.key] = true;
      }
    });
    setCustomPermissions(allTrue);
    showToast('Granted all module permissions to selected user', 'success');
  };

  // Quick Action: Revoke to Basic POS Billing Only
  const handleRevokeOptional = () => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin (Faisal) can modify user rights', 'error');
      return;
    }
    const minimal: Record<string, boolean> = {
      pos_billing: true,
      hold_recall: true,
      sales_return: false,
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
      clear_data: false,
    };
    setCustomPermissions(minimal);
    showToast('Restricted user permissions to basic front desk billing only', 'success');
  };

  // Quick Action: Reset to Role Defaults
  const handleResetToRoleDefault = () => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin (Faisal) can modify user rights', 'error');
      return;
    }
    const preset = DEFAULT_ROLE_PRESETS[selectedUserRole] ?? DEFAULT_ROLE_PRESETS.CASHIER;
    setCustomPermissions({ ...preset });
    showToast(`Reset permissions to default preset for ${selectedUserRole}`, 'success');
  };

  // Save Custom Rights to Backend
  const handleSaveUserRights = async () => {
    if (!isSuperAdmin) {
      showToast('Access Denied: Only Super Admin (Faisal) can grant or save user rights', 'error');
      return;
    }
    if (!selectedUserId) return;

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    setSavingRights(true);
    try {
      // 1. If role was changed, update role first
      if (targetUser.role !== selectedUserRole) {
        const roleRes = await fetch('/api/settings', {
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
        if (!roleRes.ok) {
          throw new Error('Failed to update user role');
        }
      }

      // 2. Save custom permissions
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
      showToast(`Custom rights for ${targetUser.full_name} (${targetUser.username}) saved successfully!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving user rights';
      showToast(msg, 'error');
    } finally {
      setSavingRights(false);
    }
  };

  // Filtered Matrix Rows for Tab 2
  const filteredMatrix = useMemo(() => {
    if (!searchQuery.trim()) return MATRIX_ROWS;
    const q = searchQuery.toLowerCase().trim();
    return MATRIX_ROWS.filter(
      (m) =>
        m.module.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        m.ruleNote.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const selectedUserObj = users.find((u) => u.id === selectedUserId);
  const isSelectedUserSuper =
    selectedUserObj?.role === 'SUPER_ADMIN' ||
    selectedUserObj?.username.toLowerCase() === 'faisal';

  // Group permission definitions by category for Tab 1
  const groupedDefinitions = useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {
      'Point of Sale & Billing': [],
      'Inventory & Catalog': [],
      'Financials & Reports': [],
      'Tenant Administration': [],
      'Platform Super Admin (Faisal Only)': [],
    };

    ALL_PERMISSION_DEFINITIONS.forEach((def) => {
      if (def.category === 'POS') groups['Point of Sale & Billing'].push(def);
      else if (def.category === 'INVENTORY') groups['Inventory & Catalog'].push(def);
      else if (def.category === 'FINANCIAL') groups['Financials & Reports'].push(def);
      else if (def.category === 'ADMIN') groups['Tenant Administration'].push(def);
      else groups['Platform Super Admin (Faisal Only)'].push(def);
    });

    return groups;
  }, []);

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
                  User Rights &amp; Custom Permissions Manager
                </h2>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Super Admin Controlled
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tenant: <span className="font-semibold text-slate-200">{settings.business_name}</span> | Custom Module Rights Assignment By Super Admin (Faisal)
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
            {/* Top Super Admin Authority Status Banner */}
            <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="text-xs">
                    <span className="font-semibold text-slate-500">Super Admin Rights Authority:</span>{' '}
                    <span className="font-extrabold text-purple-900">
                      Faisal (Super Admin) Grants All Rights
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Authorized as Super Admin (Faisal)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      Viewing in Read-Only Mode (Faisal Exclusive)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 5 Executive KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-100/70 p-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Governed Modules</span>
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-slate-900">21</span>
                  <span className="text-[11px] font-semibold text-slate-500">Capabilities</span>
                </div>
              </div>

              <div className="rounded-xl border border-purple-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-purple-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Super Admin (Faisal)</span>
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-purple-700">100%</span>
                  <span className="text-[11px] font-semibold text-purple-600">Full Rights Always</span>
                </div>
              </div>

              <div className="rounded-xl border border-teal-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-teal-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Rights Authority</span>
                  <KeyRound className="h-4 w-4 text-teal-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-teal-700">Exclusive</span>
                  <span className="text-[11px] font-semibold text-teal-600">Only Faisal Grants</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200/80 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between text-blue-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Company Admin</span>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-blue-700">Tenant Scope</span>
                  <span className="text-[11px] font-semibold text-blue-600">Catalog &amp; Cashiers</span>
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-emerald-200/80 bg-white p-3 shadow-xs sm:col-span-1">
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider">POS Cashier</span>
                  <Store className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-emerald-700">Counter POS</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Billing &amp; Receipts</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-2">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('custom_rights')}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition ${
                    activeTab === 'custom_rights'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Assign Custom Rights Per Staff Member</span>
                </button>

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
                  <span>Full Role Permissions Matrix</span>
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
                  <span>Multi-Tenant Security Policy</span>
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

            {/* TAB 1: CUSTOM RIGHTS ASSIGNMENT PER STAFF MEMBER */}
            {activeTab === 'custom_rights' && (
              <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-5">
                {/* Employee Selector Bar */}
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-5">
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Select Employee To Configure Individual Rights:
                      </label>
                      <select
                        aria-label="Select Employee"
                        value={selectedUserId ?? ''}
                        onChange={(e) => setSelectedUserId(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.username}) — Role: {u.role} — Branch: {u.branch_name ?? 'All Outlets (HQ)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Base Security Role:
                      </label>
                      <select
                        aria-label="Security Role"
                        value={selectedUserRole}
                        disabled={!isSuperAdmin || isSelectedUserSuper}
                        onChange={(e) => setSelectedUserRole(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="CASHIER">CASHIER (Front Desk Staff)</option>
                        <option value="MANAGER">MANAGER (Store Supervisor)</option>
                        <option value="ADMIN">ADMIN (Tenant Company Owner)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Platform Root Faisal)</option>
                      </select>
                    </div>

                    <div className="md:col-span-4 flex items-end justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleGrantAll}
                        disabled={!isSuperAdmin || isSelectedUserSuper}
                        title="Grant all modules to this employee"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeOptional}
                        disabled={!isSuperAdmin || isSelectedUserSuper}
                        title="Restrict to basic counter POS only"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                      >
                        Billing Only
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToRoleDefault}
                        disabled={!isSuperAdmin || isSelectedUserSuper}
                        title="Reset to default preset for this role"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40"
                      >
                        Reset Preset
                      </button>
                    </div>
                  </div>
                </div>

                {/* If selected user is Faisal (Super Admin) */}
                {isSelectedUserSuper ? (
                  <div className="flex-1 overflow-auto rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg">
                      <Shield className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-base font-extrabold text-purple-950">
                      Super Admin (Faisal) — 100% Unrestricted Full Rights
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-xs text-purple-900 leading-relaxed">
                      As the platform software owner, your account <strong>Faisal</strong> holds complete, unrestricted authority over all 21 system modules, physical branches, tenant provisioning, pricing, tax rates, financial audits, and security controls across all companies.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-300 bg-white px-4 py-1.5 text-xs font-bold text-purple-800 shadow-xs">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      All 21 System Permissions Permanently Active
                    </div>
                  </div>
                ) : (
                  /* Custom Permissions Toggles Grid */
                  <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    {!isSuperAdmin && (
                      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          Notice: You are in Read-Only Mode. Only Faisal (Super Admin) can toggle or save custom user rights.
                        </span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {Object.entries(groupedDefinitions).map(([groupTitle, defs]) => (
                        <div key={groupTitle}>
                          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
                            {groupTitle}
                          </h4>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {defs.map((def) => {
                              const isChecked = Boolean(customPermissions[def.key]);
                              const isLockedSuperAdminOnly = Boolean(def.superAdminOnly);

                              return (
                                <div
                                  key={def.key}
                                  onClick={() => {
                                    if (!isLockedSuperAdminOnly) {
                                      handleTogglePermission(def.key);
                                    }
                                  }}
                                  className={`rounded-xl border p-3 transition select-none ${
                                    isLockedSuperAdminOnly
                                      ? 'border-purple-200 bg-purple-50/40 opacity-75'
                                      : isChecked
                                      ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs cursor-pointer hover:border-emerald-400'
                                      : 'border-slate-200 bg-slate-50/70 cursor-pointer hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900">
                                        {def.name}
                                      </h5>
                                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                                        {def.description}
                                      </p>
                                    </div>

                                    {/* Toggle Switch */}
                                    <div className="shrink-0 pt-0.5">
                                      {isLockedSuperAdminOnly ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                          <Lock className="h-2.5 w-2.5" />
                                          Faisal Only
                                        </span>
                                      ) : (
                                        <div
                                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                            isChecked ? 'bg-emerald-600' : 'bg-slate-300'
                                          }`}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                              isChecked ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                                    <span className="font-semibold text-slate-400">{def.categoryLabel}</span>
                                    {isChecked ? (
                                      <span className="font-extrabold text-emerald-700">Granted</span>
                                    ) : (
                                      <span className="font-semibold text-slate-400">Restricted</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Rights Footer Bar */}
                {!isSelectedUserSuper && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    <div className="text-xs text-slate-600">
                      Configuring rights for:{' '}
                      <strong className="text-slate-900">{selectedUserObj?.full_name}</strong> ({selectedUserObj?.username})
                      {' | '}
                      Role: <strong className="text-slate-900">{selectedUserRole}</strong>
                    </div>

                    <button
                      type="button"
                      disabled={!isSuperAdmin || savingRights}
                      onClick={handleSaveUserRights}
                      className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {savingRights ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving Rights...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Custom Rights For {selectedUserObj?.username}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: FULL ROLE PERMISSIONS MATRIX */}
            {activeTab === 'matrix' && (
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                {/* Search Bar */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search module capability or operational rule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs focus:border-emerald-500 focus:outline-hidden"
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

                {/* Permissions Matrix Table */}
                <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                        <th className="px-3 py-2.5 text-center">Sr #</th>
                        <th className="px-3 py-2.5 text-center">POS Module / Capability</th>
                        <th className="px-3 py-2.5 text-center">Scope</th>
                        <th className="px-3 py-2.5 text-center bg-purple-50 text-purple-900 font-extrabold">
                          Super Admin (Faisal)
                        </th>
                        <th className="px-3 py-2.5 text-center">Company Admin</th>
                        <th className="px-3 py-2.5 text-center">Store Manager</th>
                        <th className="px-3 py-2.5 text-center">POS Cashier</th>
                        <th className="px-4 py-2.5 text-center">Operational Policy &amp; Security Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMatrix.map((item, idx) => (
                        <tr key={item.id} className="transition hover:bg-slate-50/80">
                          {/* Sr # */}
                          <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Module */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                            {item.module}
                          </td>

                          {/* Scope */}
                          <td className="px-3 py-2.5 text-center">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {item.categoryLabel}
                            </span>
                          </td>

                          {/* Super Admin (Faisal): 100% Full Access */}
                          <td className="px-3 py-2.5 text-center bg-purple-50/50">
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100/70 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                              <CheckCircle2 className="h-3 w-3 text-purple-600" />
                              Full Access
                            </span>
                          </td>

                          {/* Company Admin */}
                          <td className="px-3 py-2.5 text-center">
                            {item.companyAdmin === 'YES' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                Yes
                              </span>
                            ) : item.companyAdmin === 'AUDIT' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                Audit All
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span>—</span>
                                <span>Restricted</span>
                              </span>
                            )}
                          </td>

                          {/* Store Manager */}
                          <td className="px-3 py-2.5 text-center">
                            {item.manager === 'YES' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <CheckCircle2 className="h-3 w-3 text-amber-600" />
                                Yes
                              </span>
                            ) : item.manager === 'BRANCH_ONLY' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Branch Only
                              </span>
                            ) : item.manager === 'VIEW_ONLY' ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                View Only
                              </span>
                            ) : item.manager === 'AUTHORIZE' ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Authorize
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span>—</span>
                                <span>Restricted</span>
                              </span>
                            )}
                          </td>

                          {/* POS Cashier */}
                          <td className="px-3 py-2.5 text-center">
                            {item.cashier === 'YES' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Yes
                              </span>
                            ) : item.cashier === 'SHIFT_ONLY' ? (
                              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                                Shift Only
                              </span>
                            ) : item.cashier === 'READ_POS' ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                POS Read
                              </span>
                            ) : item.cashier === 'QUICK_ADD' ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Quick Add
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span>—</span>
                                <span>Restricted</span>
                              </span>
                            )}
                          </td>

                          {/* Note */}
                          <td className="px-4 py-2.5 text-center text-[11px] text-slate-600">
                            {item.ruleNote}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: MULTI-TENANT SECURITY POLICY */}
            {activeTab === 'policy' && (
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                  {/* Faisal Super Admin Authority Banner */}
                  <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-5 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-2xl bg-purple-600 p-2.5 text-white shadow-md">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                            Strict Platform Architecture
                          </span>
                          <span className="rounded-full bg-purple-200 px-2 py-0.2 text-[10px] font-bold text-purple-900">
                            Faisal Exclusive Rights Authority
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-extrabold text-purple-950">
                          Super Admin Governs All Branch Provisioning &amp; User Rights
                        </h3>
                        <p className="mt-1 text-xs text-purple-900 leading-relaxed">
                          As requested: <strong>Faisal (Super Admin)</strong> has 100% full rights everywhere in the system. User Rights granting and physical branch creation are exclusively held by Faisal. When client companies are created, Faisal can tailor individual module rights for each staff member according to their duties.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Tier Role Structure */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Platform Super Admin</h4>
                          <span className="text-[10px] font-semibold text-purple-700">Faisal (Software Owner)</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>100% permanent full rights on all modules</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Exclusive authority to grant &amp; customize user rights</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>Exclusive right to provision physical branches &amp; FBR POS</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Company Admin</h4>
                          <span className="text-[10px] font-semibold text-blue-700">Client Tenant Owner</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Manages company catalog, prices, and tax rates</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Creates cashier logins for assigned outlets</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Cannot create branches or alter system user rights</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">POS Cashier</h4>
                          <span className="text-[10px] font-semibold text-emerald-700">Counter Operator</span>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Bound strictly to assigned branch counter</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Fast barcode billing and receipt printing</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Only possesses permissions granted by Faisal</span>
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
