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
  FileText,
  Filter,
  Folder,
  FolderOpen,
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

export function InventoryModal() {
  const {
    branches,
    closeInventoryModal,
    triggerInventoryRefresh,
    setSelectedProductIdForPos,
    isPosModalOpen,
  } = usePosContext();

  // Window states
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active selections
  const [selectedMainCode, setSelectedMainCode] = useState<string>('FG-1');
  const [selectedSubCode, setSelectedSubCode] = useState<string>('FG-101');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Filter & Search states
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [globalFindOpen, setGlobalFindOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [treeChartOpen, setTreeChartOpen] = useState(false);
  const [priceListModalOpen, setPriceListModalOpen] = useState(false);

  // Section 1: Main Category Form States
  const [mainFormId, setMainFormId] = useState<number | string | null>(null);
  const [mainFormCode, setMainFormCode] = useState('FG-1');
  const [mainFormName, setMainFormName] = useState('FINISH GOODS');
  const [mainFormType, setMainFormType] = useState('Finish Goods');

  // Section 2: Sub Category Form States
  const [subFormId, setSubFormId] = useState<number | string | null>(null);
  const [subFormCode, setSubFormCode] = useState('FG-101');
  const [subFormName, setSubFormName] = useState('U-PVC PRESSURE PIPES');

  // Section 3: Item Master Form States
  const [itemFormId, setItemFormId] = useState<number | null>(null);
  const [itemFormCode, setItemFormCode] = useState('');
  const [itemFormBarcode, setItemFormBarcode] = useState('');
  const [itemFormHsCode, setItemFormHsCode] = useState('3917.2390');
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormDescription, setItemFormDescription] = useState('');
  const [itemFormBrand, setItemFormBrand] = useState('SEASTONE');
  const [itemFormRackNo, setItemFormRackNo] = useState('Rack A-01');
  const [itemFormPurchasePrice, setItemFormPurchasePrice] = useState<number>(0);
  const [itemFormSellingPrice, setItemFormSellingPrice] = useState<number>(0);
  const [itemFormWholesalePrice, setItemFormWholesalePrice] = useState<number>(0);
  const [itemFormUnit, setItemFormUnit] = useState('Pcs');
  const [itemFormQtyPerPiece, setItemFormQtyPerPiece] = useState<number>(1);
  const [itemFormTaxRate, setItemFormTaxRate] = useState<number>(18);
  const [itemFormTaxType, setItemFormTaxType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [itemFormValuationMethod, setItemFormValuationMethod] = useState<'WEIGHTED_AVG' | 'MANUAL'>('WEIGHTED_AVG');
  const [itemFormValuationCost, setItemFormValuationCost] = useState<number>(0);
  const [itemFormOrderQty, setItemFormOrderQty] = useState<number>(50);
  const [itemFormInactive, setItemFormInactive] = useState<boolean>(false);
  const [itemFormStockQty, setItemFormStockQty] = useState<number>(0);

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
        // Fallback if local Next route
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

      // 2. Fetch products
      const prodRes = await fetch('/api/products?includeInactive=true');
      if (prodRes.ok) {
        const prodData = (await prodRes.json()) as { products: ProductWithStock[] };
        const prods = prodData.products || [];
        setProducts(prods);

        // Auto select first product if available
        if (prods.length > 0 && !selectedProductId) {
          const first = prods[0];
          setSelectedProductId(first.id);
          populateItemForm(first);
        }
      }
    } catch (e) {
      console.error('Error loading inventory data:', e);
      setStatusMessage({ type: 'error', text: 'Error loading inventory catalog.' });
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived category lists
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parent_code);
  }, [categories]);

  const activeMainCategory = useMemo(() => {
    return mainCategories.find((c) => c.code === selectedMainCode) || mainCategories[0];
  }, [mainCategories, selectedMainCode]);

  const subCategoriesForActiveMain = useMemo(() => {
    if (!activeMainCategory) return [];
    return categories.filter((c) => c.parent_code === activeMainCategory.code);
  }, [categories, activeMainCategory]);

  const activeSubCategory = useMemo(() => {
    const found = subCategoriesForActiveMain.find((s) => s.code === selectedSubCode);
    return found || subCategoriesForActiveMain[0];
  }, [subCategoriesForActiveMain, selectedSubCode]);

  // Filtered items in Section 3
  const itemsInActiveSub = useMemo(() => {
    if (!activeSubCategory && !activeMainCategory) return products;
    const subName = activeSubCategory?.name.toLowerCase() || '';
    const mainName = activeMainCategory?.name.toLowerCase() || '';

    return products.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pMain = (p.main_category || '').toLowerCase();
      const pSub = (p.sub_category || '').toLowerCase();

      // Check match with subcategory
      const matchSub =
        (subName && pSub.includes(subName)) ||
        (subName && pCat.includes(subName)) ||
        (mainName && pMain.includes(mainName) && !pSub);

      if (!matchSub && subCategoriesForActiveMain.length > 0) {
        // Fallback: match by main category
        if (mainName && (pMain.includes(mainName) || pCat.includes(mainName))) {
          // include
        } else {
          return false;
        }
      }

      if (!itemSearchQuery.trim()) return true;
      const q = itemSearchQuery.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q)
      );
    });
  }, [products, activeSubCategory, activeMainCategory, subCategoriesForActiveMain, itemSearchQuery]);

  // Synchronize category selection
  const handleSelectMainCategory = (cat: InventoryCategory) => {
    setSelectedMainCode(cat.code);
    setMainFormId(cat.id);
    setMainFormCode(cat.code);
    setMainFormName(cat.name);
    setMainFormType(cat.category_type || 'Finish Goods');

    // Auto select first subcategory of this main
    const subs = categories.filter((c) => c.parent_code === cat.code);
    if (subs.length > 0) {
      setSelectedSubCode(subs[0].code);
      setSubFormId(subs[0].id);
      setSubFormCode(subs[0].code);
      setSubFormName(subs[0].name);
    } else {
      // Create a default subcategory placeholder
      const nextSub = `${cat.code}-101`;
      setSelectedSubCode(nextSub);
      setSubFormId(null);
      setSubFormCode(nextSub);
      setSubFormName(cat.name);
    }
  };

  const handleSelectSubCategory = (sub: InventoryCategory) => {
    setSelectedSubCode(sub.code);
    setSubFormId(sub.id);
    setSubFormCode(sub.code);
    setSubFormName(sub.name);
  };

  const populateItemForm = (prod: ProductWithStock) => {
    setItemFormId(prod.id);
    setItemFormCode(prod.sku);
    setItemFormBarcode(prod.barcode || '');
    setItemFormHsCode(prod.hs_code || '3917.2390');
    setItemFormName(prod.name);
    setItemFormDescription(prod.description || prod.name);
    setItemFormBrand(prod.brand || 'SEASTONE');
    setItemFormRackNo(prod.rack_no || 'Rack A-01');
    setItemFormPurchasePrice(prod.cost_price || 0);
    setItemFormSellingPrice(prod.sale_price || 0);
    setItemFormWholesalePrice(prod.wholesale_price || Math.round(prod.sale_price * 0.9));
    setItemFormUnit(prod.unit || 'Pcs');
    setItemFormQtyPerPiece(prod.qty_per_piece || 1);
    setItemFormTaxRate(prod.tax_rate ?? 18);
    setItemFormTaxType(prod.tax_type || 'PERCENT');
    setItemFormValuationMethod(prod.valuation_method || 'WEIGHTED_AVG');
    setItemFormValuationCost(prod.valuation_cost || prod.cost_price || 0);
    setItemFormOrderQty(prod.order_quantity || 50);
    setItemFormInactive(prod.is_active === 0);
    setItemFormStockQty(prod.stock_qty || 0);
  };

  const handleSelectItem = (prod: ProductWithStock) => {
    setSelectedProductId(prod.id);
    populateItemForm(prod);
  };

  // 1. ADD / RESET ACTIONS FOR SECTION 1 (MAIN CATEGORY)
  const handleAddNewMainCategory = () => {
    const nextNum = mainCategories.length + 1;
    setMainFormId(null);
    setMainFormCode(`CAT-${nextNum}`);
    setMainFormName('');
    setMainFormType('Finish Goods');
    setStatusMessage({ type: 'success', text: 'Enter new Main Category details and click Save.' });
  };

  const handleSaveMainCategory = async () => {
    if (!mainFormCode.trim() || !mainFormName.trim()) {
      setStatusMessage({ type: 'error', text: 'Category Code and Name are required.' });
      return;
    }
    setSavingCategory(true);
    setStatusMessage(null);
    try {
      const payload = {
        id: mainFormId || undefined,
        code: mainFormCode.trim().toUpperCase(),
        name: mainFormName.trim(),
        category_type: mainFormType,
        parent_code: null,
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Main Category [${payload.code}] saved successfully!` });
        await loadData();
        setSelectedMainCode(payload.code);
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to save category.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving category.' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteMainCategory = async () => {
    if (!selectedMainCode) return;
    if (!confirm(`Are you sure you want to delete Main Category [${selectedMainCode}]?`)) return;

    try {
      const res = await fetch(`/api/categories?code=${encodeURIComponent(selectedMainCode)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Main Category [${selectedMainCode}] removed.` });
        await loadData();
      } else {
        setStatusMessage({ type: 'error', text: 'Could not delete category.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting category.' });
    }
  };

  // 2. ADD / RESET ACTIONS FOR SECTION 2 (SUB CATEGORY)
  const handleAddNewSubCategory = () => {
    const nextNum = subCategoriesForActiveMain.length + 1;
    const parent = activeMainCategory?.code || 'FG-1';
    setSubFormId(null);
    setSubFormCode(`${parent}-${100 + nextNum}`);
    setSubFormName('');
    setStatusMessage({ type: 'success', text: `Enter new Sub Category under [${parent}] and click Save.` });
  };

  const handleSaveSubCategory = async () => {
    if (!subFormCode.trim() || !subFormName.trim()) {
      setStatusMessage({ type: 'error', text: 'Sub Category Code and Name are required.' });
      return;
    }
    setSavingCategory(true);
    setStatusMessage(null);
    try {
      const payload = {
        id: subFormId || undefined,
        code: subFormCode.trim().toUpperCase(),
        name: subFormName.trim(),
        category_type: activeMainCategory?.category_type || 'Finish Goods',
        parent_code: activeMainCategory?.code || 'FG-1',
      };

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Sub Category [${payload.code}] saved successfully!` });
        await loadData();
        setSelectedSubCode(payload.code);
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to save subcategory.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving subcategory.' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteSubCategory = async () => {
    if (!selectedSubCode) return;
    if (!confirm(`Are you sure you want to delete Sub Category [${selectedSubCode}]?`)) return;

    try {
      const res = await fetch(`/api/categories?code=${encodeURIComponent(selectedSubCode)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Sub Category [${selectedSubCode}] removed.` });
        await loadData();
      } else {
        setStatusMessage({ type: 'error', text: 'Could not delete subcategory.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting subcategory.' });
    }
  };

  // 3. ADD / RESET ACTIONS FOR SECTION 3 (ITEM MASTER)
  const handleAddNewItem = () => {
    const nextRandom = Math.floor(100000 + Math.random() * 900000);
    const prefix = activeSubCategory?.code ? activeSubCategory.code.replace(/[^A-Za-z0-9]/g, '') : 'FG';
    const newSku = `${prefix}-${nextRandom}`;

    setItemFormId(null);
    setSelectedProductId(null);
    setItemFormCode(newSku);
    setItemFormBarcode(`8969${nextRandom}123`);
    setItemFormHsCode(
      activeMainCategory?.name.toLowerCase().includes('tile')
        ? '6907.2100'
        : activeMainCategory?.name.toLowerCase().includes('sanitary')
        ? '6910.1000'
        : '3917.2390'
    );
    setItemFormName('');
    setItemFormDescription('');
    setItemFormBrand('SEASTONE');
    setItemFormRackNo('Rack A-01');
    setItemFormPurchasePrice(0);
    setItemFormSellingPrice(0);
    setItemFormWholesalePrice(0);
    setItemFormUnit('Pcs');
    setItemFormQtyPerPiece(1);
    setItemFormTaxRate(18);
    setItemFormTaxType('PERCENT');
    setItemFormValuationMethod('WEIGHTED_AVG');
    setItemFormValuationCost(0);
    setItemFormOrderQty(50);
    setItemFormInactive(false);
    setItemFormStockQty(0);
    setStatusMessage({ type: 'success', text: `New Item template [${newSku}] ready. Fill details & Save.` });
  };

  const handleSaveItem = async () => {
    if (!itemFormCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Item Code is required.' });
      return;
    }
    if (!itemFormName.trim()) {
      setStatusMessage({ type: 'error', text: 'Item Name is required.' });
      return;
    }
    if (itemFormSellingPrice <= 0) {
      setStatusMessage({ type: 'error', text: 'Selling price must be greater than 0.' });
      return;
    }

    setSavingItem(true);
    setStatusMessage(null);
    try {
      const mainCat = activeMainCategory?.name || 'General';
      const subCat = activeSubCategory?.name || mainCat;
      const fullCategory = `${mainCat} > ${subCat}`;

      const payload = {
        id: itemFormId || undefined,
        sku: itemFormCode.trim().toUpperCase(),
        barcode: itemFormBarcode.trim(),
        name: itemFormName.trim(),
        description: itemFormDescription.trim() || itemFormName.trim(),
        category: fullCategory,
        main_category: mainCat,
        sub_category: subCat,
        unit: itemFormUnit.trim() || 'Pcs',
        hs_code: itemFormHsCode.trim() || '3917.2390',
        brand: itemFormBrand,
        rack_no: itemFormRackNo,
        cost_price: Number(itemFormPurchasePrice) || 0,
        sale_price: Number(itemFormSellingPrice) || 0,
        wholesale_price: Number(itemFormWholesalePrice) || Math.round(Number(itemFormSellingPrice) * 0.9),
        tax_rate: Number(itemFormTaxRate) || 18,
        tax_type: itemFormTaxType,
        valuation_method: itemFormValuationMethod,
        valuation_cost: Number(itemFormValuationCost) || Number(itemFormPurchasePrice) || 0,
        order_quantity: Number(itemFormOrderQty) || 50,
        qty_per_piece: Number(itemFormQtyPerPiece) || 1,
        is_active: itemFormInactive ? 0 : 1,
        branch_id: branches[0]?.id || 1,
        stock_qty: Number(itemFormStockQty) || 0,
      };

      const res = await fetch('/api/products', {
        method: itemFormId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { product: ProductWithStock };
        setStatusMessage({
          type: 'success',
          text: `Item [${data.product.sku}] saved successfully to database!`,
        });
        triggerInventoryRefresh();
        await loadData();
        setSelectedProductId(data.product.id);
        populateItemForm(data.product);
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.error || 'Failed to save product.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving product.' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedProductId) return;
    if (!confirm(`Are you sure you want to delete / deactivate Item [${itemFormCode}]?`)) return;

    try {
      const res = await fetch(`/api/products?id=${selectedProductId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Item [${itemFormCode}] deleted or deactivated.` });
        triggerInventoryRefresh();
        await loadData();
        handleAddNewItem();
      } else {
        setStatusMessage({ type: 'error', text: 'Could not delete product.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting product.' });
    }
  };

  // Bill in active POS
  const handleBillInPos = () => {
    if (!selectedProductId) return;
    setSelectedProductIdForPos(selectedProductId);
    setStatusMessage({
      type: 'success',
      text: `Item [${itemFormCode}] loaded into active POS Sale screen!`,
    });
  };

  // Helper to append pipe spec chips to item name
  const handleAppendSpec = (chip: string) => {
    setItemFormName((prev) => {
      if (!prev) return chip;
      if (prev.includes(chip)) return prev;
      return `${prev} ${chip}`.trim();
    });
  };

  // Profit Margin calculation
  const calculatedMargin = useMemo(() => {
    if (itemFormPurchasePrice <= 0 || itemFormSellingPrice <= 0) return 0;
    return (((itemFormSellingPrice - itemFormPurchasePrice) / itemFormPurchasePrice) * 100).toFixed(1);
  }, [itemFormPurchasePrice, itemFormSellingPrice]);

  // Export to Excel / CSV
  const handleExportCsv = () => {
    const headers = [
      'Main Category',
      'Sub Category',
      'Item Code / SKU',
      'Item Name',
      'HS Code',
      'Unit',
      'Purchase Price',
      'Wholesale Price',
      'Selling Price',
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

  // Global search matching items
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.main_category && p.main_category.toLowerCase().includes(q)) ||
        (p.sub_category && p.sub_category.toLowerCase().includes(q))
    );
  }, [products, globalSearchQuery]);

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
              {mainCategories.length} Cats • {products.length} SKUs Active
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-1 sm:p-2.5 backdrop-blur-xs font-sans overflow-y-auto">
      <div
        className={`flex flex-col rounded-xl border border-slate-700/80 bg-white shadow-2xl transition-all duration-150 relative ${
          isMaximized
            ? 'fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none'
            : 'h-[97vh] max-h-[920px] w-full max-w-[1360px]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. SEASTONE EXECUTIVE TITLEBAR (#091529)                   */}
        {/* ========================================================= */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#091529] via-[#0e1f3d] to-[#132952] px-3 text-white select-none rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <FolderTree className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wide uppercase">
                Chart Of Inventory
              </span>
              <span className="hidden sm:inline-block text-[10px] text-slate-300 font-normal">
                (Categories ➔ Sub-Categories ➔ Item Master • Multi-Tenant Ready)
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.2 text-[9.5px] font-medium text-emerald-300">
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
              className="flex h-5.5 w-5.5 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((m) => !m)}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="flex h-5.5 w-5.5 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={closeInventoryModal}
              title="Close (Esc)"
              className="flex h-5.5 w-5.5 cursor-pointer items-center justify-center rounded text-slate-300 hover:bg-rose-600 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner (if any) */}
        {statusMessage && (
          <div
            className={`shrink-0 flex items-center justify-between px-3 py-1 text-xs font-medium border-b ${
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
        {/* SCROLLABLE 3-TIER MASTER SECTIONS CONTAINER               */}
        {/* ========================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-2 bg-[#f8fafc]">
          {/* ===================================================== */}
          {/* TIER 1: 1. INVENTORY CATEGORIES                      */}
          {/* ===================================================== */}
          <div className="rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
            {/* Tier 1 Header Strip */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#59391e] via-[#6e4624] to-[#7f512a] px-3 py-1 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-300" />
                <span>1. INVENTORY CATEGORIES</span>
              </span>
              <span className="text-[10px] text-amber-200 font-semibold">
                Total Main Categories: {mainCategories.length}
              </span>
            </div>

            {/* Tier 1 Split: Left List | Right Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Category List Box (4 Cols) */}
              <div className="md:col-span-5 p-2 flex flex-col justify-between bg-[#fcfdfe]">
                <div className="max-h-[120px] overflow-y-auto rounded border border-slate-300 bg-white">
                  <div className="bg-[#4a2e16] text-[10px] font-bold text-white px-2 py-0.5 uppercase tracking-wide sticky top-0">
                    Category Name &amp; Code
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {mainCategories.map((c) => {
                      const isSelected = selectedMainCode === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelectMainCategory(c)}
                          className={`flex w-full cursor-pointer items-center justify-between px-2.5 py-1 text-left transition ${
                            isSelected
                              ? 'bg-amber-100/80 font-bold text-amber-950 border-l-4 border-amber-700'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[9.5px] font-mono text-slate-600 border border-slate-200">
                            {c.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Category Controls & Form Fields (7 Cols) */}
              <div className="md:col-span-7 p-2 flex flex-col justify-between bg-white">
                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-end gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setTreeChartOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceListModalOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Price List
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-6 cursor-pointer rounded bg-[#0284c7] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-sky-700 transition"
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewMainCategory}
                    className="h-6 cursor-pointer rounded bg-[#0369a1] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:bg-sky-800 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMainCategory}
                    disabled={savingCategory}
                    className="h-6 cursor-pointer rounded bg-[#15803d] px-3 text-[10.5px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                  >
                    {savingCategory ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeMainCategory) handleSelectMainCategory(activeMainCategory);
                    }}
                    className="h-6 cursor-pointer rounded bg-[#0f766e] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-teal-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMainCategory}
                    className="h-6 cursor-pointer rounded bg-[#be123c] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-rose-800 transition"
                  >
                    Delete
                  </button>
                </div>

                {/* Form Inputs Grid */}
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <span className="sm:col-span-3 text-[11px] font-semibold text-slate-700 italic">
                      Main Category Code
                    </span>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={mainFormCode}
                        onChange={(e) => setMainFormCode(e.target.value)}
                        placeholder="e.g. FG-1"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                    </div>
                    <span className="sm:col-span-2 text-right text-[11px] font-semibold text-slate-700 italic">
                      Category Type
                    </span>
                    <div className="sm:col-span-3">
                      <select
                        value={mainFormType}
                        onChange={(e) => setMainFormType(e.target.value)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-1.5 py-0 text-xs text-slate-800 focus:border-amber-600 focus:outline-none"
                      >
                        {CATEGORY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <span className="sm:col-span-3 text-[11px] font-semibold text-slate-700 italic">
                      Main Category Name
                    </span>
                    <div className="sm:col-span-9">
                      <input
                        type="text"
                        value={mainFormName}
                        onChange={(e) => setMainFormName(e.target.value)}
                        placeholder="e.g. FINISH GOODS"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* TIER 2: 2. SUB INVENTORY CATEGORIES                  */}
          {/* ===================================================== */}
          <div className="rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
            {/* Tier 2 Header Strip */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#59391e] via-[#6e4624] to-[#7f512a] px-3 py-1 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-amber-300" />
                <span>2. SUB INVENTORY CATEGORIES</span>
              </span>
              <span className="text-[10px] text-amber-200 font-semibold">
                Parent: <strong className="text-white font-extrabold">{activeMainCategory?.name}</strong> (
                {subCategoriesForActiveMain.length} Sub-Categories)
              </span>
            </div>

            {/* Tier 2 Split: Left List | Right Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Sub Categories List Box (4 Cols) */}
              <div className="md:col-span-5 p-2 flex flex-col justify-between bg-[#fcfdfe]">
                <div className="max-h-[105px] overflow-y-auto rounded border border-slate-300 bg-white">
                  <div className="bg-[#4a2e16] text-[10px] font-bold text-white px-2 py-0.5 uppercase tracking-wide sticky top-0 flex justify-between">
                    <span>{activeMainCategory?.name || 'SUB CATEGORIES'}</span>
                    <span className="text-amber-200">{subCategoriesForActiveMain.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {subCategoriesForActiveMain.length === 0 ? (
                      <div className="p-2 text-center text-slate-400 text-[11px] italic">
                        No sub-categories yet. Click [Add] on the right to create one.
                      </div>
                    ) : (
                      subCategoriesForActiveMain.map((s) => {
                        const isSelected = selectedSubCode === s.code;
                        return (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => handleSelectSubCategory(s)}
                            className={`flex w-full cursor-pointer items-center justify-between px-2.5 py-1 text-left transition ${
                              isSelected
                                ? 'bg-amber-100/80 font-bold text-amber-950 border-l-4 border-amber-700'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9.5px] font-mono text-slate-600 border border-slate-200">
                              {s.code}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Sub Category Controls & Form Fields (7 Cols) */}
              <div className="md:col-span-7 p-2 flex flex-col justify-between bg-white">
                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-end gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setTreeChartOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceListModalOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Price List
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewSubCategory}
                    className="h-6 cursor-pointer rounded bg-[#0369a1] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:bg-sky-800 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSubCategory}
                    disabled={savingCategory}
                    className="h-6 cursor-pointer rounded bg-[#15803d] px-3 text-[10.5px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                  >
                    {savingCategory ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSubCategory) handleSelectSubCategory(activeSubCategory);
                    }}
                    className="h-6 cursor-pointer rounded bg-[#0f766e] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-teal-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSubCategory}
                    className="h-6 cursor-pointer rounded bg-[#be123c] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-rose-800 transition"
                  >
                    Delete
                  </button>
                </div>

                {/* Form Inputs Grid */}
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <span className="sm:col-span-3 text-[11px] font-semibold text-slate-700 italic">
                      Sub Category Code
                    </span>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={subFormCode}
                        onChange={(e) => setSubFormCode(e.target.value)}
                        placeholder="e.g. FG-101"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <span className="sm:col-span-3 text-[11px] font-semibold text-slate-700 italic">
                      Sub Category Name
                    </span>
                    <div className="sm:col-span-9">
                      <input
                        type="text"
                        value={subFormName}
                        onChange={(e) => setSubFormName(e.target.value)}
                        placeholder="e.g. U-PVC PRESSURE PIPES"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================== */}
          {/* TIER 3: 3. LIST OF INVENTORY ITEMS                   */}
          {/* ===================================================== */}
          <div className="rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
            {/* Tier 3 Header Strip */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#59391e] via-[#6e4624] to-[#7f512a] px-3 py-1 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-300" />
                <span>3. LIST OF INVENTORY ITEMS</span>
              </span>
              <span className="text-[10px] text-amber-200 font-semibold">
                Category: <strong className="text-white font-extrabold">{activeMainCategory?.name} ❯ {activeSubCategory?.name}</strong> (
                {itemsInActiveSub.length} Items Listed)
              </span>
            </div>

            {/* Tier 3 Split: Left Items List | Right Comprehensive Item Master Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Items List Box (4.5 Cols) */}
              <div className="md:col-span-5 p-2 flex flex-col justify-between bg-[#fcfdfe]">
                {/* Search input in items box */}
                <div className="relative mb-1.5">
                  <Search className="pointer-events-none absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Search SKU or name in subcategory..."
                    className="h-6 w-full rounded border border-slate-300 bg-white pl-6 pr-2 text-[10.5px] text-slate-800 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div className="max-h-[305px] overflow-y-auto rounded border border-slate-300 bg-white">
                  <div className="bg-[#4a2e16] text-[10px] font-bold text-white px-2 py-0.5 uppercase tracking-wide sticky top-0 flex justify-between">
                    <span>SKU &amp; Description</span>
                    <span>Rate (Rs.)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {itemsInActiveSub.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs italic">
                        No items found under this subcategory.
                        <br />
                        Click <strong className="text-slate-700 font-semibold">[Add]</strong> on the right to register
                        new SKU.
                      </div>
                    ) : (
                      itemsInActiveSub.map((p) => {
                        const isSelected = selectedProductId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectItem(p)}
                            className={`flex w-full cursor-pointer items-start justify-between px-2.5 py-1 text-left transition ${
                              isSelected
                                ? 'bg-amber-100/80 font-bold text-amber-950 border-l-4 border-amber-700'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-700">{p.sku}</span>
                                {p.is_active === 0 && (
                                  <span className="rounded bg-rose-100 px-1 text-[8.5px] font-semibold text-rose-700">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[11px] font-medium text-slate-900">{p.name}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[11px] font-bold text-slate-900">
                                {formatCurrency(p.sale_price)}
                              </span>
                              <span className="block text-[9.5px] text-emerald-700 font-semibold">
                                Stock: {p.stock_qty || 0} {p.unit}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Item Master Form Fields (7.5 Cols) */}
              <div className="md:col-span-7 p-2 flex flex-col justify-between bg-white">
                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-end gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setTreeChartOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceListModalOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#4a2e16] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-[#3d2411] transition"
                  >
                    Price List
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalFindOpen(true)}
                    className="h-6 cursor-pointer rounded bg-[#0284c7] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:bg-sky-700 transition"
                  >
                    Find
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="h-6 cursor-pointer rounded bg-[#0369a1] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:bg-sky-800 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItem}
                    disabled={savingItem}
                    className="h-6 cursor-pointer rounded bg-[#15803d] px-3 text-[10.5px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                  >
                    {savingItem ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProductId) {
                        const p = products.find((prod) => prod.id === selectedProductId);
                        if (p) populateItemForm(p);
                      }
                    }}
                    className="h-6 cursor-pointer rounded bg-[#0f766e] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-teal-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteItem}
                    className="h-6 cursor-pointer rounded bg-[#be123c] px-2 text-[10.5px] font-bold text-white shadow-2xs hover:bg-rose-800 transition"
                  >
                    Delete
                  </button>
                  {/* Direct Bill in POS Button */}
                  <button
                    type="button"
                    onClick={handleBillInPos}
                    disabled={!selectedProductId}
                    className="h-6 cursor-pointer rounded bg-gradient-to-r from-emerald-600 to-teal-700 px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:brightness-110 active:scale-95 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3 text-amber-300" />
                    <span>Bill in POS</span>
                  </button>
                </div>

                {/* Form Fields Grid (Exactly matching user's reference layout) */}
                <div className="space-y-1.5 text-xs">
                  {/* Row 1: Item Code & HS Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Item Code
                    </span>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={itemFormCode}
                        onChange={(e) => setItemFormCode(e.target.value)}
                        placeholder="e.g. FG-202011"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                    </div>

                    <span className="sm:col-span-2 text-right text-[11px] font-semibold text-slate-700 italic">
                      HS Code
                    </span>
                    <div className="sm:col-span-3.5 flex items-center gap-1">
                      <select
                        value={itemFormHsCode}
                        onChange={(e) => setItemFormHsCode(e.target.value)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-1 py-0 text-xs text-slate-800 focus:border-amber-600 focus:outline-none"
                      >
                        {STANDARD_HS_CODES.map((h) => (
                          <option key={h.code} value={h.code}>
                            {h.code}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => alert(`Standard FBR Tariff:\n${STANDARD_HS_CODES.map(h => h.label).join('\n')}`)}
                        className="h-6 w-6 shrink-0 rounded border border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        ..
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Item Name (Full Width + Dimension Helper Chips) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Item Name
                    </span>
                    <div className="sm:col-span-9.5">
                      <input
                        type="text"
                        value={itemFormName}
                        onChange={(e) => setItemFormName(e.target.value)}
                        placeholder="e.g. 2&quot;X13' U-PVC PRESSURE PIPE - 2.50 KG"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none uppercase"
                      />
                      {/* 1-Click pipe dimension & specification quick chips */}
                      <div className="mt-1 flex flex-wrap items-center gap-1 select-none">
                        <span className="text-[9.5px] font-bold text-amber-900 uppercase">Quick Add:</span>
                        {QUICK_SIZES.slice(0, 8).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleAppendSpec(sz)}
                            className="rounded border border-slate-200 bg-slate-100 px-1 py-0.2 text-[9.5px] font-semibold text-slate-700 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300"
                          >
                            {sz}
                          </button>
                        ))}
                        {QUICK_SPECS.slice(0, 4).map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => handleAppendSpec(sp)}
                            className="rounded border border-slate-200 bg-slate-100 px-1 py-0.2 text-[9.5px] font-semibold text-slate-700 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300"
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Item Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Item Description
                    </span>
                    <div className="sm:col-span-9.5">
                      <input
                        type="text"
                        value={itemFormDescription}
                        onChange={(e) => setItemFormDescription(e.target.value)}
                        placeholder="e.g. Commercial Grade Water Supply Pressure Pipe"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Brand Name & Rack No. */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Brand Name
                    </span>
                    <div className="sm:col-span-4 flex items-center gap-1">
                      <select
                        value={itemFormBrand}
                        onChange={(e) => setItemFormBrand(e.target.value)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-1.5 py-0 text-xs text-slate-800 focus:border-amber-600 focus:outline-none"
                      >
                        {BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const custom = prompt('Enter custom Brand name:');
                          if (custom) setItemFormBrand(custom.trim().toUpperCase());
                        }}
                        className="h-6 w-6 shrink-0 rounded border border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        ..
                      </button>
                    </div>

                    <span className="sm:col-span-2 text-right text-[11px] font-semibold text-slate-700 italic">
                      Rack No.
                    </span>
                    <div className="sm:col-span-3.5">
                      <input
                        type="text"
                        value={itemFormRackNo}
                        onChange={(e) => setItemFormRackNo(e.target.value)}
                        placeholder="e.g. Rack A-01"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 5: Purchase Price & Selling Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Purchase Price
                    </span>
                    <div className="sm:col-span-4">
                      <input
                        type="number"
                        min={0}
                        value={itemFormPurchasePrice === 0 ? '' : itemFormPurchasePrice}
                        onChange={(e) => setItemFormPurchasePrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-right text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <span className="sm:col-span-2 text-right text-[11px] font-semibold text-slate-700 italic">
                      Selling Price
                    </span>
                    <div className="sm:col-span-3.5 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={itemFormSellingPrice === 0 ? '' : itemFormSellingPrice}
                        onChange={(e) => setItemFormSellingPrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-6 w-full rounded border border-emerald-500 bg-emerald-50/50 px-2 py-0 text-right text-xs font-extrabold text-emerald-950 focus:border-emerald-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {calculatedMargin !== 0 && (
                        <span className="shrink-0 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                          +{calculatedMargin}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 6: Measurement Unit & Quantity/Piece */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Measurement Unit
                    </span>
                    <div className="sm:col-span-4">
                      <select
                        value={itemFormUnit}
                        onChange={(e) => setItemFormUnit(e.target.value)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-1.5 py-0 text-xs font-semibold text-slate-800 focus:border-amber-600 focus:outline-none"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="sm:col-span-2 text-right text-[11px] font-semibold text-slate-700 italic">
                      Quantity/Piece
                    </span>
                    <div className="sm:col-span-3.5">
                      <input
                        type="number"
                        min={0}
                        value={itemFormQtyPerPiece}
                        onChange={(e) => setItemFormQtyPerPiece(Number(e.target.value) || 1)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-right text-xs text-slate-900 focus:border-amber-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Row 7: Sales Tax Rate & Tax Type Radio */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Sales Tax Rate
                    </span>
                    <div className="sm:col-span-4 flex items-center gap-1">
                      <input
                        type="number"
                        value={itemFormTaxRate}
                        onChange={(e) => setItemFormTaxRate(Number(e.target.value) || 0)}
                        className="h-6 w-20 rounded border border-slate-300 bg-white px-2 py-0 text-right text-xs font-bold text-slate-900 focus:border-amber-600 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>

                    <div className="sm:col-span-5.5 flex items-center gap-3">
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="taxType"
                          checked={itemFormTaxType === 'PERCENT'}
                          onChange={() => setItemFormTaxType('PERCENT')}
                          className="text-amber-700 focus:ring-amber-500"
                        />
                        <span>Percent</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="taxType"
                          checked={itemFormTaxType === 'AMOUNT'}
                          onChange={() => setItemFormTaxType('AMOUNT')}
                          className="text-amber-700 focus:ring-amber-500"
                        />
                        <span>Amount</span>
                      </label>
                    </div>
                  </div>

                  {/* Row 8: Valuation Method Radio & Valuation Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Valuation Method
                    </span>
                    <div className="sm:col-span-5.5 flex items-center gap-3">
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="valMethod"
                          checked={itemFormValuationMethod === 'WEIGHTED_AVG'}
                          onChange={() => setItemFormValuationMethod('WEIGHTED_AVG')}
                          className="text-amber-700 focus:ring-amber-500"
                        />
                        <span>Weighted Average Price</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="valMethod"
                          checked={itemFormValuationMethod === 'MANUAL'}
                          onChange={() => setItemFormValuationMethod('MANUAL')}
                          className="text-amber-700 focus:ring-amber-500"
                        />
                        <span>Manual Cost</span>
                      </label>
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="number"
                        min={0}
                        value={itemFormValuationCost === 0 ? '' : itemFormValuationCost}
                        onChange={(e) => setItemFormValuationCost(Number(e.target.value) || 0)}
                        placeholder="Valuation Cost"
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-right text-xs text-slate-900 focus:border-amber-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Row 9: Order Quantity & Inactive Checkbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                    <span className="sm:col-span-2.5 text-[11px] font-semibold text-slate-700 italic">
                      Order Quantity
                    </span>
                    <div className="sm:col-span-4">
                      <input
                        type="number"
                        min={0}
                        value={itemFormOrderQty}
                        onChange={(e) => setItemFormOrderQty(Number(e.target.value) || 0)}
                        className="h-6 w-full rounded border border-slate-300 bg-white px-2 py-0 text-right text-xs text-slate-900 focus:border-amber-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="sm:col-span-5.5 flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itemFormInactive}
                          onChange={(e) => setItemFormInactive(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className={itemFormInactive ? 'text-rose-700 font-bold' : ''}>Inactive Item</span>
                      </label>

                      {/* Barcode Display */}
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        <span>{itemFormBarcode || 'NO-BARCODE'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM STATUS & INFORMATION FOOTER                        */}
        {/* ========================================================= */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 rounded-b-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              Database Total: <strong className="text-slate-900">{products.length}</strong> Products across{' '}
              <strong className="text-slate-900">{mainCategories.length}</strong> Main Categories &amp;{' '}
              <strong className="text-slate-900">{categories.length - mainCategories.length}</strong> Sub-Categories
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="rounded bg-slate-200 px-1.5 py-0.2 font-mono font-bold text-slate-700">F2: New Item</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.2 font-mono font-bold text-slate-700">Ctrl+S: Save</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.2 font-mono font-bold text-slate-700">Esc: Close</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GLOBAL OMNI-FIND MODAL (TRIGGERED BY [FIND] BUTTON)       */}
        {/* ========================================================= */}
        {globalFindOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs font-sans">
            <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-[#091529] px-3 text-white">
                <span className="text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-sky-400" />
                  <span>Global Inventory Item Find</span>
                </span>
                <button
                  type="button"
                  onClick={() => setGlobalFindOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    placeholder="Search any SKU, Barcode, Pipe Specification, or Category..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                {globalSearchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    {globalSearchQuery
                      ? 'No items matched your search query.'
                      : 'Type anything above to search across all catalog products.'}
                  </div>
                ) : (
                  globalSearchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleSelectItem(p);
                        setGlobalFindOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between p-2 text-left hover:bg-emerald-50 transition rounded"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-800">{p.sku}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600">
                            {p.main_category || 'General'} ❯ {p.sub_category || 'General'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-900 mt-0.5">{p.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-extrabold text-slate-900">
                          {formatCurrency(p.sale_price)}
                        </span>
                        <span className="block text-[10px] text-emerald-700 font-semibold">
                          Stock: {p.stock_qty || 0} {p.unit}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* INTERACTIVE TREE CHART VISUALIZER MODAL                   */}
        {/* ========================================================= */}
        {treeChartOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs font-sans">
            <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-[#091529] px-3 text-white">
                <span className="text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Chart Of Inventory Hierarchy Tree</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTreeChartOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3 bg-slate-50 text-xs">
                {mainCategories.map((m) => {
                  const subs = categories.filter((c) => c.parent_code === m.code);
                  const itemsInMain = products.filter(
                    (p) =>
                      (p.main_category && p.main_category.toLowerCase() === m.name.toLowerCase()) ||
                      p.category.toLowerCase().includes(m.name.toLowerCase())
                  );

                  return (
                    <div key={m.code} className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-800 px-1.5 py-0.5 text-[10px] font-bold text-white font-mono">
                            {m.code}
                          </span>
                          <span className="text-xs font-bold text-slate-900 uppercase">{m.name}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] text-slate-600 font-semibold">
                            {m.category_type}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-700">
                          {itemsInMain.length} Finished Goods
                        </span>
                      </div>

                      <div className="mt-2 pl-4 space-y-1.5 border-l-2 border-amber-200">
                        {subs.map((s) => {
                          const itemsInSub = products.filter(
                            (p) =>
                              (p.sub_category && p.sub_category.toLowerCase() === s.name.toLowerCase()) ||
                              p.category.toLowerCase().includes(s.name.toLowerCase())
                          );
                          return (
                            <div key={s.code} className="flex items-center justify-between text-[11px] py-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-slate-500">↳ {s.code}:</span>
                                <span className="font-semibold text-slate-800">{s.name}</span>
                              </div>
                              <span className="rounded bg-emerald-50 px-1 text-[9.5px] font-bold text-emerald-800">
                                {itemsInSub.length} Items
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXECUTIVE PRICE LIST PRINT PREVIEW MODAL                  */}
        {/* ========================================================= */}
        {priceListModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs font-sans">
            <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
              <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-[#091529] px-3 text-white">
                <span className="text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5 text-amber-300" />
                  <span>Executive Price List • Print Preview</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceListModalOpen(false)}
                    className="rounded p-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="text-center border-b border-slate-200 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase">
                    M/S SEASTONE PVC PIPE INDUSTRY
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Official Inventory Price List • FBR HS Code 3917.2390 • Sales Tax 18%
                  </p>
                  <p className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-4">
                  {mainCategories.map((m) => {
                    const itemsInMain = products.filter(
                      (p) =>
                        (p.main_category && p.main_category.toLowerCase() === m.name.toLowerCase()) ||
                        p.category.toLowerCase().includes(m.name.toLowerCase())
                    );
                    if (itemsInMain.length === 0) return null;

                    return (
                      <div key={m.code} className="space-y-1">
                        <div className="bg-[#091529] text-white px-2.5 py-1 text-xs font-bold uppercase rounded flex justify-between">
                          <span>
                            {m.code} • {m.name}
                          </span>
                          <span className="text-emerald-300">{itemsInMain.length} SKUs</span>
                        </div>
                        <table className="w-full border-collapse border border-slate-200 text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                              <th className="border border-slate-200 p-1">SKU</th>
                              <th className="border border-slate-200 p-1">Product Description</th>
                              <th className="border border-slate-200 p-1 text-center">Unit</th>
                              <th className="border border-slate-200 p-1 text-right">Wholesale Rate</th>
                              <th className="border border-slate-200 p-1 text-right">Retail Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemsInMain.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="border border-slate-200 p-1 font-mono font-semibold text-slate-700">
                                  {p.sku}
                                </td>
                                <td className="border border-slate-200 p-1 font-medium text-slate-900">{p.name}</td>
                                <td className="border border-slate-200 p-1 text-center font-semibold">{p.unit}</td>
                                <td className="border border-slate-200 p-1 text-right font-mono text-slate-800">
                                  {formatCurrency(p.wholesale_price || Math.round(p.sale_price * 0.9))}
                                </td>
                                <td className="border border-slate-200 p-1 text-right font-mono font-bold text-emerald-800">
                                  {formatCurrency(p.sale_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
