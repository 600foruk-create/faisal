'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Check,
  CheckCircle2,
  Coins,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  PackagePlus,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency } from '@/lib/format';
import type { ProductWithStock } from '@/lib/types';

export const COMMON_UNITS = ['Kgs', 'Pcs', 'Mtr', 'Feet', 'Bundle', 'Bags', 'Coil'];
export const COMMON_CATEGORIES = ['PVC Pipes', 'Fittings & Joints', 'Accessories', 'General'];
export const DEFAULT_FBR_HS_CODE = '3917.2390';

export function InventoryModal() {
  const {
    branches,
    closeInventoryModal,
    triggerInventoryRefresh,
    setSelectedProductIdForPos,
    isPosModalOpen,
  } = usePosContext();

  // Window state: floating modal, maximized, minimized
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Data & loading state
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Dedicated Registration / Edit Dialog State
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // Form Fields
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('PVC Pipes');
  const [formUnit, setFormUnit] = useState('Kgs');
  const [formHsCode, setFormHsCode] = useState(DEFAULT_FBR_HS_CODE);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formBranchId, setFormBranchId] = useState<number | null>(branches[0]?.id ?? 1);
  const [formStockQty, setFormStockQty] = useState<number>(100);
  const [formIsActive, setFormIsActive] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  const skuInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load products from API
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const bParam = branchFilter !== 'ALL' ? `?branchId=${branchFilter}&includeInactive=true` : '?includeInactive=true';
      const res = await fetch(`/api/products${bParam}`);
      if (res.ok) {
        const data = (await res.json()) as { products: ProductWithStock[] };
        setProducts(data.products || []);
      }
    } catch {
      setToastMessage({ text: 'Error connecting to database to load products catalog.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Open "New Product Registration" Dialog
  const handleOpenAddDialog = useCallback(() => {
    // Generate next suggested SKU
    const count = products.length + 1;
    const suggestedSku = `FG-${202000 + count}`;
    const suggestedBarcode = `896${Math.floor(100000000 + Math.random() * 900000000)}`;

    setEditingProduct(null);
    setFormSku(suggestedSku);
    setFormBarcode(suggestedBarcode);
    setFormName('');
    setFormCategory('PVC Pipes');
    setFormUnit('Kgs');
    setFormHsCode(DEFAULT_FBR_HS_CODE);
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormTaxRate(18);
    setFormBranchId(branches[0]?.id ?? 1);
    setFormStockQty(100);
    setFormIsActive(1);
    setFormError(null);
    setShowFormDialog(true);
    setTimeout(() => skuInputRef.current?.focus(), 80);
  }, [products, branches]);

  // Open "Edit Product" Dialog
  const handleOpenEditDialog = useCallback((p: ProductWithStock) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormName(p.name);
    setFormCategory(p.category || 'PVC Pipes');
    setFormUnit(p.unit || 'Kgs');
    setFormHsCode(p.hs_code || DEFAULT_FBR_HS_CODE);
    setFormCostPrice(p.cost_price || 0);
    setFormSalePrice(p.sale_price || 0);
    setFormTaxRate(p.tax_rate ?? 18);
    setFormBranchId(branches[0]?.id ?? 1);
    setFormStockQty(p.stock_qty || 0);
    setFormIsActive(p.is_active);
    setFormError(null);
    setShowFormDialog(true);
    setTimeout(() => skuInputRef.current?.focus(), 80);
  }, [branches]);

  // Close Registration Dialog
  const handleCloseFormDialog = useCallback(() => {
    setShowFormDialog(false);
    setEditingProduct(null);
    setFormError(null);
  }, []);

  // Save Product (Create or Update)
  const handleSaveProduct = useCallback(
    async (selectInPosAfterSave = false) => {
      if (!formSku.trim()) {
        setFormError('Item Code / SKU is required!');
        skuInputRef.current?.focus();
        return;
      }
      if (!formName.trim()) {
        setFormError('Product Description / Name is required!');
        return;
      }
      if (formSalePrice <= 0) {
        setFormError('Retail Sale Price must be greater than 0!');
        return;
      }

      setSaving(true);
      setFormError(null);

      try {
        const payload = {
          id: editingProduct ? editingProduct.id : undefined,
          sku: formSku.trim(),
          barcode: formBarcode.trim(),
          name: formName.trim(),
          category: formCategory.trim(),
          unit: formUnit.trim(),
          hs_code: formHsCode.trim(),
          cost_price: Number(formCostPrice) || 0,
          sale_price: Number(formSalePrice) || 0,
          tax_rate: Number(formTaxRate) || 18,
          branch_id: formBranchId ?? undefined,
          stock_qty: Number(formStockQty) || 0,
          is_active: formIsActive,
        };

        const res = await fetch('/api/products', {
          method: editingProduct ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save product');
        }

        const savedProduct = data.product as ProductWithStock;
        setToastMessage({
          text: `Product [${savedProduct.sku}] "${savedProduct.name}" successfully ${
            editingProduct ? 'updated' : 'registered'
          }!`,
          type: 'success',
        });

        triggerInventoryRefresh();
        await loadProducts();
        setShowFormDialog(false);

        if (selectInPosAfterSave) {
          setSelectedProductIdForPos(savedProduct.id);
          if (isPosModalOpen) {
            closeInventoryModal();
          }
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Error saving product');
      } finally {
        setSaving(false);
      }
    },
    [
      formSku,
      formBarcode,
      formName,
      formCategory,
      formUnit,
      formHsCode,
      formCostPrice,
      formSalePrice,
      formTaxRate,
      formBranchId,
      formStockQty,
      formIsActive,
      editingProduct,
      loadProducts,
      triggerInventoryRefresh,
      setSelectedProductIdForPos,
      isPosModalOpen,
      closeInventoryModal,
    ]
  );

  // Delete / Deactivate Product
  const handleDeleteProduct = useCallback(
    async (p: ProductWithStock) => {
      const confirmed = window.confirm(
        `Are you sure you want to remove item [${p.sku}] "${p.name}"?\nIf this item has transaction history, it will be safely deactivated.`
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/products?id=${p.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete product');
        }
        setToastMessage({ text: `Item [${p.sku}] removed / deactivated successfully.`, type: 'success' });
        await loadProducts();
        triggerInventoryRefresh();
      } catch (err) {
        setToastMessage({
          text: err instanceof Error ? err.message : 'Error removing item.',
          type: 'error',
        });
      }
    },
    [loadProducts, triggerInventoryRefresh]
  );

  // Direct Select for POS Sale bill
  const handleSelectForPos = useCallback(
    (p: ProductWithStock) => {
      setSelectedProductIdForPos(p.id);
      setToastMessage({ text: `Added [${p.sku}] "${p.name}" to POS Sale counter.`, type: 'success' });
      if (isPosModalOpen) {
        setTimeout(() => closeInventoryModal(), 200);
      }
    },
    [setSelectedProductIdForPos, isPosModalOpen, closeInventoryModal]
  );

  // Print Catalog
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Keyboard shortcuts (F2: New, Ctrl+S: Save, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFormDialog) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          void handleSaveProduct();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseFormDialog();
        }
      } else {
        if (e.key === 'F2') {
          e.preventDefault();
          handleOpenAddDialog();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeInventoryModal();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFormDialog, handleSaveProduct, handleCloseFormDialog, handleOpenAddDialog, closeInventoryModal]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      if (!query) return true;
      return (
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.unit && p.unit.toLowerCase().includes(query)) ||
        (p.hs_code && p.hs_code.toLowerCase().includes(query))
      );
    });
  }, [products, searchQuery, categoryFilter]);

  // Executive Metric Calculations
  const totalItemCount = products.length;
  const inStockCount = products.filter((p) => p.stock_qty > 0).length;
  const lowStockCount = products.filter((p) => p.stock_qty <= 20 && p.stock_qty > 0).length;
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.sale_price || 0), 0);
  }, [products]);

  // Calculated Margin in form
  const calculatedMargin = useMemo(() => {
    if (formCostPrice <= 0 || formSalePrice <= 0) return 0;
    return (((formSalePrice - formCostPrice) / formCostPrice) * 100).toFixed(1);
  }, [formCostPrice, formSalePrice]);

  // Minimized dock pill on bottom left
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-36 z-50 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-3 text-xs font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-900 font-extrabold shadow-sm">
            <Package className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Maintain Module</p>
            <p className="text-xs font-bold text-white">Chart of Inventory ({products.length} Items)</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs font-sans">
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[840px] w-full max-w-[1280px]'
        }`}
      >
        {/* 1. TITLEBAR (Executive Midnight Navy #091529) */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Maintain Module • Chart Of Inventory &amp; Finished Goods Catalog
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-normal">
                (FBR HS Code 3917.2390 • GST 18% Compliant)
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Stock Active
            </span>
          </div>

          {/* Window action controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize to Dock"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={closeInventoryModal}
              title="Close (Esc)"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. EXECUTIVE INVENTORY SUMMARY KPI CARDS BAR */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-100/90 p-2.5 border-b border-slate-200">
          {/* KPI 1 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Catalog SKUs</p>
              <p className="text-sm font-extrabold text-slate-900">{totalItemCount} Finished Goods</p>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estimated Valuation</p>
              <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(totalValuation)}</p>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Available In-Stock</p>
              <p className="text-sm font-extrabold text-slate-900">{inStockCount} Items Active</p>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FBR HS Code Mapping</p>
              <p className="text-sm font-extrabold text-slate-900">100% Tax Mapped (18%)</p>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTION & SEARCH CONTROL BAR */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {/* Left: Primary Register New Item CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddDialog}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>+ Register New Item (F2)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Catalog</span>
            </button>

            <button
              type="button"
              onClick={loadProducts}
              title="Refresh Products Catalog"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: Filters & Omni-Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl justify-end">
            {/* Category Filter Pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  categoryFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalItemCount})
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    categoryFilter === cat
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Branch Dropdown */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-[#f8fafc] px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Branches Stock</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>

            {/* Omni Search Box */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, barcode, description..."
                className="h-8 w-full rounded-lg border border-slate-300 bg-[#f8fafc] pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. TOAST NOTIFICATION BANNER IF ACTIVE */}
        {toastMessage && (
          <div
            className={`flex shrink-0 items-center justify-between px-4 py-1.5 text-xs font-semibold transition ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 5. FINISHED GOODS INVENTORY DATA TABLE */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-[#091529] text-[11px] font-bold uppercase tracking-wider text-white select-none">
              <tr className="h-8 border-b border-slate-700">
                <th className="w-10 border-r border-slate-700/60 text-center font-bold">#</th>
                <th className="w-28 border-r border-slate-700/60 px-3 font-bold">Item SKU</th>
                <th className="w-32 border-r border-slate-700/60 px-3 font-bold">Barcode</th>
                <th className="w-28 border-r border-slate-700/60 px-3 font-bold">HS Code</th>
                <th className="border-r border-slate-700/60 px-3 font-bold">Description &amp; Specification</th>
                <th className="w-28 border-r border-slate-700/60 px-3 font-bold">Category</th>
                <th className="w-16 border-r border-slate-700/60 px-2 text-center font-bold">Unit</th>
                <th className="w-24 border-r border-slate-700/60 px-3 text-right font-bold">Cost Rate</th>
                <th className="w-28 border-r border-slate-700/60 px-3 text-right font-bold">Sale Price</th>
                <th className="w-24 border-r border-slate-700/60 px-3 text-right font-bold">GST (18%)</th>
                <th className="w-28 border-r border-slate-700/60 px-3 text-center font-bold">Physical Stock</th>
                <th className="w-36 px-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-xs text-slate-400">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    {loading ? (
                      <p>Loading inventory catalog from database...</p>
                    ) : (
                      <p>No products found matching &quot;{searchQuery}&quot;.</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const stock = p.stock_qty || 0;
                  const isLow = stock > 0 && stock <= 20;
                  const isOut = stock <= 0;

                  return (
                    <tr
                      key={p.id}
                      onDoubleClick={() => handleOpenEditDialog(p)}
                      className={`h-8 border-b border-slate-200 transition-colors ${
                        idx % 2 === 0 ? 'bg-white hover:bg-sky-50/60' : 'bg-slate-50/50 hover:bg-sky-50/60'
                      }`}
                    >
                      {/* Row index */}
                      <td className="border-r border-slate-200 text-center text-[11px] font-semibold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="border-r border-slate-200 px-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                          {p.sku}
                        </span>
                      </td>

                      {/* Barcode */}
                      <td className="border-r border-slate-200 px-3">
                        {p.barcode ? (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                            <Barcode className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{p.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* HS Code */}
                      <td className="border-r border-slate-200 px-3">
                        <span className="font-mono text-[11px] text-indigo-700 font-medium">
                          {p.hs_code || DEFAULT_FBR_HS_CODE}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="border-r border-slate-200 px-3 py-1">
                        <p className="font-bold text-slate-900 text-[11px] leading-tight">{p.name}</p>
                      </td>

                      {/* Category */}
                      <td className="border-r border-slate-200 px-3 text-[11px] text-slate-600">
                        <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700 border border-sky-200">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="border-r border-slate-200 px-2 text-center text-[11px] font-bold text-slate-700">
                        {p.unit || 'Kgs'}
                      </td>

                      {/* Cost Rate */}
                      <td className="border-r border-slate-200 px-3 text-right font-mono text-[11px] text-slate-600">
                        {p.cost_price > 0 ? formatCurrency(p.cost_price) : '—'}
                      </td>

                      {/* Sale Price */}
                      <td className="border-r border-slate-200 px-3 text-right font-mono font-bold text-[11px] text-slate-900">
                        {formatCurrency(p.sale_price)}
                      </td>

                      {/* Tax Rate */}
                      <td className="border-r border-slate-200 px-3 text-right font-mono text-[11px] text-slate-700">
                        {p.tax_rate ?? 18}%
                      </td>

                      {/* Physical Stock Status */}
                      <td className="border-r border-slate-200 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isOut ? 'bg-rose-600' : isLow ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          />
                          {isOut ? 'Out of Stock' : `${stock} ${p.unit || 'Kgs'}`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Add to POS Sale Button */}
                          <button
                            type="button"
                            onClick={() => handleSelectForPos(p)}
                            title="Add item directly to POS Sale counter"
                            className="flex h-6 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 text-[10.5px] font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span>Bill in POS</span>
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditDialog(p)}
                            title="Edit product specifications"
                            className="flex h-6 w-6 items-center justify-center rounded border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Edit className="h-3 w-3" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete or deactivate product"
                            className="flex h-6 w-6 items-center justify-center rounded border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. BOTTOM STATUS BAR */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
              {totalItemCount} products
            </span>
            <span className="text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600">
              Double-click any item row to edit specifications
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              F2: New Item
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Ctrl+F: Search
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Esc: Close
            </span>
          </div>
        </div>

        {/* 7. DEDICATED "NEW ITEM SPECIFICATION / EDIT" MODAL DIALOG */}
        {showFormDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-xs font-sans animate-fade-in">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-white shadow-2xl overflow-hidden flex flex-col">
              {/* Form Titlebar */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <PackagePlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">
                      {editingProduct
                        ? `Edit Product Profile [${editingProduct.sku}]`
                        : 'New Finished Goods Registration'}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Finished Goods Inventory &amp; FBR HS Code Mapping
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFormDialog}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body with 4 Organized Cards */}
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto bg-slate-50/40">
                {/* Error Banner */}
                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: Item Identity & Identification */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Tag className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      1. Item Identification &amp; Description
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-800">
                        Item Code / SKU <span className="text-rose-600">*</span>
                      </label>
                      <input
                        ref={skuInputRef}
                        type="text"
                        required
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        placeholder="e.g. FG-202005"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Barcode (EAN / UPC)
                      </label>
                      <div className="relative">
                        <Barcode className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          placeholder="e.g. 896123456789"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-800">
                      Description / Product Specification <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={'e.g. 2"X13\' U-PVC PIPE - 2.50 KG / ELBOW 90 DEGREE'}
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Product Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      >
                        {COMMON_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Unit of Measure (UOM)
                      </label>
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: FBR HS Code & Tax Compliance */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      2. FBR HS Code &amp; Sales Tax Rate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Pakistan Customs HS Code
                      </label>
                      <input
                        type="text"
                        value={formHsCode}
                        onChange={(e) => setFormHsCode(e.target.value)}
                        placeholder="3917.2390"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Standard Pakistan Customs Tariff for PVC Pipes &amp; Fittings
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Sales Tax Rate (GST %)
                      </label>
                      <div className="relative">
                        <Percent className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={formTaxRate}
                          onChange={(e) => setFormTaxRate(Number(e.target.value))}
                          placeholder="18"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-emerald-700 font-semibold">
                        Standard Federal Sales Tax is 18.00%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Pricing & Commercial Valuation */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        3. Pricing &amp; Commercial Rates (Rs.)
                      </span>
                    </div>
                    {Number(calculatedMargin) > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Margin: +{calculatedMargin}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Cost / Purchase Price (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(Number(e.target.value))}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-800">
                        Retail Sale Price (Rs.) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formSalePrice}
                        onChange={(e) => setFormSalePrice(Number(e.target.value))}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-emerald-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Initial Stock & Status */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Boxes className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      4. Stock Allocation &amp; Availability
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Branch Stock ({branches.find((b) => b.id === formBranchId)?.name || 'Branch'})
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formStockQty}
                        onChange={(e) => setFormStockQty(Number(e.target.value))}
                        placeholder="100"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        POS Active Status
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormIsActive(1)}
                          className={`rounded-lg py-1.5 text-xs font-bold border transition ${
                            formIsActive === 1
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          Active for Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormIsActive(0)}
                          className={`rounded-lg py-1.5 text-xs font-bold border transition ${
                            formIsActive === 0
                              ? 'border-rose-500 bg-rose-50 text-rose-800'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Footer Action Buttons */}
              <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={handleCloseFormDialog}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel (Esc)
                </button>

                <div className="flex items-center gap-2">
                  {/* Save & Bill in POS Button */}
                  {isPosModalOpen && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveProduct(true)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 active:scale-95 disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Save &amp; Bill in POS</span>
                    </button>
                  )}

                  {/* Primary Save Button */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveProduct(false)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Product (Ctrl+S)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
