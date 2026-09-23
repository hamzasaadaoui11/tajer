import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  Package, 
  ArrowUpRight, 
  FileSpreadsheet,
  Receipt,
  Users,
  Droplet,
  Zap,
  Wifi,
  Fuel,
  Home,
  ShoppingBag,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { formatMAD } from '../../i18n/locales';

export const ReportsView: React.FC = () => {
  const { business, branch, formatCurrency, dataVersion, lang } = useApp();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const sales = useMemo(() => db.getSales(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const expenses = useMemo(() => db.getExpenses(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const products = useMemo(() => db.getProducts(business.id, branch.id), [business.id, branch.id, dataVersion]);
  const customers = useMemo(() => db.getCustomers(business.id), [business.id, dataVersion]);

  // Filter by period
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const saleDate = new Date(s.created_at);
      if (period === 'today') {
        return saleDate.toDateString() === now.toDateString();
      } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= weekAgo;
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= monthAgo;
      }
      return true;
    });
  }, [sales, period]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const expDate = new Date(e.created_at);
      if (period === 'today') {
        return expDate.toDateString() === now.toDateString();
      } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return expDate >= weekAgo;
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return expDate >= monthAgo;
      }
      return true;
    });
  }, [expenses, period]);

  // Aggregate numbers
  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
  const totalCost = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const saleCost = s.items.reduce((itemSum, item) => itemSum + (item.purchase_price || 0) * item.quantity, 0);
      return sum + saleCost;
    }, 0);
  }, [filteredSales]);
  const grossProfit = totalRevenue - totalCost;
  const totalExp = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const netProfit = grossProfit - totalExp;

  // Best selling products
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number }> = {};
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        if (!counts[item.product_id]) {
          counts[item.product_id] = { name: item.product_name, qty: 0, total: 0 };
        }
        counts[item.product_id].qty += item.quantity;
        counts[item.product_id].total += item.total;
      }
    }
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredSales]);

  // Moroccan Dirham expense categories with Arabic and corresponding Icons
  const expenseCategories = useMemo(() => [
    { id: 'الماء (Eau)', label: lang === 'ar' ? 'الماء' : 'Eau', icon: Droplet, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40', progressColor: 'bg-blue-500' },
    { id: 'الكهرباء (Électricité)', label: lang === 'ar' ? 'الكهرباء' : 'Électricité', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', progressColor: 'bg-amber-500' },
    { id: 'الأنترنيت والويفي (Internet/Wifi)', label: lang === 'ar' ? 'الأنترنيت والويفي' : 'Internet/Wifi', icon: Wifi, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40', progressColor: 'bg-indigo-500' },
    { id: 'المحروقات والغازوال (Carburant)', label: lang === 'ar' ? 'المحروقات والغازوال' : 'Carburant', icon: Fuel, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40', progressColor: 'bg-rose-500' },
    { id: 'كراء المحل (Loyer)', label: lang === 'ar' ? 'كراء المحل' : 'Loyer', icon: Home, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40', progressColor: 'bg-purple-500' },
    { id: 'الأجور والعمال (Salaries)', label: lang === 'ar' ? 'الأجور والعمال' : 'Salariés / Salaires', icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', progressColor: 'bg-emerald-500' },
    { id: 'المشتريات والسلع (Achats)', label: lang === 'ar' ? 'المشتريات والسلع' : 'Achats et marchandises', icon: ShoppingBag, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40', progressColor: 'bg-teal-500' },
    { id: 'مصاريف أخرى (Divers)', label: lang === 'ar' ? 'مصاريف أخرى' : 'Autres dépenses / Divers', icon: HelpCircle, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/40', progressColor: 'bg-slate-500' }
  ], [lang]);

  // Compute breakdown of expenses by category for the selected period
  const expensesBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    
    // Initialize with 0
    expenseCategories.forEach(cat => {
      breakdown[cat.id] = 0;
    });

    let total = 0;
    const arabicLabels: Record<string, string> = {
      'الماء (Eau)': 'الماء',
      'الكهرباء (Électricité)': 'الكهرباء',
      'الأنترنيت والويفي (Internet/Wifi)': 'الأنترنيت',
      'المحروقات والغازوال (Carburant)': 'المحروقات',
      'كراء المحل (Loyer)': 'كراء',
      'الأجور والعمال (Salaries)': 'الأجور',
      'المشتريات والسلع (Achats)': 'المشتريات',
      'مصاريف أخرى (Divers)': 'مصاريف أخرى'
    };
    filteredExpenses.forEach(exp => {
      let matchedId = 'مصاريف أخرى (Divers)';
      for (const cat of expenseCategories) {
        const arLabel = arabicLabels[cat.id] || '';
        if (exp.category === cat.id || exp.category.includes(arLabel) || (arLabel && exp.category.includes(arLabel))) {
          matchedId = cat.id;
          break;
        }
      }
      breakdown[matchedId] = (breakdown[matchedId] || 0) + exp.amount;
      total += exp.amount;
    });

    return expenseCategories.map(cat => {
      const amount = breakdown[cat.id] || 0;
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      return {
        ...cat,
        amount,
        percentage
      };
    }).filter(item => item.amount > 0) // only show categories with actual expenses
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenseCategories]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = lang === 'ar' 
      ? ['رقم الفاتورة', 'التاريخ', 'العميل', 'المبلغ الإجمالي', 'التكلفة', 'الربح', 'طريقة الدفع']
      : ['N° Facture', 'Date', 'Client', 'Total TTC', 'Coût d\'achat', 'Marge profit', 'Mode de paiement'];
    const rows = filteredSales.map(s => {
      const saleCost = s.items.reduce((acc, it) => acc + (it.purchase_price || 0) * it.quantity, 0);
      const saleProfit = s.total - saleCost;
      return [
        s.invoice_number,
        new Date(s.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR'),
        `"${s.customer_name || (lang === 'ar' ? 'عام' : 'Comptoir')}"`,
        s.total,
        saleCost,
        saleProfit,
        s.payment_method,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rapport_ventes_${business.name}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'التقارير والأرباح المحققة' : 'Rapports & Analyse des Bénéfices'}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {lang === 'ar' ? 'تحليل المبيعات وهوامش الربح والمصاريف' : "Analyse des ventes, marges bénéficiaires et charges d'exploitation"}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Period selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl transition ${period === 'today' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'}`}
            >
              {lang === 'ar' ? 'اليوم' : "Aujourd'hui"}
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl transition ${period === 'week' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'}`}
            >
              {lang === 'ar' ? '7 أيام' : '7 jours'}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl transition ${period === 'month' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'}`}
            >
              {lang === 'ar' ? '30 يوماً' : '30 jours'}
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl transition ${period === 'all' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'}`}
            >
              {lang === 'ar' ? 'الكل' : 'Tout'}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800"
            title={lang === 'ar' ? 'تحميل التقرير بتنسيق Excel CSV' : 'Télécharger le rapport au format Excel CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'تصدير CSV' : 'Exporter CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? "رقم المعاملات (Chiffre d'affaires)" : "Chiffre d'Affaires (TTC)"}</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalRevenue)}
          </div>
          <span className="text-[11px] text-teal-600 font-bold mt-1 inline-block">
            {filteredSales.length} {lang === 'ar' ? 'عملية بيع' : 'vente(s)'}
          </span>
        </div>

        {/* Cost of Goods */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? "تكلفة شراء السلع (Coût d'achat)" : "Coût d'Achat des Marchandises"}</span>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {formatCurrency(totalCost)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">
            {lang === 'ar' ? 'رأس المال المسترجع' : 'Capital récupéré'}
          </span>
        </div>

        {/* Gross Margin */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? 'الهامش الإجمالي (Marge brute)' : 'Marge Brute Globale'}</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            +{formatCurrency(grossProfit)}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">
            {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}% {lang === 'ar' ? 'من المعاملات' : 'du C.A.'}
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-teal-600 text-white rounded-3xl p-5 shadow-md shadow-teal-600/20">
          <span className="text-xs text-teal-100 font-semibold">{lang === 'ar' ? 'الربح الصافي الفعلي (Bénéfice Net)' : 'Bénéfice Net Réel'}</span>
          <div className="text-2xl font-black tracking-tight mt-1">
            +{formatCurrency(netProfit)}
          </div>
          <span className="text-[11px] text-teal-100 mt-1 inline-block">
            {lang === 'ar' 
              ? `بعد خصم مصاريف المحل (${formatCurrency(totalExp)})` 
              : `Après déduction des charges (${formatCurrency(totalExp)})`}
          </span>
        </div>
      </div>

      {/* Top 5 Products & Operating Charges Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Top Products */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>{lang === 'ar' ? 'السلع الأكثر مبيعاً في هذه الفترة' : 'Top 5 des articles les plus vendus'}</span>
          </h3>

          <div className="space-y-3 flex-1">
            {topProducts.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                {lang === 'ar' ? 'لا توجد مبيعات في هذه الفترة' : 'Aucune vente sur cette période'}
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[180px]">{p.name}</span>
                  </div>
                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      {p.qty} {lang === 'ar' ? 'قطعة' : 'unité(s)'}
                    </span>
                    <span className="text-[10px] text-teal-600 font-semibold">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Operating Charges (Expenses) Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>{lang === 'ar' ? 'توزيع المصاريف التشغيلية (Charges)' : "Répartition des Charges d'Exploitation"}</span>
          </h3>

          <div className="space-y-3 flex-1">
            {expensesBreakdown.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                {lang === 'ar' ? 'لا توجد مصاريف تشغيلية مسجلة في هذه الفترة' : 'Aucune charge enregistrée sur cette période'}
              </div>
            ) : (
              expensesBreakdown.map((cat, idx) => {
                const CatIcon = cat.icon;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cat.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{cat.label}</span>
                      </div>
                      <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                        <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(cat.amount)}</span>
                        <span className="text-[9.5px] text-slate-400 ml-1 mr-1">({cat.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${cat.progressColor} rounded-full transition-all duration-500`} 
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Charges aggregate summary banner */}
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 text-center">
            <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">
              {lang === 'ar' ? 'إجمالي تكاليف هذه الفترة المخصومة من الأرباح:' : 'Total des charges déduites du bénéfice :'}
            </div>
            <div className="text-sm font-black text-rose-600 mt-0.5">
              -{formatCurrency(totalExp)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
