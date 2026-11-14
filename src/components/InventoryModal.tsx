'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
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

// Quick dimension helper chips for PVC pipes & building materials
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

type ActiveTabMode = 'CATALOG_TREE' | 'MAIN_CATEGORIES' | 'SUB_CATEGORIES';

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

  // Active top view tab
  const [activeTab, setActiveTab] = useState<ActiveTabMode>('CATALOG_TREE');

  // Data states
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tree & Filter states for CATALOG_TREE view
  const [selectedMainCode, setSelectedMainCode] = useState<string>('ALL');
  const [selectedSubCode, setSelectedSubCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMains, setExpandedMains] = useState<Record<string, boolean>>({});
  const [branchFilter, setBranchFilter] = useState('ALL');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Item Add / Edit Modal Popup States
  // ==========================================
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formMainCat, setFormMainCat] = useState('FINISH GOODS');
  const [formSubCat, setFormSubCat] = useState('U-PVC PRESSURE PIPES');
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

  // ==========================================
  // Dedicated Main Category Modal States
  // ==========================================
  const [showMainCatModal, setShowMainCatModal] = useState(false);
  const [editingMainCat, setEditingMainCat] = useState<InventoryCategory | null>(null);
  const [mainCatCode, setMainCatCode] = useState('');
  const [mainCatName, setMainCatName] = useState('');
  const [mainCatType, setMainCatType] = useState('Finish Goods');
  const [mainCatError, setMainCatError] = useState<string | null>(null);
  const [savingMainCat, setSavingMainCat] = useState(false);

  // ==========================================
  // Dedicated Sub-Category Modal States
  // ==========================================
  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [editingSubCat, setEditingSubCat] = useState<InventoryCategory | null>(null);
  const [subCatParentCode, setSubCatParentCode] = useState('FG-1');
  const [subCatCode, setSubCatCode] = useState('');
  const [subCatName, setSubCatName] = useState('');
  const [subCatType, setSubCatType] = useState('Finish Goods');
  const [subCatError, setSubCatError] = useState<string | null>(null);
  const [savingSubCat, setSavingSubCat] = useState(false);

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

      // Expand first main category by default
      const defaultExpand: Record<string, boolean> = {};
      cats.filter((c) => !c.parent_code).forEach((m, idx) => {
        defaultExpand[m.code] = idx === 0;
      });
      setExpandedMains(defaultExpand);

      // 2. Fetch products
      const prodRes = await fetch('/api/products?includeInactive=true');
      if (prodRes.ok) {
        const prodData = (await prodRes.json()) as { products: ProductWithStock[] };
        setProducts(prodData.products || []);
      }
    } catch (e) {
      console.error('Error loading inventory data:', e);
      setStatusMessage({ type: 'error', text: 'Error connecting to database to load inventory catalog.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Main Categories & Subcategories Memo
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_code);
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parent_code));
  }, [categories]);

  // Map of subcategories grouped by parent_code
  const subCategoriesByParent = useMemo(() => {
    const map: Record<string, InventoryCategory[]> = {};
    for (const sub of subCategories) {
      if (sub.parent_code) {
        if (!map[sub.parent_code]) map[sub.parent_code] = [];
        map[sub.parent_code].push(sub);
      }
    }
    return map;
  }, [subCategories]);

  // Map of products count per category
  const productCountBySubName = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const sub = (p.sub_category || '').toLowerCase();
      if (sub) {
        counts[sub] = (counts[sub] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  const productCountByMainName = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const main = (p.main_category || p.category || '').toLowerCase();
      if (main) {
        counts[main] = (counts[main] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  // Filtered Products for the table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Main filter
      if (selectedMainCode !== 'ALL') {
        const mainObj = mainCategories.find((m) => m.code === selectedMainCode);
        if (mainObj) {
          const pMain = (p.main_category || '').toLowerCase();
          const pCat = (p.category || '').toLowerCase();
          const target = mainObj.name.toLowerCase();
          if (!pMain.includes(target) && !pCat.includes(target)) {
            return false;
          }
        }
      }

      // Sub filter
      if (selectedSubCode !== 'ALL') {
        const subObj = subCategories.find((s) => s.code === selectedSubCode);
        if (subObj) {
          const pSub = (p.sub_category || '').toLowerCase();
          const pCat = (p.category || '').toLowerCase();
          const target = subObj.name.toLowerCase();
          if (!pSub.includes(target) && !pCat.includes(target)) {
            return false;
          }
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
  }, [products, selectedMainCode, selectedSubCode, searchQuery, mainCategories, subCategories]);

  // Active breadcrumb label
  const activeBreadcrumb = useMemo(() => {
    if (selectedMainCode === 'ALL') {
      return { main: 'All Categories', sub: 'All Sub-Categories' };
    }
    const mainObj = mainCategories.find((m) => m.code === selectedMainCode);
    const mainName = mainObj?.name || selectedMainCode;
    if (selectedSubCode === 'ALL') {
      return { main: mainName, sub: 'All Sub-Categories' };
    }
    const subObj = subCategories.find((s) => s.code === selectedSubCode);
    return { main: mainName, sub: subObj?.name || selectedSubCode };
  }, [selectedMainCode, selectedSubCode, mainCategories, subCategories]);

  // KPI Calculations
  const totalItemCount = products.length;
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_qty || 0) * (p.sale_price || 0), 0);
  }, [products]);

  // Live Profit Margin Calculation
  const calculatedMargin = useMemo(() => {
    if (formCostPrice <= 0 || formSalePrice <= 0) return 0;
    return (((formSalePrice - formCostPrice) / formCostPrice) * 100).toFixed(1);
  }, [formCostPrice, formSalePrice]);

  const netGainAmount = useMemo(() => {
    if (formSalePrice <= 0 || formCostPrice <= 0) return 0;
    return (formSalePrice - formCostPrice).toFixed(2);
  }, [formCostPrice, formSalePrice]);

  // Toggle tree accordion
  const toggleMainExpand = (code: string) => {
    setExpandedMains((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Select a category in the tree
  const handleSelectTreeCategory = (mainCode: string, subCode: string = 'ALL') => {
    setSelectedMainCode(mainCode);
    setSelectedSubCode(subCode);
    if (mainCode !== 'ALL') {
      setExpandedMains((prev) => ({ ...prev, [mainCode]: true }));
    }
  };

  // ==========================================
  // HANDLERS: ADD / EDIT ITEM
  // ==========================================
  const handleOpenAddItem = (prefilledMain?: string, prefilledSub?: string) => {
    const nextRandom = Math.floor(100000 + Math.random() * 900000);
    const defaultMain = prefilledMain || mainCategories[0]?.name || 'FINISH GOODS';
    const mainObj = mainCategories.find((m) => m.name.toLowerCase() === defaultMain.toLowerCase());
    const firstSub =
      prefilledSub ||
      (mainObj ? subCategoriesByParent[mainObj.code]?.[0]?.name : 'U-PVC PRESSURE PIPES') ||
      'General';

    setEditingProduct(null);
    setFormSku(`FG-${nextRandom}`);
    setFormBarcode(`8969${nextRandom}123`);
    setFormName('');
    setFormMainCat(defaultMain);
    setFormSubCat(firstSub);
    setFormUnit('Pcs');
    setFormBrand('SEASTONE');
    setFormRackNo('Rack A-01');
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormWholesalePrice(0);
    setFormTaxRate(18);
    setFormHsCode('3917.2390');
    setFormStockQty(0);
    setFormError(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (prod: ProductWithStock) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode || '');
    setFormName(prod.name);
    setFormMainCat(prod.main_category || mainCategories[0]?.name || 'FINISH GOODS');
    setFormSubCat(prod.sub_category || 'General');
    setFormUnit(prod.unit || 'Pcs');
    setFormBrand(prod.brand || 'SEASTONE');
    setFormRackNo(prod.rack_no || 'Rack A-01');
    setFormCostPrice(prod.cost_price || 0);
    setFormSalePrice(prod.sale_price || 0);
    setFormWholesalePrice(prod.wholesale_price || Math.round(prod.sale_price * 0.9));
    setFormTaxRate(prod.tax_rate ?? 18);
    setFormHsCode(prod.hs_code || '3917.2390');
    setFormStockQty(prod.stock_qty || 0);
    setFormError(null);
    setShowItemModal(true);
  };

  const handleAppendSpec = (chip: string) => {
    setFormName((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      return `${prev} ${chip}`.trim();
    });
  };

  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formSku.trim()) {
      setFormError('Item Code / SKU is required.');
      return;
    }
    if (!formName.trim()) {
      setFormError('Product Name / Description is required.');
      return;
    }
    if (formSalePrice <= 0) {
      setFormError('Retail Sale Price must be greater than 0.');
      return;
    }

    setSavingItem(true);
    try {
      const fullCategory = `${formMainCat} > ${formSubCat || formMainCat}`;
      const payload = {
        id: editingProduct?.id,
        sku: formSku.trim().toUpperCase(),
        barcode: formBarcode.trim(),
        name: formName.trim(),
        description: formName.trim(),
        category: fullCategory,
        main_category: formMainCat,
        sub_category: formSubCat || formMainCat,
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
        setShowItemModal(false);
        triggerInventoryRefresh();
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Finished Good [${payload.sku}] saved successfully!`,
        });
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

  const handleSaveAndBill = async (e: React.FormEvent) => {
    await handleSaveItemSubmit(e);
    const exact = products.find((p) => p.sku === formSku.trim().toUpperCase());
    if (exact) {
      setSelectedProductIdForPos(exact.id);
      closeInventoryModal();
    }
  };

  const handleDeleteProduct = async (prod: ProductWithStock) => {
    if (!confirm(`Are you sure you want to delete [${prod.sku}] - ${prod.name}?`)) return;

    try {
      const res = await fetch(`/api/products?id=${prod.id}`, { method: 'DELETE' });
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

  const handleBillInPos = (prod: ProductWithStock) => {
    setSelectedProductIdForPos(prod.id);
    closeInventoryModal();
  };

  // ==========================================
  // HANDLERS: MAIN CATEGORIES (TIER 1)
  // ==========================================
  const handleOpenAddMainCat = () => {
    setEditingMainCat(null);
    setMainCatCode(`CAT-${mainCategories.length + 1}`);
    setMainCatName('');
    setMainCatType('Finish Goods');
    setMainCatError(null);
    setShowMainCatModal(true);
  };

  const handleOpenEditMainCat = (cat: InventoryCategory) => {
    setEditingMainCat(cat);
    setMainCatCode(cat.code);
    setMainCatName(cat.name);
    setMainCatType(cat.category_type || 'Finish Goods');
    setMainCatError(null);
    setShowMainCatModal(true);
  };

  const handleSaveMainCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainCatName.trim()) {
      setMainCatError('Category Name is required.');
      return;
    }
    if (!mainCatCode.trim()) {
      setMainCatError('Category Code is required.');
      return;
    }

    setSavingMainCat(true);
    setMainCatError(null);

    try {
      const payload = {
        id: editingMainCat?.id,
        code: mainCatCode.trim().toUpperCase(),
        name: mainCatName.trim().toUpperCase(),
        category_type: mainCatType,
        parent_code: null,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowMainCatModal(false);
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Main Category [${payload.name}] saved successfully!`,
        });
      } else {
        const err = await res.json();
        setMainCatError(err.error || 'Failed to save Main Category.');
      }
    } catch {
      setMainCatError('Network error connecting to database.');
    } finally {
      setSavingMainCat(false);
    }
  };

  // ==========================================
  // HANDLERS: SUB CATEGORIES (TIER 2)
  // ==========================================
  const handleOpenAddSubCat = (parentCode?: string) => {
    const parent = parentCode || mainCategories[0]?.code || 'FG-1';
    setEditingSubCat(null);
    setSubCatParentCode(parent);
    setSubCatCode(`${parent}-${100 + subCategories.length + 1}`);
    setSubCatName('');
    setSubCatType('Finish Goods');
    setSubCatError(null);
    setShowSubCatModal(true);
  };

  const handleOpenEditSubCat = (sub: InventoryCategory) => {
    setEditingSubCat(sub);
    setSubCatParentCode(sub.parent_code || mainCategories[0]?.code || 'FG-1');
    setSubCatCode(sub.code);
    setSubCatName(sub.name);
    setSubCatType(sub.category_type || 'Finish Goods');
    setSubCatError(null);
    setShowSubCatModal(true);
  };

  const handleSaveSubCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatName.trim()) {
      setSubCatError('Sub-Category Name is required.');
      return;
    }
    if (!subCatCode.trim()) {
      setSubCatError('Sub-Category Code is required.');
      return;
    }

    setSavingSubCat(true);
    setSubCatError(null);

    try {
      const payload = {
        id: editingSubCat?.id,
        code: subCatCode.trim().toUpperCase(),
        name: subCatName.trim().toUpperCase(),
        category_type: subCatType,
        parent_code: subCatParentCode,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowSubCatModal(false);
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Sub-Category [${payload.name}] saved successfully!`,
        });
      } else {
        const err = await res.json();
        setSubCatError(err.error || 'Failed to save Sub-Category.');
      }
    } catch {
      setSubCatError('Network error connecting to database.');
    } finally {
      setSavingSubCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: InventoryCategory) => {
    const isMain = !cat.parent_code;
    const confirmed = confirm(
      `Are you sure you want to delete ${isMain ? 'Main Category' : 'Sub-Category'} [${cat.name}]?\n` +
        (isMain
          ? 'Warning: Any sub-categories under this category will need re-assignment.'
          : 'Warning: Products assigned to this sub-category will lose their sub-category tag.')
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/categories?code=${encodeURIComponent(cat.code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadData();
        setStatusMessage({
          type: 'success',
          text: `Category [${cat.name}] deleted successfully.`,
        });
      } else {
        alert('Could not delete category.');
      }
    } catch {
      alert('Network error deleting category.');
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenAddItem();
      }
      if (e.key === 'Escape') {
        if (showItemModal) setShowItemModal(false);
        else if (showMainCatModal) setShowMainCatModal(false);
        else if (showSubCatModal) setShowSubCatModal(false);
        else closeInventoryModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showItemModal, showMainCatModal, showSubCatModal, closeInventoryModal]);

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
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide uppercase">
                Chart Of Inventory &bull; Multi-Tenant Hierarchy Master
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-300 font-normal">
                (Tier 1: Main Category ➔ Tier 2: Sub-Category ➔ Tier 3: Item Master)
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Catalog Finished Goods</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Main Categories (Tier 1)</p>
              <p className="text-sm font-extrabold text-slate-900">{mainCategories.length} Registered</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <FolderTree className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sub-Categories (Tier 2)</p>
              <p className="text-sm font-extrabold text-slate-900">{subCategories.length} Configured</p>
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
        {/* 3. 3-TIER NAVIGATION TABS & PRIMARY ACTION BAR           */}
        {/* ========================================================= */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {/* Left: 3 Main View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('CATALOG_TREE')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'CATALOG_TREE'
                  ? 'bg-gradient-to-r from-[#091529] to-[#132952] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Boxes className="h-3.5 w-3.5 text-emerald-400" />
              <span>1. Inventory Catalog (Tree &amp; Items)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MAIN_CATEGORIES')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'MAIN_CATEGORIES'
                  ? 'bg-gradient-to-r from-[#091529] to-[#132952] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span>2. Main Categories ({mainCategories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUB_CATEGORIES')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === 'SUB_CATEGORIES'
                  ? 'bg-gradient-to-r from-[#091529] to-[#132952] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900'
              }`}
            >
              <FolderTree className="h-3.5 w-3.5 text-teal-400" />
              <span>3. Sub-Categories ({subCategories.length})</span>
            </button>
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddItem()}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>+ Register New Item (F2)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddMainCat()}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-sky-600" />
              <span>+ Main Category</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddSubCat()}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-teal-600" />
              <span>+ Sub-Category</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Print Catalog"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              title="Export Excel (CSV)"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Excel</span>
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
        </div>

        {/* ========================================================= */}
        {/* 4. MAIN CONTENT AREA (BASED ON ACTIVE TAB)                */}
        {/* ========================================================= */}

        {/* TAB 1: SPLIT MASTER-DETAIL VIEW (TREE ON LEFT, TABLE ON RIGHT) */}
        {activeTab === 'CATALOG_TREE' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 4A. LEFT SIDEBAR: CATEGORY HIERARCHY TREE */}
            <div className="w-72 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0">
              {/* Sidebar Header */}
              <div className="p-2.5 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Hierarchy Tree
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddMainCat()}
                  title="Add New Main Category"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-100"
                >
                  <Plus className="h-3 w-3" />
                  <span>Main</span>
                </button>
              </div>

              {/* Tree Container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* "ALL PRODUCTS" Button */}
                <button
                  type="button"
                  onClick={() => handleSelectTreeCategory('ALL', 'ALL')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                    selectedMainCode === 'ALL'
                      ? 'bg-gradient-to-r from-[#091529] to-[#132952] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-emerald-400" />
                    <span>All Inventory Items</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      selectedMainCode === 'ALL'
                        ? 'bg-emerald-500 text-slate-900 font-extrabold'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {totalItemCount}
                  </span>
                </button>

                <div className="my-1.5 border-t border-slate-200" />

                {/* Main Categories Accordion Tree */}
                {mainCategories.map((main) => {
                  const isMainSelected = selectedMainCode === main.code && selectedSubCode === 'ALL';
                  const isExpanded = expandedMains[main.code] ?? false;
                  const subs = subCategoriesByParent[main.code] || [];
                  const mainProductCount = productCountByMainName[main.name.toLowerCase()] || 0;

                  return (
                    <div key={main.code} className="space-y-0.5">
                      {/* Main Category Header Row */}
                      <div
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          isMainSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : selectedMainCode === main.code
                            ? 'bg-slate-200/80 text-slate-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-200/60 font-semibold'
                        }`}
                        onClick={() => handleSelectTreeCategory(main.code, 'ALL')}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMainExpand(main.code);
                            }}
                            className="p-0.5 hover:bg-black/10 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="truncate">{main.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isMainSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {subs.length} subs
                          </span>
                        </div>
                      </div>

                      {/* Sub-Categories (Indented List when Expanded) */}
                      {isExpanded && (
                        <div className="ml-4 pl-2 border-l-2 border-emerald-300 space-y-0.5 py-0.5">
                          {subs.map((sub) => {
                            const isSubSelected =
                              selectedMainCode === main.code && selectedSubCode === sub.code;
                            const subProductCount =
                              productCountBySubName[sub.name.toLowerCase()] || 0;

                            return (
                              <div
                                key={sub.code}
                                onClick={() => handleSelectTreeCategory(main.code, sub.code)}
                                className={`flex items-center justify-between px-2 py-1 rounded text-[11px] transition cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
                                }`}
                              >
                                <span className="truncate">↳ {sub.name}</span>
                                <span
                                  className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                                    isSubSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {subProductCount}
                                </span>
                              </div>
                            );
                          })}

                          {/* Quick "+ Add Sub under this Main" Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddSubCat(main.code);
                            }}
                            className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-0.5"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add sub under {main.name.split(' ')[0]}...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Category Actions */}
              <div className="p-2 border-t border-slate-200 bg-white grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenAddMainCat()}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3 text-sky-600" />
                  <span>+ New Main</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddSubCat(selectedMainCode !== 'ALL' ? selectedMainCode : undefined)}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded border border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3 text-teal-600" />
                  <span>+ New Sub</span>
                </button>
              </div>
            </div>

            {/* 4B. RIGHT MAIN AREA: FINISHED GOODS DATA TABLE */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Table Top Controls & Breadcrumbs */}
              <div className="p-2.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
                {/* Active Breadcrumb Path */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">Viewing:</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                    <Folder className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-emerald-700">{activeBreadcrumb.main}</span>
                    <span className="text-slate-400">❯</span>
                    <span className="text-teal-700">{activeBreadcrumb.sub}</span>
                    <span className="ml-1 text-[11px] font-normal text-slate-500">
                      ({filteredProducts.length} items listed)
                    </span>
                  </div>
                </div>

                {/* Omni Search & Branch Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search SKU, name, dimensions..."
                      className="h-7.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="h-7.5 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 min-h-0 overflow-auto bg-slate-50/40">
                <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 shadow-2xs">
                    <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                      <th className="w-10 px-2 py-2 text-center border-b-2 border-emerald-500">#</th>
                      <th className="w-36 px-2.5 py-2 border-b-2 border-emerald-500">Classification</th>
                      <th className="w-32 px-2.5 py-2 border-b-2 border-emerald-500">SKU / Code</th>
                      <th className="min-w-[200px] px-2.5 py-2 border-b-2 border-emerald-500">Product Name &amp; Specs</th>
                      <th className="w-16 px-2 py-2 text-center border-b-2 border-emerald-500">UOM</th>
                      <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Cost (Rs.)</th>
                      <th className="w-24 px-2.5 py-2 text-right border-b-2 border-emerald-500">Wholesale</th>
                      <th className="w-28 px-2.5 py-2 text-right border-b-2 border-emerald-500">Retail Price</th>
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
                          <span>Loading inventory catalog...</span>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-500">
                          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700">No items in this category or search filter</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click &quot;+ Register New Item (F2)&quot; to add a new product under this classification.
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
                            className="hover:bg-emerald-50/40 transition group cursor-pointer"
                            onDoubleClick={() => handleOpenEditItem(p)}
                          >
                            <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-2.5 py-2">
                              <div className="font-bold text-slate-800 text-[11px] truncate">
                                {p.main_category || 'FINISH GOODS'}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-semibold truncate">
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
                                  onClick={() => handleBillInPos(p)}
                                  title="Bill directly into active POS Sale invoice"
                                  className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 active:scale-95 transition"
                                >
                                  <Zap className="h-3 w-3" />
                                  <span>Bill</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(p)}
                                  title="Edit finished good specifications"
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
          </div>
        )}

        {/* TAB 2: MAIN CATEGORIES MASTER (TIER 1 DIRECT MANAGEMENT) */}
        {activeTab === 'MAIN_CATEGORIES' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tier 1 &bull; Main Categories Directory
                </h3>
                <p className="text-[11px] text-slate-500">
                  Primary classification for your inventory (e.g. Finish Goods, Raw Materials, Fittings, Pipes)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddMainCat()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>+ Register New Main Category</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/40">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                      <th className="w-12 px-3 py-2.5 text-center">#</th>
                      <th className="w-32 px-3 py-2.5">Category Code</th>
                      <th className="px-3 py-2.5">Main Category Name</th>
                      <th className="w-40 px-3 py-2.5">Category Type</th>
                      <th className="w-32 px-3 py-2.5 text-center">Sub-Categories</th>
                      <th className="w-32 px-3 py-2.5 text-center">Items Count</th>
                      <th className="w-48 px-3 py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mainCategories.map((main, idx) => {
                      const subs = subCategoriesByParent[main.code] || [];
                      const prodCount = productCountByMainName[main.name.toLowerCase()] || 0;

                      return (
                        <tr key={main.code} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{main.code}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                            <Folder className="h-4 w-4 text-amber-500" />
                            <span>{main.name}</span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-600">
                            {main.category_type || 'Finish Goods'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold border border-sky-200">
                              {subs.length} Subs
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              {prodCount} Items
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddSubCat(main.code)}
                                className="flex items-center gap-1 rounded bg-teal-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-teal-700"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Sub</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditMainCat(main)}
                                className="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100"
                                title="Edit Main Category"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(main)}
                                className="rounded border border-slate-300 p-1 text-rose-600 hover:bg-rose-50"
                                title="Delete Main Category"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUB-CATEGORIES MASTER (TIER 2 DIRECT MANAGEMENT) */}
        {activeTab === 'SUB_CATEGORIES' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tier 2 &bull; Sub-Categories Directory
                </h3>
                <p className="text-[11px] text-slate-500">
                  Secondary classification grouping specific product families under each Main Category
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddSubCat()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>+ Register New Sub-Category</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/40">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
                      <th className="w-12 px-3 py-2.5 text-center">#</th>
                      <th className="w-32 px-3 py-2.5">Sub Code</th>
                      <th className="px-3 py-2.5">Sub-Category Name</th>
                      <th className="w-48 px-3 py-2.5">Parent Main Category</th>
                      <th className="w-36 px-3 py-2.5">Category Type</th>
                      <th className="w-32 px-3 py-2.5 text-center">Items Count</th>
                      <th className="w-40 px-3 py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subCategories.map((sub, idx) => {
                      const parent = mainCategories.find((m) => m.code === sub.parent_code);
                      const prodCount = productCountBySubName[sub.name.toLowerCase()] || 0;

                      return (
                        <tr key={sub.code} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{sub.code}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">↳</span>
                            <span>{sub.name}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold border border-slate-200">
                              {parent ? `${parent.name} (${parent.code})` : sub.parent_code}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-600">
                            {sub.category_type || 'Finish Goods'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              {prodCount} Items
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddItem(parent?.name, sub.name)}
                                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Item</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSubCat(sub)}
                                className="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100"
                                title="Edit Sub-Category"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(sub)}
                                className="rounded border border-slate-300 p-1 text-rose-600 hover:bg-rose-50"
                                title="Delete Sub-Category"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. BOTTOM STATUS BAR                                      */}
        {/* ========================================================= */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              Catalog Total: <strong className="text-slate-900">{totalItemCount}</strong> Products across{' '}
              <strong className="text-slate-900">{mainCategories.length}</strong> Main Categories &amp;{' '}
              <strong className="text-slate-900">{subCategories.length}</strong> Sub-Categories
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

        {/* ========================================================= */}
        {/* 6. MODAL: REGISTER / EDIT FINISHED GOODS ITEM             */}
        {/* ========================================================= */}
        {showItemModal && (
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
                        ? `Edit Finished Good [${editingProduct.sku}]`
                        : 'New Finished Goods / Item Registration'}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Enterprise Finished Goods Inventory &amp; FBR HS Code Mapping
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Hierarchy Live Mapping Banner */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-slate-400 font-sans">Active Mapping:</span>
                  <span className="text-emerald-400 font-bold">{formMainCat}</span>
                  <span className="text-slate-500">❯</span>
                  <span className="text-teal-400 font-bold">{formSubCat}</span>
                  <span className="text-slate-500">❯</span>
                  <span className="text-sky-300 font-bold">{formSku || 'NEW_ITEM'}</span>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                  Multi-Tenant Ready
                </span>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveItemSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/40">
                  {/* Form Error Banner */}
                  {formError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Section 1: Classification & 2-Tier Hierarchy Selection */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          1. Classification &amp; 3-Tier Hierarchy Mapping
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Self-Service Hierarchy</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Main Category with Quick Add */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800">
                            Main Category <span className="text-rose-600">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenAddMainCat()}
                            className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>New Main</span>
                          </button>
                        </div>
                        <select
                          value={formMainCat}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormMainCat(val);
                            const mainObj = mainCategories.find(
                              (m) => m.name.toLowerCase() === val.toLowerCase()
                            );
                            if (mainObj) {
                              const subs = subCategoriesByParent[mainObj.code];
                              if (subs && subs.length > 0) {
                                setFormSubCat(subs[0].name);
                              }
                            }
                          }}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        >
                          {mainCategories.map((m) => (
                            <option key={m.code} value={m.name}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-Category with Quick Add */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800">
                            Sub-Category <span className="text-rose-600">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const mainObj = mainCategories.find(
                                (m) => m.name.toLowerCase() === formMainCat.toLowerCase()
                              );
                              handleOpenAddSubCat(mainObj?.code);
                            }}
                            className="text-[10.5px] font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>New Sub</span>
                          </button>
                        </div>
                        <select
                          value={formSubCat}
                          onChange={(e) => setFormSubCat(e.target.value)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        >
                          {(() => {
                            const mainObj = mainCategories.find(
                              (m) => m.name.toLowerCase() === formMainCat.toLowerCase()
                            );
                            const subs = mainObj ? subCategoriesByParent[mainObj.code] || [] : [];
                            if (subs.length === 0) {
                              return <option value="General">General (Default)</option>;
                            }
                            return subs.map((s) => (
                              <option key={s.code} value={s.name}>
                                {s.name} ({s.code})
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Product Identification & Specifications */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Package className="h-4 w-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        2. Item Identification &amp; Product Specifications
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-800">
                          Item Code / SKU <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formSku}
                          onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                          placeholder="e.g. FG-202011"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Barcode (EAN-13 / UPC)
                        </label>
                        <div className="relative">
                          <Barcode className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={formBarcode}
                            onChange={(e) => setFormBarcode(e.target.value)}
                            placeholder="8969XXXXXXXXX"
                            className="h-8.5 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Name & Dimensions */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-800">
                        Product Name &amp; Dimensions <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. 2&quot;X13' U-PVC PRESSURE PIPE - 2.50 KG"
                        className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>

                    {/* 1-Click Pipe Dimension Quick Add Chips */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10.5px] font-bold text-slate-600">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>Quick-Add Dimensions &amp; Specifications:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {QUICK_SIZES.concat(QUICK_SPECS).map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleAppendSpec(chip)}
                            className="rounded border border-slate-300 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 px-2 py-0.5 text-[10.5px] font-mono font-semibold text-slate-700 transition cursor-pointer"
                          >
                            +{chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Unit of Measure (UOM)
                        </label>
                        <select
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Brand</label>
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

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Warehouse Rack No.
                        </label>
                        <input
                          type="text"
                          value={formRackNo}
                          onChange={(e) => setFormRackNo(e.target.value)}
                          placeholder="e.g. Rack A-01"
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Commercial Pricing & Margins */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          3. Commercial Pricing &amp; Profit Margins (Rs.)
                        </span>
                      </div>
                      {Number(calculatedMargin) > 0 && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono">
                          Profit Margin: +{calculatedMargin}% (Rs. {netGainAmount}/pc)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Cost / Purchase Price (Rs.)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formCostPrice}
                          onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Wholesale Price (Rs.)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formWholesalePrice}
                          onChange={(e) => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-900">
                          Retail Sale Price (Rs.) <span className="text-rose-600">*</span>
                        </label>
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
                          className="h-8.5 w-full rounded-lg border-2 border-emerald-500 bg-emerald-50/20 px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: FBR Compliance & Opening Stock */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        4. FBR Customs HS Code &amp; Stock Balance
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Opening Stock Qty
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formStockQty}
                          onChange={(e) => setFormStockQty(parseFloat(e.target.value) || 0)}
                          className="h-8.5 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Footer Action Buttons */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel (Esc)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAndBill}
                      disabled={savingItem}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Zap className="h-4 w-4 text-emerald-600" />
                      <span>Save &amp; Bill in POS</span>
                    </button>

                    <button
                      type="submit"
                      disabled={savingItem}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {savingItem ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span>{editingProduct ? 'Update Finished Good' : 'Save Finished Good (Ctrl+S)'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. MODAL: REGISTER / EDIT MAIN CATEGORY (TIER 1)          */}
        {/* ========================================================= */}
        {showMainCatModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs font-sans animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {editingMainCat ? 'Edit Main Category' : 'Register New Main Category (Tier 1)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMainCatModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMainCat} className="p-4 space-y-3">
                {mainCatError && (
                  <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-800">
                    {mainCatError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Main Category Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mainCatCode}
                    onChange={(e) => setMainCatCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FG-1 or PVC-1"
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Main Category Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mainCatName}
                    onChange={(e) => setMainCatName(e.target.value.toUpperCase())}
                    placeholder="e.g. FINISH GOODS / RAW MATERIAL"
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Type
                  </label>
                  <select
                    value={mainCatType}
                    onChange={(e) => setMainCatType(e.target.value)}
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowMainCatModal(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMainCat}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    {savingMainCat ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    <span>Save Main Category</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. MODAL: REGISTER / EDIT SUB-CATEGORY (TIER 2)           */}
        {/* ========================================================= */}
        {showSubCatModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs font-sans animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-4 text-white">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {editingSubCat ? 'Edit Sub-Category' : 'Register New Sub-Category (Tier 2)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubCatModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSubCat} className="p-4 space-y-3">
                {subCatError && (
                  <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-800">
                    {subCatError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Parent Main Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={subCatParentCode}
                    onChange={(e) => {
                      const parent = e.target.value;
                      setSubCatParentCode(parent);
                      setSubCatCode(`${parent}-${100 + subCategories.length + 1}`);
                    }}
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {mainCategories.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sub-Category Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subCatCode}
                    onChange={(e) => setSubCatCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FG-101"
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sub-Category Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subCatName}
                    onChange={(e) => setSubCatName(e.target.value.toUpperCase())}
                    placeholder="e.g. U-PVC PRESSURE PIPES"
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Type
                  </label>
                  <select
                    value={subCatType}
                    onChange={(e) => setSubCatType(e.target.value)}
                    className="h-8.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSubCatModal(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSubCat}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    {savingSubCat ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    <span>Save Sub-Category</span>
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
