import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CashClosing, Business } from '../../types';

interface CashClosingReceiptModalProps {
  closing: CashClosing;
  business: Business;
  lang: string;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
}

export const CashClosingReceiptModal: React.FC<CashClosingReceiptModalProps> = ({
  closing,
  business,
  lang,
  formatCurrency,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900 print:shadow-none print:border-none print:max-w-full print:w-full print:rounded-none"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Modal Top Bar (hidden on print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
              Z
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">
                {lang === 'ar' ? 'تقرير إغلاق الصندوق (Ticket Z)' : 'Rapport de Clôture (Ticket Z)'}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {closing.closing_date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'طباعة' : 'Imprimer'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Z Content */}
        <div className="p-6 text-xs font-mono space-y-4 print:p-2 print:space-y-3">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
              {business.name}
            </h2>
            {business.phone && (
              <p className="text-[11px] text-slate-600">
                {lang === 'ar' ? 'الهاتف:' : 'Tél :'} {business.phone}
              </p>
            )}
            {business.address && (
              <p className="text-[10px] text-slate-500">
                {business.address} {business.city ? `- ${business.city}` : ''}
              </p>
            )}
            <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold tracking-widest uppercase">
              {lang === 'ar' ? 'تقرير إغلاق الصندوق (RAPPORT Z)' : 'CLÔTURE DE CAISSE (RAPPORT Z)'}
            </div>
          </div>

          {/* Meta Info */}
          <div className="text-[11px] space-y-1 text-slate-600 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'تاريخ العمليات:' : 'Date opérations :'}</span>
              <span className="font-bold text-slate-900">{closing.closing_date}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'توقيت الإغلاق:' : 'Heure de clôture :'}</span>
              <span className="font-bold text-slate-900">
                {new Date(closing.closed_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'أمين الصندوق:' : 'Responsable caisse :'}</span>
              <span className="font-bold text-slate-900">{closing.user_name}</span>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              {lang === 'ar' ? '1. تفاصيل المبيعات' : '1. Détail des Ventes'}
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'عدد عمليات البيع:' : 'Nombre de tickets :'}</span>
              <span className="font-bold">{closing.sales_count}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'المبيعات نقداً (Espèces):' : 'Ventes en Espèces :'}</span>
              <span className="font-bold text-slate-900">{formatCurrency(closing.total_cash_sales)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{lang === 'ar' ? 'المبيعات بالبطاقة/التحويل:' : 'Ventes Carte / Virement :'}</span>
              <span>{formatCurrency(closing.total_card_sales)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{lang === 'ar' ? 'المبيعات بالكريدي (Crédit):' : 'Ventes à Crédit :'}</span>
              <span>{formatCurrency(closing.total_credit_sales)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
              <span>{lang === 'ar' ? 'إجمالي رقم المعاملات:' : 'Chiffre d\'Affaires Total :'}</span>
              <span>{formatCurrency(closing.total_cash_sales + closing.total_card_sales + closing.total_credit_sales)}</span>
            </div>
          </div>

          {/* Cash Movements Breakdown */}
          <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              {lang === 'ar' ? '2. حركة السيولة بالصندوق' : '2. Mouvements d\'Espèces'}
            </div>
            <div className="flex justify-between">
              <span>{lang === 'ar' ? 'الرصيد الافتتاحي (Fond initial):' : 'Solde initial :'}</span>
              <span>{formatCurrency(closing.opening_balance)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>{lang === 'ar' ? '(+) مقبوضات المبيعات نقداً:' : '(+) Ventes espèces :'}</span>
              <span>+{formatCurrency(closing.total_cash_sales)}</span>
            </div>
            {closing.total_debt_recovered > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>{lang === 'ar' ? '(+) استخلاص ديون العملاء:' : '(+) Recouvrements dettes :'}</span>
                <span>+{formatCurrency(closing.total_debt_recovered)}</span>
              </div>
            )}
            {closing.total_cash_in > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>{lang === 'ar' ? '(+) إيداعات نقدية أخرى:' : '(+) Entrées manuelles :'}</span>
                <span>+{formatCurrency(closing.total_cash_in)}</span>
              </div>
            )}
            {closing.total_expenses > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>{lang === 'ar' ? '(-) مصاريف مدفوعة من الصندوق:' : '(-) Dépenses en espèces :'}</span>
                <span>-{formatCurrency(closing.total_expenses)}</span>
              </div>
            )}
            {closing.total_cash_out > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>{lang === 'ar' ? '(-) سحوبات نقدية:' : '(-) Retraits d\'espèces :'}</span>
                <span>-{formatCurrency(closing.total_cash_out)}</span>
              </div>
            )}
          </div>

          {/* Final Results & Écart */}
          <div className="space-y-2 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold text-slate-600">{lang === 'ar' ? 'الرصيد النظري المحسوب:' : 'Solde Théorique Attendu :'}</span>
              <span className="font-bold text-slate-900">{formatCurrency(closing.theoretical_balance)}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-100 text-xs font-black">
              <span className="text-slate-800">{lang === 'ar' ? 'المبلغ الفعلي بالصندوق:' : 'Montant Réel Compté :'}</span>
              <span className="text-teal-700 text-sm">{formatCurrency(closing.actual_balance)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="font-bold text-slate-700">{lang === 'ar' ? 'فارق الصندوق (Écart):' : 'Écart de Caisse :'}</span>
              <span className={`font-black flex items-center gap-1 ${
                closing.difference === 0 
                  ? 'text-emerald-700' 
                  : closing.difference > 0 
                  ? 'text-blue-700' 
                  : 'text-rose-700'
              }`}>
                {closing.difference === 0 ? (
                  <span>0.00 DH ({lang === 'ar' ? 'متطابق ✓' : 'Équilibré ✓'})</span>
                ) : closing.difference > 0 ? (
                  <span>+{formatCurrency(closing.difference)} ({lang === 'ar' ? 'فائض' : 'Excédent'})</span>
                ) : (
                  <span>{formatCurrency(closing.difference)} ({lang === 'ar' ? 'عجز' : 'Déficit'})</span>
                )}
              </span>
            </div>
          </div>

          {/* Notes */}
          {closing.notes && (
            <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
              <span className="font-bold not-italic">{lang === 'ar' ? 'ملاحظة: ' : 'Note : '}</span>
              {closing.notes}
            </div>
          )}

          {/* Footer Signature */}
          <div className="pt-3 text-center space-y-4">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{lang === 'ar' ? 'توقيع أمين الصندوق' : 'Signature caissier'}</span>
              <span>{lang === 'ar' ? 'توقيع الإدارة / الختم' : 'Signature responsable'}</span>
            </div>
            <div className="h-8 border-b border-slate-200"></div>
            <p className="text-[9px] text-slate-400 font-sans">
              {lang === 'ar' ? 'نظام تاجر لإدارة المبيعات والمخزون' : 'TAJER - Système de Gestion & Point de Vente'}
            </p>
          </div>
        </div>

        {/* Action Buttons (hidden on print) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طباعة التقرير (Ticket Z)' : 'Imprimer Ticket Z'}</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};
