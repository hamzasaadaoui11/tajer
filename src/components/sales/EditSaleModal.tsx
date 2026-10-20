import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Sale, SaleItem, Product, PaymentMethod } from '../../types';
import { syncEngine } from '../../services/sync';

interface EditSaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  onClose,
  onSuccess
}) => {
  const { business, branch, user, formatCurrency, refreshData, lang } = useApp();

  const [items, setItems] = useState<SaleItem[]>([...sale.items]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.payment_method);
  const [amountPaid, setAmountPaid] = useState<string>((sale.amount_paid || 0).toString());
  const [notes, setNotes] = useState(sale.notes || '');

  // Add Product Search / Selector State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState('1');

  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      !productSearch || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.barcode.includes(productSearch)
    );
  }, [products, productSearch]);

  const handleQuantityChange = (productId: string, newQty: number) => {
    setItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const qty = Math.max(0.001, newQty);
        return {
          ...item,
          quantity: qty,
          total: Math.round(qty * item.unit_price * 100) / 100
        };
      }
      return item;
    }));
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    setItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const price = Math.max(0, newPrice);
        return {
          ...item,
          unit_price: price,
          total: Math.round(item.quantity * price * 100) / 100
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleAddProduct = (product: Product) => {
    const q = parseFloat(addQty) || 1;
    const existingIdx = items.findIndex(it => it.product_id === product.id);

    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += q;
      updated[existingIdx].total = Math.round(updated[existingIdx].quantity * updated[existingIdx].unit_price * 100) / 100;
      setItems(updated);
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
    setSelectedProductId('');
    setAddQty('1');
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const taxRate = sale.tax_rate || business.defaultTaxRate || 20;
  const taxTotal = business.taxEnabled ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = subtotal + taxTotal;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert(lang === 'ar' ? '⚠️ لا يمكن حفظ فاتورة فارغة بدون سلع!' : '⚠️ Impossible d\'enregistrer une facture vide !');
      return;
    }

    const paidNum = paymentMethod === 'CREDIT' ? 0 : (parseFloat(amountPaid) || 0);

    db.updateSale(
      sale.id,
      items,
      paymentMethod,
      paidNum,
      notes,
      user.name
    );

    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-6"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>{lang === 'ar' ? `تعديل الفاتورة: ${sale.invoice_number}` : `Modifier la facture : ${sale.invoice_number}`}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {lang === 'ar' ? 'إضافة سلع جديدة، حذف سلع، أو تعديل الكميات والأسعار' : 'Ajouter, supprimer ou modifier les articles et quantités'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* 1. Add New Product Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? '➕ إضافة سلعة جديدة للفاتورة:' : '➕ Ajouter un nouveau produit :'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن اسم السلعة لإضافتها...' : 'Rechercher un produit à ajouter...'}
                  className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <input
                type="number"
                step="any"
                min="0.001"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                className="w-20 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-center"
                placeholder={lang === 'ar' ? 'الكمية' : 'Qté'}
              />
            </div>

            {/* Product Suggestions Dropdown */}
            {productSearch.trim().length > 0 && (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    {lang === 'ar' ? 'لا توجد سلعة مطابقة للبحث' : 'Aucun produit trouvé'}
                  </div>
                ) : (
                  filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="p-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {lang === 'ar' ? `المخزون: ${p.current_stock} • السعر: ${formatCurrency(p.sale_price)}` : `Stock: ${p.current_stock} • Prix: ${formatCurrency(p.sale_price)}`}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-[11px]">
                        {lang === 'ar' ? '+ إضافة' : '+ Ajouter'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Current Items List */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? `سلع الفاتورة الحاليـة (${items.length} أصناف):` : `Articles actuels (${items.length}) :`}
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  {lang === 'ar' ? 'لا توجد سلع في الفاتورة' : 'Aucun article dans la facture'}
                </div>
              ) : (
                items.map(item => (
                  <div key={item.product_id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{item.product_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {lang === 'ar' ? 'المجموع الجزئي: ' : 'Total partiel : '}
                        <span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrency(item.total)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Unit Price */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الثمن (DH)' : 'Prix (DH)'}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_price}
                          onChange={e => handlePriceChange(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-center text-xs"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">{lang === 'ar' ? 'الكمية' : 'Qté'}</span>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.quantity}
                          onChange={e => handleQuantityChange(item.product_id, parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 rounded-xl border border-teal-500 bg-white dark:bg-slate-800 font-extrabold text-center text-xs text-teal-700 dark:text-teal-300"
                        />
                      </div>

                      {/* Delete item */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition cursor-pointer self-end sm:self-center"
                        title={lang === 'ar' ? 'حذف السلعة' : 'Supprimer'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'طريقة الأداء' : 'Mode de paiement'}
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
              >
                <option value="CASH">{lang === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</option>
                <option value="CARD">{lang === 'ar' ? 'بطاقة بنكية (Carte)' : 'Carte Bancaire'}</option>
                <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي (Virement)' : 'Virement'}</option>
                <option value="CREDIT">{lang === 'ar' ? 'كريدي / دين (Crédit)' : 'Crédit / Dette'}</option>
              </select>
            </div>

            {paymentMethod !== 'CREDIT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المبلغ المؤدى (DH)' : 'Montant payé (DH)'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'ar' ? 'ملاحظات الفاتورة' : 'Remarques sur la facture'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {/* Grand Total Summary Box */}
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-teal-800 dark:text-teal-300 block font-bold">
                {lang === 'ar' ? 'المجموع الإجمالي الجديد:' : 'Nouveau Total Général :'}
              </span>
              <span className="text-xs text-slate-500">
                {subtotal.toFixed(2)} DH {taxTotal > 0 ? `+ TVA ${taxTotal.toFixed(2)} DH` : ''}
              </span>
            </div>
            <div className="text-xl font-black text-teal-700 dark:text-teal-300">
              {formatCurrency(grandTotal)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ تعديلات الفاتورة والمخزون' : 'Enregistrer les modifications'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
