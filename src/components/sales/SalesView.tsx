import React, { useState, useMemo, useEffect } from 'react';
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
  DollarSign,
  Trash2,
  Loader2
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

  // Delete Sale Modal State
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const sales = useMemo(() => db.getSales(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const customers = useMemo(() => db.getCustomers(business.id), [business.id, dataVersion]);

  // Sync on mount to immediately load any new or returning sales from cloud
  const [isInitialSyncing, setIsInitialSyncing] = useState(sales.length === 0);

  const fetchSales = async () => {
    setIsInitialSyncing(true);
    try {
      await syncEngine.pullSalesDirectly(business.id);
      refreshData();
    } finally {
      setIsInitialSyncing(false);
    }
    // Also perform full background sync
    syncEngine.syncAll().then(() => refreshData()).catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Immediately trigger fast direct sales pull on mount
    syncEngine.pullSalesDirectly(business.id).then(() => {
      if (isMounted) {
        refreshData();
        setIsInitialSyncing(false);
      }
    }).catch(() => {
      if (isMounted) setIsInitialSyncing(false);
    });

    // 2. Also trigger full sync to ensure deletions/returns/debts are reconciled
    syncEngine.syncAll().then(() => {
      if (isMounted) {
        refreshData();
        setIsInitialSyncing(false);
      }
    }).catch(() => {
      if (isMounted) setIsInitialSyncing(false);
    });

    // 3. React to any sync completing in background
    const unsub = syncEngine.onSyncComplete(() => {
      if (isMounted) {
        refreshData();
        setIsInitialSyncing(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [business.id]);

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

  const handleConfirmDeleteSale = async () => {
    if (!saleToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await syncEngine.deleteSaleEverywhere(saleToDelete.id, business.id, branch.id, user.name);
      setSaleToDelete(null);
      refreshData();
      alert(lang === 'ar'
        ? `تم حذف الفاتورة ${saleToDelete.invoice_number} بنجاح، وإرجاع ${res.restoredItemsCount} قطعة إلى المخزون، وخصم قيمتها من المبيعات.`
        : `Vente ${saleToDelete.invoice_number} supprimée avec succès, ${res.restoredItemsCount} article(s) réintégré(s) au stock et C.A. ajusté.`);
    } catch (e) {
      console.error('Delete sale error:', e);
      const res = db.deleteSale(saleToDelete.id, business.id, branch.id, user.name);
      setSaleToDelete(null);
      refreshData();
      alert(lang === 'ar'
        ? `تم حذف الفاتورة محلياً، وإرجاع ${res.restoredItemsCount} قطعة إلى المخزون.`
        : `Vente supprimée localement, ${res.restoredItemsCount} article(s) réintégré(s) au stock.`);
    } finally {
      setDeleteLoading(false);
    }
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

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
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

          <button
            onClick={fetchSales}
            disabled={isInitialSyncing}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
            title={lang === 'ar' ? 'تحديث الفواتير من السحابة' : 'Actualiser depuis le cloud'}
          >
            <RotateCcw className={`w-4 h-4 text-teal-600 ${isInitialSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lang === 'ar' ? 'تحديث' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-12 text-center text-slate-400 text-xs">
            {isInitialSyncing ? (
              <div className="flex flex-col items-center justify-center gap-2 text-teal-600 dark:text-teal-400 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {lang === 'ar' ? 'جاري مزامنة وتحديث سجل المبيعات...' : 'Synchronisation des ventes en cours...'}
                </span>
              </div>
            ) : (
              lang === 'ar' ? 'لم يتم العثور على أي فواتير بيع' : 'Aucune facture de vente trouvée'
            )}
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

                  {/* Delete Sale with Stock Restock & Revenue Reversal */}
                  <button
                    onClick={() => setSaleToDelete(sale)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 border border-rose-200 dark:border-rose-900/60 cursor-pointer transition"
                    title={lang === 'ar' ? 'حذف الفاتورة وإرجاع السلع للمخزون' : 'Supprimer la vente et réintégrer le stock'}
                  >
                    <Trash2 className="w-4 h-4" />
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
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReturnModalSale(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
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
                        step="any"
                        min="0"
                        max={item.quantity}
                        value={returnQtys[item.product_id] !== undefined ? returnQtys[item.product_id] : 0}
                        onChange={e => {
                          const parsed = parseFloat(e.target.value.replace(',', '.')) || 0;
                          const val = Math.min(item.quantity, Math.max(0, Math.round(parsed * 1000) / 1000));
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
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditPaymentSale(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
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

      {/* Delete Sale Confirmation Modal */}
      {saleToDelete && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSaleToDelete(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 space-y-4`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'حذف فاتورة البيع نهائياً' : 'Supprimer la vente'}
                  </h3>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">
                    {saleToDelete.invoice_number}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSaleToDelete(null)} 
                disabled={deleteLoading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sale Summary Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{lang === 'ar' ? 'الزبون :' : 'Client :'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{saleToDelete.customer_name || (lang === 'ar' ? 'زبون عام' : 'Client comptoir')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{lang === 'ar' ? 'المبلغ الإجمالي :' : 'Montant total :'}</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{formatCurrency(saleToDelete.total)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">{lang === 'ar' ? 'التاريخ :' : 'Date :'}</span>
                <span className="text-slate-500 font-mono">{new Date(saleToDelete.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')} {new Date(saleToDelete.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Impact Details / What happens automatically */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'التأثيرات التلقائية عند الحذف :' : 'Actions automatiques lors de la suppression :'}
              </div>

              {/* 1. Stock restoration */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'ar' ? 'إرجاع السلع إلى المخزون (Restock)' : 'Réintégration automatique au stock'}</span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 ps-5 space-y-0.5 max-h-24 overflow-y-auto">
                  {saleToDelete.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {it.product_name}</span>
                      <span className="font-bold font-mono">+{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Turnover reduction */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'ar' ? 'تخفيض رقم المعاملات والمداخيل' : 'Diminution du chiffre d\'affaires'}</span>
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 ps-5">
                  {lang === 'ar' 
                    ? `سيتم خصم ${formatCurrency(saleToDelete.total)} من إجمالي المبيعات، وتعديل رصيد الصندوق والكريدي المرتبط بها فوراً.` 
                    : `Le C.A. sera diminué de ${formatCurrency(saleToDelete.total)}, et la caisse/créance client sera ajustée.`}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmDeleteSale}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الحذف وتحديث المخزون...' : 'Suppression en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تأكيد الحذف واسترجاع المخزون' : 'Confirmer la suppression'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-40"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
