'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  DatabaseBackup,
  ImagePlus,
  Lock,
  Package,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency } from '@/lib/format';
import type { Customer, FbrMode, ProductWithStock, UserRole, UserSummary } from '@/lib/types';

type SettingsTab = 'business' | 'branches' | 'products' | 'customers' | 'users';

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
    if (
      tabParam &&
      ['business', 'branches', 'products', 'customers', 'users'].includes(tabParam)
    ) {
      setTab(tabParam);
    }
  }, [tabParam]);

  // Company & Branding form
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

  // Branch & Terminal form
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

  const loadProductsAndCustomers = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/products?branchId=${stockBranchId}&includeInactive=true`),
      fetch('/api/customers'),
    ]);
    if (pRes.ok) {
      const pData = (await pRes.json()) as { products: ProductWithStock[] };
      setProducts(pData.products);
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
          Company Name, Logo, FBR Terminals, and User Roles can only be changed by an{' '}
          <strong>ADMIN</strong> or <strong>MANAGER</strong>. Switch user via the green{' '}
          <strong>Login to Branch</strong> menu above.
        </p>
      </section>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeLogoFileToDataUrl(file);
      setBizLogo(dataUrl);
      setMessage({ type: 'success', text: 'Logo preview loaded. Click Save Branding & Settings to apply.' });
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

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'business',
        data: {
          software_brand: softBrand.trim() || 'Softifyx',
          business_name: bizName.trim(),
          logo_data_url: bizLogo,
          footer_text: bizFooterCredit.trim(),
          ntn: bizNtn,
          strn: bizStrn,
          default_tax_rate: Number(bizTax) || 18,
          default_opening_cash: Number(bizOpeningCash) || 0,
          currency_symbol: bizCurrency.trim() || 'Rs.',
          receipt_footer: bizFooter,
        },
      }),
    });
    if (res.ok) {
      await reloadContext();
      setMessage({ type: 'success', text: 'Company branding & settings updated across the app!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save branding settings.' });
    }
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
          fbrPosId: tPosId,
          fbrToken: tToken,
          fbrMode: tMode,
        },
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      await reloadContext();
      resetBranchForm();
      setMessage({ type: 'success', text: 'Branch & FBR terminal configuration saved.' });
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">Administrator &amp; System Settings</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'business', label: 'Company & Logo', icon: Building2 },
                { key: 'branches', label: 'Branches & FBR POSIDs', icon: Settings },
                { key: 'products', label: 'Products & Stock', icon: Package },
                { key: 'customers', label: 'Customers', icon: Users },
                { key: 'users', label: 'Users & Roles', icon: Shield },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === key
                    ? 'bg-[#49210a] text-white'
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
          className={`rounded-xl border px-4 py-2 text-xs font-medium ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {tab === 'business' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <form
            onSubmit={saveBusiness}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8"
          >
            <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              Company Branding, Tax &amp; Receipt Identity
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

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Company Logo (Shown on Top Header &amp; Printed Receipts)
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white p-1">
                  {bizLogo ? (
                    <img src={bizLogo} alt="Preview" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">Default SVG</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900">
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>Upload Logo Image</span>
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
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Default GST %</label>
                <input
                  type="number"
                  value={bizTax}
                  onChange={(e) => setBizTax(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Currency</label>
                <input
                  type="text"
                  value={bizCurrency}
                  onChange={(e) => setBizCurrency(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Opening Cash
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
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
              className="cursor-pointer rounded-lg bg-[#0fa968] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d945b]"
            >
              Save Branding &amp; Settings
            </button>
          </form>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              System Maintenance &amp; Backup
            </h2>
            <p className="text-xs text-slate-600">
              Download a full JSON snapshot of your company settings, branches, products, customers,
              invoices, and day closings.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#49210a] py-2.5 text-xs font-bold text-white hover:bg-[#5e2b0d]"
            >
              <DatabaseBackup className="h-4 w-4" />
              Download System Backup (JSON)
            </button>
          </section>
        </div>
      )}

      {tab === 'branches' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Configured Branches &amp; FBR POSIDs</h2>
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
                            Prefix: {t.invoice_prefix}
                          </span>
                          <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800">
                            POSID: {t.fbr_pos_id}
                          </span>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                            Mode: {t.fbr_mode}
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
                {editBranchId ? 'Edit Branch & Terminal' : 'Add New Branch & Terminal'}
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
                placeholder="Terminal Code (TERM-C1)"
                value={tCode}
                onChange={(e) => setTCode(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="Invoice Prefix (SWT-C-POS)"
                value={tPrefix}
                onChange={(e) => setTPrefix(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="FBR POSID"
                value={tPosId}
                onChange={(e) => setTPosId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                required
              />
              <select
                value={tMode}
                onChange={(e) => setTMode(e.target.value as FbrMode)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              >
                <option value="MOCK">MOCK (Offline Demo)</option>
                <option value="SANDBOX">SANDBOX (FBR Test)</option>
                <option value="PRODUCTION">PRODUCTION (Live FBR)</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="FBR IRIS Bearer Token"
              value={tToken}
              onChange={(e) => setTToken(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-2 text-xs font-bold text-white hover:bg-[#0d945b]"
            >
              Save Branch &amp; FBR Terminal
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
              <input
                type="text"
                placeholder="Unit (Box/Pcs)"
                value={pUnit}
                onChange={(e) => setPUnit(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
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
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#0fa968] py-2 text-xs font-bold text-white hover:bg-[#0d945b]"
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
              className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-2 text-xs font-bold text-white hover:bg-[#0d945b]"
            >
              Add Customer
            </button>
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <h2 className="mb-3 text-sm font-bold text-slate-900">POS Users &amp; Role Permissions</h2>
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
                {editUserId ? 'Edit User & Reset Password' : 'Create User'}
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
              className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-2 text-xs font-bold text-white hover:bg-[#0d945b]"
            >
              {editUserId ? 'Update User' : 'Create User'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="rounded-xl bg-white p-6 text-sm">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
