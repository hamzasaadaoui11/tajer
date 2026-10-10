import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Eye,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { CashTransaction, CashClosing } from '../../types';
import { syncEngine } from '../../services/sync';
import { CashClosingModal } from './CashClosingModal';
import { CashClosingReceiptModal } from './CashClosingReceiptModal';

export const CashView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang } = useApp();

  // Tab State: Transactions vs Closings
  const [activeTab, setActiveTab] = useState<'transactions' | 'closings'>('transactions');

  // Manual Cash In/Out Modal
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDesc, setCashDesc] = useState('');

  // Cash Closing Modals State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingModalDate, setClosingModalDate] = useState<string | undefined>(undefined);
  const [selectedClosingForReceipt, setSelectedClosingForReceipt] = useState<CashClosing | null>(null);

  // Filter Date for Closings Tab
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterClosingDate, setFilterClosingDate] = useState<string>(todayStr);

  const cashTransactions = useMemo(() => db.getCashTransactions(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const currentCash = useMemo(() => db.getCurrentCashBalance(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const cashClosings = useMemo(() => db.getCashClosings(business.id, branch.id), [business.id, branch.id, dataVersion]);

  // Pagination states for transactions (7 items per page)
  const [currentPageTx, setCurrentPageTx] = useState(1);
  const itemsPerPage = 7;

  // Paginated Cash Transactions
  const totalTxPages = Math.ceil(cashTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPageTx - 1) * itemsPerPage;
    return cashTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [cashTransactions, currentPageTx]);

  // Aggregate in / out today
  const todayIn = cashTransactions
    .filter(t => t.created_at.startsWith(todayStr) && t.type === 'IN')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayOut = cashTransactions
    .filter(t => t.created_at.startsWith(todayStr) && t.type === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0);

  // Find closing for the selected filter date
  const selectedDateClosing = useMemo(() => {
    if (!filterClosingDate) return null;
    return cashClosings.find(c => c.closing_date === filterClosingDate) || null;
  }, [cashClosings, filterClosingDate]);

  // Yesterday helper
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const formatTxDescription = (tx: CashTransaction) => {
    if (lang === 'ar') return tx.description;
    let desc = tx.description || '';
    if (desc.startsWith('مقبوضات بيع')) return desc.replace('مقبوضات بيع', 'Recette vente');
    if (desc.startsWith('استرجاع نقد لمرتجع')) return desc.replace('استرجاع نقد لمرتجع', 'Remboursement retour');
    if (desc.startsWith('أداء شراء سلع من')) return desc.replace('أداء شراء سلع من', 'Règlement achat chez');
    if (desc.startsWith('سداد دين من العميل')) return desc.replace('سداد دين من العميل', 'Règlement dette client:');
    if (desc.startsWith('تسديد مستحقات للمورد')) return desc.replace('تسديد مستحقات للمورد', 'Paiement fournisseur:');
    if (desc.startsWith('مصروف:')) return desc.replace('مصروف:', 'Dépense:');
    if (desc === 'إيداع نقدي في الصندوق') return 'Alimentation de caisse';
    if (desc === 'سحب نقدي من الصندوق') return 'Retrait de caisse';
    if (desc === 'رصيد افتتاحي للصندوق') return 'Solde initial de la caisse';
    return desc;
  };

  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) return;

    db.addCashManual(
      business.id,
      branch.id,
      cashType,
      amount,
      cashDesc || (cashType === 'IN' 
        ? (lang === 'ar' ? 'إيداع نقدي في الصندوق' : 'Alimentation de caisse') 
        : (lang === 'ar' ? 'سحب نقدي من الصندوق' : 'Retrait de caisse')),
      user.name
    );

    setIsCashModalOpen(false);
    setCashAmount('');
    setCashDesc('');
    setCurrentPageTx(1);
    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
  };

  const handleDeleteClosing = (id: string) => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف تقرير إغلاق الصندوق هذا؟' : 'Supprimer cette clôture de caisse ?')) {
      db.deleteCashClosing(id);
      refreshData();
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'إدارة الخزينة وإغلاق الصندوق' : 'Gestion de Caisse & Clôtures'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'تتبع السيولة، الإيداعات، السحوبات، وتقارير إغلاق الصندوق اليومية (Rapport Z)' : 'Suivi des flux d\'espèces et clôtures journalières (Ticket Z)'}
          </p>
        </div>

        {/* Primary Action Button: Clôture de Caisse */}
        <button
          onClick={() => {
            setClosingModalDate(todayStr);
            setIsClosingModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer shrink-0"
        >
          <Lock className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إغلاق الصندوق اليومي (Clôturer la Caisse)' : 'Clôturer la Caisse (Ticket Z)'}</span>
        </button>
      </div>

      {/* Treasury Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Main Cash Balance */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold">{lang === 'ar' ? 'رصيد الصندوق الحالي (Caisse)' : 'Solde actuel de la caisse'}</span>
            <Wallet className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-teal-300 tracking-tight my-2">
            {formatCurrency(currentCash)}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setCashType('IN');
                setIsCashModalOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إيداع نقدي' : "Dépôt d'espèces"}</span>
            </button>
            <button
              onClick={() => {
                setCashType('OUT');
                setIsCashModalOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'سحب نقدي' : "Retrait d'espèces"}</span>
            </button>
          </div>
        </div>

        {/* Today's Cash In */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">{lang === 'ar' ? 'المقبوضات النقدية اليوم (Entrées)' : 'Recettes du jour (Entrées)'}</span>
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 my-2">
            +{formatCurrency(todayIn)}
          </div>
          <span className="text-[11px] text-slate-400">
            {lang === 'ar' ? 'مبيعات وسداد ديون نقداً' : 'Ventes & règlements clients en espèces'}
          </span>
        </div>

        {/* Today's Cash Out */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold">{lang === 'ar' ? 'المدفوعات والمصاريف اليوم (Sorties)' : 'Décaissements du jour (Sorties)'}</span>
            <ArrowUpRight className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 my-2">
            -{formatCurrency(todayOut)}
          </div>
          <span className="text-[11px] text-slate-400">
            {lang === 'ar' ? 'سحوبات ومصاريف تشغيلية' : 'Retraits & dépenses opérationnelles'}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Transactions vs Closings Archive */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === 'ar' ? 'حركات الصندوق اليومية' : 'Mouvements de Caisse'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {cashTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('closings')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'closings'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{lang === 'ar' ? 'أرشيف إغلاقات الصندوق (Clôtures & Rapport Z)' : 'Clôtures & Rapports Z'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold">
            {cashClosings.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Transactions History */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
              {lang === 'ar' ? 'سجل حركات الصندوق وعمليات الخزينة' : 'Journal des mouvements de caisse & trésorerie'}
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {lang === 'ar' ? `(${cashTransactions.length} حركة مسجلة)` : `(${cashTransactions.length} opération(s))` }
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {lang === 'ar' ? 'لا توجد حركات مسجلة في الصندوق بعد' : 'Aucun mouvement de caisse enregistré'}
                </div>
              ) : (
                paginatedTransactions.map(tx => {
                  const isIncoming = tx.type === 'IN';
                  return (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                          isIncoming 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' 
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                        }`}>
                          {isIncoming ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {formatTxDescription(tx)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{new Date(tx.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <span>•</span>
                            <span>{new Date(tx.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span className="text-slate-500 font-medium">{tx.user_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                        <div className={`font-black text-xs sm:text-sm ${isIncoming ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncoming ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {lang === 'ar' ? 'الرصيد بعد: ' : 'Solde après: '} {formatCurrency(tx.balance_after)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalTxPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {lang === 'ar' 
                    ? `صفحة ${currentPageTx} من ${totalTxPages}` 
                    : `Page ${currentPageTx} sur ${totalTxPages}`}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPageTx(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageTx === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPageTx(prev => Math.min(prev + 1, totalTxPages))}
                    disabled={currentPageTx === totalTxPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Clôtures Archive with Date Picker */}
      {activeTab === 'closings' && (
        <div className="space-y-4">
          
          {/* Date Picker & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ar' ? 'اختر التاريخ لعرض إغلاق الصندوق:' : 'Sélectionner la date de clôture :'}</span>
              </span>

              <input
                type="date"
                value={filterClosingDate}
                onChange={e => setFilterClosingDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono outline-hidden focus:ring-2 focus:ring-teal-500"
              />

              {/* Quick Date Pills */}
              <button
                onClick={() => setFilterClosingDate(todayStr)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterClosingDate === todayStr 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'اليوم' : "Aujourd'hui"}
              </button>

              <button
                onClick={() => setFilterClosingDate(yesterdayStr)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterClosingDate === yesterdayStr 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang === 'ar' ? 'البارحة' : 'Hier'}
              </button>

              {filterClosingDate && (
                <button
                  onClick={() => setFilterClosingDate('')}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                >
                  {lang === 'ar' ? 'عرض الكل' : 'Tout afficher'}
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setClosingModalDate(filterClosingDate || todayStr);
                setIsClosingModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تسجيل إغلاق جديد' : 'Nouvelle Clôture'}</span>
            </button>
          </div>

          {/* Featured Card for the Selected Date */}
          {filterClosingDate && (
            <div>
              {selectedDateClosing ? (
                /* Closing Found for this Date */
                <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-teal-100 dark:border-teal-950">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        Z
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{lang === 'ar' ? `تقرير إغلاق الصندوق ليوم: ${selectedDateClosing.closing_date}` : `Clôture de Caisse du ${selectedDateClosing.closing_date}`}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {lang === 'ar' ? 'تم الإغلاق ✓' : 'Clôturé ✓'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'ar' ? `المسؤول: ${selectedDateClosing.user_name} • التوقيت: ${new Date(selectedDateClosing.closed_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}` : `Par : ${selectedDateClosing.user_name} à ${new Date(selectedDateClosing.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedClosingForReceipt(selectedDateClosing)}
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'طباعة تقرير الإغلاق (Ticket Z)' : 'Imprimer Ticket Z'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClosing(selectedDateClosing.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title={lang === 'ar' ? 'حذف هذا الإغلاق' : 'Supprimer'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {/* Actual Counted Cash */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10.5px] text-slate-500 block font-medium">
                        {lang === 'ar' ? 'المبلغ الفعلي بالصندوق (Espèces):' : 'Montant Réel en Caisse :'}
                      </span>
                      <span className="text-lg font-black text-teal-700 dark:text-teal-300 block mt-1">
                        {formatCurrency(selectedDateClosing.actual_balance)}
                      </span>
                    </div>

                    {/* Theoretical Balance */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10.5px] text-slate-500 block font-medium">
                        {lang === 'ar' ? 'الرصيد النظري المحسوب:' : 'Solde Théorique :'}
                      </span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-200 block mt-1">
                        {formatCurrency(selectedDateClosing.theoretical_balance)}
                      </span>
                    </div>

                    {/* Écart de Caisse */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10.5px] text-slate-500 block font-medium">
                        {lang === 'ar' ? 'فارق الصندوق (Écart):' : 'Écart de Caisse :'}
                      </span>
                      <span className={`text-sm font-black block mt-1 ${
                        selectedDateClosing.difference === 0 
                          ? 'text-emerald-600' 
                          : selectedDateClosing.difference > 0 
                          ? 'text-blue-600' 
                          : 'text-rose-600'
                      }`}>
                        {selectedDateClosing.difference === 0 
                          ? (lang === 'ar' ? '0.00 DH (متطابق ✓)' : '0.00 DH (Équilibré)') 
                          : selectedDateClosing.difference > 0 
                          ? `+${formatCurrency(selectedDateClosing.difference)}` 
                          : formatCurrency(selectedDateClosing.difference)}
                      </span>
                    </div>

                    {/* Cash Sales */}
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[10.5px] text-slate-500 block font-medium">
                        {lang === 'ar' ? 'مبيعات اليوم نقداً:' : 'Ventes en Espèces :'}
                      </span>
                      <span className="text-sm font-black text-emerald-600 block mt-1">
                        {formatCurrency(selectedDateClosing.total_cash_sales)} ({selectedDateClosing.sales_count})
                      </span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {selectedDateClosing.notes && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300 italic">
                      <span className="font-bold not-italic">{lang === 'ar' ? 'ملاحظة: ' : 'Remarque : '}</span>
                      {selectedDateClosing.notes}
                    </div>
                  )}
                </div>
              ) : (
                /* No closing recorded for this selected date */
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? `لم يتم تسجيل إغلاق للصندوق بتاريخ: ${filterClosingDate}` : `Aucune clôture enregistrée pour le ${filterClosingDate}`}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {lang === 'ar' ? 'يمكنك إغلاق وحساب مجموع صندوق هذا التاريخ بالضغط على الزر أسفله:' : 'Vous pouvez effectuer la clôture et calculer le total de cette journée maintenant :'}
                  </p>
                  <button
                    onClick={() => {
                      setClosingModalDate(filterClosingDate);
                      setIsClosingModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-teal-600/20 transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{lang === 'ar' ? `إغلاق صندوق يوم (${filterClosingDate}) الآن` : `Clôturer la date du ${filterClosingDate}`}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Full Archive Table of All Closings */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ar' ? 'سجل جميع إغلاقات الصندوق السابقة' : 'Historique de toutes les clôtures de caisse'}</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {cashClosings.length} {lang === 'ar' ? 'إغلاق مؤرشف' : 'clôture(s)'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 uppercase">
                  <tr>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'المسؤول' : 'Caissier'}</th>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'المبلغ الفعلي (Total Caisse)' : 'Montant Réel'}</th>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'المبلغ النظري' : 'Théorique'}</th>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'الفارق (Écart)' : 'Écart'}</th>
                    <th className="p-3.5 font-bold">{lang === 'ar' ? 'المبيعات نقداً' : 'Ventes Espèces'}</th>
                    <th className="p-3.5 font-bold text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashClosings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {lang === 'ar' ? 'لا توجد إغلاقات سابقة للصندوق بعد' : 'Aucune clôture enregistrée'}
                      </td>
                    </tr>
                  ) : (
                    cashClosings.map(c => {
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                            {c.closing_date}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {c.user_name}
                          </td>
                          <td className="p-3.5 font-black text-teal-700 dark:text-teal-400">
                            {formatCurrency(c.actual_balance)}
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                            {formatCurrency(c.theoretical_balance)}
                          </td>
                          <td className="p-3.5 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              c.difference === 0 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                : c.difference > 0 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {c.difference === 0 ? '0.00' : c.difference > 0 ? `+${formatCurrency(c.difference)}` : formatCurrency(c.difference)}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                            {formatCurrency(c.total_cash_sales)}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedClosingForReceipt(c)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                title={lang === 'ar' ? 'معاينة وطباعة Ticket Z' : 'Imprimer Ticket Z'}
                              >
                                <Printer className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'Ticket Z' : 'Ticket Z'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteClosing(c.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* Manual Cash In/Out Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {cashType === 'IN' 
                  ? (lang === 'ar' ? 'إيداع نقدي في الصندوق' : 'Alimentation de la caisse') 
                  : (lang === 'ar' ? 'سحب نقدي من الصندوق' : 'Retrait d\'espèces')}
              </h3>
              <button onClick={() => setIsCashModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCash} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المبلغ بالدرهم (DH) *' : 'Montant en Dirhams (DH) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-teal-500 font-extrabold text-sm text-center"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'البيان أو السبب' : 'Motif ou libellé'}
                </label>
                <input
                  type="text"
                  value={cashDesc}
                  onChange={e => setCashDesc(e.target.value)}
                  placeholder={
                    cashType === 'IN' 
                      ? (lang === 'ar' ? 'مثال: تغذية الصندوق بفكة إضافية' : 'Ex: Apport de monnaie / fond de caisse') 
                      : (lang === 'ar' ? 'مثال: سحب صاحب المحل' : 'Ex: Prélèvement de l\'exploitant')
                  }
                  className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-teal-600/10"
                >
                  {lang === 'ar' ? 'حفظ الحركة' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Closing Modal (Clôture de Caisse) */}
      {isClosingModalOpen && (
        <CashClosingModal
          initialDate={closingModalDate}
          onClose={() => setIsClosingModalOpen(false)}
          onSuccess={(savedClosing) => {
            setIsClosingModalOpen(false);
            setFilterClosingDate(savedClosing.closing_date);
            setActiveTab('closings');
            setSelectedClosingForReceipt(savedClosing);
          }}
        />
      )}

      {/* Cash Closing Printable Receipt Modal (Ticket Z) */}
      {selectedClosingForReceipt && (
        <CashClosingReceiptModal
          closing={selectedClosingForReceipt}
          business={business}
          lang={lang}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedClosingForReceipt(null)}
        />
      )}

    </div>
  );
};
