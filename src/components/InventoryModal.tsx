'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Hash,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Package,
  PackageCheck,
  PackagePlus,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { usePosContext } from './PosContext';
import { formatCurrency } from '@/lib/format';
import type { InventoryCategory, ProductWithStock } from '@/lib/types';

// Curated clean pipe dimension helper chips
export const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"', '4"', '5"', '6"'];
export const PIPE_LENGTH_WEIGHT = ["X 10'", "X 13'", '2.00 KG', '2.50 KG', '3.00 KG', '3.50 KG', 'Class B', 'Class D', 'Heavy Duty'];
export const QUICK_UNITS = ['Pcs', 'Kgs', 'Bundle', 'Feet', 'Meter', 'Box'];
export const ALL_UNITS = ['Pcs', 'Kgs', 'Mtr', 'Feet', 'Bundle', 'Bags', 'Box', 'Coil', 'Set'];
export const BRANDS = ['SEASTONE', 'MASTER', 'POPULAR', 'IIL', 'ALPHA', 'CUSTOM', 'None'];

export function InventoryModal() {
  const {
    branches,
    closeInventoryModal,
    triggerInventoryRefresh,
    setSelectedProductIdForPos,
  } = usePosContext();

  // Consistent Uniform Window Size (Identical to CustomerModal & PosSaleModal)
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Screen Mode: DIRECT_FORM (Option A) vs ITEM_LIST (View registered catalog)
  const [viewMode, setViewMode] = useState<'DIRECT_FORM' | 'ITEM_LIST'>('DIRECT_FORM');

  // Data states
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ==========================================
  // OPTION A: 3-STEP DIRECT ENTRY FORM STATE
  // ==========================================
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // Step 1: Main Category
  const [selectedMainCode, setSelectedMainCode] = useState<string>('FG-1');
  const [showInlineAddMain, setShowInlineAddMain] = useState(false);
  const [newMainName, setNewMainName] = useState('');
  const [newMainCode, setNewMainCode] = useState('');
  const [savingNewMain, setSavingNewMain] = useState(false);

  // Step 2: Sub-Category
  const [selectedSubCode, setSelectedSubCode] = useState<string>('FG-101');
  const [showInlineAddSub, setShowInlineAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [savingNewSub, setSavingNewSub] = useState(false);

  // Step 3: Item Specifications & Pricing
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formBrand, setFormBrand] = useState('SEASTONE');
  const [formRackNo, setFormRackNo] = useState('Rack A-01');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formHsCode, setFormHsCode] = useState('3917.2390');
  const [formStockQty, setFormStockQty] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Toggle for Advanced Code & Tax details (to keep Step 3 ultra simple)
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Item List Table Search & Filters
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableMainFilter, setTableMainFilter] = useState('ALL');
  const [tableSubFilter, setTableSubFilter] = useState('ALL');

  const itemNameInputRef = useRef<HTMLInputElement>(null);

  // Generate new SKU & Barcode
  const generateNewSkuAndBarcode = useCallback(() => {
    const nextRandom = Math.floor(100000 + Math.random() * 900000);
    setFormSku(`FG-${nextRandom}`);
    setFormBarcode(`8969${nextRandom}123`);
  }, []);

  // Load all categories and products
  const loadData = useCallback(async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      // 1. Fetch categories
      let cats: InventoryCategory[] = [];
      try {
        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const catData = (await catRes.json()) as { categories: InventoryCategory[] };
          cats = catData.categories || [];
        }
      } catch {
        // Fallback
      }

      if (cats.length === 0) {
        cats = [
          { id: 1, code: 'FG-1', name: 'FINISH GOODS', category_type: 'Finish Goods', parent_code: null },
          { id: 2, code: 'PVC-1', name: 'U-PVC PIPES', category_type: 'Finish Goods', parent_code: null },
          { id: 3, code: 'RAW-1', name: 'RAW MATERIAL', category_type: 'Raw Material', parent_code: null },
          { id: 4, code: 'FIT-1', name: 'SEASTONE FITTING', category_type: 'Finish Goods', parent_code: null },
          { id: 5, code: 'SAN-1', name: 'SANITARY WARE', category_type: 'Finish Goods', parent_code: null },
          { id: 6, code: 'TIL-1', name: 'TILES & CERAMICS', category_type: 'Finish Goods', parent_code: null },
          { id: 7, code: 'ADH-1', name: 'ADHESIVES & CHEMICALS', category_type: 'Finish Goods', parent_code: null },
          { id: 8, code: 'HRD-1', name: 'HARDWARE & ACCESSORIES', category_type: 'Finish Goods', parent_code: null },
          // Subcategories
          { id: 9, code: 'FG-101', name: 'U-PVC PRESSURE PIPES', category_type: 'Finish Goods', parent_code: 'FG-1' },
          { id: 10, code: 'FG-102', name: 'PPR-C HOT & COLD PIPES', category_type: 'Finish Goods', parent_code: 'FG-1' },
          { id: 11, code: 'FG-103', name: 'PVC CONDUIT PIPES', category_type: 'Finish Goods', parent_code: 'FG-1' },
          { id: 12, code: 'FG-104', name: 'SEWERAGE & DRAINAGE PIPES', category_type: 'Finish Goods', parent_code: 'FG-1' },
          { id: 13, code: 'PVC-101', name: 'PRESSURE PIPES CLASS B', category_type: 'Finish Goods', parent_code: 'PVC-1' },
          { id: 14, code: 'PVC-102', name: 'PRESSURE PIPES CLASS D', category_type: 'Finish Goods', parent_code: 'PVC-1' },
          { id: 15, code: 'RAW-101', name: 'PVC RESIN COMPOUND', category_type: 'Raw Material', parent_code: 'RAW-1' },
          { id: 16, code: 'RAW-102', name: 'STABILIZERS & CHEMICALS', category_type: 'Raw Material', parent_code: 'RAW-1' },
          { id: 17, code: 'FIT-101', name: 'ELBOWS & TEES', category_type: 'Finish Goods', parent_code: 'FIT-1' },
          { id: 18, code: 'FIT-102', name: 'SOCKETS & BENDS', category_type: 'Finish Goods', parent_code: 'FIT-1' },
          { id: 19, code: 'FIT-103', name: 'VALVES & UNION', category_type: 'Finish Goods', parent_code: 'FIT-1' },
          { id: 20, code: 'SAN-101', name: 'WASH BASINS & COUNTERTOPS', category_type: 'Finish Goods', parent_code: 'SAN-1' },
          { id: 21, code: 'SAN-102', name: 'ONE-PIECE & RIMLESS COMMODES', category_type: 'Finish Goods', parent_code: 'SAN-1' },
          { id: 22, code: 'SAN-103', name: 'MIXER TAPS & FAUCETS', category_type: 'Finish Goods', parent_code: 'SAN-1' },
          { id: 23, code: 'TIL-101', name: 'PORCELAIN FLOOR TILES 60x60', category_type: 'Finish Goods', parent_code: 'TIL-1' },
          { id: 24, code: 'TIL-102', name: 'PORCELAIN FLOOR TILES 80x80', category_type: 'Finish Goods', parent_code: 'TIL-1' },
          { id: 25, code: 'TIL-103', name: 'CERAMIC WALL TILES 30x60', category_type: 'Finish Goods', parent_code: 'TIL-1' },
          { id: 26, code: 'ADH-101', name: 'PVC SOLVENT CEMENT (GLUE)', category_type: 'Finish Goods', parent_code: 'ADH-1' },
          { id: 27, code: 'ADH-102', name: 'TILE BOND ADHESIVE (BAGS)', category_type: 'Finish Goods', parent_code: 'ADH-1' },
          { id: 28, code: 'HRD-101', name: 'PIPE CLAMPS & WALL BRACKETS', category_type: 'Finish Goods', parent_code: 'HRD-1' },
          { id: 29, code: 'HRD-102', name: 'TEFLON TAPES & RUBBER SEALS', category_type: 'Finish Goods', parent_code: 'HRD-1' },
        ];
      }
      setCategories(cats);

      // 2. Fetch products
      const prodRes = await fetch('/api/products?includeInactive=true');
      if (prodRes.ok) {
        const prodData = (await prodRes.json()) as { products: ProductWithStock[] };
        setProducts(prodData.products || []);
      }
    } catch (e) {
      console.error('Error loading inventory data:', e);
      setStatusMessage({ type: 'error', text: 'Error connecting to database to load inventory.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    generateNewSkuAndBarcode();
  }, [loadData, generateNewSkuAndBarcode]);

  // Main Categories & Subcategories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_code);
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parent_code));
  }, [categories]);

  // Sub-categories strictly belonging to the currently selected Main Category in Step 1
  const subCategoriesForActiveMain = useMemo(() => {
    return subCategories.filter((s) => s.parent_code === selectedMainCode);
  }, [subCategories, selectedMainCode]);

  // Ensure selectedSubCode is valid whenever selectedMainCode changes
  useEffect(() => {
    if (subCategoriesForActiveMain.length > 0) {
      const exists = subCategoriesForActiveMain.some((s) => s.code === selectedSubCode);
      if (!exists) {
        setSelectedSubCode(subCategoriesForActiveMain[0].code);
      }
    }
  }, [subCategoriesForActiveMain, selectedSubCode]);

  // Get active names for display
  const activeMainCategory = useMemo(() => {
    return mainCategories.find((m) => m.code === selectedMainCode) || mainCategories[0];
  }, [mainCategories, selectedMainCode]);

  const activeSubCategory = useMemo(() => {
    return (
      subCategoriesForActiveMain.find((s) => s.code === selectedSubCode) ||
      subCategoriesForActiveMain[0] || {
        code: `${selectedMainCode}-101`,
        name: 'General',
        category_type: 'Finish Goods',
        parent_code: selectedMainCode,
      }
    );
  }, [subCategoriesForActiveMain, selectedSubCode, selectedMainCode]);

  // KPI Calculations
  const totalItemCount = products.length;

  // Live Profit Margin Calculation
  const calculatedMargin = useMemo(() => {
    if (formCostPrice <= 0 || formSalePrice <= 0) return 0;
    return (((formSalePrice - formCostPrice) / formCostPrice) * 100).toFixed(1);
  }, [formCostPrice, formSalePrice]);

  const netGainAmount = useMemo(() => {
    if (formSalePrice <= 0 || formCostPrice <= 0) return 0;
    return (formSalePrice - formCostPrice).toFixed(2);
  }, [formCostPrice, formSalePrice]);

  // Helper to append pipe spec chips
  const handleAppendSpec = (chip: string) => {
    setFormName((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      return `${prev} ${chip}`.trim();
    });
    itemNameInputRef.current?.focus();
  };

  // Reset Item Form for the next item
  const handleResetItemFields = () => {
    setEditingProduct(null);
    generateNewSkuAndBarcode();
    setFormName('');
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormWholesalePrice(0);
    setFormStockQty(0);
    setFormError(null);
    setTimeout(() => itemNameInputRef.current?.focus(), 80);
  };

  // ==========================================
  // INLINE ADD MAIN CATEGORY (STEP 1)
  // ==========================================
  const handleSaveInlineMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) return;

    setSavingNewMain(true);
    try {
      const code = newMainCode.trim()
        ? newMainCode.trim().toUpperCase()
        : `CAT-${mainCategories.length + 1}`;

      const payload = {
        code,
        name: newMainName.trim().toUpperCase(),
        category_type: 'Finish Goods',
        parent_code: null,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData();
        setSelectedMainCode(code);
        setShowInlineAddMain(false);
        setNewMainName('');
        setNewMainCode('');
        setStatusMessage({
          type: 'success',
          text: `Main Category [${payload.name}] created and selected for Step 1!`,
        });
      }
    } catch {
      alert('Error creating Main Category.');
    } finally {
      setSavingNewMain(false);
    }
  };

  // ==========================================
  // INLINE ADD SUB-CATEGORY (STEP 2)
  // ==========================================
  const handleSaveInlineSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    setSavingNewSub(true);
    try {
      const code = newSubCode.trim()
        ? newSubCode.trim().toUpperCase()
        : `${selectedMainCode}-${100 + subCategoriesForActiveMain.length + 1}`;

      const payload = {
        code,
        name: newSubName.trim().toUpperCase(),
        category_type: 'Finish Goods',
        parent_code: selectedMainCode,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData();
        setSelectedSubCode(code);
        setShowInlineAddSub(false);
        setNewSubName('');
        setNewSubCode('');
        setStatusMessage({
          type: 'success',
          text: `Sub-Category [${payload.name}] created under ${activeMainCategory?.name}!`,
        });
      }
    } catch {
      alert('Error creating Sub-Category.');
    } finally {
      setSavingNewSub(false);
    }
  };

  // ==========================================
  // SAVE FINISHED GOODS ITEM (STEP 3)
  // ==========================================
  const handleSaveItemSubmit = async (e: React.FormEvent, billDirectlyInPos = false) => {
    e.preventDefault();
    setFormError(null);

    if (!formSku.trim()) {
      setFormError('Item Code / SKU is required.');
      return;
    }
    if (!formName.trim()) {
      setFormError('Please enter Product Name (Item ka naam likhein).');
      itemNameInputRef.current?.focus();
      return;
    }
    if (formSalePrice <= 0) {
      setFormError('Please enter Retail Sale Price (Farokht Rate lazmi darj karein).');
      return;
    }

    setSavingItem(true);
    try {
      const mainName = activeMainCategory?.name || 'FINISH GOODS';
      const subName = activeSubCategory?.name || 'General';
      const fullCategory = `${mainName} > ${subName}`;

      const payload = {
        id: editingProduct?.id,
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim(),
        name: formName.trim(),
        description: formName.trim(),
        category: fullCategory,
        main_category: mainName,
        sub_category: subName,
        unit: formUnit.trim() || 'Pcs',
        hs_code: formHsCode.trim() || '3917.2390',
        brand: formBrand,
        rack_no: formRackNo,
        cost_price: Number(formCostPrice) || 0,
        sale_price: Number(formSalePrice) || 0,
        wholesale_price: Number(formWholesalePrice) || Math.round(Number(formSalePrice) * 0.9),
        tax_rate: Number(formTaxRate) || 18,
        branch_id: branches[0]?.id || 1,
        stock_qty: Number(formStockQty) || 0,
        is_active: 1,
      };

      const res = await fetch('/api/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const savedProduct = data.product as ProductWithStock;

        triggerInventoryRefresh();
        await loadData();

        setStatusMessage({
          type: 'success',
          text: `Item [${payload.name}] saved successfully under ${mainName} ➔ ${subName}!`,
        });

        if (billDirectlyInPos && savedProduct?.id) {
          setSelectedProductIdForPos(savedProduct.id);
          closeInventoryModal();
        } else {
          // Clear inputs for the next item while preserving the selected Main and Sub categories
          handleResetItemFields();
        }
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to save product.');
      }
    } catch {
      setFormError('Network error connecting to database.');
    } finally {
      setSavingItem(false);
    }
  };

  // Open Edit Item from the list table
  const handleEditProductFromTable = (prod: ProductWithStock) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode || '');
    setFormName(prod.name);
    setFormUnit(prod.unit || 'Pcs');
    setFormBrand(prod.brand || 'SEASTONE');
    setFormRackNo(prod.rack_no || 'Rack A-01');
    setFormCostPrice(prod.cost_price || 0);
    setFormSalePrice(prod.sale_price || 0);
    setFormWholesalePrice(prod.wholesale_price || Math.round(prod.sale_price * 0.9));
    setFormTaxRate(prod.tax_rate ?? 18);
    setFormHsCode(prod.hs_code || '3917.2390');
    setFormStockQty(prod.stock_qty || 0);

    // Match Main Category
    const mainMatch = mainCategories.find(
      (m) =>
        m.name.toLowerCase() === (prod.main_category || '').toLowerCase() ||
        m.name.toLowerCase() === (prod.category || '').toLowerCase()
    );
    if (mainMatch) {
      setSelectedMainCode(mainMatch.code);
    }

    // Match Sub Category
    const subMatch = subCategories.find(
      (s) =>
        s.name.toLowerCase() === (prod.sub_category || '').toLowerCase() ||
        s.name.toLowerCase() === (prod.category || '').toLowerCase()
    );
    if (subMatch) {
      setSelectedSubCode(subMatch.code);
    }

    setViewMode('DIRECT_FORM');
    setTimeout(() => itemNameInputRef.current?.focus(), 80);
  };

  // Delete product
  const handleDeleteProduct = async (prod: ProductWithStock) => {
    if (!confirm(`Are you sure you want to delete [${prod.sku}] - ${prod.name}?`)) return;

    try {
      const res = await fetch(`/api/products?id=${prod.id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerInventoryRefresh();
        await loadData();
        setStatusMessage({ type: 'success', text: `Item [${prod.sku}] deleted.` });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete product.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting product.' });
    }
  };

  // Filtered Products for the table view
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (tableMainFilter !== 'ALL') {
        const pMain = (p.main_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const m = tableMainFilter.toLowerCase();
        if (!pMain.includes(m) && !pCat.includes(m)) return false;
      }

      if (tableSubFilter !== 'ALL') {
        const pSub = (p.sub_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const s = tableSubFilter.toLowerCase();
        if (!pSub.includes(s) && !pCat.includes(s)) return false;
      }

      if (!tableSearchQuery.trim()) return true;
      const q = tableSearchQuery.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.main_category && p.main_category.toLowerCase().includes(q)) ||
        (p.sub_category && p.sub_category.toLowerCase().includes(q)) ||
        (p.unit && p.unit.toLowerCase().includes(q)) ||
        (p.hs_code && p.hs_code.toLowerCase().includes(q))
      );
    });
  }, [products, tableMainFilter, tableSubFilter, tableSearchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Main Category',
      'Sub Category',
      'Item Code / SKU',
      'Product Name',
      'Unit',
      'Cost Price',
      'Wholesale Price',
      'Retail Price',
      'Stock Qty',
      'HS Code',
    ];
    const rows = products.map((p) => [
      `"${p.main_category || 'General'}"`,
      `"${p.sub_category || 'General'}"`,
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.unit || 'Pcs'}"`,
      p.cost_price,
      p.wholesale_price || Math.round(p.sale_price * 0.9),
      p.sale_price,
      p.stock_qty || 0,
      `"${p.hs_code || '3917.2390'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Chart_Of_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard Shortcuts (F2: new, Esc: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setViewMode('DIRECT_FORM');
        handleResetItemFields();
      }
      if (e.key === 'Escape') {
        if (showInlineAddMain) setShowInlineAddMain(false);
        else if (showInlineAddSub) setShowInlineAddSub(false);
        else closeInventoryModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInlineAddMain, showInlineAddSub, closeInventoryModal]);

  // Minimized dock pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-36 z-50 animate-bounce-short">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 py-2.5 text-xs font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-900 font-extrabold shadow-sm">
            <PackagePlus className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Chart Of Inventory</p>
            <p className="text-xs font-bold text-white">
              {mainCategories.length} Mains • {subCategories.length} Subs • {products.length} Items
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs font-sans">
      {/* WINDOW CONTAINER - EXACT SAME UNIFORM SIZE AS CUSTOMERMODAL & POS SALE MODAL */}
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[92vh] max-h-[820px] w-full max-w-[1240px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. TITLEBAR (Executive Midnight Navy #091529)             */}
        {/* ========================================================= */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Chart Of Inventory &bull; Item Registration Master
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-300 font-normal">
                (Step 1: Main Category ➔ Step 2: Sub-Category ➔ Step 3: Item &amp; Rates)
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live DB Synced
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

        {/* ========================================================= */}
        {/* 2. TOP ACTION & MODE SWITCHER BAR                        */}
        {/* ========================================================= */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
          {/* Left: Active Mode Pill */}
          <div className="flex items-center gap-2">
            {viewMode === 'DIRECT_FORM' ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Direct 3-Step Creation Form</span>
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Pehle Category, phir Sub-Category, phir Item Naam aur Rates.
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('DIRECT_FORM')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>← Back to 3-Step Entry Form</span>
              </button>
            )}
          </div>

          {/* Right: Quick Switch to Items List / Excel / Print */}
          <div className="flex items-center gap-2">
            {viewMode === 'DIRECT_FORM' ? (
              <button
                type="button"
                onClick={() => setViewMode('ITEM_LIST')}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Boxes className="h-3.5 w-3.5 text-emerald-400" />
                <span>View Registered Items List ({products.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setViewMode('DIRECT_FORM');
                  handleResetItemFields();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Register New Item (F2)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              title="Export Excel (CSV)"
              className="flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Print Catalog"
              className="flex h-7.5 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              title="Refresh Catalog"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status notification banner (if any) */}
        {statusMessage && (
          <div
            className={`shrink-0 flex items-center justify-between px-4 py-1.5 text-xs font-semibold border-b ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MODE A: OPTION A DIRECT 3-STEP SMART FORM               */}
        {/* ========================================================= */}
        {viewMode === 'DIRECT_FORM' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 bg-slate-100/60 flex flex-col">
            <form
              onSubmit={(e) => handleSaveItemSubmit(e, false)}
              className="max-w-4xl mx-auto w-full space-y-3.5 pb-4"
            >
              {/* Form Error Banner */}
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Live Hierarchy Breadcrumb Ribbon */}
              <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] p-2.5 px-4 text-white shadow-md flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                    Item Mapping:
                  </span>
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                      {activeMainCategory?.name || 'MAIN'}
                    </span>
                    <span className="text-slate-400">❯</span>
                    <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
                      {activeSubCategory?.name || 'SUB'}
                    </span>
                    <span className="text-slate-400">❯</span>
                    <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
                      {formSku || 'NEW_SKU'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {editingProduct ? (
                    <span className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-extrabold">
                      Editing: #{editingProduct.id} [{editingProduct.sku}]
                    </span>
                  ) : (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                      New Finished Goods Entry
                    </span>
                  )}
                </div>
              </div>

              {/* --------------------------------------------------- */}
              {/* STEP 1: MAIN CATEGORY (TIER 1)                      */}
              {/* --------------------------------------------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5 transition hover:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white font-extrabold text-xs shadow-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        Step 1 &bull; Main Category (Pehla Step: Main Category)
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInlineAddMain((prev) => !prev)}
                    className="flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-sky-700" />
                    <span>{showInlineAddMain ? 'Cancel' : '+ Nayi Main Category'}</span>
                  </button>
                </div>

                {/* Inline New Main Category Form */}
                {showInlineAddMain && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-2 animate-fade-in">
                    <p className="text-xs font-bold text-sky-900">
                      Nayi Main Category Ka Naam Likhein:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newMainCode}
                        onChange={(e) => setNewMainCode(e.target.value.toUpperCase())}
                        placeholder={`Code e.g. CAT-${mainCategories.length + 1}`}
                        className="h-8.5 rounded-lg border border-sky-300 bg-white px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newMainName}
                        onChange={(e) => setNewMainName(e.target.value.toUpperCase())}
                        placeholder="e.g. ELECTRICAL ITEMS / HARDWARE"
                        className="h-8.5 rounded-lg border border-sky-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:outline-none sm:col-span-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowInlineAddMain(false)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInlineMainCategory}
                        disabled={savingNewMain || !newMainName.trim()}
                        className="flex items-center gap-1 rounded bg-sky-700 px-3 py-1 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50 cursor-pointer"
                      >
                        {savingNewMain ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span>Save &amp; Select</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Category Selection Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {mainCategories.map((main) => {
                    const isSelected = selectedMainCode === main.code;
                    return (
                      <button
                        key={main.code}
                        type="button"
                        onClick={() => {
                          setSelectedMainCode(main.code);
                          const subs = subCategories.filter((s) => s.parent_code === main.code);
                          if (subs.length > 0) {
                            setSelectedSubCode(subs[0].code);
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sm ring-2 ring-sky-400'
                            : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Folder className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                        <span>{main.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --------------------------------------------------- */}
              {/* STEP 2: SUB-CATEGORY (TIER 2)                       */}
              {/* --------------------------------------------------- */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5 transition hover:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-white font-extrabold text-xs shadow-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        Step 2 &bull; Sub-Category (Doosra Step: Sub-Category)
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInlineAddSub((prev) => !prev)}
                    className="flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-teal-700" />
                    <span>{showInlineAddSub ? 'Cancel' : `+ Nayi Sub-Category`}</span>
                  </button>
                </div>

                {/* Inline New Sub Category Form */}
                {showInlineAddSub && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 space-y-2 animate-fade-in">
                    <p className="text-xs font-bold text-teal-900">
                      [{activeMainCategory?.name}] Ke Under Nayi Sub-Category Likhein:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
                        placeholder={`Code e.g. ${selectedMainCode}-${100 + subCategoriesForActiveMain.length + 1}`}
                        className="h-8.5 rounded-lg border border-teal-300 bg-white px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value.toUpperCase())}
                        placeholder="e.g. 3-INCH CONDUIT PIPES / GATE VALVES"
                        className="h-8.5 rounded-lg border border-teal-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:outline-none sm:col-span-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowInlineAddSub(false)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInlineSubCategory}
                        disabled={savingNewSub || !newSubName.trim()}
                        className="flex items-center gap-1 rounded bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
                      >
                        {savingNewSub ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span>Save &amp; Select</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Category Selection Chips */}
                {subCategoriesForActiveMain.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-2.5 text-xs text-teal-800 flex items-center justify-between">
                    <span>Is Main Category ke under koi sub-category nahi hai.</span>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddSub(true)}
                      className="font-bold underline cursor-pointer"
                    >
                      + Pehli Sub-Category Banayein
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {subCategoriesForActiveMain.map((sub) => {
                      const isSelected = selectedSubCode === sub.code;
                      return (
                        <button
                          key={sub.code}
                          type="button"
                          onClick={() => setSelectedSubCode(sub.code)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm ring-2 ring-teal-400'
                              : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-teal-300 font-bold">↳</span>
                          <span>{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* --------------------------------------------------- */}
              {/* STEP 3: REDESIGNED CLEAN & BEAUTIFUL ITEM DETAILS    */}
              {/* --------------------------------------------------- */}
              <div className="rounded-2xl border-2 border-emerald-500 bg-white p-4 sm:p-5 shadow-md space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-extrabold text-sm shadow-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        Step 3 &bull; Item Details &amp; Rates (Teesra Step: Item Ka Naam Aur Rates)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Neeche Item ka naam, paimana (Unit) aur rates darj karein.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg">
                      SKU: {formSku}
                    </span>
                    {editingProduct && (
                      <button
                        type="button"
                        onClick={handleResetItemFields}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Reset / New Item
                      </button>
                    )}
                  </div>
                </div>

                {/* 2-COLUMN BALANCED CARDS: CARD A (ITEM & UNIT) + CARD B (RATES & PROFIT) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* LEFT CARD: ITEM NAME, SIZES & UNIT (7 cols) */}
                  <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                    {/* Item Name Input */}
                    <div>
                      <label className="mb-1 block text-xs font-extrabold text-slate-800">
                        Item Ka Naam &amp; Specifications <span className="text-rose-600">*</span>
                      </label>
                      <input
                        ref={itemNameInputRef}
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. 2&quot;X13' U-PVC PIPE - 2.50 KG / 90 DEGREE ELBOW"
                        className="h-10 w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    {/* Quick Size Chips (Curated & Neat) */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Aasan Size Buttons (Click karein to naam me add ho jayega):</span>
                      </span>

                      {/* Row 1: Sizes */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {PIPE_SIZES.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleAppendSpec(chip)}
                            className="rounded-lg border border-slate-300 bg-white hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-900 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                          >
                            +{chip}
                          </button>
                        ))}
                      </div>

                      {/* Row 2: Length / Specs */}
                      <div className="flex flex-wrap gap-1">
                        {PIPE_LENGTH_WEIGHT.map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => handleAppendSpec(spec)}
                            className="rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100 hover:border-teal-400 hover:text-teal-900 px-2 py-0.5 text-[11px] font-mono font-semibold text-teal-800 transition cursor-pointer shadow-2xs"
                          >
                            +{spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Unit of Measure (Visual Quick Buttons) */}
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-slate-800">
                        Paimana / Unit of Measure (UOM) <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_UNITS.map((unit) => {
                          const isUnitSelected = formUnit === unit;
                          return (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => setFormUnit(unit)}
                              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                                isUnitSelected
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {unit}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CARD: RATES & LIVE PROFIT BADGE (5 cols) */}
                  <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                        <Coins className="h-4 w-4 text-emerald-600" />
                        <span>Kharid O Farokht Rates (Rs.)</span>
                      </div>

                      {/* Purchase Price */}
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Kharid Rate (Purchase Price Rs.)
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-2 text-xs font-bold text-slate-400">
                            Rs.
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formCostPrice}
                            onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                            className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Retail Sale Price (Most Prominent) */}
                      <div>
                        <label className="mb-1 block text-xs font-extrabold text-emerald-800">
                          Farokht Rate (Retail Sale Price Rs.) <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-2 text-xs font-extrabold text-emerald-600">
                            Rs.
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={formSalePrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFormSalePrice(val);
                              if (formWholesalePrice === 0) {
                                setFormWholesalePrice(Math.round(val * 0.9));
                              }
                            }}
                            className="h-10 w-full rounded-xl border-2 border-emerald-500 bg-emerald-50/20 pl-9 pr-3 font-mono text-sm font-extrabold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Wholesale Price */}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Wholesale / Dealer Rate (Rs.)
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1.5 text-xs text-slate-400">
                            Rs.
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formWholesalePrice}
                            onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                            className="h-8.5 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 font-mono text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE PROFIT HIGHLIGHT BOX */}
                    <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-2.5 text-center shadow-2xs">
                      {Number(calculatedMargin) > 0 ? (
                        <div>
                          <p className="text-[10.5px] uppercase tracking-wider font-extrabold text-emerald-800">
                            Munafa / Profit Calculation
                          </p>
                          <p className="text-sm font-extrabold font-mono text-emerald-900">
                            Rs. {netGainAmount} / {formUnit} (+{calculatedMargin}%)
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">
                          Kharid aur Farokht rate darj karein taake munafa calculate ho sake.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW: STOCK QUANTITY & GODAM RACK */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Opening Stock (Mojooda Taadad)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formStockQty}
                      onChange={(e) => setFormStockQty(parseFloat(e.target.value) || 0)}
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Dukan / Godam Rack No.
                    </label>
                    <input
                      type="text"
                      value={formRackNo}
                      onChange={(e) => setFormRackNo(e.target.value)}
                      placeholder="e.g. Rack A-01 / Godam #2"
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Brand / Company</label>
                    <select
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      {BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TOGGLE ADVANCED DETAILS (FBR HS CODE & BARCODE) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedDetails((prev) => !prev)}
                    className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdvancedDetails ? '▼ Hide' : '▶ Show'} FBR Customs HS Code &amp; Barcode Details</span>
                  </button>

                  {showAdvancedDetails && (
                    <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Barcode (Scanner / EAN-13)
                        </label>
                        <input
                          type="text"
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          placeholder="8969XXXXXXXXX"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Pakistan Customs HS Code
                        </label>
                        <input
                          type="text"
                          value={formHsCode}
                          onChange={(e) => setFormHsCode(e.target.value)}
                          placeholder="3917.2390"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Sales Tax Rate (GST %)
                        </label>
                        <input
                          type="number"
                          value={formTaxRate}
                          onChange={(e) => setFormTaxRate(parseFloat(e.target.value) || 18)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleResetItemFields}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Reset Form
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleSaveItemSubmit(e, true)}
                    disabled={savingItem}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition active:scale-95"
                  >
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span>Save &amp; Bill in POS</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingItem}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingItem ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{editingProduct ? 'Update Finished Good' : 'Save Finished Goods Item (Ctrl+S)'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MODE B: VIEW REGISTERED ITEMS LIST                      */}
        {/* ========================================================= */}
        {viewMode === 'ITEM_LIST' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Filter controls */}
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    placeholder="Search SKU, item name, barcode, dimensions..."
                    className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                  {tableSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={tableMainFilter}
                  onChange={(e) => {
                    setTableMainFilter(e.target.value);
                    setTableSubFilter('ALL');
                  }}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Main Categories</option>
                  {mainCategories.map((m) => (
                    <option key={m.code} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={tableSubFilter}
                  onChange={(e) => setTableSubFilter(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Sub-Categories</option>
                  {subCategories.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
                  {totalItemCount} items
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto bg-slate-50/40">
              <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 shadow-2xs">
                  <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                    <th className="w-10 px-2 py-2 text-center border-b-2 border-emerald-500">#</th>
                    <th className="w-40 px-2.5 py-2 border-b-2 border-emerald-500">Classification</th>
                    <th className="w-32 px-2.5 py-2 border-b-2 border-emerald-500">SKU / Code</th>
                    <th className="min-w-[200px] px-2.5 py-2 border-b-2 border-emerald-500">Product Name &amp; Dimensions</th>
                    <th className="w-16 px-2 py-2 text-center border-b-2 border-emerald-500">UOM</th>
                    <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Cost (Rs.)</th>
                    <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Wholesale</th>
                    <th className="w-28 px-2.5 py-2 text-right border-b-2 border-emerald-500">Retail Rate</th>
                    <th className="w-20 px-2 py-2 text-center border-b-2 border-emerald-500">Margin</th>
                    <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Stock Qty</th>
                    <th className="w-24 px-2.5 py-2 text-center border-b-2 border-emerald-500">HS Code</th>
                    <th className="w-36 px-2.5 py-2 text-center border-b-2 border-emerald-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-500">
                        <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No items match the search query</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const marginPct =
                        p.cost_price > 0 && p.sale_price > 0
                          ? (((p.sale_price - p.cost_price) / p.cost_price) * 100).toFixed(0)
                          : null;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-emerald-50/40 transition group cursor-pointer"
                          onDoubleClick={() => handleEditProductFromTable(p)}
                        >
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-bold text-slate-800 text-[11px] truncate">
                              {p.main_category || 'FINISH GOODS'}
                            </div>
                            <div className="text-[10px] text-teal-700 font-semibold truncate">
                              ↳ {p.sub_category || 'General'}
                            </div>
                          </td>
                          <td className="px-2.5 py-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                              {p.sku}
                            </span>
                            {p.barcode && (
                              <div className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                                {p.barcode}
                              </div>
                            )}
                          </td>
                          <td className="px-2.5 py-2">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              {p.brand && (
                                <span className="bg-sky-50 text-sky-700 px-1 rounded font-semibold border border-sky-200">
                                  {p.brand}
                                </span>
                              )}
                              {p.rack_no && (
                                <span className="bg-amber-50 text-amber-700 px-1 rounded border border-amber-200">
                                  {p.rack_no}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">
                            {p.unit || 'Pcs'}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-600">
                            {formatCurrency(p.cost_price || 0)}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-600">
                            {formatCurrency(p.wholesale_price || Math.round(p.sale_price * 0.9))}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(p.sale_price)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {marginPct !== null ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                +{marginPct}%
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono">
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                p.stock_qty > 0
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {p.stock_qty || 0}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono text-[10px] text-slate-500">
                            {p.hs_code || '3917.2390'}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductIdForPos(p.id);
                                  closeInventoryModal();
                                }}
                                title="Bill directly into active POS Sale invoice"
                                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 active:scale-95 transition"
                              >
                                <Zap className="h-3 w-3" />
                                <span>Bill</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditProductFromTable(p)}
                                title="Edit finished good in 3-Step form"
                                className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                title="Delete item"
                                className="rounded border border-slate-300 p-1 text-rose-600 hover:bg-rose-50"
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
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. BOTTOM STATUS BAR                                      */}
        {/* ========================================================= */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Total Catalog: <strong className="text-slate-900">{totalItemCount}</strong> Products across{' '}
              <strong className="text-slate-900">{mainCategories.length}</strong> Main Categories &amp;{' '}
              <strong className="text-slate-900">{subCategories.length}</strong> Sub-Categories
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              F2: New Item
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Ctrl+S: Save Item
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">
              Esc: Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
