import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  UserCheck, 
  User,
  CheckCircle2, 
  CreditCard, 
  Wallet, 
  DollarSign, 
  Receipt, 
  Percent, 
  ArrowLeft,
  X,
  AlertCircle,
  Tag,
  ChevronRight,
  ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { PaymentMethod, Customer, Sale } from '../../types';
import { playBeep } from '../../services/barcode';
import { formatMAD, formatUnit } from '../../i18n/locales';
import { syncEngine } from '../../services/sync';

export const POSView: React.FC = () => {
  const {
    business,
    branch,
    user,
    cart,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    cartDiscount,
    setCartDiscount,
    cartCustomer,
    setCartCustomer,
    cartTotals,
    setActiveSaleReceipt,
    setIsBarcodeScannerOpen,
    setBarcodeScanTarget,
    formatCurrency,
    refreshData,
    dataVersion,
    lang
  } = useApp();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search query or selected category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryId]);

  // Payment Drawer Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Products and Categories
  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const categories = useMemo(() => db.getCategories(business.id), [business.id, dataVersion]);
  const customers = useMemo(() => db.getCustomers(business.id), [business.id, dataVersion]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategoryId !== 'all') {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, selectedCategoryId, searchQuery]);

  // Paginated Products calculation
  const itemsPerPage = 8;
  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / itemsPerPage);
  }, [filteredProducts.length]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, startIndex]);

  // Handle direct barcode scanner enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const prod = db.getProductByBarcode(barcodeInput.trim(), business.id);
    if (prod) {
      playBeep();
      addToCart(prod);
      setBarcodeInput('');
    } else {
      alert(lang === 'ar' ? `السلعة غير مسجلة بالباركود: ${barcodeInput}` : `Article non trouvé avec ce code-barres : ${barcodeInput}`);
    }
  };

  // Open payment dialog
  const handleProceedToPayment = () => {
    if (cart.length === 0) return;
    setAmountPaidInput(cartTotals.total.toString());
    setIsPaymentOpen(true);
  };

  // Calculate change to return (الصرف)
  const paidAmountNumber = parseFloat(amountPaidInput) || 0;
  const changeToReturn = Math.max(0, paidAmountNumber - cartTotals.total);
  const creditRemaining = selectedMethod === 'CREDIT' 
    ? cartTotals.total 
    : Math.max(0, cartTotals.total - paidAmountNumber);

  // Finalize Sale Transaction
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;

    const isCredit = selectedMethod === 'CREDIT';
    const actualAmountPaid = isCredit ? 0 : Math.min(paidAmountNumber, cartTotals.total);
    const finalAmountDue = isCredit ? cartTotals.total : Math.max(0, cartTotals.total - actualAmountPaid);

    if (finalAmountDue > 0 && !cartCustomer) {
      alert(lang === 'ar' ? '⚠️ يرجى تحديد العميل أولاً لتسجيل عملية البيع بالدين (الكريدي) أو المبلغ المتبقي في حسابه!' : '⚠️ Veuillez d\'abord sélectionner un client pour enregistrer la vente à crédit ou le montant restant sur son compte !');
      return;
    }

    const invoiceNumber = db.generateNextInvoiceNumber(business.id);

    const newSale: Sale = {
      id: 'sale-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      invoice_number: invoiceNumber,
      customer_id: cartCustomer ? cartCustomer.id : undefined,
      customer_name: cartCustomer ? cartCustomer.name : (lang === 'ar' ? 'زبون عام (Comptoir)' : 'Client Comptoir'),
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount,
      tax_total: cartTotals.taxTotal,
      total: cartTotals.total,
      amount_paid: actualAmountPaid,
      amount_due: finalAmountDue,
      payment_method: selectedMethod,
      status: 'COMPLETED',
      user_name: user.name,
      notes: saleNotes,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        discount: item.discount,
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        total: item.total,
      })),
      created_at: new Date().toISOString(),
    };

    // Save transaction in database
    db.createSale(newSale);

    // Immediately push customer with updated debt to cloud
    if (cartCustomer) {
      const updatedCust = db.getCustomerById(cartCustomer.id);
      if (updatedCust) {
        syncEngine.saveCustomerEverywhere(updatedCust).catch(() => {});
      }
    }
    syncEngine.syncAll().then(refreshData).catch(() => {});

    // Supermarket feedback
    playBeep();

    // Clear cart and UI state
    clearCart();
    setIsPaymentOpen(false);
    setAmountPaidInput('');
    setSaleNotes('');

    // Trigger Print Receipt Modal automatically
    setActiveSaleReceipt(newSale);
    refreshData();
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 pb-24 text-right flex flex-col h-auto lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
      
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'products'
              ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <span>{lang === 'ar' ? '📦 السلع والمنتجات' : '📦 Produits'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px]">
            {products.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <span>{lang === 'ar' ? '🛒 السلة والطلب' : '🛒 Panier'}</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {cart.length}
            </span>
          )}
        </button>
      </div>

       <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-visible lg:overflow-hidden">
        {/* LEFT / CENTER: Products Catalog & Search (60%) */}
        <div className={`flex-1 flex-col bg-transparent lg:bg-white lg:dark:bg-slate-900 rounded-3xl p-1 sm:p-4 border-none lg:border lg:border-slate-200/80 lg:dark:border-slate-800 shadow-none lg:shadow-xs overflow-visible lg:overflow-hidden ${
          mobileTab === 'products' ? 'flex' : 'hidden lg:flex'
        }`}>
        
        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن سلعة بالاسم أو الرمز...' : 'Rechercher un produit...'}
              className="w-full ps-9 pe-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden border border-slate-200/60 dark:border-slate-700 shadow-xs font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute end-3 top-3 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Hardware Barcode Enter */}
          <form onSubmit={handleBarcodeSubmit} className="hidden sm:flex">
            <input
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder={lang === 'ar' ? 'الباركود...' : 'Code-barres...'}
              className="w-32 px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-xs font-mono border border-slate-200/60 dark:border-slate-700 shadow-xs outline-hidden"
            />
          </form>

          {/* Camera Scanner Button */}
          <button
            onClick={() => {
              setBarcodeScanTarget('pos');
              setIsBarcodeScannerOpen(true);
            }}
            className="p-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
            title={lang === 'ar' ? 'فتح كاميرا مسح الباركود' : 'Ouvrir la caméra pour scanner'}
          >
            <Barcode className="w-5 h-5" />
          </button>
        </div>

        {/* Category Selector Dropdown */}
        <div className="relative mb-3 text-xs shrink-0 select-none">
          <div className="absolute start-3 top-2.5 text-slate-500 pointer-events-none flex items-center gap-1.5 font-bold">
            <Tag className="w-4 h-4 text-teal-600" />
            <span>{lang === 'ar' ? 'عرض فئة:' : 'Catégorie :'}</span>
          </div>
          <select
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className="w-full ps-24 pe-10 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-xs font-bold text-slate-800 dark:text-white outline-hidden focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer text-right"
          >
            <option value="all">{lang === 'ar' ? `جميع السلع والمنتجات (${products.length})` : `Tous les produits (${products.length})`}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon || '🏷️'} {cat.name}
              </option>
            ))}
          </select>
          <div className="absolute end-3.5 top-3 text-slate-400 pointer-events-none">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-visible lg:overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pe-1 content-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 text-xs">
              <Tag className="w-8 h-8 text-slate-300 mb-2" />
              <span>{lang === 'ar' ? 'لم يتم العثور على سلع تطابق البحث' : 'Aucun produit ne correspond à la recherche'}</span>
            </div>
          ) : (
            paginatedProducts.map(product => {
              const isOutOfStock = product.current_stock <= 0;
              return (
                <div
                  key={product.id}
                  onClick={() => {
                    playBeep();
                    addToCart(product);
                  }}
                  className={`p-2.5 rounded-2xl border text-right transition flex flex-col justify-between group active:scale-95 cursor-pointer relative overflow-hidden min-h-[190px] ${
                    isOutOfStock
                      ? 'border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 opacity-80 cursor-not-allowed'
                      : 'border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-teal-400 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Image on Top */}
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-24 rounded-xl object-cover border border-slate-100 dark:border-slate-800" 
                      />
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-lg">
                        📦
                      </div>
                    )}

                    {/* Product Name & Barcode */}
                    <div className="text-right">
                      <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {product.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {product.barcode}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Stock info at the bottom */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/60 flex items-end justify-between">
                    <div>
                      <span className="font-extrabold text-xs sm:text-sm text-teal-600 dark:text-teal-400">
                        {formatCurrency(product.sale_price)}
                      </span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      product.current_stock <= product.min_stock
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'text-slate-400'
                    }`}>
                      {product.current_stock} {formatUnit(product.unit, lang)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/60 shrink-0 text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                const gridElement = document.querySelector('.content-start');
                if (gridElement) gridElement.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-1 cursor-pointer transition ${
                currentPage === 1 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'hover:bg-slate-50 active:scale-95'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الصفحة السابقة' : 'Page précédente'}</span>
            </button>

            <div className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
              <span>{lang === 'ar' ? 'صفحة' : 'Page'}</span>
              <span className="text-teal-600 dark:text-teal-400 font-extrabold">{currentPage}</span>
              <span>{lang === 'ar' ? 'من' : 'sur'}</span>
              <span>{totalPages}</span>
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                const gridElement = document.querySelector('.content-start');
                if (gridElement) gridElement.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-1 cursor-pointer transition ${
                currentPage === totalPages 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'hover:bg-slate-50 active:scale-95'
              }`}
            >
              <span>{lang === 'ar' ? 'الصفحة التالية' : 'Page suivante'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* RIGHT: Active Cart, Customer & Total (40%) */}
      <div className={`w-full lg:w-96 flex-col bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0 ${
        mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Customer Header Selector */}
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setCustomerModalOpen(true)}
            className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer max-w-[200px] truncate"
          >
            <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="truncate">
              {cartCustomer ? cartCustomer.name : (lang === 'ar' ? 'زبون عام (Comptoir)' : 'Client Comptoir')}
            </span>
          </button>

          {cartCustomer && (
            <div className="text-[11px] text-amber-600 font-bold">
              {lang === 'ar' ? 'كريدي سابق:' : 'Crédit précédent :'} {formatCurrency(cartCustomer.total_debt)}
            </div>
          )}

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium cursor-pointer"
              title={lang === 'ar' ? 'إفراغ السلة' : 'Vider le panier'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إفراغ' : 'Vider'}</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="max-h-48 lg:max-h-none flex-1 overflow-y-auto py-2 space-y-2 pe-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 text-xs text-center">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                {lang === 'ar' ? 'السلة فارغة' : 'Panier vide'}
              </p>
              <span className="text-[11px] text-slate-400 mt-1">
                {lang === 'ar' ? 'اختر السلع من القائمة أو امسح الباركود للبدء' : 'Sélectionnez des produits ou scannez le code-barres pour commencer'}
              </span>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product_id}
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {item.product_name}
                  </div>
                  <div className="text-[11px] text-teal-600 font-semibold mt-0.5">
                    {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.total)}
                  </div>
                </div>

                {/* Qty increment / decrement */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                  <button
                    onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.product_id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals Summary and Checkout */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          
          {/* Quick Discount Input */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{lang === 'ar' ? 'الخصم المطبق (DH):' : 'Remise appliquée (DH) :'}</span>
            <input
              type="number"
              min="0"
              value={cartDiscount || ''}
              onChange={e => setCartDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-left font-bold text-xs bg-slate-50 dark:bg-slate-800 text-emerald-600"
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>{lang === 'ar' ? 'المجموع:' : 'Total :'}</span>
            <span>{formatCurrency(cartTotals.subtotal)}</span>
          </div>

          {business.taxEnabled && (
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>{lang === 'ar' ? `الضريبة TVA (${business.defaultTaxRate}%):` : `TVA (${business.defaultTaxRate}%) :`}</span>
              <span>{formatCurrency(cartTotals.taxTotal)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="font-bold text-sm text-slate-900 dark:text-white">{lang === 'ar' ? 'المجموع الإجمالي:' : 'Total Général :'}</span>
            <span className="font-extrabold text-lg text-teal-600 dark:text-teal-400">
              {formatCurrency(cartTotals.total)}
            </span>
          </div>

          {/* Big Checkout Button (Desktop only, mobile uses floating bottom bar) */}
          <button
            disabled={cart.length === 0}
            onClick={handleProceedToPayment}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-sm hidden lg:flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30'
            }`}
          >
            <span>{lang === 'ar' ? 'أداء وإنهاء الفاتورة' : 'Payer et finaliser'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

      </div>

      </div>

      {/* Customer Selection Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-right animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تحديد العميل للعملية' : 'Sélectionner le client pour la vente'}
              </h3>
              <button onClick={() => setCustomerModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {/* Default Walk-in Customer */}
              <button
                onClick={() => {
                  setCartCustomer(null);
                  setCustomerModalOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs font-bold transition flex items-center justify-between ${
                  !cartCustomer ? 'bg-teal-50 border-teal-500 text-teal-800' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{lang === 'ar' ? 'زبون عام (Comptoir)' : 'Client Comptoir'}</span>
                {!cartCustomer && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
              </button>

              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCartCustomer(c);
                    setCustomerModalOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-right text-xs transition flex items-center justify-between ${
                    cartCustomer?.id === c.id ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.phone}</div>
                  </div>
                  {c.total_debt > 0 && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      {lang === 'ar' ? 'كريدي:' : 'Crédit :'} {formatMAD(c.total_debt)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Drawer Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'طريقة الأداء والتسوية' : 'Mode de paiement et règlement'}
                </h3>
                <span className="text-xs text-slate-400">
                  {lang === 'ar' ? 'المبلغ المطلوب:' : 'Montant requis :'} {formatCurrency(cartTotals.total)}
                </span>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer info header in payment modal if selected */}
            {cartCustomer && (
              <div className="mb-3.5 p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{cartCustomer.name}</span>
                </div>
                <div className="text-amber-600 dark:text-amber-400 font-bold">
                  {lang === 'ar' ? 'كريدي سابق:' : 'Crédit précédent :'} {formatCurrency(cartCustomer.total_debt)}
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('CASH');
                  setAmountPaidInput(cartTotals.total.toString());
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  selectedMethod === 'CASH'
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-2 ring-teal-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700'
                }`}
              >
                <Wallet className="w-5 h-5 text-teal-600" />
                <span className="text-xs">{lang === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('CREDIT');
                  setAmountPaidInput('0');
                  if (!cartCustomer) {
                    setCustomerModalOpen(true);
                  }
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  selectedMethod === 'CREDIT'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold ring-2 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700'
                }`}
              >
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-black">{lang === 'ar' ? 'كريدي (دفتر)' : 'Crédit (Dette)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('CARD');
                  setAmountPaidInput(cartTotals.total.toString());
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                  selectedMethod === 'CARD'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold ring-2 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-xs">{lang === 'ar' ? 'بطاقة بنكية' : 'Carte Bancaire'}</span>
              </button>
            </div>

            {/* Cash Input & Quick Bills Helper */}
            {selectedMethod === 'CASH' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'المبلغ المستلم من الزبون (DH):' : 'Montant reçu du client (DH) :'}
                  </label>
                  <input
                    type="number"
                    value={amountPaidInput}
                    onChange={e => setAmountPaidInput(e.target.value)}
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-left font-bold text-sm bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Quick Bills for Morocco (20, 50, 100, 200 DH) */}
                <div className={`flex gap-1.5 ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}>
                  {[20, 50, 100, 200].map(bill => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setAmountPaidInput(bill.toString())}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-teal-50"
                    >
                      {bill} DH
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountPaidInput(cartTotals.total.toString())}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-bold"
                  >
                    {lang === 'ar' ? 'الضبط' : 'Exact'}
                  </button>
                </div>

                {/* Change return output */}
                {changeToReturn > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300">
                    <span>{lang === 'ar' ? 'الصرف الواجب إرجاعه للزبون:' : 'Monnaie à rendre au client :'}</span>
                    <span className="text-sm">{formatCurrency(changeToReturn)}</span>
                  </div>
                )}

                {/* Remaining debt warning */}
                {creditRemaining > 0 && (
                  <div className={`p-2.5 rounded-xl text-xs flex flex-col gap-1.5 border ${
                    !cartCustomer 
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300'
                  }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>{lang === 'ar' ? 'المبلغ المتبقي كدين (كريدي):' : 'Reste à payer (Dette / Crédit) :'}</span>
                      <span className="text-sm font-extrabold">{formatCurrency(creditRemaining)}</span>
                    </div>
                    {!cartCustomer && (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">
                        {lang === 'ar' ? '⚠️ يرجى تحديد العميل أولاً لتسجيل هذا الدين في حسابه!' : '⚠️ Veuillez sélectionner un client pour enregistrer cette dette sur son compte !'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Credit Warning if applicable */}
            {selectedMethod === 'CREDIT' && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs mb-4 text-amber-900 dark:text-amber-200 leading-relaxed">
                {!cartCustomer ? (
                  <span className="font-bold text-rose-600">
                    {lang === 'ar' ? '⚠️ تنبيه: يجب اختيار العميل أولاً لتسجيل الدين في ذمته!' : '⚠️ Attention: Vous devez sélectionner un client pour lui accorder un crédit !'}
                  </span>
                ) : (
                  <div>
                    {lang === 'ar' ? (
                      <>
                        سيتم إضافة مبلغ <strong>{formatCurrency(cartTotals.total)}</strong> إلى دين العميل{' '}
                        <strong>{cartCustomer.name}</strong>.
                      </>
                    ) : (
                      <>
                        Le montant de <strong>{formatCurrency(cartTotals.total)}</strong> sera ajouté aux dettes du client{' '}
                        <strong>{cartCustomer.name}</strong>.
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note Input */}
            <div className="mb-4">
              <input
                type="text"
                value={saleNotes}
                onChange={e => setSaleNotes(e.target.value)}
                placeholder={lang === 'ar' ? 'ملاحظات اختيارية على الفاتورة...' : 'Notes optionnelles sur la facture...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تأكيد وطباعة الفاتورة' : 'Confirmer et imprimer la facture'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Quick Checkout Bar for Mobile */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40 bg-teal-700 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-teal-200">
              {lang === 'ar' ? `الإجمالي (${cart.length} سلع):` : `Total (${cart.length} art.) :`}
            </span>
            <span className="font-extrabold text-base">{formatCurrency(cartTotals.total)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileTab('cart');
              handleProceedToPayment();
            }}
            className="px-4 py-2.5 rounded-xl bg-white text-teal-800 font-extrabold text-xs shadow-md hover:bg-teal-50 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>{lang === 'ar' ? 'أداء وإنهاء الفاتورة' : 'Payer et finaliser'}</span>
            <ArrowLeft className={`w-4 h-4 ${lang === 'fr' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

    </div>
  );
};
