import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Barcode, 
  Edit2, 
  Trash2, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpDown,
  SlidersHorizontal,
  History,
  RotateCcw,
  LayoutGrid,
  List,
  Camera
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Product, StockAdjustment } from '../../types';
import { generateRandomBarcode } from '../../services/barcode';
import { formatMAD, formatUnit } from '../../i18n/locales';
import { generateSeedData } from '../../services/seed';

const formatCategoryName = (catName: string, lang: string) => {
  if (lang === 'ar' || !catName) return catName;
  const map: Record<string, string> = {
    'حليب ومشتقاته': 'Lait & Produits laitiers',
    'مشروبات ومياه': 'Boissons & Eaux',
    'بقالة ومواد غذائية': 'Épicerie & Alimentation',
    'منظفات وعناية': 'Entretien & Hygiène',
    'بسكويت وحلويات': 'Biscuits & Confiseries',
    'معلبات وتوابل': 'Conserves & Épices',
  };
  return map[catName] || catName;
};

export const ProductsView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang, openBarcodeScanner } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [imageUrl, setImageUrl] = useState('');
  const [taxRate, setTaxRate] = useState('20');

  // Physical Inventory Adjustment Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [countedQty, setCountedQty] = useState('');
  const [adjustReason, setAdjustReason] = useState(lang === 'ar' ? 'جرد دوري بالمحل' : 'Inventaire périodique');

  // Product Delete Confirmation Modal
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const categories = useMemo(() => db.getCategories(business.id), [business.id, dataVersion]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
      const matchCat = selectedCat === 'all' || p.category_id === selectedCat;
      const matchStock = 
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.current_stock <= p.min_stock && p.current_stock > 0) ||
        (stockFilter === 'out' && p.current_stock <= 0);
      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, selectedCat, stockFilter]);

  // Open modal for new product
  const handleOpenNew = () => {
    setEditingProduct(null);
    setName('');
    setBarcode(generateRandomBarcode());
    setCategoryId(categories[0]?.id || '');
    setUnit('قطعة');
    setPurchasePrice('0');
    setSalePrice('0');
    setCurrentStock('10');
    setMinStock('5');
    setImageUrl('');
    setTaxRate((business.defaultTaxRate ?? 20).toString());
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBarcode(p.barcode);
    setCategoryId(p.category_id || '');
    setUnit(p.unit);
    setPurchasePrice(p.purchase_price.toString());
    setSalePrice(p.sale_price.toString());
    setCurrentStock(p.current_stock.toString());
    setMinStock(p.min_stock.toString());
    setImageUrl(p.image_url || '');
    setTaxRate((p.tax_rate ?? business.defaultTaxRate ?? 20).toString());
    setIsModalOpen(true);
  };

  // Image Upload and Canvas-based compressor
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setImageUrl(dataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Margin calculation helper
  const pCost = parseFloat(purchasePrice) || 0;
  const pSale = parseFloat(salePrice) || 0;
  const profitMargin = pSale - pCost;
  const marginPercent = pCost > 0 ? ((profitMargin / pCost) * 100).toFixed(1) : '100';

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(lang === 'ar' ? 'يرجى كتابة اسم المنتج' : 'Veuillez saisir le nom du produit');
      return;
    }
    if (!imageUrl) {
      alert(lang === 'ar' ? 'يرجى تحميل صورة المنتج (الصورة مطلوبة)' : 'Veuillez ajouter une photo pour le produit (obligatoire)');
      return;
    }

    const prodData: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      name: name.trim(),
      sku: editingProduct ? editingProduct.sku : 'SKU-' + Date.now().toString().slice(-6),
      barcode: barcode.trim() || generateRandomBarcode(),
      category_id: categoryId || (categories[0]?.id || 'cat-general'),
      unit,
      purchase_price: pCost,
      sale_price: pSale,
      current_stock: parseFloat(currentStock) || 0,
      min_stock: parseFloat(minStock) || 5,
      tax_rate: business.taxEnabled ? (parseFloat(taxRate) || 0) : 0,
      image_url: imageUrl,
      is_active: true,
      created_at: editingProduct ? editingProduct.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveProduct(prodData, user.name);
    setIsModalOpen(false);
    refreshData();
  };

  // Delete product
  const handleDeleteProduct = (p: Product) => {
    setDeleteConfirmProduct(p);
  };

  // Apply Physical Count
  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    const qty = parseFloat(countedQty);
    if (isNaN(qty)) return;

    const adj: StockAdjustment = {
      id: 'adj-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      product_id: adjustModalProduct.id,
      system_qty: adjustModalProduct.current_stock,
      counted_qty: qty,
      difference: qty - adjustModalProduct.current_stock,
      reason: adjustReason,
      user_name: user.name,
      created_at: new Date().toISOString(),
    };

    db.applyPhysicalInventory(adj);
    setAdjustModalProduct(null);
    setCountedQty('');
    refreshData();
  };

  const handleSeedDemoData = () => {
    const seed = generateSeedData(business.id, branch.id);
    localStorage.setItem('tajer_db_categories', JSON.stringify(seed.categories));
    localStorage.setItem('tajer_db_suppliers', JSON.stringify(seed.suppliers));
    localStorage.setItem('tajer_db_customers', JSON.stringify(seed.customers));
    localStorage.setItem('tajer_db_products', JSON.stringify(seed.products));
    refreshData();
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-4`}>
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'إدارة السلع والمخزون' : 'Gestion des produits et du stock'}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {lang === 'ar' ? `إجمالي السلع المسجلة: ${products.length} سلعة` : `Total des produits enregistrés : ${products.length} articles`}
          </span>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إضافة سلعة جديدة' : 'Nouveau produit'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap gap-2.5 items-center">
        
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث باسم السلعة أو الباركود' : 'Rechercher par nom ou code-barres...'}
            className="w-full ps-9 pe-9 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={() => {
              openBarcodeScanner('custom', (scannedCode) => {
                setSearch(scannedCode);
              });
            }}
            title={lang === 'ar' ? 'مسح الباركود للبحث عن السلعة' : 'Scanner pour rechercher'}
            className="absolute end-2 top-2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-teal-600 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent outline-hidden"
        >
          <option value="all">{lang === 'ar' ? 'جميع الفئات' : 'Toutes les catégories'}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{formatCategoryName(c.name, lang)}</option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              stockFilter === 'all' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'Tous'}
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              stockFilter === 'low' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'منخفض' : 'Faible'}
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              stockFilter === 'out' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'نفد' : 'Épuisé'}
          </button>
        </div>

        {/* View Mode Switcher (Cards vs Table) */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs ms-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'cards' || (viewMode === 'auto') ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
            title={lang === 'ar' ? 'عرض البطاقات' : 'Vue Cartes'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
            title={lang === 'ar' ? 'عرض الجدول' : 'Vue Tableau'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Products Display: Mobile Cards + Desktop Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-8 sm:p-12 text-center">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <Package className="w-7 h-7" />
            </div>
            <div className="font-bold text-base text-slate-800 dark:text-slate-200">
              {products.length === 0 
                ? (lang === 'ar' ? 'المخزون فارغ حالياً' : 'Le stock est actuellement vide') 
                : (lang === 'ar' ? 'لم يتم العثور على سلع مطابقة للبحث' : 'Aucun produit ne correspond à la recherche')}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {products.length === 0
                ? (lang === 'ar' ? 'يمكنك البدء بإضافة أول سلعة يدوياً أو تعبئة المتجر فوراً بتشكيلة سلع مغربية جاهزة للتجربة.' : 'Vous pouvez commencer par ajouter un produit ou charger des données d\'exemple.')
                : (lang === 'ar' ? 'جرّب تغيير كلمة البحث أو تصفية الفئات.' : 'Essayez de modifier votre recherche ou de filtrer par catégorie.')}
            </p>
            {products.length === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleOpenNew}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'إضافة سلعة يدوياً' : 'Ajouter un produit'}</span>
                </button>
                <button
                  onClick={handleSeedDemoData}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'إضافة سلع تجريبية مغربية' : 'Charger des produits de démonstration'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Optimized Product Cards (Default on mobile, no horizontal scroll) */}
          <div className={`${viewMode === 'table' ? 'hidden' : 'block md:hidden'} space-y-2.5`}>
            {filteredProducts.map(p => {
              const cat = categories.find(c => c.id === p.category_id);
              const margin = p.sale_price - p.purchase_price;
              const isLow = p.current_stock <= p.min_stock;
              const isOut = p.current_stock <= 0;

              return (
                <div 
                  key={p.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 transition"
                >
                  {/* Top row: Image, Title, Barcode and Stock Badge */}
                  <div className="flex items-start gap-2.5 justify-between">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {p.image_url ? (
                        <img 
                          src={p.image_url} 
                          alt={p.name} 
                          className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-100 dark:border-slate-800" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          📦
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug break-words">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          {cat && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {formatCategoryName(cat.name, lang)}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-slate-400 truncate">
                            {p.barcode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock status badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${
                      isOut
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : isLow
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {p.current_stock} {formatUnit(p.unit, lang)}
                    </span>
                  </div>

                  {/* Middle row: Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 my-2.5 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">{lang === 'ar' ? 'سعر الشراء' : "Prix d'achat"}</div>
                      <div className="font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                        {formatCurrency(p.purchase_price)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">{lang === 'ar' ? 'سعر البيع' : 'Prix de vente'}</div>
                      <div className="font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                        {formatCurrency(p.sale_price)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">{lang === 'ar' ? 'الربح المتوقع' : 'Bénéfice prévu'}</div>
                      <div className="font-bold text-emerald-600 mt-0.5">
                        +{formatCurrency(margin)}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Action Buttons */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      onClick={() => {
                        setAdjustModalProduct(p);
                        setCountedQty(p.current_stock.toString());
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'جرد المخزون' : 'Inventaire'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title={lang === 'ar' ? 'تعديل السلعة' : 'Modifier'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Shown on larger screens or when table view is selected) */}
          <div className={`${viewMode === 'cards' ? 'hidden' : 'hidden md:block'} bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs`}>
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold">
                  <tr>
                    <th className="p-3.5">{lang === 'ar' ? 'السلعة والباركود' : 'Produit & Code-barres'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'الفئة' : 'Catégorie'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'سعر الشراء' : "Prix d'achat"}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'سعر البيع' : 'Prix de vente'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'الهامش الربحي' : 'Marge'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'المخزون الحالي' : 'Stock actuel'}</th>
                    <th className="p-3.5 text-center">{lang === 'ar' ? 'العمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.category_id);
                    const margin = p.sale_price - p.purchase_price;
                    const isLow = p.current_stock <= p.min_stock;
                    const isOut = p.current_stock <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            {p.image_url ? (
                              <img 
                                src={p.image_url} 
                                alt={p.name} 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                                📦
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.barcode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {cat ? formatCategoryName(cat.name, lang) : '-'}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-500">
                          {formatCurrency(p.purchase_price)}
                        </td>
                        <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(p.sale_price)}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-emerald-600">
                            +{formatCurrency(margin)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {p.current_stock} {formatUnit(p.unit, lang)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Physical Count Button */}
                            <button
                              onClick={() => {
                                setAdjustModalProduct(p);
                                setCountedQty(p.current_stock.toString());
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600 cursor-pointer"
                              title={lang === 'ar' ? 'تسوية جرد فعلي (Inventaire physique)' : 'Inventaire physique'}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title={lang === 'ar' ? 'تعديل السلعة' : 'Modifier'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                              title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                            >
                              <Trash2 className="w-4 h-4" />
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
        </>
      )}

      {/* Product Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className={`w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 my-auto`}>
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingProduct 
                  ? (lang === 'ar' ? 'تعديل بيانات السلعة' : 'Modifier les données du produit') 
                  : (lang === 'ar' ? 'إضافة سلعة جديدة للمحل' : 'Ajouter un nouveau produit')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              {/* Product Image Upload */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
                {imageUrl ? (
                  <div className="relative w-24 h-24 group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute inset-0 bg-black/65 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs cursor-pointer"
                    >
                      {lang === 'ar' ? 'تغيير الصورة' : "Changer l'image"}
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 cursor-pointer w-full py-2 text-slate-500">
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {lang === 'ar' ? 'تحميل صورة للمنتج (مطلوبة) *' : 'Photo du produit (obligatoire) *'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {lang === 'ar' ? 'اضغط لاختيار صورة أو التقاطها' : 'Cliquez pour choisir ou prendre une photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم السلعة أو المنتج *' : 'Nom du produit *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: زيت لوسيور 1 لتر' : 'Ex: Huile Lesieur 1L'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Barcode + Camera Scan + Auto Generate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'كود الباركود (EAN-13)' : 'Code-barres (EAN-13)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="611..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      openBarcodeScanner('custom', (scannedCode) => {
                        setBarcode(scannedCode);
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
                    title={lang === 'ar' ? 'مسح الباركود مباشرة من الهاتف' : 'Scanner le code-barres avec le téléphone'}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'مسح بالكاميرا' : 'Scanner'}</span>
                  </button>
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الفئة / الصنف' : 'Catégorie'}
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="">{lang === 'ar' ? 'بدون فئة' : 'Sans catégorie'}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{formatCategoryName(c.name, lang)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'وحدة القياس' : 'Unité de mesure'}
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="قطعة">{lang === 'ar' ? 'قطعة (Pièce)' : 'Pièce (قطعة)'}</option>
                    <option value="كغ">{lang === 'ar' ? 'كيلوغرام (Kg)' : 'Kilogramme (Kg)'}</option>
                    <option value="لتر">{lang === 'ar' ? 'لتر (Litre)' : 'Litre (L)'}</option>
                    <option value="علبة">{lang === 'ar' ? 'علبة (Boîte)' : 'Boîte (علبة)'}</option>
                    <option value="صندوق">{lang === 'ar' ? 'صندوق (Caisse)' : 'Caisse (صندوق)'}</option>
                    <option value="باكي">{lang === 'ar' ? 'باكي (Paquet)' : 'Paquet (باكي)'}</option>
                  </select>
                </div>
              </div>

              {/* Prices & Margins */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? "ثمن الشراء (Prix d'achat DH)" : "Prix d'achat (DH)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'ثمن البيع (Prix de vente DH) *' : 'Prix de vente (DH) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-teal-500 bg-white dark:bg-slate-800 text-xs font-extrabold text-teal-600"
                  />
                </div>

                <div className="col-span-2 text-center text-xs font-bold text-emerald-600 pt-1 border-t border-slate-200 dark:border-slate-700">
                  {lang === 'ar' ? 'هامش الربح في القطعة:' : 'Marge unitaire :'} +{formatMAD(profitMargin)} ({marginPercent}%)
                </div>
              </div>

              {/* Product Tax Rate (TVA %) if enabled */}
              {business.taxEnabled && (
                <div className={`p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-150 dark:border-slate-800/65 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in slide-in-from-top-1 duration-200`}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'نسبة الضريبة الخاصة بهذه السلعة (TVA %)' : 'Taux de TVA pour ce produit (%)'}
                  </label>
                  <div className="relative max-w-[150px]">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                      className={`w-full ps-8 pe-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 select-none">%</span>
                  </div>
                </div>
              )}

              {/* Stock Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'المخزون المتوفر الآن' : 'Stock actuel disponible'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentStock}
                    onChange={e => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'تنبيه الحد الأدنى للمخزون' : 'Seuil alerte stock minimum'}
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ السلعة' : 'Enregistrer le produit'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Physical Count Adjustment Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
              {lang === 'ar' ? 'تسوية جرد فعلي (Inventaire)' : 'Inventaire physique'}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {lang === 'ar' ? 'المنتج:' : 'Produit :'} <strong>{adjustModalProduct.name}</strong>
            </p>

            <form onSubmit={handleApplyAdjustment} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between">
                <span>{lang === 'ar' ? 'المخزون المسجل بالنظام:' : 'Stock enregistré au système :'}</span>
                <span className="font-bold">{adjustModalProduct.current_stock} {formatUnit(adjustModalProduct.unit, lang)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'الكمية الحقيقية الموجودة على الرف (المعدودة) *' : 'Quantité réelle comptée en rayon *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={countedQty}
                  onChange={e => setCountedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-teal-500 text-center text-base font-extrabold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'سبب التعديل' : "Motif de l'ajustement"}
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder={lang === 'ar' ? 'جرد دوري بالمحل' : 'Inventaire périodique'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'تسجيل الجرد وتصحيح المخزون' : 'Enregistrer et corriger le stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Dialog Modal */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-200`}>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تأكيد حذف المنتج' : 'Confirmer la suppression'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف المنتج{' '}
                    <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirmProduct.name}"</span>؟ 
                    هذا الإجراء لا يمكن التراجع عنه وسيحذف السلعة من المخزن والكتالوج نهائياً.
                  </>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir supprimer le produit{' '}
                    <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirmProduct.name}"</span> ? 
                    Cette action est irréversible et supprimera le produit définitivement.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer select-none"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                onClick={() => {
                  db.deleteProduct(deleteConfirmProduct.id, business.id, user.name);
                  setDeleteConfirmProduct(null);
                  refreshData();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer select-none"
              >
                {lang === 'ar' ? 'نعم، تأكيد الحذف' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
