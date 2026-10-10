import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Calculator, 
  Wallet, 
  Coins, 
  Save, 
  Calendar, 
  ArrowDownRight, 
  ArrowUpRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { CashClosing, Sale, CashTransaction } from '../../types';

interface CashClosingModalProps {
  onClose: () => void;
  onSuccess: (savedClosing: CashClosing) => void;
  initialDate?: string;
}

export const CashClosingModal: React.FC<CashClosingModalProps> = ({
  onClose,
  onSuccess,
  initialDate
}) => {
  const { business, branch, user, formatCurrency, refreshData, lang } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [closingDate, setClosingDate] = useState(initialDate || todayStr);
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showDenominations, setShowDenominations] = useState(false);

  // Moroccan Dirham Denominations State
  const [denominations, setDenominations] = useState<Record<number, number>>({
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });

  // Fetch sales and cash transactions
  const allSales = useMemo(() => db.getSales(business.id, branch.id), [business.id, branch.id]);
  const allCashTx = useMemo(() => db.getCashTransactions(business.id, branch.id), [business.id, branch.id]);

  // Aggregate metrics for the chosen closing date
  const daySummary = useMemo(() => {
    // 1. Sales for date
    const daySales = allSales.filter(s => s.created_at.startsWith(closingDate));
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalCreditSales = 0;

    for (const s of daySales) {
      if (s.payment_method === 'CASH') {
        totalCashSales += s.amount_paid || 0;
      } else if (s.payment_method === 'CARD' || s.payment_method === 'TRANSFER') {
        totalCardSales += s.total || 0;
      }
      if (s.amount_due && s.amount_due > 0) {
        totalCreditSales += s.amount_due;
      }
    }

    // 2. Cash Transactions for date
    const dayCashTx = allCashTx.filter(t => t.created_at.startsWith(closingDate));
    let totalDebtRecovered = 0;
    let totalCashIn = 0;
    let totalExpenses = 0;
    let totalCashOut = 0;

    for (const tx of dayCashTx) {
      if (tx.type === 'IN') {
        if (tx.category === 'CUSTOMER_PAYMENT') {
          totalDebtRecovered += tx.amount;
        } else if (tx.category === 'MANUAL_IN') {
          totalCashIn += tx.amount;
        }
      } else if (tx.type === 'OUT') {
        if (tx.category === 'EXPENSE') {
          totalExpenses += tx.amount;
        } else {
          totalCashOut += tx.amount;
        }
      }
    }

    // 3. Opening balance before start of this date
    const priorTx = allCashTx.filter(t => t.created_at < `${closingDate}T00:00:00`);
    let openingBalance = 0;
    for (const pt of priorTx) {
      if (pt.type === 'IN') openingBalance += pt.amount;
      else if (pt.type === 'OUT') openingBalance -= pt.amount;
    }
    // If no prior transactions, use initial baseline if any
    if (priorTx.length === 0 && dayCashTx.length > 0) {
      openingBalance = 0;
    }

    // 4. Theoretical Balance
    const theoreticalBalance = Math.max(
      0,
      openingBalance + totalCashSales + totalDebtRecovered + totalCashIn - totalExpenses - totalCashOut
    );

    return {
      daySalesCount: daySales.length,
      totalCashSales,
      totalCardSales,
      totalCreditSales,
      totalDebtRecovered,
      totalCashIn,
      totalExpenses,
      totalCashOut,
      openingBalance,
      theoreticalBalance,
    };
  }, [allSales, allCashTx, closingDate]);

  // Denominations Total
  const calculatedDenominationsTotal = useMemo(() => {
    let sum = 0;
    for (const [val, count] of Object.entries(denominations)) {
      sum += Number(val) * (Number(count) || 0);
    }
    return sum;
  }, [denominations]);

  const handleDenominationChange = (val: number, count: number) => {
    const next = { ...denominations, [val]: Math.max(0, count) };
    setDenominations(next);
    let sum = 0;
    for (const [v, c] of Object.entries(next)) {
      sum += Number(v) * (Number(c) || 0);
    }
    setActualBalanceInput(sum.toString());
  };

  const actualBalance = parseFloat(actualBalanceInput) || 0;
  const difference = actualBalance - daySummary.theoreticalBalance;

  const handleAutofillTheoretical = () => {
    setActualBalanceInput(daySummary.theoreticalBalance.toString());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const closingRecord: CashClosing = {
      id: `closing-${closingDate}-${Date.now()}`,
      business_id: business.id,
      branch_id: branch.id,
      closing_date: closingDate,
      closed_at: new Date().toISOString(),
      user_name: user.name,
      opening_balance: daySummary.openingBalance,
      total_cash_sales: daySummary.totalCashSales,
      total_card_sales: daySummary.totalCardSales,
      total_credit_sales: daySummary.totalCreditSales,
      total_cash_in: daySummary.totalCashIn,
      total_debt_recovered: daySummary.totalDebtRecovered,
      total_cash_out: daySummary.totalCashOut,
      total_expenses: daySummary.totalExpenses,
      theoretical_balance: daySummary.theoreticalBalance,
      actual_balance: actualBalance,
      difference: difference,
      sales_count: daySummary.daySalesCount,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    db.saveCashClosing(closingRecord);
    refreshData();
    onSuccess(closingRecord);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-6"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'إغلاق الصندوق اليومي (Clôture de Caisse)' : 'Clôture de Caisse Journalière'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'حساب مجموع الصندوق والمبيعات والعد الفعلي' : 'Arrêté des comptes et comptage physique'}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Closing Date Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'تاريخ إغلاق الصندوق:' : 'Date de clôture :'}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={closingDate}
                onChange={e => setClosingDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold font-mono outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setClosingDate(todayStr)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  closingDate === todayStr 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {lang === 'ar' ? 'اليوم' : "Aujourd'hui"}
              </button>
            </div>
          </div>

          {/* System Calculated Metrics Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>{lang === 'ar' ? 'ملخص حركة الصندوق المحسوبة في النظام' : 'Mouvements théoriques de la journée'}</span>
              <span className="text-[11px] font-normal text-slate-500">
                {daySummary.daySalesCount} {lang === 'ar' ? 'عملية بيع' : 'vente(s)'}
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {/* Ventes Espèces */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 p-2.5 rounded-2xl">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-medium">
                  {lang === 'ar' ? 'مبيعات نقداً (Espèces)' : 'Ventes Espèces'}
                </span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm mt-0.5 block">
                  +{formatCurrency(daySummary.totalCashSales)}
                </span>
              </div>

              {/* Ventes Carte / Virement */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 p-2.5 rounded-2xl">
                <span className="text-[10px] text-blue-800 dark:text-blue-300 block font-medium">
                  {lang === 'ar' ? 'مبيعات بطاقة/تحويل' : 'Ventes Carte / Vir.'}
                </span>
                <span className="font-black text-blue-700 dark:text-blue-300 text-sm mt-0.5 block">
                  {formatCurrency(daySummary.totalCardSales)}
                </span>
              </div>

              {/* Ventes Crédit */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 p-2.5 rounded-2xl">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-medium">
                  {lang === 'ar' ? 'مبيعات بالكريدي' : 'Ventes Crédit'}
                </span>
                <span className="font-black text-amber-700 dark:text-amber-300 text-sm mt-0.5 block">
                  {formatCurrency(daySummary.totalCreditSales)}
                </span>
              </div>

              {/* Recouvrement dettes */}
              <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/40 p-2.5 rounded-2xl">
                <span className="text-[10px] text-teal-800 dark:text-teal-300 block font-medium">
                  {lang === 'ar' ? 'استخلاص ديون نقداً' : 'Recouvrement dettes'}
                </span>
                <span className="font-black text-teal-700 dark:text-teal-300 text-sm mt-0.5 block">
                  +{formatCurrency(daySummary.totalDebtRecovered)}
                </span>
              </div>

              {/* Dépenses en espèces */}
              <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 p-2.5 rounded-2xl">
                <span className="text-[10px] text-rose-800 dark:text-rose-300 block font-medium">
                  {lang === 'ar' ? 'مصاريف من الصندوق' : 'Dépenses réglées'}
                </span>
                <span className="font-black text-rose-700 dark:text-rose-300 text-sm mt-0.5 block">
                  -{formatCurrency(daySummary.totalExpenses)}
                </span>
              </div>

              {/* Retraits / Entrées manuelles */}
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 block font-medium">
                  {lang === 'ar' ? 'سحوبات/إيداعات يدوية' : 'Retraits / Dépôts'}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs mt-0.5 block">
                  {formatCurrency(daySummary.totalCashIn - daySummary.totalCashOut)}
                </span>
              </div>
            </div>

            {/* Theoretical Cash Balance Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10.5px] text-slate-400 block font-medium">
                  {lang === 'ar' ? 'الرصيد النظري المحسوب بالصندوق (Solde Théorique):' : 'Solde Théorique calculé en caisse :'}
                </span>
                <span className="text-lg sm:text-xl font-black text-teal-300 tracking-tight">
                  {formatCurrency(daySummary.theoreticalBalance)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutofillTheoretical}
                className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition cursor-pointer"
                title={lang === 'ar' ? 'نسخ المبلغ النظري في خانة العد الفعلي' : 'Remplir avec le montant théorique'}
              >
                {lang === 'ar' ? 'مطابق للنظري' : 'Reporter ce solde'}
              </button>
            </div>
          </div>

          {/* Actual Cash Counted Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>{lang === 'ar' ? 'المبلغ الفعلي المعدود في الصندوق (DH) *' : 'Montant Réel Compté (Espèces physiques) *'}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowDenominations(!showDenominations)}
                className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{showDenominations ? (lang === 'ar' ? 'إخفاء حاسبة الأوراق' : 'Masquer le détail') : (lang === 'ar' ? 'حاسبة الأوراق النقدية' : 'Calculateur de billets')}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={actualBalanceInput}
                onChange={e => setActualBalanceInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-2xl border-2 border-teal-500 bg-white dark:bg-slate-800 text-lg sm:text-xl font-black text-slate-900 dark:text-white outline-hidden focus:ring-4 focus:ring-teal-500/20"
              />
              <span className="absolute end-4 top-3.5 font-bold text-xs text-slate-400 select-none">
                DH
              </span>
            </div>

            {/* Optional Moroccan Denominations Counter */}
            {showDenominations && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
                  <span>{lang === 'ar' ? 'عدد الأوراق والقطع النقدية:' : 'Comptage par coupure :'}</span>
                  <span>{lang === 'ar' ? 'المجموع:' : 'Total :'} {formatCurrency(calculatedDenominationsTotal)}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {[200, 100, 50, 20, 10, 5, 2, 1].map(val => (
                    <div key={val} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 block mb-1">
                        {val} DH
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[val] || ''}
                        onChange={e => handleDenominationChange(val, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full text-center py-1 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs font-bold border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash Difference Banner (Écart) */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              difference === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : difference > 0
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {difference === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${difference > 0 ? 'text-blue-600' : 'text-rose-600'}`} />
                )}
                <div>
                  <span>{lang === 'ar' ? 'فارق الصندوق (Écart de caisse):' : 'Écart de caisse :'} </span>
                  <span className="font-extrabold">
                    {difference === 0 
                      ? (lang === 'ar' ? '0.00 DH (الصندوق متطابق تماماً ✓)' : '0.00 DH (Caisse parfaitement équilibrée)') 
                      : difference > 0 
                      ? (lang === 'ar' ? `+${formatCurrency(difference)} (فائض في الصندوق)` : `+${formatCurrency(difference)} (Excédent de caisse)`) 
                      : (lang === 'ar' ? `${formatCurrency(difference)} (عجز / نقص في الصندوق)` : `${formatCurrency(difference)} (Déficit / Manquant)`)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'ar' ? 'ملاحظات وتوضيحات (اختياري):' : 'Notes / Remarques (optionnel) :'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === 'ar' ? 'أي ملاحظة حول حركة اليوم أو سبب الفارق...' : 'Remarque concernant la caisse...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ إغلاق الصندوق وطباعة التقرير (Ticket Z)' : 'Enregistrer la Clôture & Imprimer'}</span>
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
