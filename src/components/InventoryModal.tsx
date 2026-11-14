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
  FolderOpen,
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

// Quick dimension helper chips for PVC pipes & building materials
export const QUICK_SIZES = ['1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"', '4"', '5"', '6"', '8"'];
export const QUICK_SPECS = ["X 13'", "X 10'", '2.00 KG', '2.50 KG', '3.00 KG', '3.50 KG', '4.00 KG', 'Class B', 'Class D', 'Heavy Duty'];
export const COMMON_UNITS = ['Pcs', 'Kgs', 'Mtr', 'Feet', 'Bundle', 'Bags', 'Box', 'Coil', 'Set'];
export const CATEGORY_TYPES = ['Finish Goods', 'Raw Material', 'Trading Goods', 'Services', 'Assets', 'None'];

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

  // Active Navigation Tab: 'ITEMS' | 'MAINS' | 'SUBS'
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'MAINS' | 'SUBS'>('ITEMS');

  // Data states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table filters for Items Tab
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedMainFilter, setSelectedMainFilter] = useState('ALL');
  const [selectedSubFilter, setSelectedSubFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Item Add / Edit Modal Popup States
  // ==========================================
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [itemSku, setItemSku] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemMainCat, setItemMainCat] = useState('');
  const [itemSubCat, setItemSubCat] = useState('');
  const [itemUnit, setItemUnit] = useState('Pcs');
  const [itemCostPrice, setItemCostPrice] = useState<number>(0);
  const [itemSalePrice, setItemSalePrice] = useState<number>(0);
  const [itemWholesalePrice, setItemWholesalePrice] = useState<number>(0);
  const [itemTaxRate, setItemTaxRate] = useState<number>(18);
  const [itemHsCode, setItemHsCode] = useState('3917.2390');
  const [itemStockQty, setItemStockQty] = useState<number>(0);
  const [itemError, setItemError] = useState<string | null>(null);

  // Inline Quick Add Category Modal (Inside Item Popup)
  const [showInlineCatModal, setShowInlineCatModal] = useState(false);
  const [inlineCatTarget, setInlineCatTarget] = useState<'MAIN' | 'SUB'>('MAIN');
  const [inlineCatName, setInlineCatName] = useState('');

  // ==========================================
  // Tab 2: Main Category Management States
  // ==========================================
  const [newMainName, setNewMainName] = useState('');
  const [newMainCode, setNewMainCode] = useState('');
  const [newMainType, setNewMainType] = useState('Finish Goods');

  // ==========================================
  // Tab 3: Sub Category Management States
  // ==========================================
  const [newSubParent, setNewSubParent] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');

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

      // If empty, supply default seed
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

      // Default selections
      if (cats.length > 0 && !newSubParent) {
        const firstMain = cats.find((c) => !c.parent_code);
        if (firstMain) setNewSubParent(firstMain.code);
      }

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
  }, [newSubParent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Main Categories & Subcategories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_code);
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parent_code));
  }, [categories]);

  // Subcategories for active item popup selection
  const subCategoriesForItemForm = useMemo(() => {
    if (!itemMainCat) return [];
    const main = mainCategories.find(
      (m) => m.name.toLowerCase() === itemMainCat.toLowerCase() || m.code === itemMainCat
    );
    if (!main) return [];
    return categories.filter((c) => c.parent_code === main.code);
  }, [categories, mainCategories, itemMainCat]);

  // Subcategories for the active filter on Items tab
  const subCategoriesForActiveFilter = useMemo(() => {
    if (selectedMainFilter === 'ALL') return [];
    const main = mainCategories.find((m) => m.name.toLowerCase() === selectedMainFilter.toLowerCase());
    if (!main) return [];
    return categories.filter((c) => c.parent_code === main.code);
  }, [categories, mainCategories, selectedMainFilter]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Main Category filter
      if (selectedMainFilter !== 'ALL') {
        const pMain = (p.main_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const m = selectedMainFilter.toLowerCase();
        if (!pMain.includes(m) && !pCat.includes(m)) return false;
      }

      // Sub Category filter
      if (selectedSubFilter !== 'ALL') {
        const pSub = (p.sub_category || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const s = selectedSubFilter.toLowerCase();
        if (!pSub.includes(s) && !pCat.includes(s)) return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.main_category && p.main_category.toLowerCase().includes(q)) ||
        (p.sub_category && p.sub_category.toLowerCase().includes(q)) ||
        (p.unit && p.unit.toLowerCase().includes(q))
      );
    });
  }, [products, selectedMainFilter, selectedSubFilter, searchQuery]);

  // KPI Calculations
  const totalItemCount = products.length;
  const inStockCount = products.filter((p) => p.stock_qty > 0).length;
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.sale_price || 0), 0);
  }, [products]);

  // Form Profit Margin
  const calculatedMargin = useMemo(() => {
    if (itemCostPrice <= 0 || itemSalePrice <= 0) return 0;
    return (((itemSalePrice - itemCostPrice) / itemCostPrice) * 100).toFixed(0);
  }, [itemCostPrice, itemSalePrice]);

  // ==========================================
  // HANDLERS: TAB 1 (ADD / EDIT / DELETE ITEMS)
  // ==========================================
  const handleOpenAddItem = () => {
    const nextRandom = Math.floor(100000 + Math.random() * 900000);
    const defaultMain = mainCategories[0]?.name || 'FINISH GOODS';
    const firstSub =
      categories.find((c) => c.parent_code === mainCategories[0]?.code)?.name || 'U-PVC PRESSURE PIPES';

    setEditingProduct(null);
    setItemSku(`FG-${nextRandom}`);
    setItemBarcode(`8969${nextRandom}123`);
    setItemName('');
    setItemMainCat(defaultMain);
    setItemSubCat(firstSub);
    setItemUnit('Pcs');
    setItemCostPrice(0);
    setItemSalePrice(0);
    setItemWholesalePrice(0);
    setItemTaxRate(18);
    setItemHsCode('3917.2390');
    setItemStockQty(0);
    setItemError(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (prod: ProductWithStock) => {
    setEditingProduct(prod);
    setItemSku(prod.sku);
    setItemBarcode(prod.barcode || '');
    setItemName(prod.name);
    setItemMainCat(prod.main_category || mainCategories[0]?.name || 'FINISH GOODS');
    setItemSubCat(prod.sub_category || 'General');
    setItemUnit(prod.unit || 'Pcs');
    setItemCostPrice(prod.cost_price || 0);
    setItemSalePrice(prod.sale_price || 0);
    setItemWholesalePrice(prod.wholesale_price || Math.round(prod.sale_price * 0.9));
    setItemTaxRate(prod.tax_rate ?? 18);
    setItemHsCode(prod.hs_code || '3917.2390');
    setItemStockQty(prod.stock_qty || 0);
    setItemError(null);
    setShowItemModal(true);
  };

  const handleAppendSpec = (chip: string) => {
    setItemName((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      return `${prev} ${chip}`.trim();
    });
  };

  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);

    if (!itemSku.trim()) {
      setItemError('Item Code / SKU is required.');
      return;
    }
    if (!itemName.trim()) {
      setItemError('Item Name is required.');
      return;
    }
    if (itemSalePrice <= 0) {
      setItemError('Retail Sale Price must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      const fullCategory = `${itemMainCat} > ${itemSubCat || itemMainCat}`;
      const payload = {
        id: editingProduct?.id,
        sku: itemSku.trim().toUpperCase(),
        barcode: itemBarcode.trim(),
        name: itemName.trim(),
        description: itemName.trim(),
        category: fullCategory,
        main_category: itemMainCat,
        sub_category: itemSubCat || itemMainCat,
        unit: itemUnit.trim() || 'Pcs',
        hs_code: itemHsCode.trim() || '3917.2390',
        cost_price: Number(itemCostPrice) || 0,
        sale_price: Number(itemSalePrice) || 0,
        wholesale_price: Number(itemWholesalePrice) || Math.round(Number(itemSalePrice) * 0.9),
        tax_rate: Number(itemTaxRate) || 18,
        branch_id: branches[0]?.id || 1,
        stock_qty: Number(itemStockQty) || 0,
        is_active: 1,
      };

      const res = await fetch('/api/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowItemModal(false);
        triggerInventoryRefresh();
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Product [${payload.sku}] saved successfully!`,
        });
      } else {
        const err = await res.json();
        setItemError(err.error || 'Failed to save product.');
      }
    } catch {
      setItemError('Network error saving product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (prod: ProductWithStock) => {
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

  const handleBillInPos = (prod: ProductWithStock) => {
    setSelectedProductIdForPos(prod.id);
    closeInventoryModal();
  };

  // Inline Quick Category Add inside Item Modal
  const handleSaveInlineCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCatName.trim()) return;

    try {
      const isMain = inlineCatTarget === 'MAIN';
      const code = isMain
        ? `CAT-${mainCategories.length + 1}`
        : `${categories.find((c) => c.name === itemMainCat)?.code || 'FG'}-${100 + subCategories.length + 1}`;

      const payload = {
        code,
        name: inlineCatName.trim().toUpperCase(),
        category_type: 'Finish Goods',
        parent_code: isMain ? null : categories.find((c) => c.name === itemMainCat)?.code || 'FG-1',
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadData();
        if (isMain) {
          setItemMainCat(payload.name);
        } else {
          setItemSubCat(payload.name);
        }
        setShowInlineCatModal(false);
        setInlineCatName('');
      }
    } catch {
      alert('Error saving category');
    }
  };

  // ==========================================
  // HANDLERS: TAB 2 (ADD / DELETE MAIN CATEGORY)
  // ==========================================
  const handleSaveMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) {
      alert('Please enter Category Name');
      return;
    }

    setSaving(true);
    try {
      const code = newMainCode.trim()
        ? newMainCode.trim().toUpperCase()
        : `CAT-${mainCategories.length + 1}`;

      const payload = {
        code,
        name: newMainName.trim().toUpperCase(),
        category_type: newMainType,
        parent_code: null,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewMainName('');
        setNewMainCode('');
        await loadData();
        setStatusMessage({ type: 'success', text: `Main Category [${payload.name}] added successfully!` });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save main category');
      }
    } catch {
      alert('Network error saving main category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (code: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category [${name}]?`)) return;

    try {
      const res = await fetch(`/api/categories?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadData();
        setStatusMessage({ type: 'success', text: `Category [${name}] deleted.` });
      } else {
        alert('Could not delete category');
      }
    } catch {
      alert('Network error deleting category');
    }
  };

  // ==========================================
  // HANDLERS: TAB 3 (ADD / DELETE SUB CATEGORY)
  // ==========================================
  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubParent || !newSubName.trim()) {
      alert('Please select Main Category and enter Sub-Category Name');
      return;
    }

    setSaving(true);
    try {
      const code = newSubCode.trim()
        ? newSubCode.trim().toUpperCase()
        : `${newSubParent}-${100 + subCategories.length + 1}`;

      const payload = {
        code,
        name: newSubName.trim().toUpperCase(),
        category_type: 'Finish Goods',
        parent_code: newSubParent,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNewSubName('');
        setNewSubCode('');
        await loadData();
        setStatusMessage({ type: 'success', text: `Sub-Category [${payload.name}] added successfully!` });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save sub-category');
      }
    } catch {
      alert('Network error saving sub-category');
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Main Category',
      'Sub Category',
      'Item Code / SKU',
      'Product Name',
      'Unit',
      'Cost Price',
      'Sale Price',
      'Stock Qty',
    ];
    const rows = products.map((p) => [
      `"${p.main_category || 'General'}"`,
      `"${p.sub_category || 'General'}"`,
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.unit || 'Pcs'}"`,
      p.cost_price,
      p.sale_price,
      p.stock_qty || 0,
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

  // Keyboard Shortcuts (F2: add item, Esc: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenAddItem();
      }
      if (e.key === 'Escape') {
        if (showInlineCatModal) setShowInlineCatModal(false);
        else if (showItemModal) setShowItemModal(false);
        else closeInventoryModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInlineCatModal, showItemModal, closeInventoryModal]);

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
              {mainCategories.length} Categories • {products.length} Items Active
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
                (Categories, Sub-Categories &amp; Finished Goods Master)
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
        {/* 2. THREE CRYSTAL-CLEAR NAVIGATION TABS                    */}
        {/* ========================================================= */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-3 py-1.5">
          <div className="flex items-center gap-2 select-none">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'ITEMS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Package className="h-4 w-4 text-emerald-400" />
              <span>1. Items / Finished Goods ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MAINS')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'MAINS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-4 w-4 text-sky-400" />
              <span>2. Main Categories ({mainCategories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUBS')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'SUBS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FolderOpen className="h-4 w-4 text-amber-400" />
              <span>3. Sub-Categories ({subCategories.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Asset Valuation:</span>
            <strong className="text-emerald-700 font-extrabold">{formatCurrency(totalValuation)}</strong>
          </div>
        </div>

        {/* Status notification banner */}
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
        {/* 3. TAB CONTENT VIEWS                                      */}
        {/* ========================================================= */}

        {/* --------------------------------------------------------- */}
        {/* TAB 1: ITEMS / FINISHED GOODS LIST & BILLING              */}
        {/* --------------------------------------------------------- */}
        {activeTab === 'ITEMS' && (
          <div className="flex-1 min-h-0 flex flex-col bg-white">
            {/* Action Bar */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>+ Add New Item (F2)</span>
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
                  title="Refresh"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Omni-search */}
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU, name, category, unit..."
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

            {/* Quick Category Filter Pills */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 space-y-1">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs select-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Category:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMainFilter('ALL');
                    setSelectedSubFilter('ALL');
                  }}
                  className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold transition ${
                    selectedMainFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({products.length})
                </button>
                {mainCategories.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      setSelectedMainFilter(m.name);
                      setSelectedSubFilter('ALL');
                    }}
                    className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold transition ${
                      selectedMainFilter.toLowerCase() === m.name.toLowerCase()
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              {/* Sub-Category chips if a main category is selected */}
              {subCategoriesForActiveFilter.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 text-[11px] select-none border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase shrink-0 mr-1">
                    ↳ Sub-Category:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubFilter('ALL')}
                    className={`shrink-0 rounded px-2 py-0.2 font-semibold transition ${
                      selectedSubFilter === 'ALL'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Subcategories
                  </button>
                  {subCategoriesForActiveFilter.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSelectedSubFilter(s.name)}
                      className={`shrink-0 rounded px-2 py-0.2 font-semibold transition ${
                        selectedSubFilter === s.name
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clean Products Table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 shadow-2xs">
                  <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                    <th className="w-10 px-2 py-2 text-center border-b-2 border-emerald-500">#</th>
                    <th className="w-32 px-2.5 py-2 border-b-2 border-emerald-500">Item Code / SKU</th>
                    <th className="min-w-[220px] px-2.5 py-2 border-b-2 border-emerald-500">Product Name</th>
                    <th className="w-36 px-2.5 py-2 border-b-2 border-emerald-500">Main Category</th>
                    <th className="w-36 px-2.5 py-2 border-b-2 border-emerald-500">Sub-Category</th>
                    <th className="w-16 px-2 py-2 text-center border-b-2 border-emerald-500">Unit</th>
                    <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Cost Price</th>
                    <th className="w-28 px-2.5 py-2 text-right border-b-2 border-emerald-500">Sale Price</th>
                    <th className="w-20 px-2 py-2 text-right border-b-2 border-emerald-500">Stock Qty</th>
                    <th className="w-36 px-2.5 py-2 text-center border-b-2 border-emerald-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
                        <span>Loading items...</span>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No items found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;+ Add New Item (F2)&quot; to create your first finished good.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`h-9 hover:bg-sky-50/60 transition ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="px-2 py-1 text-center font-normal text-slate-400 text-[11px] tabular-nums">
                          {idx + 1}
                        </td>

                        <td className="px-2.5 py-1 font-mono font-bold text-slate-900 text-xs">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                            {p.sku}
                          </span>
                        </td>

                        <td className="px-2.5 py-1">
                          <p className="font-bold text-slate-900 text-xs truncate max-w-sm">{p.name}</p>
                          {p.barcode && (
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Barcode className="h-3 w-3" />
                              {p.barcode}
                            </span>
                          )}
                        </td>

                        <td className="px-2.5 py-1 text-xs font-semibold text-slate-800">
                          {p.main_category || 'General'}
                        </td>

                        <td className="px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {p.sub_category || 'General'}
                        </td>

                        <td className="px-2 py-1 text-center font-semibold text-slate-700 text-xs">
                          {p.unit || 'Pcs'}
                        </td>

                        <td className="px-2.5 py-1 text-right tabular-nums text-slate-700 text-xs">
                          {formatCurrency(p.cost_price)}
                        </td>

                        <td className="px-2.5 py-1 text-right tabular-nums font-extrabold text-emerald-800 text-xs">
                          {formatCurrency(p.sale_price)}
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

                        <td className="px-2.5 py-1 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleBillInPos(p)}
                              title="Load into active POS Sale screen"
                              className="flex h-6 items-center gap-1 rounded bg-emerald-600 px-2 text-[10.5px] font-bold text-white hover:bg-emerald-500 shadow-2xs active:scale-95 transition"
                            >
                              <Zap className="h-3 w-3 text-amber-300" />
                              <span>Bill in POS</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditItem(p)}
                              title="Edit Item"
                              className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                            >
                              <Edit className="h-3 w-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(p)}
                              title="Delete Item"
                              className="flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-2xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* TAB 2: MAIN CATEGORIES (USER HUD ADD KAR SAKTA HAI)      */}
        {/* --------------------------------------------------------- */}
        {activeTab === 'MAINS' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {/* Create New Main Category Form Card */}
            <form onSubmit={handleSaveMainCategory} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                <Layers className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  + Add New Main Category (Tenant Custom Category)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Main Category Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMainName}
                    onChange={(e) => setNewMainName(e.target.value)}
                    placeholder="e.g. PVC PIPES / SANITARY / TILES"
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Code (Optional)</label>
                  <input
                    type="text"
                    value={newMainCode}
                    onChange={(e) => setNewMainCode(e.target.value)}
                    placeholder="e.g. CAT-1 (Auto)"
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={newMainType}
                    onChange={(e) => setNewMainType(e.target.value)}
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-8.5 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500 shadow-2xs active:scale-95 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{saving ? 'Adding...' : 'Add Category'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of Active Main Categories */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Active Main Categories in Database ({mainCategories.length})
                </span>
                <span className="text-[11px] text-slate-500">Any tenant can customize these categories</span>
              </div>

              <div className="divide-y divide-slate-100">
                {mainCategories.map((m, idx) => {
                  const linkedSubs = categories.filter((c) => c.parent_code === m.code);
                  const linkedItems = products.filter(
                    (p) =>
                      (p.main_category && p.main_category.toLowerCase() === m.name.toLowerCase()) ||
                      p.category.toLowerCase().includes(m.name.toLowerCase())
                  );

                  return (
                    <div key={m.code} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                        <span className="rounded bg-slate-900 text-white px-2 py-0.5 text-xs font-mono font-bold">
                          {m.code}
                        </span>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 uppercase">{m.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Type: {m.category_type}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
                          {linkedSubs.length} Sub-Categories
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                          {linkedItems.length} Items Listed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(m.code, m.name)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* TAB 3: SUB-CATEGORIES (USER HUD ADD KAR SAKTA HAI)        */}
        {/* --------------------------------------------------------- */}
        {activeTab === 'SUBS' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {/* Create New Sub Category Form Card */}
            <form onSubmit={handleSaveSubCategory} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                <FolderOpen className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  + Add New Sub-Category under Main Category
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Main Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newSubParent}
                    onChange={(e) => setNewSubParent(e.target.value)}
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {mainCategories.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-Category Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="e.g. U-PVC PRESSURE PIPES"
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code (Optional)</label>
                  <input
                    type="text"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="e.g. SUB-1 (Auto)"
                    className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-8.5 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500 shadow-2xs active:scale-95 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{saving ? 'Adding...' : 'Add Sub-Category'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of Active Sub-Categories */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Active Sub-Categories in Database ({subCategories.length})
                </span>
                <span className="text-[11px] text-slate-500">Cascading under each tenant Main Category</span>
              </div>

              <div className="divide-y divide-slate-100">
                {subCategories.map((s, idx) => {
                  const parent = mainCategories.find((m) => m.code === s.parent_code);
                  const linkedItems = products.filter(
                    (p) =>
                      (p.sub_category && p.sub_category.toLowerCase() === s.name.toLowerCase()) ||
                      p.category.toLowerCase().includes(s.name.toLowerCase())
                  );

                  return (
                    <div key={s.code} className="flex items-center justify-between p-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
                            <span>{s.name}</span>
                            <span className="font-mono text-[10px] text-slate-500 font-normal">[{s.code}]</span>
                          </p>
                          <p className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
                            Belongs to: <strong>{parent?.name || s.parent_code}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                          {linkedItems.length} Items
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(s.code, s.name)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Delete subcategory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. BOTTOM FOOTER STATUS BAR                               */}
        {/* ========================================================= */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
              {totalItemCount} catalog items across <strong className="text-slate-900">{mainCategories.length}</strong> Main &amp;{' '}
              <strong className="text-slate-900">{subCategories.length}</strong> Sub-Categories
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">F2: New Item</span>
            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-bold text-slate-700">Esc: Close</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. ITEM ADD / EDIT POPUP MODAL (SIMPLE & ELEGANT)         */}
        {/* ========================================================= */}
        {showItemModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-xs font-sans">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-white shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Titlebar */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {editingProduct ? `Edit Item [${editingProduct.sku}]` : 'Add New Inventory Item'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveItemSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs bg-slate-50/50">
                {itemError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-800">
                    {itemError}
                  </div>
                )}

                {/* 1. Category Hierarchy Selectors */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Main Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800">
                          Main Category <span className="text-rose-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineCatTarget('MAIN');
                            setInlineCatName('');
                            setShowInlineCatModal(true);
                          }}
                          className="text-[10.5px] font-bold text-emerald-700 hover:underline"
                        >
                          + New Main
                        </button>
                      </div>
                      <select
                        value={itemMainCat}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemMainCat(val);
                          const matching = categories.filter(
                            (c) => c.parent_code === mainCategories.find((m) => m.name === val)?.code
                          );
                          if (matching.length > 0) setItemSubCat(matching[0].name);
                        }}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        {mainCategories.map((m) => (
                          <option key={m.code} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sub Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800">Sub-Category</label>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineCatTarget('SUB');
                            setInlineCatName('');
                            setShowInlineCatModal(true);
                          }}
                          className="text-[10.5px] font-bold text-emerald-700 hover:underline"
                        >
                          + New Sub
                        </button>
                      </div>
                      <select
                        value={itemSubCat}
                        onChange={(e) => setItemSubCat(e.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        {subCategoriesForItemForm.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                        {subCategoriesForItemForm.length === 0 && (
                          <option value={itemMainCat}>{itemMainCat}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Product Name & SKU */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-bold text-slate-800">
                        Item Code / SKU <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemSku}
                        onChange={(e) => setItemSku(e.target.value)}
                        placeholder="e.g. FG-202011"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-mono font-bold text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-slate-800">Barcode</label>
                      <input
                        type="text"
                        value={itemBarcode}
                        onChange={(e) => setItemBarcode(e.target.value)}
                        placeholder="e.g. 896912345678"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-mono text-slate-700 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 font-bold text-slate-800">
                      Product Name &amp; Dimensions <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={'e.g. 2"X13\' U-PVC PRESSURE PIPE - 2.50 KG'}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 uppercase focus:border-emerald-500 focus:outline-none"
                    />

                    {/* Quick dimension buttons */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 select-none">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase">Quick Add:</span>
                      {QUICK_SIZES.slice(0, 7).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleAppendSpec(sz)}
                          className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300"
                        >
                          {sz}
                        </button>
                      ))}
                      {QUICK_SPECS.slice(0, 3).map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => handleAppendSpec(sp)}
                          className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300"
                        >
                          {sp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-bold text-slate-800">Unit of Measure</label>
                      <select
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-800">Opening Stock Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={itemStockQty === 0 ? '' : itemStockQty}
                        onChange={(e) => setItemStockQty(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Pricing Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-800 uppercase text-xs flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Pricing (Rs.)</span>
                    </span>
                    {calculatedMargin !== 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10.5px] font-extrabold text-emerald-800 border border-emerald-300">
                        Margin: +{calculatedMargin}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block mb-1 font-bold text-slate-700">Cost Price (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={itemCostPrice === 0 ? '' : itemCostPrice}
                        onChange={(e) => setItemCostPrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-700">
                        Retail Sale Price (Rs.) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={itemSalePrice === 0 ? '' : itemSalePrice}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setItemSalePrice(val);
                          if (!itemWholesalePrice) setItemWholesalePrice(Math.round(val * 0.9));
                        }}
                        placeholder="0.00"
                        className="h-8 w-full rounded border border-emerald-500 bg-emerald-50/40 px-2 text-right font-extrabold text-emerald-950 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 font-bold text-slate-700">Wholesale Rate (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={itemWholesalePrice === 0 ? '' : itemWholesalePrice}
                        onChange={(e) => setItemWholesalePrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="h-8.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-8.5 items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition"
                  >
                    <Check className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. INLINE QUICK ADD CATEGORY POPUP                        */}
        {/* ========================================================= */}
        {showInlineCatModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs font-sans">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-white shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold uppercase text-slate-900">
                  + Add New {inlineCatTarget === 'MAIN' ? 'Main Category' : `Sub-Category under ${itemMainCat}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowInlineCatModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInlineCategory} className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">Category Name</label>
                  <input
                    type="text"
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    placeholder="Enter category name..."
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 uppercase font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInlineCatModal(false)}
                    className="h-7.5 px-3 rounded border border-slate-300 bg-slate-50 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-7.5 px-4 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-2xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
