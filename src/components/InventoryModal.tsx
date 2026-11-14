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
  Download,
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

// Quick dimension helper chips for PVC pipes & fittings
export const QUICK_SIZES = ['1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"', '4"', '5"', '6"', '8"'];
export const QUICK_SPECS = ["X 13'", "X 10'", '2.00 KG', '2.50 KG', '3.00 KG', '3.50 KG', '4.00 KG', 'Class B', 'Class D', 'Heavy Duty'];
export const COMMON_UNITS = ['Pcs', 'Kgs', 'Mtr', 'Feet', 'Bundle', 'Bags', 'Box', 'Coil', 'Set'];
export const CATEGORY_TYPES = ['Finish Goods', 'Raw Material', 'Trading Goods', 'Services', 'Assets', 'None'];
export const STANDARD_HS_CODES = [
  { code: '3917.2390', label: '3917.2390 - U-PVC Pipes & Rigid Conduits' },
  { code: '3917.4000', label: '3917.4000 - Plastic Fittings (Elbows, Tees, Sockets)' },
  { code: '6910.1000', label: '6910.1000 - Ceramic Sanitary Fixtures & Basins' },
  { code: '6907.2100', label: '6907.2100 - Glazed Ceramic & Porcelain Tiles' },
  { code: '3506.9100', label: '3506.9100 - Adhesives & Tile Bond Cement' },
  { code: '8302.4100', label: '8302.4100 - Hardware & Mounting Accessories' },
];
export const BRANDS = ['SEASTONE', 'MASTER', 'POPULAR', 'IIL', 'ALPHA', 'CUSTOM', 'None'];

export function InventoryModal() {
  const {
    branches,
    closeInventoryModal,
    triggerInventoryRefresh,
    setSelectedProductIdForPos,
    isPosModalOpen,
  } = usePosContext();

  // Consistent Window Sizing & States (Matches CustomerModal & PosSaleModal exactly)
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search states
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedMainFilter, setSelectedMainFilter] = useState('ALL');
  const [selectedSubFilter, setSelectedSubFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Popup Dialog States
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // Item Form Fields
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMainCategory, setFormMainCategory] = useState('FINISH GOODS');
  const [formSubCategory, setFormSubCategory] = useState('U-PVC PRESSURE PIPES');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formHsCode, setFormHsCode] = useState('3917.2390');
  const [formBrand, setFormBrand] = useState('SEASTONE');
  const [formRackNo, setFormRackNo] = useState('Rack A-01');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formTaxType, setFormTaxType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [formValuationMethod, setFormValuationMethod] = useState<'WEIGHTED_AVG' | 'MANUAL'>('WEIGHTED_AVG');
  const [formValuationCost, setFormValuationCost] = useState<number>(0);
  const [formOrderQty, setFormOrderQty] = useState<number>(50);
  const [formQtyPerPiece, setFormQtyPerPiece] = useState<number>(1);
  const [formInactive, setFormInactive] = useState(false);
  const [formStockQty, setFormStockQty] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Category Manager Form Fields
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('Finish Goods');
  const [newCatParent, setNewCatParent] = useState<string | null>(null);

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
      setStatusMessage({ type: 'error', text: 'Error loading inventory catalog.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Main Categories & Subcategories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_code);
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parent_code));
  }, [categories]);

  // Subcategories for the active filter
  const subCategoriesForActiveFilter = useMemo(() => {
    if (selectedMainFilter === 'ALL') return [];
    const main = mainCategories.find((m) => m.name.toLowerCase() === selectedMainFilter.toLowerCase());
    if (!main) return [];
    return categories.filter((c) => c.parent_code === main.code);
  }, [categories, mainCategories, selectedMainFilter]);

  // Subcategories for the active form selection
  const subCategoriesForForm = useMemo(() => {
    const main = mainCategories.find((m) => m.name.toLowerCase() === formMainCategory.toLowerCase());
    if (!main) return [];
    return categories.filter((c) => c.parent_code === main.code);
  }, [categories, mainCategories, formMainCategory]);

  // Filtered Products Table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Branch filter
      if (branchFilter !== 'ALL') {
        // branch match if applicable
      }

      // Main Category filter
      if (selectedMainFilter !== 'ALL') {
        const pMain = (p.main_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const m = selectedMainFilter.toLowerCase();
        if (!pMain.includes(m) && !pCat.includes(m)) {
          return false;
        }
      }

      // Sub Category filter
      if (selectedSubFilter !== 'ALL') {
        const pSub = (p.sub_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const s = selectedSubFilter.toLowerCase();
        if (!pSub.includes(s) && !pCat.includes(s)) {
          return false;
        }
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
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
  }, [products, branchFilter, selectedMainFilter, selectedSubFilter, searchQuery]);

  // KPI Calculations
  const totalItemCount = products.length;
  const inStockCount = products.filter((p) => p.stock_qty > 0).length;
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.sale_price || 0), 0);
  }, [products]);

  // Form Profit Margin calculation
  const calculatedMargin = useMemo(() => {
    if (formCostPrice <= 0 || formSalePrice <= 0) return 0;
    return (((formSalePrice - formCostPrice) / formCostPrice) * 100).toFixed(1);
  }, [formCostPrice, formSalePrice]);

  // Open Registration Modal for new item
  const handleOpenAddDialog = () => {
    const nextRandom = Math.floor(100000 + Math.random() * 900000);
    const defaultMain = mainCategories[0]?.name || 'FINISH GOODS';
    const firstSub = categories.find((c) => c.parent_code === mainCategories[0]?.code)?.name || 'U-PVC PRESSURE PIPES';

    setEditingProduct(null);
    setFormSku(`FG-${nextRandom}`);
    setFormBarcode(`8969${nextRandom}123`);
    setFormName('');
    setFormDescription('');
    setFormMainCategory(defaultMain);
    setFormSubCategory(firstSub);
    setFormUnit('Pcs');
    setFormHsCode('3917.2390');
    setFormBrand('SEASTONE');
    setFormRackNo('Rack A-01');
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormWholesalePrice(0);
    setFormTaxRate(18);
    setFormTaxType('PERCENT');
    setFormValuationMethod('WEIGHTED_AVG');
    setFormValuationCost(0);
    setFormOrderQty(50);
    setFormQtyPerPiece(1);
    setFormInactive(false);
    setFormStockQty(0);
    setFormError(null);
    setShowItemDialog(true);
  };

  // Open Edit Modal for existing item
  const handleOpenEditDialog = (prod: ProductWithStock) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode || '');
    setFormName(prod.name);
    setFormDescription(prod.description || prod.name);
    setFormMainCategory(prod.main_category || 'FINISH GOODS');
    setFormSubCategory(prod.sub_category || 'U-PVC PRESSURE PIPES');
    setFormUnit(prod.unit || 'Pcs');
    setFormHsCode(prod.hs_code || '3917.2390');
    setFormBrand(prod.brand || 'SEASTONE');
    setFormRackNo(prod.rack_no || 'Rack A-01');
    setFormCostPrice(prod.cost_price || 0);
    setFormSalePrice(prod.sale_price || 0);
    setFormWholesalePrice(prod.wholesale_price || Math.round(prod.sale_price * 0.9));
    setFormTaxRate(prod.tax_rate ?? 18);
    setFormTaxType(prod.tax_type || 'PERCENT');
    setFormValuationMethod(prod.valuation_method || 'WEIGHTED_AVG');
    setFormValuationCost(prod.valuation_cost || prod.cost_price || 0);
    setFormOrderQty(prod.order_quantity || 50);
    setFormQtyPerPiece(prod.qty_per_piece || 1);
    setFormInactive(prod.is_active === 0);
    setFormStockQty(prod.stock_qty || 0);
    setFormError(null);
    setShowItemDialog(true);
  };

  // Helper to append pipe specs to item name
  const handleAppendSpec = (chip: string) => {
    setFormName((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      return `${prev} ${chip}`.trim();
    });
  };

  // Save Item
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formSku.trim()) {
      setFormError('Item Code / SKU is required.');
      return;
    }
    if (!formName.trim()) {
      setFormError('Item Name / Description is required.');
      return;
    }
    if (formSalePrice <= 0) {
      setFormError('Retail Sale Price must be greater than 0.');
      return;
    }

    setSavingItem(true);
    try {
      const fullCategory = `${formMainCategory} > ${formSubCategory}`;
      const payload = {
        id: editingProduct?.id,
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim(),
        name: formName.trim(),
        description: formDescription.trim() || formName.trim(),
        category: fullCategory,
        main_category: formMainCategory,
        sub_category: formSubCategory,
        unit: formUnit.trim() || 'Pcs',
        hs_code: formHsCode.trim() || '3917.2390',
        brand: formBrand,
        rack_no: formRackNo,
        cost_price: Number(formCostPrice) || 0,
        sale_price: Number(formSalePrice) || 0,
        wholesale_price: Number(formWholesalePrice) || Math.round(Number(formSalePrice) * 0.9),
        tax_rate: Number(formTaxRate) || 18,
        tax_type: formTaxType,
        valuation_method: formValuationMethod,
        valuation_cost: Number(formValuationCost) || Number(formCostPrice) || 0,
        order_quantity: Number(formOrderQty) || 50,
        qty_per_piece: Number(formQtyPerPiece) || 1,
        is_active: formInactive ? 0 : 1,
        branch_id: branches[0]?.id || 1,
        stock_qty: Number(formStockQty) || 0,
      };

      const res = await fetch('/api/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowItemDialog(false);
        triggerInventoryRefresh();
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Product [${payload.sku}] saved successfully!`,
        });
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to save product.');
      }
    } catch {
      setFormError('Network error saving product.');
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Item
  const handleDeleteProduct = async (prod: ProductWithStock) => {
    if (!confirm(`Are you sure you want to delete / deactivate [${prod.sku}] - ${prod.name}?`)) return;

    try {
      const res = await fetch(`/api/products?id=${prod.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        triggerInventoryRefresh();
        await loadData();
        setStatusMessage({ type: 'success', text: `Item [${prod.sku}] removed.` });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete product.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting product.' });
    }
  };

  // Bill in POS
  const handleBillInPos = (prod: ProductWithStock) => {
    setSelectedProductIdForPos(prod.id);
    closeInventoryModal();
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Main Category',
      'Sub Category',
      'Item Code / SKU',
      'Product Name',
      'HS Code',
      'Unit',
      'Cost Price',
      'Wholesale Price',
      'Retail Sale Price',
      'Stock Qty',
      'Status',
    ];
    const rows = products.map((p) => [
      `"${p.main_category || 'General'}"`,
      `"${p.sub_category || 'General'}"`,
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.hs_code || '3917.2390'}"`,
      `"${p.unit || 'Pcs'}"`,
      p.cost_price,
      p.wholesale_price || Math.round(p.sale_price * 0.9),
      p.sale_price,
      p.stock_qty || 0,
      p.is_active ? 'Active' : 'Inactive',
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

  // Save Category in Category Manager
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatCode.trim() || !newCatName.trim()) {
      alert('Category Code and Name are required.');
      return;
    }

    try {
      const payload = {
        code: newCatCode.trim().toUpperCase(),
        name: newCatName.trim().toUpperCase(),
        category_type: newCatType,
        parent_code: newCatParent || null,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewCatCode('');
        setNewCatName('');
        await loadData();
        setStatusMessage({ type: 'success', text: `Category [${payload.code}] registered!` });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save category');
      }
    } catch {
      alert('Network error saving category');
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenAddDialog();
      }
      if (e.key === 'Escape') {
        if (showItemDialog) setShowItemDialog(false);
        else if (showCategoryManager) setShowCategoryManager(false);
        else closeInventoryModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showItemDialog, showCategoryManager, closeInventoryModal]);

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
            <FolderTree className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Chart Of Inventory</p>
            <p className="text-xs font-bold text-white">
              {mainCategories.length} Categories • {products.length} SKUs Active
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
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Maintain Module • Chart Of Inventory
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-400 font-normal">
                (Main Category ➔ Sub Category ➔ Finished Goods Master • Multi-Tenant Ready)
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
        {/* 2. EXECUTIVE METRIC SUMMARY CARDS BAR                     */}
        {/* ========================================================= */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-100/90 p-2.5 border-b border-slate-200">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Catalog Finished Goods</p>
              <p className="text-sm font-extrabold text-slate-900">{totalItemCount} SKUs Active</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estimated Inventory Value</p>
              <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(totalValuation)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Categories &amp; Hierarchy</p>
              <p className="text-sm font-extrabold text-slate-900">
                {mainCategories.length} Mains • {subCategories.length} Subs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FBR &amp; Multi-Tenant</p>
              <p className="text-sm font-extrabold text-slate-900">100% Tax &amp; Sync Ready</p>
            </div>
          </div>
        </div>

        {/* Status notification banner (if any) */}
        {statusMessage && (
          <div
            className={`shrink-0 flex items-center justify-between px-3 py-1.5 text-xs font-semibold border-b ${
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
        {/* 3. PRIMARY ACTION & SEARCH CONTROL BAR                    */}
        {/* ========================================================= */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {/* Left: Action CTA Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddDialog}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>+ Register Finished Goods Item (F2)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Settings2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Manage Categories (Hierarchy)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Catalog</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              title="Refresh Products Catalog"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: Branch Selector & Omni-Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
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

            <div className="relative min-w-[200px] flex-1">
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

        {/* ========================================================= */}
        {/* 4. LEVEL 1 & LEVEL 2 CASCADING CATEGORY NAVIGATION TABS    */}
        {/* ========================================================= */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 space-y-1.5">
          {/* Level 1: Main Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
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

            {mainCategories.map((cat) => {
              const isSelected = selectedMainFilter.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.code}
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
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Level 2: Sub-Category Filter Chips (shows when Main Category is chosen) */}
          {subCategoriesForActiveFilter.length > 0 && (
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
              {subCategoriesForActiveFilter.map((sub) => (
                <button
                  key={sub.code}
                  type="button"
                  onClick={() => setSelectedSubFilter(sub.name)}
                  className={`shrink-0 rounded-md px-2 py-0.5 font-semibold transition ${
                    selectedSubFilter === sub.name
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 5. MASTER FINISHED GOODS INVENTORY TABLE                  */}
        {/* ========================================================= */}
        <div className="flex-1 min-h-0 overflow-auto bg-slate-50/50">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-20 shadow-2xs">
              <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                <th className="w-10 px-2 py-2 text-center border-b-2 border-emerald-500">#</th>
                <th className="w-36 px-2.5 py-2 border-b-2 border-emerald-500">Classification</th>
                <th className="w-32 px-2.5 py-2 border-b-2 border-emerald-500">Item Code / SKU</th>
                <th className="min-w-[200px] px-2.5 py-2 border-b-2 border-emerald-500">Item Name &amp; Specs</th>
                <th className="w-16 px-2 py-2 text-center border-b-2 border-emerald-500">Unit</th>
                <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Cost Price</th>
                <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Wholesale</th>
                <th className="w-28 px-2.5 py-2 text-right border-b-2 border-emerald-500">Retail Rate</th>
                <th className="w-20 px-2 py-2 text-center border-b-2 border-emerald-500">Margin</th>
                <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Stock Qty</th>
                <th className="w-24 px-2.5 py-2 text-center border-b-2 border-emerald-500">HS Code</th>
                <th className="w-36 px-2.5 py-2 text-center border-b-2 border-emerald-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                    <span>Loading multi-tenant inventory catalog...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No items found matching the selected filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;+ Register Finished Goods Item (F2)&quot; to add new product.
                    </p>
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
                      className={`h-9 hover:bg-sky-50/60 transition ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="px-2 py-1 text-center font-normal text-slate-400 text-[11px] tabular-nums">
                        {idx + 1}
                      </td>

                      <td className="px-2.5 py-1">
                        <span className="block text-[11px] font-bold text-slate-800 truncate">
                          {p.main_category || 'General'}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold truncate block">
                          ↳ {p.sub_category || 'General'}
                        </span>
                      </td>

                      <td className="px-2.5 py-1 font-mono font-bold text-slate-900 text-xs">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                          {p.sku}
                        </span>
                      </td>

                      <td className="px-2.5 py-1">
                        <p className="font-semibold text-slate-900 text-xs truncate max-w-xs">{p.name}</p>
                        {p.barcode && (
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Barcode className="h-3 w-3" />
                            {p.barcode}
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-1 text-center font-semibold text-slate-700 text-xs">
                        {p.unit || 'Pcs'}
                      </td>

                      <td className="px-2.5 py-1 text-right tabular-nums text-slate-700 text-xs">
                        {formatCurrency(p.cost_price)}
                      </td>

                      <td className="px-2.5 py-1 text-right tabular-nums font-semibold text-slate-800 text-xs">
                        {formatCurrency(p.wholesale_price || Math.round(p.sale_price * 0.9))}
                      </td>

                      <td className="px-2.5 py-1 text-right tabular-nums font-extrabold text-emerald-800 text-xs">
                        {formatCurrency(p.sale_price)}
                      </td>

                      <td className="px-2 py-1 text-center">
                        {marginPct ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            +{marginPct}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="px-2.5 py-1 text-right tabular-nums text-xs">
                        <span
                          className={`font-bold ${
                            p.stock_qty <= 0
                              ? 'text-rose-600'
                              : p.stock_qty < 10
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {p.stock_qty || 0}
                        </span>
                      </td>

                      <td className="px-2.5 py-1 text-center font-mono text-[11px] text-slate-600">
                        {p.hs_code || '3917.2390'}
                      </td>

                      {/* Actions */}
                      <td className="px-2.5 py-1 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBillInPos(p)}
                            title="Bill directly into active POS Sale screen"
                            className="flex h-6 items-center gap-1 rounded bg-emerald-600 px-2 text-[10.5px] font-bold text-white hover:bg-emerald-500 shadow-2xs active:scale-95 transition"
                          >
                            <Zap className="h-3 w-3 text-amber-300" />
                            <span>Bill in POS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditDialog(p)}
                            title="Edit Item Details"
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                          >
                            <Edit className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete Item"
                            className="flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-2xs"
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

        {/* ========================================================= */}
        {/* 6. BOTTOM STATUS FOOTER                                   */}
        {/* ========================================================= */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
              {totalItemCount} catalog items
            </span>
            <span className="text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600">
              Double-click or edit any item to customize commercial specifications
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">F2: New Item</span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">Ctrl+S: Save</span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">Esc: Close</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 7. DEDICATED REGISTRATION & EDIT POPUP MODAL               */}
        {/* ========================================================= */}
        {showItemDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-xs font-sans">
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
                        ? `Edit Finished Goods [${editingProduct.sku}]`
                        : 'New Finished Goods Registration (Main ➔ Sub ➔ Item)'}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Hierarchical Classification &amp; FBR HS Code Mapping
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowItemDialog(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto bg-slate-50/50">
                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* LIVE HIERARCHY BREADCRUMB */}
                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/80 p-2 text-xs font-bold text-emerald-200 border border-emerald-500/30 shadow-2xs">
                  <span className="text-emerald-400">Classification:</span>
                  <span className="rounded bg-emerald-900/90 px-2 py-0.5 text-white">{formMainCategory}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="rounded bg-teal-800/90 px-2 py-0.5 text-white">{formSubCategory}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-mono truncate max-w-[200px]">
                    {formSku || 'Item Code'}
                  </span>
                </div>

                {/* CARD 1: CATEGORY SELECTION */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-sky-600" />
                      <span>1. Category &amp; Sub-Category Selection</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      + Add New Category to DB
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Main Category <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formMainCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormMainCategory(val);
                          const matchingSubs = categories.filter(
                            (c) => c.parent_code === mainCategories.find((m) => m.name === val)?.code
                          );
                          if (matchingSubs.length > 0) {
                            setFormSubCategory(matchingSubs[0].name);
                          }
                        }}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        {mainCategories.map((m) => (
                          <option key={m.code} value={m.name}>
                            {m.name} ({m.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Sub-Category <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formSubCategory}
                        onChange={(e) => setFormSubCategory(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        {subCategoriesForForm.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                        {subCategoriesForForm.length === 0 && (
                          <option value={formMainCategory}>{formMainCategory}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* CARD 2: ITEM SPECIFICATIONS & QUICK CHIPS */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      2. Item Specifications &amp; Codes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Item Code / SKU <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        placeholder="e.g. FG-202011"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none uppercase"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Barcode (EAN / UPC)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          placeholder="e.g. 896912345678"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormBarcode(`8969${Math.floor(10000000 + Math.random() * 90000000)}`)}
                          className="h-8.5 px-2.5 rounded-lg border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 shrink-0"
                        >
                          Gen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Description & 1-Click Dimension Chips */}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">
                      Description / Product Specification <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={'e.g. 2"X13\' U-PVC PRESSURE PIPE - 2.50 KG'}
                      className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none uppercase"
                    />

                    {/* 1-Click Pipe Dimension Chips (Neatly styled in a horizontal responsive strip) */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 select-none">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase">1-Click Dimension Chips:</span>
                      {QUICK_SIZES.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleAppendSpec(sz)}
                          className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition"
                        >
                          {sz}
                        </button>
                      ))}
                      {QUICK_SPECS.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => handleAppendSpec(sp)}
                          className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition"
                        >
                          {sp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand, Rack, UOM */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Brand Name</label>
                      <select
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        {BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Rack / Shelf No.</label>
                      <input
                        type="text"
                        value={formRackNo}
                        onChange={(e) => setFormRackNo(e.target.value)}
                        placeholder="e.g. Rack A-01"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Unit of Measure (UOM)</label>
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
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

                {/* CARD 3: FBR HS CODE & TAX */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      3. FBR HS Code &amp; Sales Tax Rate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Pakistan Customs HS Code</label>
                      <select
                        value={formHsCode}
                        onChange={(e) => setFormHsCode(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      >
                        {STANDARD_HS_CODES.map((h) => (
                          <option key={h.code} value={h.code}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Sales Tax Rate (GST %)</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={formTaxRate}
                            onChange={(e) => setFormTaxRate(Number(e.target.value) || 0)}
                            className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">Standard GST 18%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: PRICING & COMMERCIAL RATES */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-600" />
                      <span>4. Multi-Tier Pricing &amp; Margin</span>
                    </span>
                    {calculatedMargin !== 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800 border border-emerald-300">
                        Profit Margin: +{calculatedMargin}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Cost / Purchase Price (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={formCostPrice === 0 ? '' : formCostPrice}
                        onChange={(e) => setFormCostPrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">
                        Retail Sale Price (Rs.) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formSalePrice === 0 ? '' : formSalePrice}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setFormSalePrice(val);
                          if (!formWholesalePrice || formWholesalePrice === 0) {
                            setFormWholesalePrice(Math.round(val * 0.9));
                          }
                        }}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-emerald-500 bg-emerald-50/40 px-2.5 text-xs font-extrabold text-emerald-950 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-slate-700">Wholesale Rate (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={formWholesalePrice === 0 ? '' : formWholesalePrice}
                        onChange={(e) => setFormWholesalePrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowItemDialog(false)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel (Esc)
                  </button>
                  <button
                    type="submit"
                    disabled={savingItem}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
                  >
                    <Check className="h-4 w-4" />
                    <span>{savingItem ? 'Saving...' : 'Save Product (Ctrl+S)'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. CATEGORY HIERARCHY MANAGER MODAL (MULTI-TENANT READY)  */}
        {/* ========================================================= */}
        {showCategoryManager && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-xs font-sans">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold">Category Hierarchy Manager (Multi-Tenant)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs bg-slate-50/50">
                {/* Form to add new Category */}
                <form onSubmit={handleSaveCategory} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Add New Category / Sub-Category</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-semibold text-slate-700">Category Code</label>
                      <input
                        type="text"
                        value={newCatCode}
                        onChange={(e) => setNewCatCode(e.target.value)}
                        placeholder="e.g. FG-1 or FG-101"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-mono text-xs uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-700">Category Name</label>
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="e.g. FINISH GOODS"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-700">Category Type</label>
                      <select
                        value={newCatType}
                        onChange={(e) => setNewCatType(e.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                      >
                        {CATEGORY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-700">Parent Main Category</label>
                      <select
                        value={newCatParent || ''}
                        onChange={(e) => setNewCatParent(e.target.value ? e.target.value : null)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs"
                      >
                        <option value="">(None - Main Category)</option>
                        {mainCategories.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.name} ({m.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      type="submit"
                      className="h-8 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 shadow-2xs"
                    >
                      + Save Category to DB
                    </button>
                  </div>
                </form>

                {/* Current Hierarchy Display */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase">Active Category Hierarchy in Database:</h4>
                  <div className="space-y-2">
                    {mainCategories.map((m) => {
                      const childSubs = categories.filter((c) => c.parent_code === m.code);
                      return (
                        <div key={m.code} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <span className="rounded bg-slate-900 text-white px-1.5 py-0.2 text-[10px] font-mono">
                                {m.code}
                              </span>
                              <span>{m.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal">({m.category_type})</span>
                            </span>
                            <span className="text-xs text-emerald-700 font-semibold">{childSubs.length} Subs</span>
                          </div>
                          {childSubs.length > 0 && (
                            <div className="mt-1.5 pl-4 border-l-2 border-emerald-300 space-y-1">
                              {childSubs.map((s) => (
                                <div key={s.code} className="flex items-center justify-between text-[11px] text-slate-700">
                                  <span>
                                    ↳ <strong className="font-mono text-slate-600">{s.code}:</strong> {s.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
