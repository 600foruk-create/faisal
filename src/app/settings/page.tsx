'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  DatabaseBackup,
  ImagePlus,
  KeyRound,
  Lock,
  Package,
  Percent,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency } from '@/lib/format';
import type { Customer, FbrMode, ProductWithStock, UserRole, UserSummary } from '@/lib/types';

type SettingsTab =
  | 'business'
  | 'logo'
  | 'branches'
  | 'system'
  | 'products'
  | 'stock_opening'
  | 'pricing'
  | 'tax_rates'
  | 'customers'
  | 'users'
  | 'rights'
  | 'passwords'
  | 'clear';

const VALID_TABS: SettingsTab[] = [
  'business',
  'logo',
  'branches',
  'system',
  'products',
  'stock_opening',
  'pricing',
  'tax_rates',
  'customers',
  'users',
  'rights',
  'passwords',
  'clear',
];

const ROLE_RIGHTS_MATRIX: Array<{
  feature: string;
  admin: boolean;
  manager: boolean;
  cashier: boolean;
}> = [
  { feature: 'POS Billing & Receipt Printing', admin: true, manager: true, cashier: true },
  { feature: 'Hold / Recall Parked Bills', admin: true, manager: true, cashier: true },
  { feature: 'Sales Returns & Stock Restore', admin: true, manager: true, cashier: true },
  { feature: 'View Sales Register & Reports', admin: true, manager: true, cashier: true },
  { feature: 'Day Closing & Drawer Count', admin: true, manager: true, cashier: true },
  { feature: 'Products, Pricing & Stock Management', admin: true, manager: true, cashier: false },
  { feature: 'Customers Directory', admin: true, manager: true, cashier: false },
  { feature: 'My Company, Logo & System Settings', admin: true, manager: true, cashier: false },
  { feature: 'Branches, User Rights, Passwords & Clear Data', admin: true, manager: false, cashier: false },
];

function resizeLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxSize = 200;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as SettingsTab | null;

  const { branches, terminals, users, settings, activeUser, reloadContext, refreshNonce } =
    usePosContext();

  const [tab, setTab] = useState<SettingsTab>('business');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setTab(tabParam);
      setMessage(null);
    }
  }, [tabParam]);

  // Company, Logo & System Settings
  const [softBrand, setSoftBrand] = useState(settings.software_brand);
  const [bizName, setBizName] = useState(settings.business_name);
  const [bizLogo, setBizLogo] = useState(settings.logo_data_url);
  const [bizFooterCredit, setBizFooterCredit] = useState(settings.footer_text);
  const [bizNtn, setBizNtn] = useState(settings.ntn);
  const [bizStrn, setBizStrn] = useState(settings.strn);
  const [bizTax, setBizTax] = useState(String(settings.default_tax_rate));
  const [bizOpeningCash, setBizOpeningCash] = useState(String(settings.default_opening_cash));
  const [bizCurrency, setBizCurrency] = useState(settings.currency_symbol);
  const [bizFooter, setBizFooter] = useState(settings.receipt_footer);

  // Branch & Counter form
  const [editBranchId, setEditBranchId] = useState<number | undefined>(undefined);
  const [editTerminalId, setEditTerminalId] = useState<number | undefined>(undefined);
  const [bCode, setBCode] = useState('');
  const [bName, setBName] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [tCode, setTCode] = useState('');
  const [tPrefix, setTPrefix] = useState('');
  const [tPosId, setTPosId] = useState('');
  const [tToken, setTToken] = useState('');
  const [tMode, setTMode] = useState<FbrMode>('MOCK');

  // Products & Stock
  const [stockBranchId, setStockBranchId] = useState<number>(1);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [pEditId, setPEditId] = useState<number | undefined>(undefined);
  const [pSku, setPSku] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('PVC Pipes & Fittings');
  const [pUnit, setPUnit] = useState('Pcs');
  const [pSalePrice, setPSalePrice] = useState('');
  const [pCostPrice, setPCostPrice] = useState('');
  const [pTaxRate, setPTaxRate] = useState('18');
  const [pStockQty, setPStockQty] = useState('50');

  // Customers & Users
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cCnic, setCCnic] = useState('');
  const [cNtn, setCNtn] = useState('');

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [uUsername, setUUsername] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('CASHIER');
  const [uBranchId, setUBranchId] = useState<string>('');
  const [uActive, setUActive] = useState<number>(1);

  // Dedicated Passwords, Clear Transactions & Maintain Quick-Edit Drafts
  const [pwUserId, setPwUserId] = useState<string>('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [draftStock, setDraftStock] = useState<Record<number, string>>({});
  const [draftSalePrice, setDraftSalePrice] = useState<Record<number, string>>({});
  const [draftCostPrice, setDraftCostPrice] = useState<Record<number, string>>({});
  const [draftTaxRate, setDraftTaxRate] = useState<Record<number, string>>({});

  useEffect(() => {
    setSoftBrand(settings.software_brand);
    setBizName(settings.business_name);
    setBizLogo(settings.logo_data_url);
    setBizFooterCredit(settings.footer_text);
    setBizNtn(settings.ntn);
    setBizStrn(settings.strn);
    setBizTax(String(settings.default_tax_rate));
    setBizOpeningCash(String(settings.default_opening_cash));
    setBizCurrency(settings.currency_symbol);
    setBizFooter(settings.receipt_footer);
  }, [settings]);

  useEffect(() => {
    if (branches.length > 0 && !branches.some((b) => b.id === stockBranchId)) {
      setStockBranchId(branches[0].id);
    }
  }, [branches, stockBranchId]);

  useEffect(() => {
    if (users.length > 0 && !pwUserId) {
      setPwUserId(String(users[0].id));
    }
  }, [users, pwUserId]);

  const loadProductsAndCustomers = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/products?branchId=${stockBranchId}&includeInactive=true`),
      fetch('/api/customers'),
    ]);
    if (pRes.ok) {
      const pData = (await pRes.json()) as { products: ProductWithStock[] };
      setProducts(pData.products);
      const stockMap: Record<number, string> = {};
      const saleMap: Record<number, string> = {};
      const costMap: Record<number, string> = {};
      const taxMap: Record<number, string> = {};
      for (const item of pData.products) {
        stockMap[item.id] = String(item.stock_qty);
        saleMap[item.id] = String(item.sale_price);
        costMap[item.id] = String(item.cost_price);
        taxMap[item.id] = String(item.tax_rate);
      }
      setDraftStock(stockMap);
      setDraftSalePrice(saleMap);
      setDraftCostPrice(costMap);
      setDraftTaxRate(taxMap);
    }
    if (cRes.ok) {
      const cData = (await cRes.json()) as { customers: Customer[] };
      setCustomers(cData.customers);
    }
  }, [stockBranchId]);

  useEffect(() => {
    void loadProductsAndCustomers();
  }, [loadProductsAndCustomers, refreshNonce]);

  if (activeUser?.role === 'CASHIER') {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-lg font-bold text-slate-900">Administrator Access Required</h1>
        <p className="mt-1 text-xs text-slate-600">
          Company Name, Logo, Branches &amp; Counters, and User Settings can only be changed by an{' '}
          <strong>ADMIN</strong> or <strong>MANAGER</strong>. Switch user via the top bar{' '}
          <strong>Switch</strong> button above.
        </p>
      </section>
    );
  }

  const saveBusinessPayload = async (successMessage: string, overrideLogo?: string) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'business',
        data: {
          software_brand: softBrand.trim() || 'Softifyx',
          business_name: bizName.trim(),
          logo_data_url: overrideLogo !== undefined ? overrideLogo : bizLogo,
          footer_text: bizFooterCredit.trim(),
          ntn: bizNtn,
          strn: bizStrn,
          default_tax_rate: Number(bizTax) || 0,
          default_opening_cash: Number(bizOpeningCash) || 0,
          currency_symbol: bizCurrency.trim() || 'Rs.',
          receipt_footer: bizFooter,
        },
      }),
    });
    if (res.ok) {
      await reloadContext();
      setMessage({ type: 'success', text: successMessage });
    } else {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeLogoFileToDataUrl(file);
      setBizLogo(dataUrl);
      setMessage({ type: 'success', text: 'Logo preview loaded. Click Save Logo to apply.' });
    } catch {
      setMessage({ type: 'error', text: 'Could not process selected image file.' });
    }
  };

  const handleDownloadBackup = async () => {
    const res = await fetch('/api/settings?backup=1');
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `softifyx-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectBranchForEdit = (branchId: number) => {
    const b = branches.find((item) => item.id === branchId);
    const t = terminals.find((item) => item.branch_id === branchId);
    if (!b) return;
    setEditBranchId(b.id);
    setBCode(b.code);
    setBName(b.name);
    setBAddress(b.address);
    setBPhone(b.phone);
    if (t) {
      setEditTerminalId(t.id);
      setTCode(t.terminal_code);
      setTPrefix(t.invoice_prefix);
      setTPosId(t.fbr_pos_id);
      setTToken(t.fbr_token);
      setTMode(t.fbr_mode);
    }
  };

  const resetBranchForm = () => {
    setEditBranchId(undefined);
    setEditTerminalId(undefined);
    setBCode('');
    setBName('');
    setBAddress('');
    setBPhone('');
    setTCode('');
    setTPrefix('');
    setTPosId('');
    setTToken('');
    setTMode('MOCK');
  };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'branch_terminal',
        data: {
          branchId: editBranchId,
          code: bCode,
          name: bName,
          address: bAddress,
          phone: bPhone,
          terminalId: editTerminalId,
          terminalCode: tCode,
          invoicePrefix: tPrefix,
          fbrPosId: tPosId || '100001',
          fbrToken: tToken || '',
          fbrMode: tMode || 'MOCK',
        },
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      await reloadContext();
      resetBranchForm();
      setMessage({ type: 'success', text: 'Branch & POS counter configuration saved.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to save branch' });
    }
  };

  const saveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: pEditId,
        sku: pSku,
        barcode: pBarcode,
        name: pName,
        category: pCategory,
        unit: pUnit,
        sale_price: Number(pSalePrice) || 0,
        cost_price: Number(pCostPrice) || 0,
        tax_rate: Number(pTaxRate) || 0,
        branch_id: stockBranchId,
        stock_qty: Number(pStockQty) || 0,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      await loadProductsAndCustomers();
      setPEditId(undefined);
      setPSku('');
      setPBarcode('');
      setPName('');
      setPSalePrice('');
      setPCostPrice('');
      setMessage({ type: 'success', text: 'Product & branch stock updated.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to save product' });
    }
  };

  const saveCustomerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cName,
        phone: cPhone,
        cnic: cCnic,
        ntn: cNtn,
      }),
    });
    if (res.ok) {
      setCName('');
      setCPhone('');
      setCCnic('');
      setCNtn('');
      await loadProductsAndCustomers();
      setMessage({ type: 'success', text: 'Customer added.' });
    }
  };

  const startEditUser = (u: UserSummary) => {
    setEditUserId(u.id);
    setUUsername(u.username);
    setUFullName(u.full_name);
    setUPassword('');
    setURole(u.role);
    setUBranchId(u.branch_id ? String(u.branch_id) : '');
    setUActive(u.is_active);
  };

  const resetUserForm = () => {
    setEditUserId(null);
    setUUsername('');
    setUFullName('');
    setUPassword('');
    setURole('CASHIER');
    setUBranchId('');
    setUActive(1);
  };

  const saveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        editUserId
          ? {
              action: 'user_update',
              data: {
                id: editUserId,
                full_name: uFullName,
                role: uRole,
                branch_id: uBranchId ? Number(uBranchId) : null,
                is_active: uActive,
                password: uPassword || undefined,
              },
            }
          : {
              action: 'user',
              data: {
                username: uUsername,
                full_name: uFullName,
                password: uPassword,
                role: uRole,
                branch_id: uBranchId ? Number(uBranchId) : null,
              },
            }
      ),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      resetUserForm();
      await reloadContext();
      setMessage({
        type: 'success',
        text: editUserId ? 'User updated successfully.' : 'User created successfully.',
      });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to save user' });
    }
  };

  const handleQuickRoleUpdate = async (u: UserSummary, nextRole: UserRole) => {
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'user_update',
        data: {
          id: u.id,
          full_name: u.full_name,
          role: nextRole,
          branch_id: u.branch_id,
          is_active: u.is_active,
        },
      }),
    });
    if (res.ok) {
      await reloadContext();
      setMessage({ type: 'success', text: `Role for ${u.full_name} updated to ${nextRole}.` });
    } else {
      setMessage({ type: 'error', text: 'Failed to update user role.' });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const targetUser = users.find((u) => String(u.id) === pwUserId);
    if (!targetUser) {
      setMessage({ type: 'error', text: 'Select a valid user account.' });
      return;
    }
    if (!pwNew.trim() || pwNew.trim().length < 4) {
      setMessage({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'user_update',
        data: {
          id: targetUser.id,
          full_name: targetUser.full_name,
          role: targetUser.role,
          branch_id: targetUser.branch_id,
          is_active: targetUser.is_active,
          password: pwNew.trim(),
        },
      }),
    });
    if (res.ok) {
      setPwNew('');
      setPwConfirm('');
      await reloadContext();
      setMessage({ type: 'success', text: `Password updated for ${targetUser.username}.` });
    } else {
      setMessage({ type: 'error', text: 'Failed to update password.' });
    }
  };

  const saveInlineProductEdit = async (
    p: ProductWithStock,
    overrides: Partial<{ sale_price: number; cost_price: number; tax_rate: number; stock_qty: number }>,
    successMsg: string
  ) => {
    setMessage(null);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        unit: p.unit,
        sale_price: overrides.sale_price ?? p.sale_price,
        cost_price: overrides.cost_price ?? p.cost_price,
        tax_rate: overrides.tax_rate ?? p.tax_rate,
        branch_id: stockBranchId,
        stock_qty: overrides.stock_qty ?? p.stock_qty,
        is_active: p.is_active,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      await loadProductsAndCustomers();
      setMessage({ type: 'success', text: successMsg });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to update item' });
    }
  };

  const handleClearTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (clearConfirmText.trim().toUpperCase() !== 'CLEAR') {
      setMessage({ type: 'error', text: 'Type CLEAR in the box to confirm.' });
      return;
    }
    setClearing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_transactions', data: { confirm: 'CLEAR' } }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        setClearConfirmText('');
        await reloadContext();
        setMessage({
          type: 'success',
          text: 'All sales invoices, returns, held bills, and day closings cleared.',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to clear transactions.' });
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Administrator &amp; POS Setup</h1>
              <p className="text-xs text-slate-500">
                Manage company profile, logo, branches, users, currency &amp; utilities
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: 'business', label: 'My Company', icon: Building2 },
                { key: 'logo', label: 'My Logo', icon: ImagePlus },
                { key: 'branches', label: 'Branches & Counters', icon: Store },
                { key: 'system', label: 'System & Currency', icon: SlidersHorizontal },
                { key: 'users', label: 'User Logins', icon: UserCheck },
                { key: 'rights', label: 'User Rights', icon: ShieldCheck },
                { key: 'passwords', label: 'Passwords', icon: KeyRound },
                { key: 'products', label: 'Chart Of Inventory', icon: Package },
                { key: 'stock_opening', label: 'Opening Balances', icon: Boxes },
                { key: 'pricing', label: 'Price Settings', icon: Tag },
                { key: 'tax_rates', label: 'Sales Tax Rates', icon: Percent },
                { key: 'customers', label: 'Customers', icon: Users },
                { key: 'clear', label: 'Clear / Backup', icon: Trash2 },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setMessage(null);
                }}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  tab === key
                    ? key === 'clear'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {tab === 'business' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveBusinessPayload('Company profile updated across the application!');
          }}
          className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
            My Company Profile
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Software Brand Title (Top-Left)
              </label>
              <input
                type="text"
                value={softBrand}
                onChange={(e) => setSoftBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Company / Business Name (Header &amp; Receipts)
              </label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">NTN</label>
              <input
                type="text"
                value={bizNtn}
                onChange={(e) => setBizNtn(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">STRN</label>
              <input
                type="text"
                value={bizStrn}
                onChange={(e) => setBizStrn(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Application Footer Credit
            </label>
            <input
              type="text"
              value={bizFooterCredit}
              onChange={(e) => setBizFooterCredit(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Save Company Profile
          </button>
        </form>
      )}

      {tab === 'logo' && (
        <div className="grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              My Logo — Upload &amp; Manage
            </h2>
            <p className="text-xs text-slate-500">
              This logo appears in the Top Brand Bar and on all printed 80mm POS thermal receipts.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                {bizLogo ? (
                  <img
                    src={bizLogo}
                    alt="Company Logo Preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">Default Logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Choose Image (PNG/JPG/SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {bizLogo && (
                  <button
                    type="button"
                    onClick={() => setBizLogo('')}
                    className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to Default Logo
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveBusinessPayload('Company logo saved and applied!')}
              className="w-full cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Save Logo
            </button>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              Live Header &amp; Receipt Preview
            </h2>
            <div className="flex items-center justify-between gap-3 rounded-xl border-b-2 border-emerald-500/80 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#0b1830] px-4 py-3 text-white">
              <div className="min-w-0 text-xs">
                <span className="font-bold text-white">{softBrand || 'Softifyx'}</span>{' '}
                <span className="truncate font-semibold text-amber-400">- {bizName}</span>
              </div>
              <div className="flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
                {bizLogo ? (
                  <img src={bizLogo} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-700">SP</span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              {bizLogo && (
                <img src={bizLogo} alt="Receipt Preview" className="mx-auto mb-1.5 h-10 object-contain" />
              )}
              <div className="text-xs font-bold text-slate-900">{bizName}</div>
              <div className="text-[10px] text-slate-500">POS Sales Receipt Preview</div>
            </div>
          </section>
        </div>
      )}

      {tab === 'system' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveBusinessPayload('System settings & currency updated!');
          }}
          className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
            System Settings &amp; Currency
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Currency Symbol
              </label>
              <input
                type="text"
                value={bizCurrency}
                onChange={(e) => setBizCurrency(e.target.value)}
                placeholder="Rs."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Default Tax / GST (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={bizTax}
                onChange={(e) => setBizTax(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Default Opening Cash Float
              </label>
              <input
                type="number"
                value={bizOpeningCash}
                onChange={(e) => setBizOpeningCash(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Thermal Receipt Footer Message
            </label>
            <textarea
              rows={2}
              value={bizFooter}
              onChange={(e) => setBizFooter(e.target.value)}
              placeholder="Thank you for shopping with us!"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Save System &amp; Currency Settings
          </button>
        </form>
      )}

      {tab === 'branches' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              Configured Branches &amp; POS Counters
            </h2>
            <div className="space-y-2.5">
              {branches.map((b) => {
                const t = terminals.find((term) => term.branch_id === b.id);
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{b.display_name}</div>
                      <div className="text-slate-500">
                        Code: {b.code} • {b.address} • {b.phone}
                      </div>
                      {t && (
                        <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5">
                            Counter: {t.terminal_code}
                          </span>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                            Prefix: {t.invoice_prefix}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => selectBranchForEdit(b.id)}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <form
            onSubmit={saveBranch}
            className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editBranchId ? 'Edit Branch & Counter' : 'Add New Branch & Counter'}
              </h2>
              {editBranchId && (
                <button
                  type="button"
                  onClick={resetBranchForm}
                  className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
                >
                  + New Instead
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Branch Code (e.g. SWT-C)"
                value={bCode}
                onChange={(e) => setBCode(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="City / Branch Name"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Address"
              value={bAddress}
              onChange={(e) => setBAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Phone"
              value={bPhone}
              onChange={(e) => setBPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                placeholder="Counter Code (TERM-C1)"
                value={tCode}
                onChange={(e) => setTCode(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="Receipt Prefix (SWT-C-POS)"
                value={tPrefix}
                onChange={(e) => setTPrefix(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Save Branch &amp; POS Counter
            </button>
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <h2 className="mb-3 text-sm font-bold text-slate-900">User Logins &amp; Branches</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Assigned Branch</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-mono font-bold">{u.username}</td>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2 font-semibold">{u.role}</td>
                    <td className="px-3 py-2">{u.branch_name ?? 'All Branches'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => startEditUser(u)}
                        className="cursor-pointer rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <form
            onSubmit={saveUserForm}
            className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editUserId ? 'Edit User Account' : 'Create User Login'}
              </h2>
              {editUserId && (
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
                >
                  + Create New
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Username *"
              value={uUsername}
              disabled={Boolean(editUserId)}
              onChange={(e) => setUUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs disabled:bg-slate-100"
              required
            />
            <input
              type="text"
              placeholder="Full Name *"
              value={uFullName}
              onChange={(e) => setUFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              required
            />
            <input
              type="password"
              placeholder={editUserId ? 'New Password (optional)' : 'Password / PIN *'}
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              required={!editUserId}
            />
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            >
              <option value="CASHIER">CASHIER (Counter Only)</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
            </select>
            <select
              value={uBranchId}
              onChange={(e) => setUBranchId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            >
              <option value="">All Branches (Admin)</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.display_name}
                </option>
              ))}
            </select>
            {editUserId && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={uActive === 1}
                  onChange={(e) => setUActive(e.target.checked ? 1 : 0)}
                />
                User Account Active
              </label>
            )}
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {editUserId ? 'Update User' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {tab === 'rights' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              Role Rights &amp; Access Permissions
            </h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2.5">POS Module / Permission</th>
                  <th className="px-3 py-2.5 text-center">ADMIN</th>
                  <th className="px-3 py-2.5 text-center">MANAGER</th>
                  <th className="px-3 py-2.5 text-center">CASHIER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROLE_RIGHTS_MATRIX.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{row.feature}</td>
                    {[row.admin, row.manager, row.cashier].map((allowed, idx) => (
                      <td key={idx} className="px-3 py-2.5 text-center">
                        {allowed ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Assign User Roles</h2>
            <div className="space-y-2.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{u.full_name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{u.username}</div>
                  </div>
                  <select
                    aria-label={`Role for ${u.username}`}
                    value={u.role}
                    onChange={(e) => void handleQuickRoleUpdate(u, e.target.value as UserRole)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'passwords' && (
        <form
          onSubmit={handlePasswordReset}
          className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <KeyRound className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Change / Reset User Passwords</h2>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Select User Account
            </label>
            <select
              value={pwUserId}
              onChange={(e) => setPwUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.full_name} ({u.username} — {u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              New Password / PIN
            </label>
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Confirm New Password / PIN
            </label>
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Update Password
          </button>
        </form>
      )}

      {tab === 'clear' && (
        <div className="grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              BackUp Utility (JSON Snapshot)
            </h2>
            <p className="text-xs text-slate-600">
              Always download a full JSON backup of your company settings, branches, products,
              customers, invoices, and day closings before clearing transactions.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              <DatabaseBackup className="h-4 w-4" />
              Download System Backup (JSON)
            </button>
          </section>

          <form
            onSubmit={handleClearTransactions}
            className="space-y-3 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-rose-100 pb-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              <h2 className="text-sm font-bold">Clear Transactions (Go-Live Reset)</h2>
            </div>
            <p className="text-xs text-slate-600">
              Removes all test <strong>sales invoices</strong>, <strong>returns</strong>,{' '}
              <strong>held bills</strong>, and <strong>day closings</strong>. Your Company Settings,
              Logo, Branches, Products, Customers, and User Logins stay intact.
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder='Type "CLEAR" to confirm'
              className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold focus:border-rose-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={clearing || clearConfirmText.trim().toUpperCase() !== 'CLEAR'}
              className="w-full cursor-pointer rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {clearing ? 'Clearing Transactions...' : 'Clear All Transactions'}
            </button>
          </form>
        </div>
      )}

      {tab === 'products' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Product Catalog &amp; Branch Stock</h2>
              <select
                value={stockBranchId}
                onChange={(e) => setStockBranchId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="px-3 py-2.5">SKU</th>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5 text-right">Tax %</th>
                    <th className="px-3 py-2.5 text-right">Branch Stock</th>
                    <th className="px-3 py-2.5 text-center">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono text-[11px]">{p.sku}</td>
                      <td className="px-3 py-2 font-semibold">{p.name}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(p.sale_price, settings.currency_symbol)}
                      </td>
                      <td className="px-3 py-2 text-right">{p.tax_rate}%</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {p.stock_qty} {p.unit}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPEditId(p.id);
                            setPSku(p.sku);
                            setPBarcode(p.barcode);
                            setPName(p.name);
                            setPCategory(p.category);
                            setPUnit(p.unit);
                            setPSalePrice(String(p.sale_price));
                            setPCostPrice(String(p.cost_price));
                            setPTaxRate(String(p.tax_rate));
                            setPStockQty(String(p.stock_qty));
                          }}
                          className="cursor-pointer rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form
            onSubmit={saveProductForm}
            className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
          >
            <h2 className="text-sm font-bold text-slate-900">
              {pEditId ? 'Edit Product & Stock' : 'Add Product'}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="SKU *"
                value={pSku}
                onChange={(e) => setPSku(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="Barcode"
                value={pBarcode}
                onChange={(e) => setPBarcode(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <input
              type="text"
              placeholder="Product Name *"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Category"
                value={pCategory}
                onChange={(e) => setPCategory(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <div>
                <input
                  type="text"
                  list="inventory-unit-options"
                  placeholder="Unit (e.g. Kgs, Pcs, Box, Bag)"
                  value={pUnit}
                  onChange={(e) => setPUnit(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                />
                <datalist id="inventory-unit-options">
                  <option value="Kgs" />
                  <option value="Pcs" />
                  <option value="Box" />
                  <option value="Bag" />
                  <option value="Bundle" />
                  <option value="Ft" />
                  <option value="Mtr" />
                  <option value="Set" />
                  <option value="Pack" />
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Sale Price *"
                value={pSalePrice}
                onChange={(e) => setPSalePrice(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <input
                type="number"
                placeholder="Cost Price"
                value={pCostPrice}
                onChange={(e) => setPCostPrice(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="GST Tax %"
                value={pTaxRate}
                onChange={(e) => setPTaxRate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
              <input
                type="number"
                placeholder="Branch Stock Qty"
                value={pStockQty}
                onChange={(e) => setPStockQty(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Save Product
            </button>
          </form>
        </div>
      )}

      {tab === 'customers' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Registered Customers</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">CNIC</th>
                  <th className="px-3 py-2">NTN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-semibold">{c.name}</td>
                    <td className="px-3 py-2">{c.phone || '-'}</td>
                    <td className="px-3 py-2">{c.cnic || '-'}</td>
                    <td className="px-3 py-2">{c.ntn || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <form
            onSubmit={saveCustomerForm}
            className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
          >
            <h2 className="text-sm font-bold text-slate-900">Add Customer</h2>
            <input
              type="text"
              placeholder="Customer Name *"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              required
            />
            <input
              type="text"
              placeholder="Phone"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="CNIC"
              value={cCnic}
              onChange={(e) => setCCnic(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="NTN"
              value={cNtn}
              onChange={(e) => setCNtn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Add Customer
            </button>
          </form>
        </div>
      )}

      {tab === 'stock_opening' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Inventory Opening Balances</h2>
              <p className="text-xs text-slate-500">
                Set or adjust branch opening/current stock quantities directly per SKU
              </p>
            </div>
            <select
              value={stockBranchId}
              onChange={(e) => setStockBranchId(Number(e.target.value))}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5">Unit</th>
                  <th className="px-3 py-2.5 text-right">Stock Qty</th>
                  <th className="px-3 py-2.5 text-center">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{p.sku}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-3 py-2 text-slate-600">{p.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={draftStock[p.id] ?? String(p.stock_qty)}
                        onChange={(e) =>
                          setDraftStock((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right font-bold"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          void saveInlineProductEdit(
                            p,
                            { stock_qty: Number(draftStock[p.id] ?? p.stock_qty) || 0 },
                            `Opening stock saved for ${p.name}.`
                          )
                        }
                        className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'pricing' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Item Price Settings</h2>
            <p className="text-xs text-slate-500">
              Manage Cost Price, Retail Sale Price, and Profit Margin per product
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5 text-right">Cost Price ({settings.currency_symbol})</th>
                  <th className="px-3 py-2.5 text-right">Sale Price ({settings.currency_symbol})</th>
                  <th className="px-3 py-2.5 text-right">Margin</th>
                  <th className="px-3 py-2.5 text-center">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const costVal = Number(draftCostPrice[p.id] ?? p.cost_price) || 0;
                  const saleVal = Number(draftSalePrice[p.id] ?? p.sale_price) || 0;
                  const marginPct =
                    costVal > 0 ? Math.round(((saleVal - costVal) / costVal) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{p.sku}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={draftCostPrice[p.id] ?? String(p.cost_price)}
                          onChange={(e) =>
                            setDraftCostPrice((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right font-medium"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={draftSalePrice[p.id] ?? String(p.sale_price)}
                          onChange={(e) =>
                            setDraftSalePrice((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right font-bold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">
                        {costVal > 0 ? `${marginPct}%` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            void saveInlineProductEdit(
                              p,
                              { cost_price: costVal, sale_price: saleVal },
                              `Prices updated for ${p.name}.`
                            )
                          }
                          className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'tax_rates' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Item Sales Tax Rates</h2>
            <p className="text-xs text-slate-500">
              Configure item-wise Sales Tax / GST percentage applied during POS billing
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5 text-right">Sale Price</th>
                  <th className="px-3 py-2.5 text-right">Tax Rate (%)</th>
                  <th className="px-3 py-2.5 text-center">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{p.sku}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(p.sale_price, settings.currency_symbol)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={draftTaxRate[p.id] ?? String(p.tax_rate)}
                        onChange={(e) =>
                          setDraftTaxRate((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right font-bold"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          void saveInlineProductEdit(
                            p,
                            { tax_rate: Number(draftTaxRate[p.id] ?? p.tax_rate) || 0 },
                            `Tax rate updated for ${p.name}.`
                          )
                        }
                        className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
