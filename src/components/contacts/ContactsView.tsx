import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2, 
  CreditCard, 
  X,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Customer, Supplier } from '../../types';
import { formatMAD } from '../../i18n/locales';
import { getSupabase } from '../../services/supabase';
import { syncEngine } from '../../services/sync';

interface ContactsViewProps {
  initialType?: 'customers' | 'suppliers';
}

export const ContactsView: React.FC<ContactsViewProps> = ({ initialType = 'customers' }) => {
  const { business, formatCurrency, refreshData, dataVersion, lang } = useApp();

  // Ensure demo contacts are purged on load
  React.useEffect(() => {
    db.cleanupDemoContacts(business.id);
  }, [business.id]);

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(initialType);
  const [search, setSearch] = useState('');

  // Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cCity, setCCity] = useState(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
  const [cAddress, setCAddress] = useState('');
  const [cIce, setCIce] = useState('');
  const [cCreditLimit, setCCreditLimit] = useState('');

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sCity, setSCity] = useState(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
  const [sAddress, setSAddress] = useState('');
  const [sIce, setSIce] = useState('');

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    type: 'customer' | 'supplier';
  } | null>(null);

  const customers = useMemo(() => db.getCustomers(business.id), [business.id, dataVersion]);
  const suppliers = useMemo(() => db.getSuppliers(business.id), [business.id, dataVersion]);

  // Filtered
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  }, [customers, search]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));
  }, [suppliers, search]);

  // Save Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;

    const cust: Customer = {
      id: editingCustomer ? editingCustomer.id : 'cust-' + Date.now(),
      business_id: business.id,
      name: cName.trim(),
      phone: cPhone.trim(),
      city: cCity,
      address: cAddress,
      ice: cIce,
      credit_limit: cCreditLimit ? parseFloat(cCreditLimit) : undefined,
      total_spent: editingCustomer ? editingCustomer.total_spent : 0,
      total_debt: editingCustomer ? editingCustomer.total_debt : 0,
      created_at: editingCustomer ? editingCustomer.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIsCustomerModalOpen(false);
    await syncEngine.saveCustomerEverywhere(cust);
    refreshData();
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;

    const supp: Supplier = {
      id: editingSupplier ? editingSupplier.id : 'supp-' + Date.now(),
      business_id: business.id,
      name: sName.trim(),
      phone: sPhone.trim(),
      city: sCity,
      address: sAddress,
      ice: sIce,
      total_purchased: editingSupplier ? editingSupplier.total_purchased : 0,
      total_debt: editingSupplier ? editingSupplier.total_debt : 0,
      created_at: editingSupplier ? editingSupplier.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIsSupplierModalOpen(false);
    await syncEngine.saveSupplierEverywhere(supp);
    refreshData();
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-4`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'customers' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'ar' ? `قائمة العملاء والزبائن (${customers.length})` : `Clients & Particuliers (${customers.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'suppliers' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{lang === 'ar' ? `قائمة الموردين والشركات (${suppliers.length})` : `Fournisseurs & Sociétés (${suppliers.length})`}</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'customers') {
              setEditingCustomer(null);
              setCName('');
              setCPhone('');
              setCCity(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
              setCAddress('');
              setCIce('');
              setCCreditLimit('');
              setIsCustomerModalOpen(true);
            } else {
              setEditingSupplier(null);
              setSName('');
              setSPhone('');
              setSCity(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
              setSAddress('');
              setSIce('');
              setIsSupplierModalOpen(true);
            }
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'customers'
              ? (lang === 'ar' ? 'إضافة عميل جديد' : 'Nouveau client')
              : (lang === 'ar' ? 'إضافة مورد جديد' : 'Nouveau fournisseur')}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative">
          <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-3`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              activeTab === 'customers'
                ? (lang === 'ar' ? 'بحث بالاسم أو رقم الهاتف...' : 'Rechercher un client par nom ou n° téléphone...')
                : (lang === 'ar' ? 'بحث عن مورد بالاسم أو الهاتف...' : 'Rechercher un fournisseur...')
            }
            className={`w-full ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent outline-hidden`}
          />
        </div>
      </div>

      {/* Empty States */}
      {activeTab === 'customers' && filteredCustomers.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {customers.length === 0
              ? (lang === 'ar' ? 'لا يوجد عملاء أو زبائن مسجلون بعد' : 'Aucun client enregistré pour le moment')
              : (lang === 'ar' ? 'لم يتم العثور على عملاء يطابقون البحث' : 'Aucun client ne correspond à votre recherche')}
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            {customers.length === 0
              ? (lang === 'ar' ? 'أضف أول زبون لتسجيل عمليات الشراء وحساب دفاتر الكريدي والديون بدقة.' : 'Ajoutez vos clients pour suivre leur carnet de crédit (kreddi) et leurs achats.')
              : (lang === 'ar' ? 'تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح.' : 'Vérifiez l’orthographe ou le numéro de téléphone saisi.')}
          </p>
          {customers.length === 0 && (
            <button
              onClick={() => {
                setEditingCustomer(null);
                setCName('');
                setCPhone('');
                setCCity(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
                setCAddress('');
                setCIce('');
                setCCreditLimit('');
                setIsCustomerModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة أول عميل' : 'Ajouter un client'}</span>
            </button>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && filteredSuppliers.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
            <Truck className="w-7 h-7" />
          </div>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {suppliers.length === 0
              ? (lang === 'ar' ? 'لا يوجد موردون أو شركات مسجلة بعد' : 'Aucun fournisseur enregistré pour le moment')
              : (lang === 'ar' ? 'لم يتم العثور على موردين يطابقون البحث' : 'Aucun fournisseur ne correspond à votre recherche')}
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            {suppliers.length === 0
              ? (lang === 'ar' ? 'سجل الموردين والشركات لإدارة طلبيات التوريد وفواتير الشراء وديون السلع.' : 'Enregistrez vos fournisseurs pour gérer les approvisionnements et dettes.')
              : (lang === 'ar' ? 'تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح.' : 'Vérifiez l’orthographe ou le numéro de téléphone saisi.')}
          </p>
          {suppliers.length === 0 && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setSName('');
                setSPhone('');
                setSCity(lang === 'ar' ? 'الدار البيضاء' : 'Casablanca');
                setSAddress('');
                setSIce('');
                setIsSupplierModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة أول مورد' : 'Ajouter un fournisseur'}</span>
            </button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeTab === 'customers' ? (
          filteredCustomers.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  </div>

                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <div className="text-xs font-bold text-amber-600">
                      {lang === 'ar' ? 'كريدي:' : 'Crédit :'} {formatCurrency(c.total_debt)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'ar' ? 'المشتريات:' : 'Achats :'} {formatCurrency(c.total_spent)}
                    </div>
                  </div>
                </div>

                {c.address && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{c.city} - {c.address}</span>
                  </div>
                )}
                {c.ice && (
                  <div className="mt-1 text-[10px] text-slate-400 font-mono">
                    ICE: {c.ice}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1">
                <button
                  onClick={() => {
                    setEditingCustomer(c);
                    setCName(c.name);
                    setCPhone(c.phone);
                    setCCity(c.city || (lang === 'ar' ? 'الدار البيضاء' : 'Casablanca'));
                    setCAddress(c.address || '');
                    setCIce(c.ice || '');
                    setCCreditLimit(c.credit_limit ? c.credit_limit.toString() : '');
                    setIsCustomerModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title={lang === 'ar' ? 'تعديل' : 'Modifier'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm({
                      id: c.id,
                      name: c.name,
                      type: 'customer'
                    });
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                  title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          filteredSuppliers.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{s.phone}</span>
                    </div>
                  </div>

                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <div className="text-xs font-bold text-rose-600">
                      {lang === 'ar' ? 'مستحق:' : 'Dû (Dette) :'} {formatCurrency(s.total_debt)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'ar' ? 'إجمالي التوريدات:' : 'Total achats :'} {formatCurrency(s.total_purchased)}
                    </div>
                  </div>
                </div>

                {s.address && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{s.city} - {s.address}</span>
                  </div>
                )}
                {s.ice && (
                  <div className="mt-1 text-[10px] text-slate-400 font-mono">
                    ICE: {s.ice}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1">
                <button
                  onClick={() => {
                    setEditingSupplier(s);
                    setSName(s.name);
                    setSPhone(s.phone);
                    setSCity(s.city || (lang === 'ar' ? 'الدار البيضاء' : 'Casablanca'));
                    setSAddress(s.address || '');
                    setSIce(s.ice || '');
                    setIsSupplierModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title={lang === 'ar' ? 'تعديل' : 'Modifier'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirm({
                      id: s.id,
                      name: s.name,
                      type: 'supplier'
                    });
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 cursor-pointer"
                  title={lang === 'ar' ? 'حذف' : 'Supprimer'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingCustomer 
                  ? (lang === 'ar' ? 'تعديل بيانات العميل' : 'Modifier le client') 
                  : (lang === 'ar' ? 'إضافة عميل جديد' : 'Nouveau client')}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'اسم العميل *' : 'Nom du client *'}
                </label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                  placeholder={lang === 'ar' ? 'محمد الإدريسي' : 'Mohamed El Idrissi'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'رقم الهاتف (الواتساب) *' : 'N° Téléphone (WhatsApp) *'}
                </label>
                <input
                  type="text"
                  required
                  value={cPhone}
                  onChange={e => setCPhone(e.target.value)}
                  placeholder="06 61 22 33 44"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'المدينة' : 'Ville'}
                  </label>
                  <input
                    type="text"
                    value={cCity}
                    onChange={e => setCCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'العنوان' : 'Adresse'}
                  </label>
                  <input
                    type="text"
                    value={cAddress}
                    onChange={e => setCAddress(e.target.value)}
                    placeholder={lang === 'ar' ? 'الحي، الشارع' : 'Quartier, rue'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'سقف الكريدي المسموح (DH)' : 'Plafond de crédit autorisé (DH)'}
                </label>
                <input
                  type="number"
                  value={cCreditLimit}
                  onChange={e => setCCreditLimit(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: 500' : 'Ex: 500'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ العميل' : 'Enregistrer le client'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingSupplier 
                  ? (lang === 'ar' ? 'تعديل بيانات المورد' : 'Modifier le fournisseur') 
                  : (lang === 'ar' ? 'إضافة مورد / شركة جديدة' : 'Nouveau fournisseur')}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'اسم المورد أو الشركة *' : 'Nom du fournisseur ou société *'}
                </label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={e => setSName(e.target.value)}
                  placeholder={lang === 'ar' ? 'شركة لوسيور المغرب' : 'Lesieur Cristal Maroc'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'رقم الهاتف *' : 'N° Téléphone *'}
                </label>
                <input
                  type="text"
                  required
                  value={sPhone}
                  onChange={e => setSPhone(e.target.value)}
                  placeholder="05 22 33 44 55"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'المدينة' : 'Ville'}
                  </label>
                  <input
                    type="text"
                    value={sCity}
                    onChange={e => setSCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'العنوان' : 'Adresse'}
                  </label>
                  <input
                    type="text"
                    value={sAddress}
                    onChange={e => setSAddress(e.target.value)}
                    placeholder={lang === 'ar' ? 'المنطقة الصناعية' : 'Zone Industrielle'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'ICE (اختياري)' : 'ICE (Optionnel)'}
                </label>
                <input
                  type="text"
                  value={sIce}
                  onChange={e => setSIce(e.target.value)}
                  placeholder="001234567..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ المورد' : 'Enregistrer le fournisseur'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-200`}>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تأكيد عملية الحذف' : 'Confirmer la suppression'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف {deleteConfirm.type === 'customer' ? 'العميل' : 'المورد'}{' '}
                    <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirm.name}"</span>؟ 
                    هذا الإجراء لا يمكن التراجع عنه.
                  </>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir supprimer {deleteConfirm.type === 'customer' ? 'le client' : 'le fournisseur'}{' '}
                    <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirm.name}"</span> ? 
                    Cette action est irréversible.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer select-none"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm.type === 'customer') {
                    await syncEngine.deleteCustomerEverywhere(deleteConfirm.id, business.id);
                  } else {
                    await syncEngine.deleteSupplierEverywhere(deleteConfirm.id, business.id);
                  }
                  setDeleteConfirm(null);
                  refreshData();
                  syncEngine.syncAll().then(refreshData).catch(() => {});
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer select-none"
              >
                {lang === 'ar' ? 'نعم، تأكيد الحذف' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
