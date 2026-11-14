'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Coins,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  FolderTree,
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

export interface CategoryHierarchy {
  id: string;
  name: string;
  icon: string;
  defaultHsCode: string;
  subcategories: string[];
}

export const INVENTORY_TAXONOMY: CategoryHierarchy[] = [
  {
    id: 'pvc-pipes',
    name: 'PVC Pipes & Conduits',
    icon: '💧',
    defaultHsCode: '3917.2390',
    subcategories: [
      'U-PVC Pressure Pipes (Water Supply)',
      'PPR-C Hot & Cold Water Pipes',
      'PVC Drainage & Sewerage Pipes',
      'PVC Electrical Conduit Pipes',
      'HDPE Agriculture & Irrigation Pipes',
      'Garden & Delivery Hose Pipes',
    ],
  },
  {
    id: 'fittings',
    name: 'PVC & PPR-C Fittings',
    icon: '🔧',
    defaultHsCode: '3917.2390',
    subcategories: [
      'Elbows (90° / 45°)',
      'Tee (Equal & Reducing)',
      'Sockets & Couplers',
      'Bends & Offsets',
      'End Caps & Plugs',
      'Threaded Adapters (MTA / FTA)',
      'Gate Valves & Ball Cocks',
    ],
  },
  {
    id: 'sanitary',
    name: 'Sanitary Ware & Bath',
    icon: '🚿',
    defaultHsCode: '6910.1000',
    subcategories: [
      'Wash Basins & Countertops',
      'One-Piece & Rimless Commodes',
      'Water Closets (WC / Orisa Pan)',
      'Mixer Taps & Faucets',
      'Showers & Rain Head Sets',
      'Vanities & Cabinets',
      'Waste Traps & Couplings',
    ],
  },
  {
    id: 'tiles',
    name: 'Tiles & Ceramics',
    icon: '🧱',
    defaultHsCode: '6907.2100',
    subcategories: [
      'Porcelain Floor Tiles 60x60cm',
      'Porcelain Floor Tiles 80x80cm',
      'Ceramic Wall Tiles 30x60cm',
      'Bathroom & Kitchen Tiles',
      'Border & Motif Feature Tiles',
    ],
  },
  {
    id: 'chemicals',
    name: 'Adhesives & Chemicals',
    icon: '🧴',
    defaultHsCode: '3506.9100',
    subcategories: [
      'PVC Solvent Cement (Glue)',
      'Tile Bond Adhesive (Bags)',
      'Waterproof Epoxy Grout',
      'Silicon & Joint Sealants',
    ],
  },
  {
    id: 'hardware',
    name: 'Hardware & Accessories',
    icon: '⚙️',
    defaultHsCode: '8302.4100',
    subcategories: [
      'Pipe Clamps & Wall Brackets',
      'Teflon Tapes & Rubber Seals',
      'Tile Trims & Leveling Spacers',
      'Pipe Cutters & Installation Tools',
    ],
  },
];

export const COMMON_UNITS = ['Kgs', 'Pcs', 'Mtr', 'Feet', 'Bundle', 'Bags', 'Box', 'Coil', 'Set'];

// Quick helpers for pipe dimensions
export const QUICK_SIZES = ['1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"', '4"', '5"', '6"', '8"'];
export const QUICK_SPECS = ["X 13'", "X 10'", '2.00 KG', '2.50 KG', '3.00 KG', '3.50 KG', '4.00 KG', 'Class B', 'Class D', 'Heavy Duty'];

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

  // 2-Level Category Filters on Main Table
  const [selectedMainFilter, setSelectedMainFilter] = useState<string>('ALL');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dedicated Registration / Edit Dialog State
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // 3-Level Hierarchy Form Fields
  const [formMainCategory, setFormMainCategory] = useState<string>(INVENTORY_TAXONOMY[0].name);
  const [formSubCategory, setFormSubCategory] = useState<string>(INVENTORY_TAXONOMY[0].subcategories[0]);
  const [customSubCategory, setCustomSubCategory] = useState<string>('');
  const [isCustomSub, setIsCustomSub] = useState<boolean>(false);

  // Item details
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('Kgs');
  const [formHsCode, setFormHsCode] = useState('3917.2390');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
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

  // Find active taxonomy definition for current form selection
  const currentTaxonomyDef = useMemo(() => {
    return INVENTORY_TAXONOMY.find((t) => t.name === formMainCategory) || INVENTORY_TAXONOMY[0];
  }, [formMainCategory]);

  // When Main Category changes in form, update subcategories and default HS Code
  const handleMainCategoryChange = useCallback((mainCatName: string) => {
    setFormMainCategory(mainCatName);
    const taxDef = INVENTORY_TAXONOMY.find((t) => t.name === mainCatName);
    if (taxDef) {
      setFormSubCategory(taxDef.subcategories[0] || 'General');
      setFormHsCode(taxDef.defaultHsCode || '3917.2390');
    }
    setIsCustomSub(false);
    setCustomSubCategory('');
  }, []);

  // Quick Append helper to Description
  const handleAppendSpec = useCallback((spec: string) => {
    setFormName((prev) => {
      if (!prev.trim()) return spec;
      if (prev.includes(spec)) return prev;
      return `${prev.trim()} ${spec}`;
    });
  }, []);

  // Open "New Item Registration" Dialog
  const handleOpenAddDialog = useCallback(() => {
    const nextCount = products.length + 1;
    const suggestedSku = `FG-${202000 + nextCount}`;
    const suggestedBarcode = `896${Math.floor(100000000 + Math.random() * 900000000)}`;

    setEditingProduct(null);
    setFormMainCategory(INVENTORY_TAXONOMY[0].name);
    setFormSubCategory(INVENTORY_TAXONOMY[0].subcategories[0]);
    setIsCustomSub(false);
    setCustomSubCategory('');
    setFormSku(suggestedSku);
    setFormBarcode(suggestedBarcode);
    setFormName('');
    setFormUnit('Kgs');
    setFormHsCode('3917.2390');
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormWholesalePrice(0);
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
    const mainCat = p.main_category || INVENTORY_TAXONOMY[0].name;
    const subCat = p.sub_category || INVENTORY_TAXONOMY[0].subcategories[0];

    setFormMainCategory(mainCat);
    setFormSubCategory(subCat);
    setIsCustomSub(false);
    setCustomSubCategory('');

    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormName(p.name);
    setFormUnit(p.unit || 'Kgs');
    setFormHsCode(p.hs_code || '3917.2390');
    setFormCostPrice(p.cost_price || 0);
    setFormSalePrice(p.sale_price || 0);
    setFormWholesalePrice(p.wholesale_price || (p.sale_price > 0 ? Math.round(p.sale_price * 0.9) : 0));
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

      const finalSub = isCustomSub && customSubCategory.trim() ? customSubCategory.trim() : formSubCategory.trim();

      try {
        const payload = {
          id: editingProduct ? editingProduct.id : undefined,
          sku: formSku.trim(),
          barcode: formBarcode.trim(),
          name: formName.trim(),
          main_category: formMainCategory.trim(),
          sub_category: finalSub,
          category: `${formMainCategory.trim()} > ${finalSub}`,
          unit: formUnit.trim(),
          hs_code: formHsCode.trim(),
          cost_price: Number(formCostPrice) || 0,
          sale_price: Number(formSalePrice) || 0,
          wholesale_price: Number(formWholesalePrice) || 0,
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
          text: `Item [${savedProduct.sku}] "${savedProduct.name}" saved under [${formMainCategory} ❯ ${finalSub}]!`,
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
      formMainCategory,
      formSubCategory,
      isCustomSub,
      customSubCategory,
      formUnit,
      formHsCode,
      formCostPrice,
      formSalePrice,
      formWholesalePrice,
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

  // Delete Product
  const handleDeleteProduct = useCallback(
    async (p: ProductWithStock) => {
      const confirmed = window.confirm(
        `Are you sure you want to remove item [${p.sku}] "${p.name}"?\nIf this item has sales history, it will be safely deactivated.`
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

  // Select for active POS bill
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

  // Keyboard shortcuts
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

  // Main Category Sub-list for Table Filter
  const subCategoriesForActiveMainFilter = useMemo(() => {
    if (selectedMainFilter === 'ALL') return [];
    const found = INVENTORY_TAXONOMY.find((t) => t.name === selectedMainFilter);
    return found ? found.subcategories : [];
  }, [selectedMainFilter]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      // Main category filter
      if (selectedMainFilter !== 'ALL') {
        const pMain = p.main_category || '';
        if (!pMain.toLowerCase().includes(selectedMainFilter.toLowerCase())) {
          return false;
        }
      }

      // Sub category filter
      if (selectedSubFilter !== 'ALL') {
        const pSub = p.sub_category || '';
        if (!pSub.toLowerCase().includes(selectedSubFilter.toLowerCase())) {
          return false;
        }
      }

      if (!query) return true;
      return (
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.name.toLowerCase().includes(query) ||
        (p.main_category && p.main_category.toLowerCase().includes(query)) ||
        (p.sub_category && p.sub_category.toLowerCase().includes(query)) ||
        (p.unit && p.unit.toLowerCase().includes(query)) ||
        (p.hs_code && p.hs_code.toLowerCase().includes(query))
      );
    });
  }, [products, searchQuery, selectedMainFilter, selectedSubFilter]);

  // KPI Calculations
  const totalItemCount = products.length;
  const inStockCount = products.filter((p) => p.stock_qty > 0).length;
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.sale_price || 0), 0);
  }, [products]);

  // Calculated Margin in form
  const calculatedMargin = useMemo(() => {
    if (formCostPrice <= 0 || formSalePrice <= 0) return 0;
    return (((formSalePrice - formCostPrice) / formCostPrice) * 100).toFixed(1);
  }, [formCostPrice, formSalePrice]);

  // Minimized dock pill
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
            : 'h-[93vh] max-h-[860px] w-full max-w-[1320px]'
        }`}
      >
        {/* 1. TITLEBAR (Executive Midnight Navy #091529) */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Maintain Module • Chart Of Inventory (Main Category ➔ Sub Category ➔ Item)
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-normal">
                (FBR HS Code 3917.2390 • GST 18% Tax Mapping)
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Tree Active
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

        {/* 2. EXECUTIVE SUMMARY KPI CARDS */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-100/90 p-2.5 border-b border-slate-200">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Catalog Items</p>
              <p className="text-sm font-extrabold text-slate-900">{totalItemCount} Finished Goods</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estimated Asset Value</p>
              <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(totalValuation)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">In-Stock Active Items</p>
              <p className="text-sm font-extrabold text-slate-900">{inStockCount} SKUs Active</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hierarchy &amp; FBR Mapped</p>
              <p className="text-sm font-extrabold text-slate-900">100% Tax &amp; Tree Ready</p>
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
              className="flex h-8.5 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>+ Add Item via Category Tree (F2)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Catalog</span>
            </button>

            <button
              type="button"
              onClick={loadProducts}
              title="Refresh Products Catalog"
              className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: Branch Selector & Omni-Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg justify-end">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8.5 rounded-lg border border-slate-300 bg-[#f8fafc] px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Branches Stock</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>

            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, barcode, description..."
                className="h-8.5 w-full rounded-lg border border-slate-300 bg-[#f8fafc] pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. LEVEL 1 & LEVEL 2 CASCADING CATEGORY NAVIGATION TABS */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 space-y-1.5">
          {/* Level 1: Main Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs select-none">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Main Category:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedMainFilter('ALL');
                setSelectedSubFilter('ALL');
              }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                selectedMainFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Categories ({totalItemCount})
            </button>

            {INVENTORY_TAXONOMY.map((cat) => {
              const isSelected = selectedMainFilter === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedMainFilter(cat.name);
                    setSelectedSubFilter('ALL');
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Level 2: Sub-Category Filter Chips (shows when Main Category is chosen) */}
          {subCategoriesForActiveMainFilter.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 text-[11px] select-none border-t border-slate-200/60">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <span>↳</span>
                <span>Sub-Category:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubFilter('ALL')}
                className={`shrink-0 rounded-md px-2 py-0.5 font-semibold transition ${
                  selectedSubFilter === 'ALL'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Subcategories
              </button>
              {subCategoriesForActiveMainFilter.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubFilter(sub)}
                  className={`shrink-0 rounded-md px-2 py-0.5 font-semibold transition ${
                    selectedSubFilter === sub
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. TOAST NOTIFICATION BANNER IF ACTIVE */}
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

        {/* 6. HIERARCHICAL INVENTORY DATA TABLE */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-[#091529] text-[10.5px] font-bold uppercase tracking-wider text-white select-none">
              <tr className="h-8 border-b border-slate-700">
                <th className="w-10 border-r border-slate-700/60 text-center font-bold">#</th>
                <th className="w-28 border-r border-slate-700/60 px-3 font-bold">Item SKU</th>
                <th className="w-32 border-r border-slate-700/60 px-3 font-bold">Barcode</th>
                <th className="w-36 border-r border-slate-700/60 px-3 font-bold">Main Category</th>
                <th className="w-44 border-r border-slate-700/60 px-3 font-bold">Sub Category</th>
                <th className="border-r border-slate-700/60 px-3 font-bold">Description &amp; Specifications</th>
                <th className="w-16 border-r border-slate-700/60 px-2 text-center font-bold">Unit</th>
                <th className="w-24 border-r border-slate-700/60 px-3 text-right font-bold">Cost (Rs.)</th>
                <th className="w-24 border-r border-slate-700/60 px-3 text-right font-bold">Retail (Rs.)</th>
                <th className="w-28 border-r border-slate-700/60 px-3 text-right font-bold">Wholesale (Rs.)</th>
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
                      <p>No products found matching your active filters.</p>
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

                      {/* Main Category */}
                      <td className="border-r border-slate-200 px-3 text-[11px]">
                        <span className="inline-block rounded bg-sky-50 px-2 py-0.5 font-bold text-sky-800 border border-sky-200">
                          {p.main_category || 'PVC Pipes'}
                        </span>
                      </td>

                      {/* Sub Category */}
                      <td className="border-r border-slate-200 px-3 text-[11px]">
                        <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200 max-w-[170px] truncate">
                          {p.sub_category || 'General'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="border-r border-slate-200 px-3 py-1">
                        <p className="font-bold text-slate-900 text-[11px] leading-tight">{p.name}</p>
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

                      {/* Wholesale Price */}
                      <td className="border-r border-slate-200 px-3 text-right font-mono text-[11px] text-emerald-700 font-semibold">
                        {p.wholesale_price && p.wholesale_price > 0
                          ? formatCurrency(p.wholesale_price)
                          : formatCurrency(Math.round(p.sale_price * 0.9))}
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

        {/* 7. BOTTOM STATUS BAR */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
              {totalItemCount} catalog items
            </span>
            <span className="text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600">
              Double-click any item to edit specifications
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

        {/* 8. DEDICATED 3-LEVEL "MAIN CATEGORY ➔ SUB CATEGORY ➔ ITEM" REGISTRATION MODAL */}
        {showFormDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-xs font-sans animate-fade-in">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-white shadow-2xl overflow-hidden flex flex-col">
              {/* Form Titlebar */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <FolderTree className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">
                      {editingProduct
                        ? `Edit Product Profile [${editingProduct.sku}]`
                        : 'New Finished Goods Registration (Category ➔ Sub ➔ Item)'}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Hierarchical Classification &amp; FBR Tax Mapping
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

              {/* Form Body with 4 Structured Hierarchy Cards */}
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[78vh] overflow-y-auto bg-slate-50/40">
                {/* Form Error Banner */}
                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* LIVE HIERARCHY BREADCRUMB INDICATOR */}
                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/80 p-2 text-xs font-bold text-emerald-200 border border-emerald-500/30 shadow-2xs">
                  <span className="text-emerald-400">Classification:</span>
                  <span className="rounded bg-emerald-900/90 px-2 py-0.5 text-white">
                    {formMainCategory}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="rounded bg-teal-800/90 px-2 py-0.5 text-white">
                    {isCustomSub && customSubCategory ? customSubCategory : formSubCategory}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-mono truncate max-w-[200px]">
                    {formSku || 'Item Code'}
                  </span>
                </div>

                {/* CARD 1: MAIN CATEGORY & SUB CATEGORY SELECTION */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Layers className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      1. Main Category &amp; Sub-Category
                    </span>
                  </div>

                  {/* Level 1: Main Category Selection */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-800">
                      Select Main Category <span className="text-rose-600">*</span>
                    </label>
                    {/* Quick Visual Choice Buttons for Main Categories */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                      {INVENTORY_TAXONOMY.map((tax) => {
                        const isSelected = formMainCategory === tax.name;
                        return (
                          <button
                            key={tax.id}
                            type="button"
                            onClick={() => handleMainCategoryChange(tax.name)}
                            className={`flex items-center gap-1.5 rounded-lg p-2 text-left text-xs font-bold border transition ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-base">{tax.icon}</span>
                            <span className="truncate">{tax.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level 2: Sub-Category Selection */}
                  <div className="border-t border-slate-100 pt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Select Sub-Category <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSub((c) => !c)}
                        className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
                      >
                        {isCustomSub ? '← Choose from standard list' : '+ Enter custom subcategory'}
                      </button>
                    </div>

                    {!isCustomSub ? (
                      <div className="flex flex-wrap gap-1.5">
                        {currentTaxonomyDef.subcategories.map((sub) => {
                          const isSelected = formSubCategory === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setFormSubCategory(sub)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-2xs'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customSubCategory}
                        onChange={(e) => setCustomSubCategory(e.target.value)}
                        placeholder="e.g. Schedule 40 Solvent Welded Pipes"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* CARD 2: ITEM IDENTIFICATION & SPECIFICATIONS */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      2. Item Code &amp; Detailed Specification
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
                        placeholder="e.g. FG-202011"
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
                          placeholder="e.g. 896962243843"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-800">
                      Product Name &amp; Description <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={'e.g. 2"X13\' U-PVC PIPE - 2.50 KG / ELBOW 90 DEGREE'}
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />

                    {/* Quick Specification Helpers for Pipe Dimensions */}
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ⚡ Quick Helpers (Click to add to name):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Sizes:</span>
                        {QUICK_SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleAppendSpec(s)}
                            className="rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 border border-slate-200"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Specs:</span>
                        {QUICK_SPECS.map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => handleAppendSpec(sp)}
                            className="rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        FBR HS Code
                      </label>
                      <input
                        type="text"
                        value={formHsCode}
                        onChange={(e) => setFormHsCode(e.target.value)}
                        placeholder="3917.2390"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        GST Tax Rate %
                      </label>
                      <div className="relative">
                        <Percent className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={formTaxRate}
                          onChange={(e) => setFormTaxRate(Number(e.target.value))}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: PRICING & MULTI-TIER RATES */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        3. Multi-Tier Commercial Rates (Rs.)
                      </span>
                    </div>
                    {Number(calculatedMargin) > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Retail Margin: +{calculatedMargin}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Cost / Purchase Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(Number(e.target.value))}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormSalePrice(val);
                          if (formWholesalePrice <= 0 && val > 0) {
                            setFormWholesalePrice(Math.round(val * 0.9));
                          }
                        }}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Wholesale / Dealer Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formWholesalePrice}
                        onChange={(e) => setFormWholesalePrice(Number(e.target.value))}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 4: INITIAL STOCK & AVAILABILITY */}
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
                        Initial Stock Qty ({branches.find((b) => b.id === formBranchId)?.name || 'Branch'})
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
                    <span>{saving ? 'Saving...' : 'Save Product Profile (Ctrl+S)'}</span>
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
