import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Minus,
  Trash2, 
  Save, 
  Search, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  DollarSign,
  Barcode,
  ShoppingBag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Sale, SaleItem, Product, PaymentMethod } from '../../types';
import { syncEngine } from '../../services/sync';

interface EditSaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: (updatedSale?: Sale) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  onClose,
  onSuccess
}) => {
  const { business, branch, user, formatCurrency, refreshData, openBarcodeScanner, lang } = useApp();

  const [items, setItems] = useState<SaleItem[]>(() => {
    return Array.isArray(sale.items) ? sale.items.map(it => ({ ...it })) : [];
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.payment_method || 'CASH');
  const [amountPaid, setAmountPaid] = useState<string>((sale.amount_paid ?? 0).toString());
  const [notes, setNotes] = useState(sale.notes || '');

  // Add Product Search / Selector State
  const [productSearch, setProductSearch] = useState('');
  const [addQty, setAddQty] = useState('1');

  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, productSearch]);

  const handleQuantityChange = (productId: string, newQty: number) => {
    const qty = Math.max(0.001, Math.round(newQty * 1000) / 1000);
    setItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: qty,
          subtotal: Math.round(qty * item.unit_price * 100) / 100,
          total: Math.round(qty * item.unit_price * 100) / 100
        };
      }
      return item;
    }));
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    const price = Math.max(0, Math.round(newPrice * 100) / 100);
    setItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          unit_price: price,
          subtotal: Math.round(item.quantity * price * 100) / 100,
          total: Math.round(item.quantity * price * 100) / 100
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleAddProduct = (product: Product, quantityToAdd?: number) => {
    const q = quantityToAdd || parseFloat(addQty) || 1;
    const existingIdx = items.findIndex(it => it.product_id === product.id);

    if (existingIdx !== -1) {
      setItems(prev => {
        const updated = [...prev];
        const newQty = Math.round((updated[existingIdx].quantity + q) * 1000) / 1000;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          subtotal: Math.round(newQty * updated[existingIdx].unit_price * 100) / 100,
          total: Math.round(newQty * updated[existingIdx].unit_price * 100) / 100,
        };
        return updated;
      });
    } else {
      const newItem: SaleItem = {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode || '',
        quantity: q,
        unit_price: product.sale_price,
        purchase_price: product.purchase_price || 0,
        discount: 0,
        subtotal: Math.round(q * product.sale_price * 100) / 100,
        tax_amount: 0,
        total: Math.round(q * product.sale_price * 100) / 100,
      };
      setItems(prev => [...prev, newItem]);
    }

    setProductSearch('');
    setAddQty('1');
  };

  // Barcode Scanner integration
  const handleOpenScanner = () => {
    openBarcodeScanner('custom', (code) => {
      const found = products.find(p => p.barcode === code || p.sku === code);
      if (found) {
        handleAddProduct(found, 1);
      } else {
        setProductSearch(code);
      }
    });
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const taxRate = sale.tax_rate || (business.taxEnabled ? business.defaultTaxRate || 20 : 0);
  const taxTotal = business.taxEnabled ? Math.round(((subtotal * taxRate) / 100) * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert(lang === 'ar' ? '⚠️ لا يمكن حفظ فاتورة بدون سلع! يرجى إضافة سلعة واحدة على الأقل.' : '⚠️ Impossible d\'enregistrer une facture vide !');
      return;
    }

    const paidNum = paymentMethod === 'CREDIT' ? 0 : (parseFloat(amountPaid) || 0);

    const res = db.updateSale(
      sale.id,
      items,
      paymentMethod,
      paidNum,
      notes,
      user?.name || 'مدير النظام'
    );

    if (res.sale) {
      // Push the modified invoice and updated product stocks directly to Supabase
      syncEngine.syncSaleAndStockEverywhere(res.sale).catch(err => {
        console.warn('Direct Supabase sale update notice:', err);
      });
    }

    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
    onSuccess(res.sale);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-6"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>{lang === 'ar' ? `تعديل الفاتورة: ${sale.invoice_number}` : `Modifier la facture : ${sale.invoice_number}`}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' ? 'تعديل السلع، إضافة أو إنقاص الكمية، وتغيير الأثمنة وطريقة الأداء' : 'Modifier les articles, quantités, prix et mode de paiement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          
          {/* 1. Add New Product Section */}
          <div className="bg-teal-50/40 dark:bg-teal-950/20 p-3.5 sm:p-4 rounded-2xl border border-teal-100 dark:border-teal-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-teal-900 dark:text-teal-200">
                {lang === 'ar' ? '➕ إضافة سلعة إلى الفاتورة:' : '➕ Ajouter un article à la facture :'}
              </label>
              <button
                type="button"
                onClick={handleOpenScanner}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              >
                <Barcode className="w-3.5 h-3.5 text-teal-600" />
                <span>{lang === 'ar' ? 'مسح باركود' : 'Scanner'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث باسم السلعة أو الباركود لإضافتها...' : 'Rechercher un produit à ajouter...'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
              <input
                type="number"
                step="any"
                min="0.001"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                className="w-20 px-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-black text-center"
                placeholder={lang === 'ar' ? 'الكمية' : 'Qté'}
                title={lang === 'ar' ? 'الكمية المراد إضافتها' : 'Quantité à ajouter'}
              />
            </div>

            {/* Product Suggestions Dropdown */}
            {productSearch.trim().length > 0 && (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl">
                {filteredProducts.length === 0 ? (
                  <div className="p-3.5 text-center text-xs text-slate-400">
                    {lang === 'ar' ? 'لا توجد سلعة مطابقة للاسم أو الباركود' : 'Aucun produit trouvé'}
                  </div>
                ) : (
                  filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="p-3 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {lang === 'ar' ? `المخزون: ${p.current_stock} • الثمن: ` : `Stock: ${p.current_stock} • Prix: `}
                          <span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrency(p.sale_price)}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs">
                        {lang === 'ar' ? '+ إضافة' : '+ Ajouter'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Current Items List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'سلع الفاتورة الحالية' : 'Articles dans la facture'}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-teal-600">
                  {items.length}
                </span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {lang === 'ar' ? 'يمكنك تعديل الثمن أو الكمية مباشرة' : 'Modifiez le prix ou la quantité'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                  {lang === 'ar' ? 'الفاتورة فارغة حالياً. استخدم البحث أعلاه لإضافة سلع.' : 'Aucun article dans cette facture.'}
                </div>
              ) : (
                items.map(item => (
                  <div 
                    key={item.product_id} 
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-teal-300 dark:hover:border-teal-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{lang === 'ar' ? 'المجموع الجزئي:' : 'Total :'}</span>
                        <span className="font-black text-teal-600 dark:text-teal-400">{formatCurrency(item.total)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
                      {/* Unit Price */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 mb-1">
                          {lang === 'ar' ? 'الثمن للقطعة (DH)' : 'Prix Unitaire (DH)'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_price}
                          onChange={e => handlePriceChange(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-black text-center text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Quantity with +/- Stepper */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 mb-1">
                          {lang === 'ar' ? 'الكمية' : 'Quantité'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product_id, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition cursor-pointer active:scale-95 shadow-2xs"
                            title={lang === 'ar' ? 'إنقاص 1' : '-1'}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity}
                            onChange={e => handleQuantityChange(item.product_id, parseFloat(e.target.value) || 1)}
                            className="w-16 px-1.5 py-1.5 rounded-xl border border-teal-500 bg-white dark:bg-slate-800 font-black text-center text-xs text-teal-700 dark:text-teal-300 focus:ring-2 focus:ring-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                            className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black hover:bg-teal-100 transition cursor-pointer active:scale-95 shadow-2xs"
                            title={lang === 'ar' ? 'زيادة 1' : '+1'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Delete item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer active:scale-95 mt-4 sm:mt-0"
                        title={lang === 'ar' ? 'حذف هذه السلعة من الفاتورة' : 'Supprimer cet article'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Payment Method & Amount Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'ar' ? 'طريقة الأداء' : 'Mode de paiement'}
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="CASH">{lang === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</option>
                <option value="CARD">{lang === 'ar' ? 'بطاقة بنكية (Carte)' : 'Carte Bancaire'}</option>
                <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي (Virement)' : 'Virement'}</option>
                <option value="CREDIT">{lang === 'ar' ? 'كريدي / دين (Crédit)' : 'Crédit / Dette'}</option>
              </select>
            </div>

            {paymentMethod !== 'CREDIT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'المبلغ المؤدى (DH)' : 'Montant payé (DH)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'ar' ? 'ملاحظات الفاتورة (اختياري)' : 'Remarques (optionnel)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === 'ar' ? 'أي ملاحظة إضافية تظهر في الفاتورة...' : 'Remarque à afficher sur la facture...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Grand Total Summary Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-teal-800 dark:text-teal-300 block font-bold">
                {lang === 'ar' ? 'المجموع الإجمالي الجديد بعد التعديل:' : 'Nouveau Total Général :'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {subtotal.toFixed(2)} DH {taxTotal > 0 ? `+ ضريبة ${taxTotal.toFixed(2)} DH` : ''}
              </span>
            </div>
            <div className="text-2xl font-black text-teal-700 dark:text-teal-300">
              {formatCurrency(grandTotal)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 transition active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ تعديلات الفاتورة وتحديث المخزون' : 'Enregistrer les modifications'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
