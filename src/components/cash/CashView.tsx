import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { CashTransaction } from '../../types';
import { syncEngine } from '../../services/sync';

export const CashView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang } = useApp();

  // Manual Cash In/Out Modal
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDesc, setCashDesc] = useState('');

  const cashTransactions = useMemo(() => db.getCashTransactions(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const currentCash = useMemo(() => db.getCurrentCashBalance(business.id, branch.id), [business.id, branch.id, dataVersion]);

  // Pagination states (7 items per page)
  const [currentPageTx, setCurrentPageTx] = useState(1);
  const itemsPerPage = 7;

  // Paginated Cash Transactions
  const totalTxPages = Math.ceil(cashTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPageTx - 1) * itemsPerPage;
    return cashTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [cashTransactions, currentPageTx]);

  // Aggregate in / out
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIn = cashTransactions
    .filter(t => t.created_at.startsWith(todayStr) && t.type === 'IN')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayOut = cashTransactions
    .filter(t => t.created_at.startsWith(todayStr) && t.type === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatTxDescription = (tx: CashTransaction) => {
    if (lang === 'ar') return tx.description;
    let desc = tx.description || '';
    if (desc.startsWith('مقبوضات بيع')) {
      return desc.replace('مقبوضات بيع', 'Recette vente');
    }
    if (desc.startsWith('استرجاع نقد لمرتجع')) {
      return desc.replace('استرجاع نقد لمرتجع', 'Remboursement retour');
    }
    if (desc.startsWith('أداء شراء سلع من')) {
      return desc.replace('أداء شراء سلع من', 'Règlement achat chez');
    }
    if (desc.startsWith('سداد دين من العميل')) {
      return desc.replace('سداد دين من العميل', 'Règlement dette client:');
    }
    if (desc.startsWith('تسديد مستحقات للمورد')) {
      return desc.replace('تسديد مستحقات للمورد', 'Paiement fournisseur:');
    }
    if (desc.startsWith('مصروف:')) {
      return desc.replace('مصروف:', 'Dépense:');
    }
    if (desc === 'إيداع نقدي في الصندوق') {
      return 'Alimentation de caisse';
    }
    if (desc === 'سحب نقدي من الصندوق') {
      return 'Retrait de caisse';
    }
    if (desc === 'رصيد افتتاحي للصندوق') {
      return 'Solde initial de la caisse';
    }
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

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Treasury Cards */}
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
              <span>{lang === 'ar' ? 'إيداع نقدي' : 'Dépôt d\'espèces'}</span>
            </button>
            <button
              onClick={() => {
                setCashType('OUT');
                setIsCashModalOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'سحب نقدي' : 'Retrait d\'espèces'}</span>
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

      {/* Header for history */}
      <div className="flex justify-between items-center pt-2">
        <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
          {lang === 'ar' ? 'سجل حركات الصندوق وعمليات الخزينة' : 'Journal des mouvements de caisse & trésorerie'}
        </h2>
        <span className="text-xs font-bold text-slate-400">
          {lang === 'ar' ? `(${cashTransactions.length} حركة مسجلة)` : `(${cashTransactions.length} opération(s))` }
        </span>
      </div>

      {/* Content Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cashTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {lang === 'ar' ? 'لا توجد حركات في الصندوق حالياً' : 'Aucun mouvement de caisse pour le moment'}
              </div>
            ) : (
              paginatedTransactions.map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'IN' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' 
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                    }`}>
                      {tx.type === 'IN' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {formatTxDescription(tx)}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{tx.user_name}</span>
                        <span>•</span>
                        <span>{new Date(tx.created_at).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <div className={`font-extrabold text-sm ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'ar' ? `الرصيد بعدها: ${formatCurrency(tx.balance_after)}` : `Solde après: ${formatCurrency(tx.balance_after)}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination for Transactions */}
          {totalTxPages > 1 && (
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <span>{lang === 'ar' ? 'عرض' : 'Affichage'}</span>
                <span className="text-slate-900 dark:text-white font-extrabold mx-1">{paginatedTransactions.length}</span>
                <span>{lang === 'ar' ? 'من أصل' : 'sur'}</span>
                <span className="text-slate-900 dark:text-white font-extrabold mx-1">{cashTransactions.length}</span>
                <span>{lang === 'ar' ? 'حركة صندوق' : 'mouvement(s)'}</span>
              </div>

              <div className="flex items-center gap-1.5" dir="ltr">
                <button
                  type="button"
                  onClick={() => setCurrentPageTx(prev => Math.max(1, prev - 1))}
                  disabled={currentPageTx === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
                  title={lang === 'ar' ? 'السابق' : 'Précédent'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalTxPages }, (_, i) => i + 1).map((pageNum) => {
                  if (pageNum === 1 || pageNum === totalTxPages || Math.abs(pageNum - currentPageTx) <= 1) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPageTx(pageNum)}
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                          currentPageTx === pageNum
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }

                  if (pageNum === 2 || pageNum === totalTxPages - 1) {
                    return (
                      <span key={pageNum} className="w-4 text-center text-slate-400 font-mono">
                        ...
                      </span>
                    );
                  }

                  return null;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPageTx(prev => Math.min(totalTxPages, prev + 1))}
                  disabled={currentPageTx === totalTxPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
                  title={lang === 'ar' ? 'التالي' : 'Suivant'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Cash In / Out Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {cashType === 'IN' 
                  ? (lang === 'ar' ? 'إيداع نقدي في الصندوق (Entrée)' : 'Alimentation / Dépôt en caisse (Entrée)') 
                  : (lang === 'ar' ? 'سحب نقدي من الصندوق (Sortie)' : 'Retrait d\'espèces de la caisse (Sortie)')}
              </h3>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
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

    </div>
  );
};
