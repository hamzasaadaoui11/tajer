import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Share2, 
  CheckCircle2, 
  Phone, 
  Calendar, 
  ArrowDownLeft, 
  Plus, 
  Users, 
  Truck, 
  DollarSign, 
  X,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Receipt
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Customer, Supplier, PaymentTransaction, PaymentMethod, Sale } from '../../types';
import { formatMAD } from '../../i18n/locales';
import { generateCustomerStatementWhatsAppText, openWhatsApp } from '../../services/whatsapp';
import { syncEngine } from '../../services/sync';

export const DebtsView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang, setActiveSaleReceipt } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [search, setSearch] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Payment Settlement Modal
  const [payingEntity, setPayingEntity] = useState<{ id: string; name: string; debt: number; phone?: string; type: 'customer' | 'supplier' } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add Manual Debt Modal
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [debtTargetType, setDebtTargetType] = useState<'customer' | 'supplier'>('customer');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtNotes, setNewDebtNotes] = useState('');

  // Customer History & Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Reconcile and load fresh data
  const customers = useMemo(() => {
    db.reconcileCustomerDebts(business.id);
    return db.getCustomers(business.id);
  }, [business.id, dataVersion]);

  const suppliers = useMemo(() => {
    db.reconcileSupplierDebts(business.id);
    return db.getSuppliers(business.id);
  }, [business.id, dataVersion]);

  const allSales = useMemo(() => db.getSales(business.id), [business.id, dataVersion]);
  const paymentsHistory = useMemo(() => db.getPaymentTransactions(business.id), [business.id, dataVersion]);

  // Aggregate stats
  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  }, [customers]);

  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.total_debt || 0), 0);
  }, [suppliers]);

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => (c.total_debt || 0) > 0)
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
      .sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0));
  }, [customers, search]);

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => (s.total_debt || 0) > 0)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search))
      .sort((a, b) => (b.total_debt || 0) - (a.total_debt || 0));
  }, [suppliers, search]);

  // Handle manual reconciliation trigger
  const handleReconcile = async () => {
    setIsReconciling(true);
    db.reconcileCustomerDebts(business.id);
    db.reconcileSupplierDebts(business.id);
    await syncEngine.syncAll().catch(() => {});
    refreshData();
    setIsReconciling(false);
  };

  // Open Payment modal
  const handleOpenPayment = (entity: Customer | Supplier, type: 'customer' | 'supplier') => {
    setPayingEntity({
      id: entity.id,
      name: entity.name,
      debt: entity.total_debt,
      phone: entity.phone,
      type,
    });
    setPaymentAmount(entity.total_debt.toString());
    setPaymentMethod('CASH');
    setPaymentNotes('');
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEntity) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(lang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant valide');
      return;
    }

    const tx: PaymentTransaction = {
      id: 'pay-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      type: payingEntity.type === 'customer' ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT',
      entity_id: payingEntity.id,
      entity_name: payingEntity.name,
      amount,
      payment_method: paymentMethod,
      reference_id: 'REG-' + Date.now().toString().slice(-6),
      notes: paymentNotes || (lang === 'ar' ? 'سداد دفعة من الحساب' : 'Règlement acompte'),
      user_name: user.name,
      created_at: new Date().toISOString(),
    };

    if (payingEntity.type === 'customer') {
      db.recordCustomerPayment(tx);
      const updated = db.getCustomerById(payingEntity.id);
      if (updated) syncEngine.saveCustomerEverywhere(updated).catch(() => {});
    } else {
      db.recordSupplierPayment(tx);
      const updated = db.getSupplierById(payingEntity.id);
      if (updated) syncEngine.saveSupplierEverywhere(updated).catch(() => {});
    }

    setPayingEntity(null);
    setPaymentAmount('');
    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
  };

  // Submit Manual Debt Addition
  const handleSubmitAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      alert(lang === 'ar' ? 'يرجى اختيار العميل أو المورد أولاً' : 'Veuillez sélectionner un contact');
      return;
    }
    const amount = parseFloat(newDebtAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(lang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Veuillez saisir un montant valide');
      return;
    }

    if (debtTargetType === 'customer') {
      db.addManualCustomerDebt(business.id, selectedTargetId, amount, newDebtNotes || 'تسجيل دين يدوي', user.name);
      const updated = db.getCustomerById(selectedTargetId);
      if (updated) syncEngine.saveCustomerEverywhere(updated).catch(() => {});
    } else {
      db.addManualSupplierDebt(business.id, selectedTargetId, amount, newDebtNotes || 'تسجيل مستحق يدوي', user.name);
      const updated = db.getSupplierById(selectedTargetId);
      if (updated) syncEngine.saveSupplierEverywhere(updated).catch(() => {});
    }

    setIsAddDebtOpen(false);
    setSelectedTargetId('');
    setNewDebtAmount('');
    setNewDebtNotes('');
    refreshData();
    syncEngine.syncAll().then(refreshData).catch(() => {});
  };

  // Send WhatsApp Statement to Customer
  const handleSendWhatsAppStatement = (customer: Customer) => {
    const text = generateCustomerStatementWhatsAppText(customer, allSales, business);
    openWhatsApp(customer.phone, text);
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Top Banner / Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Debts to Collect */}
        <div className="bg-amber-500 text-white rounded-3xl p-5 shadow-md shadow-amber-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-100 font-semibold mb-1">
              <Users className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إجمالي ديون الزبائن الواجب استخلاصها (كريدي)' : 'Total crédits clients à recouvrer (Kreddi)'}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatCurrency(totalCustomerDebt)}
            </div>
            <span className="text-[11px] text-amber-100 mt-1 inline-block">
              {lang === 'ar' 
                ? `${filteredCustomers.length} عميل مسجل بذمته مبالغ غير مسددة` 
                : `${filteredCustomers.length} client(s) avec solde impayé`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Supplier Debts to Pay */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <Truck className="w-4 h-4 text-teal-400" />
              <span>{lang === 'ar' ? 'مستحقات الموردين والشركات الواجب تسديدها' : 'Dettes fournisseurs à régler'}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-teal-300">
              {formatCurrency(totalSupplierDebt)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">
              {lang === 'ar'
                ? `${filteredSuppliers.length} مورد بانتظار السداد`
                : `${filteredSuppliers.length} fournisseur(s) en attente de règlement`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-teal-400" />
          </div>
        </div>
      </div>

      {/* Tabs, Actions & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {lang === 'ar' ? `كريدي الزبائن (${filteredCustomers.length})` : `Crédits Clients (${filteredCustomers.length})`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {lang === 'ar' ? `ديون الموردين (${filteredSuppliers.length})` : `Dettes Fournisseurs (${filteredSuppliers.length})`}
            </span>
          </button>
        </div>

        {/* Search & Quick Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Rechercher par nom ou tél...'}
              className={`w-full ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent outline-hidden`}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddDebtOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تسجيل دين جديد' : 'Nouveau crédit'}</span>
          </button>

          <button
            type="button"
            onClick={handleReconcile}
            disabled={isReconciling}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition"
            title={lang === 'ar' ? 'مطابقة ومزامنة أرصدة الديون مع الفواتير' : 'Réconcilier les soldes'}
          >
            <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Debts Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeTab === 'customers' ? (
          filteredCustomers.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
              {lang === 'ar' ? 'الحمد لله! لا توجد ديون مستحقة على الزبائن حالياً.' : 'Aucun crédit client en cours.'}
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const hasExceededLimit = customer.credit_limit && customer.total_debt >= customer.credit_limit;
              return (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {customer.name}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>

                      <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                        <span className="font-extrabold text-base text-amber-600 dark:text-amber-400">
                          {formatCurrency(customer.total_debt)}
                        </span>
                        <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'باقي في الذمة' : 'Solde dû'}</div>
                      </div>
                    </div>

                    {hasExceededLimit && (
                      <div className="mt-2 text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {lang === 'ar' 
                            ? `تجاوز سقف الكريدي المسموح (${formatCurrency(customer.credit_limit!)})` 
                            : `Plafond de crédit dépassé (${formatCurrency(customer.credit_limit!)})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <button
                      onClick={() => handleOpenPayment(customer, 'customer')}
                      className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'قبض دفعة (سداد)' : 'Encaisser un acompte'}</span>
                    </button>

                    <button
                      onClick={() => setStatementCustomer(customer)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                      title={lang === 'ar' ? 'عرض فواتير الكريدي وتفاصيل الحساب' : 'Voir les factures'}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{lang === 'ar' ? 'الفواتير' : 'Factures'}</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsAppStatement(customer)}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                      title={lang === 'ar' ? 'إرسال كشف الحساب عبر واتساب' : 'Envoyer relevé par WhatsApp'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{lang === 'ar' ? 'كشف الحساب' : 'Relevé'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredSuppliers.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
              {lang === 'ar' ? 'لا توجد ديون مستحقة للموردين حالياً.' : 'Aucune dette fournisseur en cours.'}
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div
                key={supplier.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {supplier.name}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{supplier.phone}</span>
                      </div>
                    </div>

                    <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                      <span className="font-extrabold text-base text-rose-600 dark:text-rose-400">
                        {formatCurrency(supplier.total_debt)}
                      </span>
                      <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'مستحق للمورد' : 'Dû au fournisseur'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenPayment(supplier, 'supplier')}
                    className="w-full py-2 rounded-xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'أداء وتسديد مستحقات المورد' : 'Régler le fournisseur'}</span>
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Payment Settlement Modal */}
      {payingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {payingEntity.type === 'customer' 
                    ? (lang === 'ar' ? 'تسجيل دفعة من العميل' : 'Règlement reçu du client') 
                    : (lang === 'ar' ? 'أداء مستحقات المورد' : 'Paiement au fournisseur')}
                </h3>
                <span className="text-xs text-slate-500">{payingEntity.name}</span>
              </div>
              <button onClick={() => setPayingEntity(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-xs flex justify-between items-center">
                <span>{lang === 'ar' ? 'إجمالي الرصيد المستحق:' : 'Total solde impayé :'}</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400">
                  {formatCurrency(payingEntity.debt)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المبلغ المؤدى (DH) *' : 'Montant réglé (DH) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-teal-500 font-extrabold text-sm text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'طريقة الأداء' : 'Mode de règlement'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="CASH">{lang === 'ar' ? 'نقداً (يدخل في رصيد الصندوق فوراً)' : 'Espèces (enregistré en caisse)'}</option>
                  <option value="BANK_TRANSFER">{lang === 'ar' ? 'تحويل بنكي (Virement)' : 'Virement bancaire'}</option>
                  <option value="CARD">{lang === 'ar' ? 'شيك أو بطاقة' : 'Chèque ou carte bancaire'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'ملاحظات' : 'Remarques'}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'رقم الوصل أو تفاصيل السداد...' : 'N° reçu ou détails...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'تأكيد وحفظ الدفعة' : 'Confirmer le règlement'}
                </button>
                <button
                  type="button"
                  onClick={() => setPayingEntity(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Debt Modal */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? '➕ تسجيل دين جديد / كريدي مباشر' : '➕ Ajouter une créance / dette'}
              </h3>
              <button onClick={() => setIsAddDebtOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddDebt} className="space-y-3">
              {/* Type Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setDebtTargetType('customer');
                    setSelectedTargetId('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debtTargetType === 'customer'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar' ? 'دين على زبون (كريدي)' : 'Crédit client'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDebtTargetType('supplier');
                    setSelectedTargetId('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debtTargetType === 'supplier'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar' ? 'مستحق لمورد' : 'Dette fournisseur'}
                </button>
              </div>

              {/* Target Entity Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {debtTargetType === 'customer' 
                    ? (lang === 'ar' ? 'اختر العميل *' : 'Sélectionner le client *')
                    : (lang === 'ar' ? 'اختر المورد *' : 'Sélectionner le fournisseur *')}
                </label>
                <select
                  required
                  value={selectedTargetId}
                  onChange={e => setSelectedTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">{lang === 'ar' ? '-- اختر من القائمة --' : '-- Choisir --'}</option>
                  {debtTargetType === 'customer'
                    ? customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} - دين حالي: {formatCurrency(c.total_debt)}
                        </option>
                      ))
                    : suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''} - دين حالي: {formatCurrency(s.total_debt)}
                        </option>
                      ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'مبلغ الدين المراد إضافته (DH) *' : 'Montant de la créance (DH) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newDebtAmount}
                  onChange={e => setNewDebtAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-amber-500 font-extrabold text-sm text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'سبب الدين / ملاحظات' : 'Motif / Remarque'}
                </label>
                <input
                  type="text"
                  value={newDebtNotes}
                  onChange={e => setNewDebtNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: كريدي سابق، سحب سلع بدون فاتورة...' : 'Ex: Crédit antérieur...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'تأكيد وإضافة إلى الحساب' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDebtOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement & Invoices Drawer/Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} max-h-[85vh] flex flex-col animate-in zoom-in-95`}>
            
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {statementCustomer.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {lang === 'ar' ? 'دفتر الكريدي' : 'Fiche Crédit'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5" dir="ltr">
                  {statementCustomer.phone}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendWhatsAppStatement(statementCustomer)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إرسال عبر واتساب' : 'WhatsApp'}</span>
                </button>
                <button onClick={() => setStatementCustomer(null)} className="text-slate-400 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Balance Banner */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">
                  {lang === 'ar' ? 'الكريدي المتبقي الحالي:' : 'Solde restant dû :'}
                </span>
                <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                  {formatCurrency(statementCustomer.total_debt)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block">
                  {lang === 'ar' ? 'إجمالي المشتريات:' : 'Total achats :'}
                </span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                  {formatCurrency(statementCustomer.total_spent)}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
                {lang === 'ar' ? 'سجل فواتير العميل المسجلة بذمته:' : 'Historique des factures du client :'}
              </h4>

              {(() => {
                const customerSales = allSales.filter(s => 
                  s.customer_id === statementCustomer.id || 
                  (!s.customer_id && s.customer_name && s.customer_name.trim().toLowerCase() === statementCustomer.name.trim().toLowerCase())
                );

                if (customerSales.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                      {lang === 'ar' ? 'لا توجد فواتير مسجلة لهذا العميل' : 'Aucune facture pour ce client'}
                    </div>
                  );
                }

                return customerSales.map(sale => {
                  const isCreditSale = (sale.amount_due && sale.amount_due > 0) || sale.payment_method === 'CREDIT';
                  return (
                    <div
                      key={sale.id}
                      className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition ${
                        isCreditSale 
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {sale.invoice_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCreditSale 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {isCreditSale ? (lang === 'ar' ? 'كريدي' : 'Crédit') : (lang === 'ar' ? 'خالص' : 'Payé')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(sale.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')} • {sale.items.length} أصناف
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                          <div className="font-black text-slate-800 dark:text-slate-200">
                            {formatCurrency(sale.total)}
                          </div>
                          {sale.amount_due > 0 && (
                            <div className="text-[10px] text-rose-600 font-bold">
                              {lang === 'ar' ? `باقي: ${formatCurrency(sale.amount_due)}` : `Dû: ${formatCurrency(sale.amount_due)}`}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setStatementCustomer(null);
                            setActiveSaleReceipt(sale);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                          title={lang === 'ar' ? 'عرض الفاتورة' : 'Voir'}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const cust = statementCustomer;
                  setStatementCustomer(null);
                  handleOpenPayment(cust, 'customer');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'قبض دفعة من الحساب الآن' : 'Encaisser un acompte'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
