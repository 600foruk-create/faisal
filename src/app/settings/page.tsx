'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Package, Plus, Settings, Shield, Users } from 'lucide-react';
import { usePosContext } from '@/components/PosContext';
import { formatCurrency } from '@/lib/format';
import type { Customer, FbrMode, ProductWithStock, UserRole } from '@/lib/types';

export default function SettingsPage() {
  const { branches, terminals, users, settings, reloadContext, refreshNonce } = usePosContext();

  const [tab, setTab] = useState<'business' | 'branches' | 'products' | 'customers' | 'users'>(
    'branches'
  );
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Business form
  const [bizName, setBizName] = useState(settings.business_name);
  const [bizNtn, setBizNtn] = useState(settings.ntn);
  const [bizStrn, setBizStrn] = useState(settings.strn);
  const [bizTax, setBizTax] = useState(String(settings.default_tax_rate));
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
  const [pCategory, setPCategory] = useState('Porcelain Tiles');
  const [pUnit, setPUnit] = useState('Box');
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

  const [uUsername, setUUsername] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('CASHIER');
  const [uBranchId, setUBranchId] = useState<string>('');

  useEffect(() => {
    setBizName(settings.business_name);
    setBizNtn(settings.ntn);
    setBizStrn(settings.strn);
    setBizTax(String(settings.default_tax_rate));
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

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'business',
        data: {
          business_name: bizName,
          ntn: bizNtn,
          strn: bizStrn,
          default_tax_rate: Number(bizTax) || 18,
          receipt_footer: bizFooter,
        },
      }),
    });
    if (res.ok) {
      await reloadContext();
      setMessage({ type: 'success', text: 'Business settings saved.' });
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

  const saveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'user',
        data: {
          username: uUsername,
          full_name: uFullName,
          password: uPassword,
          role: uRole,
          branch_id: uBranchId ? Number(uBranchId) : null,
        },
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      setUUsername('');
      setUFullName('');
      setUPassword('');
      await reloadContext();
      setMessage({ type: 'success', text: 'User created successfully.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to create user' });
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <h1 className="text-lg font-bold text-slate-900">System & FBR Settings</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'branches', label: 'Branches & FBR Terminals', icon: Building2 },
                { key: 'products', label: 'Products & Stock', icon: Package },
                { key: 'business', label: 'Business & Receipt', icon: Settings },
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

      {tab === 'branches' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Configured Branches & FBR POSIDs</h2>
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
                          <span className="rounded bg-white px-2 py-0.5 border border-slate-200">
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
            className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-5"
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
              Save Branch & FBR Terminal
            </button>
          </form>
        </div>
      )}

      {tab === 'products' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Product Catalog & Branch Stock</h2>
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
            className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
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

      {tab === 'business' && (
        <form
          onSubmit={saveBusiness}
          className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-900">Business Identity & Receipt Footer</h2>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Business Name</label>
            <input
              type="text"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
              <label className="mb-1 block text-xs font-semibold text-slate-600">Default Tax %</label>
              <input
                type="number"
                value={bizTax}
                onChange={(e) => setBizTax(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Receipt Footer</label>
            <textarea
              rows={2}
              value={bizFooter}
              onChange={(e) => setBizFooter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-[#49210a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5e2b0d]"
          >
            Save Business Settings
          </button>
        </form>
      )}

      {tab === 'customers' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
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
            className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8">
            <h2 className="mb-3 text-sm font-bold text-slate-900">POS Users & Roles</h2>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Assigned Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-mono font-bold">{u.username}</td>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2 font-semibold">{u.role}</td>
                    <td className="px-3 py-2">{u.branch_name ?? 'All Branches'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <form
            onSubmit={saveUserForm}
            className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4"
          >
            <h2 className="text-sm font-bold text-slate-900">Create User</h2>
            <input
              type="text"
              placeholder="Username *"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
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
              placeholder="Password / PIN *"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              required
            />
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
            >
              <option value="CASHIER">CASHIER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
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
            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-[#0fa968] py-2 text-xs font-bold text-white hover:bg-[#0d945b]"
            >
              Create User
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

