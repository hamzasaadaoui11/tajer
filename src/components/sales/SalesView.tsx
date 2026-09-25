import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Receipt, 
  RotateCcw, 
  Share2, 
  Calendar, 
  User, 
  X, 
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Sale, SaleReturn, PaymentMethod } from '../../types';
import { generateSaleWhatsAppText, openWhatsApp } from '../../services/whatsapp';
import { formatMAD } from '../../i18n/locales';
import { syncEngine } from '../../services/sync';

export const SalesView: React.FC = () => {
  const { business, branch, user, formatCurrency, setActiveSaleReceipt, refreshData, dataVersion, lang } = useApp();

  const [search, setSearch] = useState('');
  const [returnModalSale, setReturnModalSale] = useState<Sale | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState(lang === 'ar' ? 'سلعة معيبة أو رغبة الزبون' : 'Article défectueux ou souhait client');
  
  // Convert/Adjust Payment Modal
  const [editPaymentSale, setEditPaymentSale] = useState<Sale | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('CREDIT');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState('0');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const sales = useMemo(() => db.getSales(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const customers = useMemo(() => db.getCustomers(business.id), [business.id, dataVersion]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      !search || 
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sales, search]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSales, currentPage]);

  const handleOpenEditPayment = (sale: Sale) => {
    setEditPaymentSale(sale);
    setEditPaymentMethod(sale.payment_method === 'CREDIT' ? 'CREDIT' : 'CREDIT');
    setEditCustomerId(sale.customer_id || '');
    setEditAmountPaid(sale.payment_method === 'CREDIT' ? '0' : (sale.amount_paid || 0).toString());
  };

  const handleSaveEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaymentSale) return;

    const paidNum = parseFloat(editAmountPaid) || 0;
    const dueNum = Math.max(0, editPaymentSale.total - paidNum);

    if (dueNum > 0 && !editCustomerId) {
      alert(lang === 'ar' ? '⚠️ يرجى تحديد العميل لتسجيل المبلغ المتبقي كدين في ذمته!' : '⚠️ Veuillez sélectionner un client pour enregistrer la créance !');
      return;
    }

    const selectedCust = customers.find(c => c.id === editCustomerId);
    const customerName = selectedCust ? selectedCust.name : editPaymentSale.customer_name;

    db.updateSalePaymentStatus(
      business.id,
      editPaymentSale.id,
      editPaymentMethod,
      paidNum,
      editCustomerId || undefined,
      customerName,
      user.name
    );

    if (editCustomerId && selectedCust) {
      const updatedCust = db.getCustomerById(editCustomerId);
      if (updatedCust) syncEngine.saveCustomerEverywhere(updatedCust).catch(() => {});
    }

    setEditPaymentSale(null);
    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
  };

  const handleOpenReturn = (sale: Sale) => {
    setReturnModalSale(sale);
    setReturnReason(lang === 'ar' ? 'سلعة معيبة أو رغبة الزبون' : 'Article défectueux ou souhait client');
    const initial: Record<string, number> = {};
    for (const item of sale.items) {
      initial[item.product_id] = 0;
    }
    setReturnQtys(initial);
  };

  const handleExecuteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSale) return;

    const returnItems = returnModalSale.items
      .filter(item => (returnQtys[item.product_id] || 0) > 0)
      .map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: returnQtys[item.product_id],
        unit_price: item.unit_price,
        total: returnQtys[item.product_id] * item.unit_price,
      }));

    if (returnItems.length === 0) {
      alert(lang === 'ar' ? 'يرجى تحديد كمية سلعة واحدة على الأقل لإرجاعها' : 'Veuillez sélectionner au moins un article à retourner');
      return;
    }

    const totalRefund = returnItems.reduce((acc, it) => acc + it.total, 0);

    const saleReturn: SaleReturn = {
      id: 'ret-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      sale_id: returnModalSale.id,
      invoice_number: 'RET-' + returnModalSale.invoice_number,
      customer_id: returnModalSale.customer_id,
      customer_name: returnModalSale.customer_name,
      items: returnItems,
      total_refund: totalRefund,
      reason: returnReason,
      user_name: user.name,
      created_at: new Date().toISOString(),
    };

    db.createSaleReturn(saleReturn);
    setReturnModalSale(null);
    refreshData();
    alert(lang === 'ar' 
      ? `تم تسجيل المرتجع بنجاح واسترجاع السلع للمخزون بقيمة ${formatCurrency(totalRefund)}`
      : `Retour enregistré avec succès et stock réintégré pour une valeur de ${formatCurrency(totalRefund)}`);
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-4`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'سجل المبيعات والفواتير' : 'Historique des Ventes & Factures'}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {lang === 'ar' 
              ? `إجمالي العمليات المسجلة: ${sales.length} فاتورة` 
              : `Total des ventes enregistrées : ${sales.length} facture(s)`}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3`} />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={lang === 'ar' ? 'بحث برقم الفاتورة أو العميل...' : 'Rechercher par n° ou client...'}
            className={`w-full ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent outline-hidden`}
          />
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-12 text-center text-slate-400 text-xs">
            {lang === 'ar' ? 'لم يتم العثور على أي فواتير بيع' : 'Aucune facture de vente trouvée'}
          </div>
        ) : (
          paginatedSales.map(sale => (
            <div
              key={sale.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-400 dark:hover:border-teal-500/75 hover:shadow-xs transition duration-150"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {sale.invoice_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sale.payment_method === 'CASH'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : sale.payment_method === 'CREDIT'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    }`}>
                      {sale.payment_method === 'CASH' 
                        ? (lang === 'ar' ? 'نقداً' : 'Espèces') 
                        : sale.payment_method === 'CREDIT' 
                        ? (lang === 'ar' ? 'كريدي' : 'Crédit') 
                        : sale.payment_method}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                      {sale.customer_name || (lang === 'ar' ? 'زبون عام' : 'Client comptoir')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="font-mono text-slate-400">
                      {new Date(sale.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')} {new Date(sale.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {lang === 'ar' 
                        ? `${sale.items.length} أصناف (${sale.items.reduce((sum, item) => sum + item.quantity, 0)} قطع)`
                        : `${sale.items.length} article(s) (${sale.items.reduce((sum, item) => sum + item.quantity, 0)} pcs)`}
                    </span>
                  </div>

                  {sale.notes && (
                    <div className="text-[11px] text-amber-600 mt-0.5 font-medium">
                      {sale.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                  <div className="font-black text-sm text-slate-900 dark:text-white">
                    {formatCurrency(sale.total)}
                  </div>
                  {sale.amount_due > 0 && (
                    <div className="text-[10px] text-rose-600 font-bold animate-pulse">
                      {lang === 'ar' ? `باقي: ${formatCurrency(sale.amount_due)}` : `Reste: ${formatCurrency(sale.amount_due)}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* View/Print Invoice */}
                  <button
                    onClick={() => setActiveSaleReceipt(sale)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'عرض' : 'Voir'}</span>
                  </button>

                  {/* Convert / Adjust Payment to Credit */}
                  <button
                    onClick={() => handleOpenEditPayment(sale)}
                    className="p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800 cursor-pointer transition"
                    title={lang === 'ar' ? 'تعديل طريقة الأداء / تسجيل كدين كريدي' : 'Modifier le mode de paiement'}
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>

                  {/* Return Item */}
                  <button
                    onClick={() => handleOpenReturn(sale)}
                    className="p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800 cursor-pointer transition"
                    title={lang === 'ar' ? 'تسجيل إرجاع بضاعة (Retour)' : 'Retour de marchandise'}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={() => {
                      const text = generateSaleWhatsAppText(sale, business);
                      openWhatsApp('', text);
                    }}
                    className="p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition"
                    title={lang === 'ar' ? 'مشاركة الفاتورة عبر واتساب' : 'Partager sur WhatsApp'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Premium Professional Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 px-5 py-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs mt-4 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span>{lang === 'ar' ? 'عرض' : 'Affichage'}</span>
            <span className="text-slate-900 dark:text-white font-extrabold mx-1">{paginatedSales.length}</span>
            <span>{lang === 'ar' ? 'من أصل' : 'sur'}</span>
            <span className="text-slate-900 dark:text-white font-extrabold mx-1">{filteredSales.length}</span>
            <span>{lang === 'ar' ? 'عملية بيع' : 'vente(s)'}</span>
          </div>

          <div className="flex items-center gap-1.5" dir="ltr">
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
              title={lang === 'ar' ? 'السابق' : 'Précédent'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                Math.abs(pageNum - currentPage) <= 1
              ) {
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }

              if (
                pageNum === 2 ||
                pageNum === totalPages - 1
              ) {
                return (
                  <span key={pageNum} className="w-4 text-center text-slate-400 font-mono">
                    ...
                  </span>
                );
              }

              return null;
            })}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
              title={lang === 'ar' ? 'التالي' : 'Suivant'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sale Return Modal */}
      {returnModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'مرتجع مبيعات (Retour article)' : 'Retour de vente'}
                </h3>
                <span className="text-xs text-slate-500">
                  {lang === 'ar' ? `الفاتورة: ${returnModalSale.invoice_number}` : `Facture : ${returnModalSale.invoice_number}`}
                </span>
              </div>
              <button onClick={() => setReturnModalSale(null)} className="text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReturn} className="space-y-3.5">
              <div className="text-xs text-slate-500 mb-1">
                {lang === 'ar' 
                  ? 'حدد كمية السلع المراد استرجاعها وإدخالها للمخزون ثانية:' 
                  : 'Indiquez les quantités d\'articles à réintégrer au stock :'}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {returnModalSale.items.map(item => (
                  <div key={item.product_id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold">{item.product_name}</div>
                      <div className="text-[10px] text-slate-500">
                        {lang === 'ar' 
                          ? `الكمية المباعة: ${item.quantity} (${formatMAD(item.unit_price, lang)} للقطعة)` 
                          : `Qté vendue: ${item.quantity} (${formatMAD(item.unit_price, lang)}/pc)`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'كمية الإرجاع:' : 'Qté retour:'}</span>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnQtys[item.product_id] || 0}
                        onChange={e => {
                          const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                          setReturnQtys(prev => ({ ...prev, [item.product_id]: val }));
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-teal-500 text-center font-bold text-xs bg-white dark:bg-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'سبب الإرجاع' : 'Motif du retour'}
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'تأكيد المرتجع واسترداد السلع' : 'Confirmer le retour & réintégrer au stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setReturnModalSale(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment / Convert to Credit Modal */}
      {editPaymentSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تعديل السداد / تحويل لكريدي' : 'Modifier le paiement'}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {editPaymentSale.invoice_number} ({formatCurrency(editPaymentSale.total)})
                </span>
              </div>
              <button onClick={() => setEditPaymentSale(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'العميل *' : 'Client *'}
                </label>
                <select
                  required
                  value={editCustomerId}
                  onChange={e => setEditCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="">{lang === 'ar' ? '-- اختر العميل لتسجيل الدين --' : '-- Choisir client --'}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'طريقة الأداء' : 'Mode de règlement'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod('CREDIT');
                      setEditAmountPaid('0');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      editPaymentMethod === 'CREDIT'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    {lang === 'ar' ? 'كريدي (غير مؤدى)' : 'Crédit impayé'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod('CASH');
                      setEditAmountPaid(editPaymentSale.total.toString());
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      editPaymentMethod === 'CASH'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    {lang === 'ar' ? 'نقداً (مدفوع)' : 'Payé en espèces'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المبلغ المدفوع (DH)' : 'Montant payé (DH)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={editPaymentSale.total}
                  value={editAmountPaid}
                  onChange={e => setEditAmountPaid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>

              {/* Remaining calculation banner */}
              {(() => {
                const p = parseFloat(editAmountPaid) || 0;
                const rem = Math.max(0, editPaymentSale.total - p);
                return (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex justify-between items-center ${
                    rem > 0 
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900' 
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  }`}>
                    <span>{rem > 0 ? (lang === 'ar' ? 'المبلغ المتبقي كدين:' : 'Reste dû :') : (lang === 'ar' ? 'الفاتورة مسددة بالكامل' : 'Facture soldée')}</span>
                    <span className="text-sm font-extrabold">{formatCurrency(rem)}</span>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ وتحديث رصيد العميل' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentSale(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
