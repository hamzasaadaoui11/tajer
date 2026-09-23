import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Calendar,
  X,
  Droplet,
  Zap,
  Wifi,
  Fuel,
  Home,
  Users,
  ShoppingBag,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Expense } from '../../types';

export const ExpensesView: React.FC = () => {
  const { business, branch, user, formatCurrency, refreshData, dataVersion, lang } = useApp();

  // Search, Category and Date filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('الماء (Eau)');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 16)); // YYYY-MM-DDTHH:MM
  const [expPayMethod, setExpPayMethod] = useState<'CASH' | 'TRANSFER' | 'CREDIT'>('CASH');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Retrieve raw expenses from db
  const rawExpenses = useMemo(() => {
    return db.getExpenses(business.id, branch.id);
  }, [business.id, branch.id, dataVersion]);

  // Moroccan Dirham expense categories with Arabic and corresponding Icons
  const categories = useMemo(() => [
    { id: 'الماء (Eau)', label: lang === 'ar' ? 'الماء' : 'Eau', icon: Droplet, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    { id: 'الكهرباء (Électricité)', label: lang === 'ar' ? 'الكهرباء' : 'Électricité', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
    { id: 'الأنترنيت والويفي (Internet/Wifi)', label: lang === 'ar' ? 'الأنترنيت والويفي' : 'Internet / Wifi', icon: Wifi, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
    { id: 'المحروقات والغازوال (Carburant)', label: lang === 'ar' ? 'المحروقات والغازوال' : 'Carburant', icon: Fuel, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
    { id: 'كراء المحل (Loyer)', label: lang === 'ar' ? 'كراء المحل' : 'Loyer commercial', icon: Home, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
    { id: 'الأجور والعمال (Salaries)', label: lang === 'ar' ? 'الأجور والعمال' : 'Salaires & Personnel', icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { id: 'المشتريات والسلع (Achats)', label: lang === 'ar' ? 'المشتريات والسلع' : 'Achats & Fournitures', icon: ShoppingBag, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40' },
    { id: 'مصاريف أخرى (Divers)', label: lang === 'ar' ? 'مصاريف أخرى' : 'Dépenses diverses', icon: HelpCircle, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40' }
  ], [lang]);

  // Helper to find icon and colors for any category
  const getCategoryMeta = (catName: string) => {
    const found = categories.find(c => c.id === catName || catName.includes(c.id));
    if (found) return found;
    return { label: catName, icon: HelpCircle, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40' };
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter(exp => {
      // Search matches
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category matches
      const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;

      // Date matches
      let matchesDate = true;
      const expTime = new Date(exp.created_at).getTime();
      const now = new Date();

      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        matchesDate = expTime >= startOfToday;
      } else if (dateFilter === 'week') {
        const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        matchesDate = expTime >= oneWeekAgo;
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        matchesDate = expTime >= startOfMonth;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [rawExpenses, searchQuery, selectedCategory, dateFilter]);

  // Paginated output
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  // Aggregate sums
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayTotal = 0;
    let monthTotal = 0;
    let totalAll = 0;

    rawExpenses.forEach(exp => {
      const expTime = new Date(exp.created_at).getTime();
      totalAll += exp.amount;
      if (expTime >= startOfToday) {
        todayTotal += exp.amount;
      }
      if (expTime >= startOfMonth) {
        monthTotal += exp.amount;
      }
    });

    return { todayTotal, monthTotal, totalAll };
  }, [rawExpenses]);

  // Reset page when filters change
  const handleFilterChange = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (filter: 'all' | 'today' | 'week' | 'month') => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  // Submit expense
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: Expense = {
      id: 'exp-' + Date.now(),
      business_id: business.id,
      branch_id: branch.id,
      category: expCategory,
      amount: parsedAmount,
      payment_method: expPayMethod,
      description: expDesc || expCategory.split(' ')[0],
      user_name: user?.name || (lang === 'ar' ? 'المدير' : 'Gérant'),
      created_at: new Date(expDate).toISOString()
    };

    db.createExpense(newExpense);
    
    // Clear and close
    setExpAmount('');
    setExpDesc('');
    setExpDate(new Date().toISOString().substring(0, 16));
    setExpPayMethod('CASH');
    setIsModalOpen(false);
    setCurrentPage(1);
    refreshData();
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    const confirmMsg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ لجهة الصندوق إن كان نقداً.'
      : 'Êtes-vous sûr de vouloir supprimer cette dépense ? Le montant sera restitué à la caisse si payé en espèces.';
    if (window.confirm(confirmMsg)) {
      db.deleteExpense(id, business.id, user?.name || 'Admin');
      refreshData();
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Header section with Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-500" />
            <span>{lang === 'ar' ? 'إدارة مصاريف وتكاليف المتجر' : 'Gestion des Charges & Dépenses'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar' 
              ? 'تسجيل ومراقبة كل المصاريف التشغيلية للمحل (الماء، الكهرباء، الكراء، الأجور...) والتحكم بها بالتواريخ'
              : 'Enregistrement et suivi des charges opérationnelles (eau, électricité, loyer, salaires...) avec filtrage temporel'}
          </p>
        </div>

        <button
          onClick={() => {
            setExpDate(new Date().toISOString().substring(0, 16));
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل مصروف جديد' : 'Nouvelle dépense'}</span>
        </button>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Today's Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">
              {lang === 'ar' ? 'مجموع مصاريف اليوم' : "Dépenses d'aujourd'hui"}
            </span>
            <span className="text-2xl font-black tracking-tight text-rose-600 mt-1 block">
              {formatCurrency(stats.todayTotal)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-rose-600 text-white rounded-3xl p-5 shadow-md shadow-rose-600/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-100 font-semibold block">
              {lang === 'ar' ? 'إجمالي مصاريف هذا الشهر' : 'Dépenses ce mois-ci'}
            </span>
            <span className="text-2xl sm:text-3xl font-black tracking-tight mt-1 block">
              {formatCurrency(stats.monthTotal)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses Overall */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold block">
              {lang === 'ar' ? 'إجمالي المصاريف المسجلة' : 'Total des dépenses'}
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-200 mt-1 block">
              {formatCurrency(stats.totalAll)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Category Pills Selector */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 block">
          {lang === 'ar' ? 'تصفية سريعة حسب نوع المصروف:' : 'Filtrer par catégorie de charge :'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-950 text-white dark:bg-slate-800'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 text-slate-600 hover:bg-slate-50 dark:text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'Tous'} ({rawExpenses.length})
          </button>
          {categories.map(cat => {
            const count = rawExpenses.filter(e => e.category === cat.id).length;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleFilterChange(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 text-slate-600 hover:bg-slate-50 dark:text-slate-300'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={lang === 'ar' ? 'بحث في تفاصيل أو اسم المصروف...' : 'Rechercher par libellé ou catégorie...'}
            className={`w-full ${lang === 'ar' ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-hidden focus:border-rose-500`}
          />
          <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'left-3.5' : 'right-3.5'} top-3`} />
        </div>

        {/* Date Quick Filters */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
          <button
            onClick={() => handleDateFilterChange('all')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'كل الأوقات' : 'Tout'}
          </button>
          <button
            onClick={() => handleDateFilterChange('today')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'اليوم' : "Aujourd'hui"}
          </button>
          <button
            onClick={() => handleDateFilterChange('week')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'آخر 7 أيام' : '7 jours'}
          </button>
          <button
            onClick={() => handleDateFilterChange('month')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {lang === 'ar' ? 'هذا الشهر' : 'Ce mois'}
          </button>
        </div>

      </div>

      {/* Main Expenses List Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <TrendingDown className="w-10 h-10 mx-auto text-slate-300" />
              <p>{lang === 'ar' ? 'لا توجد مصاريف مطابقة لخيارات البحث والتصفية الحالية' : 'Aucune dépense ne correspond aux critères actuels'}</p>
            </div>
          ) : (
            paginatedExpenses.map(exp => {
              const meta = getCategoryMeta(exp.category);
              const CatIcon = meta.icon;
              const formattedDate = new Date(exp.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  
                  {/* Category, description & date */}
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.color}`}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {exp.description}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          {meta.label}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{formattedDate}</span>
                        <span>•</span>
                        <span className="text-[10px] bg-slate-50 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold">
                          {exp.payment_method === 'CASH' 
                            ? (lang === 'ar' ? 'كاش (الصندوق)' : 'Espèces (Caisse)') 
                            : exp.payment_method === 'TRANSFER' 
                            ? (lang === 'ar' ? 'حساب بنكي' : 'Virement bancaire') 
                            : (lang === 'ar' ? 'شيك / كريدي' : 'Chèque / Crédit')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Amount & Delete Action */}
                  <div className={`flex items-center gap-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                    <div>
                      <div className="font-black text-sm text-rose-600">
                        -{formatCurrency(exp.amount)}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {lang === 'ar' ? `سجلها: ${exp.user_name}` : `Par: ${exp.user_name}`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 dark:bg-slate-800/40 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={lang === 'ar' ? 'حذف هذا المصروف' : 'Supprimer cette dépense'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* List Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span>{lang === 'ar' ? 'عرض' : 'Affichage'}</span>
              <span className="text-slate-900 dark:text-white font-extrabold mx-1">{paginatedExpenses.length}</span>
              <span>{lang === 'ar' ? 'من أصل' : 'sur'}</span>
              <span className="text-slate-900 dark:text-white font-extrabold mx-1">{filteredExpenses.length}</span>
              <span>{lang === 'ar' ? 'مصروف مسجل' : 'dépense(s)'}</span>
            </div>

            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
                title={lang === 'ar' ? 'السابق' : 'Précédent'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-650 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }

                if (pageNum === 2 || pageNum === totalPages - 1) {
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed transition cursor-pointer"
                title={lang === 'ar' ? 'التالي' : 'Suivant'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150`}>
            
            {/* Modal Title */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تسجيل مصروف جديد للمحل' : 'Enregistrer une nouvelle dépense'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitExpense} className="space-y-4">
              
              {/* Expense Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المبلغ المسدد (بالدرهم) *' : 'Montant payé (en DH) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-500 bg-white dark:bg-slate-800 text-center text-lg font-black text-rose-600 focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Expense Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'فئة ونوع المصروف *' : 'Catégorie de la dépense *'}
                </label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-hidden"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'تاريخ وتوقيت المصروف' : 'Date et heure'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'طريقة السداد / الدفع' : 'Mode de paiement'}
                </label>
                <select
                  value={expPayMethod}
                  onChange={e => setExpPayMethod(e.target.value as 'CASH' | 'TRANSFER' | 'CREDIT')}
                  className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                >
                  <option value="CASH">{lang === 'ar' ? 'نقداً من رصيد صندوق المحل (Caisse)' : 'Espèces (Caisse du magasin)'}</option>
                  <option value="TRANSFER">{lang === 'ar' ? 'تحويل بنكي / حساب بنكي خارجي' : 'Virement bancaire / Carte'}</option>
                  <option value="CREDIT">{lang === 'ar' ? 'دين / كريدي / دفع مؤجل' : 'À terme / Crédit fournisseur'}</option>
                </select>
              </div>

              {/* Description Detail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'الوصف أو الملاحظة المخصصة' : 'Description ou remarque'}
                </label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: فاتورة الكهرباء لشهر غشت أو بنزين الموتور' : 'Ex: Facture électricité du mois, carburant...'}
                  className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer text-center"
                >
                  {lang === 'ar' ? 'تسجيل المصروف' : 'Enregistrer la dépense'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
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
