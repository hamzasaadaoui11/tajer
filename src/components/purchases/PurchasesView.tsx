import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  X, 
  DollarSign, 
  Package, 
  PlusCircle,
  Trash2,
  FileText,
  Printer
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Purchase, PurchaseItem, PaymentMethod } from '../../types';
import { formatMAD } from '../../i18n/locales';
import { PurchaseReceiptModal } from './PurchaseReceiptModal';

export const PurchasesView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang } = useApp();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchaseForReceipt, setSelectedPurchaseForReceipt] = useState<Purchase | null>(null);

  // New Purchase Form
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Cart for purchase items
  const [purchaseItems, setPurchaseItems] = useState<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_cost: number;
  }[]>([]);

  const purchases = useMemo(() => db.getPurchases(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const suppliers = useMemo(() => db.getSuppliers(business.id), [business.id, dataVersion]);
  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id, dataVersion]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => 
      !search || 
      p.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [purchases, search]);

  const purchaseSubtotal = useMemo(() => {
    return purchaseItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  }, [purchaseItems]);

  const handleOpenNew = () => {
    setSupplierId(suppliers[0]?.id || '');
    setPaymentMethod('CASH');
    setNotes('');
    setPurchaseItems([]);
    if (products.length > 0) {
      setPurchaseItems([
        {
          product_id: products[0].id,
          product_name: products[0].name,
          quantity: 10,
          unit_cost: products[0].purchase_price || 10,
        }
      ]);
    }
    setAmountPaid('');
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setPurchaseItems(prev => [
      ...prev,
      {
        product_id: products[0].id,
        product_name: products[0].name,
        quantity: 5,
        unit_cost: products[0].purchase_price || 10,
      }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx: number, field: string, val: string | number) => {
    setPurchaseItems(prev => {
      const copy = [...prev];
      if (field === 'product_id') {
        const prod = products.find(p => p.id === val);
        if (prod) {
          copy[idx].product_id = prod.id;
          copy[idx].product_name = prod.name;
          copy[idx].unit_cost = prod.purchase_price;
        }
      } else if (field === 'quantity') {
        copy[idx].quantity = Math.max(1, parseFloat(val as string) || 1);
      } else if (field === 'unit_cost') {
        copy[idx].unit_cost = Math.max(0, parseFloat(val as string) || 0);
      }
      return copy;
    });
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert(lang === 'ar' ? 'يرجى إضافة سلعة واحدة على الأقل' : 'Veuillez ajouter au moins un article');
      return;
    }
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) {
      alert(lang === 'ar' ? 'يرجى اختيار المورد' : 'Veuillez choisir un fournisseur');
      return;
    }

    const inputVal = amountPaid.trim();
    const paidNum = paymentMethod === 'CREDIT' 
      ? 0 
      : inputVal === '' 
        ? purchaseSubtotal 
        : Math.max(0, parseFloat(inputVal) || 0);
        
    const dueNum = Math.max(0, purchaseSubtotal - paidNum);

    const purchaseData: Purchase = {
      id: 'purch-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      invoice_number: db.generateNextPurchaseNumber(business.id),
      supplier_id: sup.id,
      supplier_name: sup.name,
      subtotal: purchaseSubtotal,
      extra_fees: 0,
      discount: 0,
      total: purchaseSubtotal,
      amount_paid: paidNum,
      amount_due: dueNum,
      payment_method: paymentMethod,
      user_name: user.name,
      notes,
      items: purchaseItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        subtotal: i.quantity * i.unit_cost,
        tax_amount: 0,
        total: i.quantity * i.unit_cost,
      })),
      created_at: new Date().toISOString(),
    };

    const newPurchase = db.createPurchase(purchaseData);
    setIsModalOpen(false);
    refreshData();
    // Open A4 invoice modal directly so user can print/view right away
    setSelectedPurchaseForReceipt(newPurchase || (purchaseData as Purchase));
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-4`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'فواتير المشتريات والتوريد' : "Factures d'Achats & Approvisionnement"}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {lang === 'ar' 
              ? `إجمالي فواتير التوريد: ${purchases.length} عملية` 
              : `Total bons d'achat : ${purchases.length} opération(s)`}
          </span>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'فاتورة شراء جديدة' : 'Nouvel achat'}</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative">
          <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث برقم الفاتورة أو المورد...' : 'Rechercher par n° de facture ou fournisseur...'}
            className={`w-full ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent outline-hidden`}
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              {lang === 'ar' ? 'لا توجد فواتير شراء وتوريد مسجلة' : "Aucune facture d'achat ou d'approvisionnement enregistrée"}
            </div>
          ) : (
            filteredPurchases.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPurchaseForReceipt(p)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition">
                      {p.invoice_number}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-100 dark:border-teal-900/50">
                      {p.supplier_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>{new Date(p.created_at).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                    <span>•</span>
                    <span>{lang === 'ar' ? `${p.items.length} أصناف تم توريدها` : `${p.items.length} article(s) approvisionné(s)`}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(p.total)}
                    </div>
                    {p.amount_due > 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                        {lang === 'ar' 
                          ? `باقي للمورد: ${formatCurrency(p.amount_due)}` 
                          : `Reste dû au fournisseur : ${formatCurrency(p.amount_due)}`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {lang === 'ar' ? 'مدفوعة بالكامل' : 'Payée en totalité'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPurchaseForReceipt(p);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 dark:hover:text-teal-400 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                    title={lang === 'ar' ? 'معاينة وطباعة الفاتورة A4 أو تحميل PDF' : 'Aperçu et impression facture A4 ou export PDF'}
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{lang === 'ar' ? 'فاتورة A4 / PDF' : 'Facture A4 / PDF'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className={`w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col`}>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'فاتورة شراء وتوريد سلع جديدة' : "Nouveau bon d'achat & approvisionnement"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'تسجيل السلع الواردة وتحديث المخزون تلقائياً' : 'Enregistrement des marchandises reçues et mise à jour automatique du stock'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 overflow-y-auto pe-1">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المورد أو الشركة *' : 'Fournisseur ou Société *'}
                </label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' 
                      ? `السلع المشتراة وتكلفتها (${purchaseItems.length})` 
                      : `Articles achetés et coût (${purchaseItems.length})`}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة سلعة أخرى' : 'Ajouter un article'}</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  {purchaseItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                    >
                      {/* Item Selector & Delete Button */}
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <select
                          value={item.product_id}
                          onChange={e => handleUpdateItemRow(idx, 'product_id', e.target.value)}
                          className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500 truncate"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 cursor-pointer"
                          title={lang === 'ar' ? 'حذف هذا السطر' : 'Supprimer cette ligne'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity, Unit Cost, and Total Grid */}
                      <div className={`grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                            {lang === 'ar' ? 'الكمية' : 'Quantité'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItemRow(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center font-bold text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                            {lang === 'ar' ? 'سعر الشراء (د.م.)' : "Prix d'achat (DH)"}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={e => handleUpdateItemRow(idx, 'unit_cost', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-teal-500/60 dark:border-teal-500/60 bg-teal-50/30 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 text-center font-bold text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className={`flex flex-col justify-end pb-1 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                          <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'المجموع:' : 'Total :'}</span>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                            {formatMAD(item.quantity * item.unit_cost, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Banner */}
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-bold text-teal-900 dark:text-teal-200">
                  {lang === 'ar' ? 'إجمالي فاتورة الشراء:' : "Total facture d'achat :"}
                </span>
                <span className="font-black text-base sm:text-lg text-teal-700 dark:text-teal-400 font-mono">
                  {formatMAD(purchaseSubtotal, lang)}
                </span>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'طريقة الأداء' : 'Mode de règlement'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="CASH">{lang === 'ar' ? 'نقداً من الصندوق (Cash)' : 'Espèces (Caisse)'}</option>
                    <option value="CREDIT">{lang === 'ar' ? 'كريدي (على حساب المورد)' : 'À crédit (Compte fournisseur)'}</option>
                    <option value="BANK_TRANSFER">{lang === 'ar' ? 'تحويل بنكي (Virement)' : 'Virement bancaire'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'المبلغ المدفوع (DH)' : 'Montant payé (DH)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder={paymentMethod === 'CREDIT' ? '0' : purchaseSubtotal.toString()}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-98 transition cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ الفاتورة وتزويد المخزون' : 'Enregistrer le bon & mettre à jour le stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase A4 Receipt Modal */}
      {selectedPurchaseForReceipt && (
        <PurchaseReceiptModal
          purchase={selectedPurchaseForReceipt}
          supplier={suppliers.find(s => s.id === selectedPurchaseForReceipt.supplier_id)}
          onClose={() => setSelectedPurchaseForReceipt(null)}
        />
      )}

    </div>
  );
};
