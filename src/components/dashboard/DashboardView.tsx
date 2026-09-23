import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Wallet, 
  Users, 
  Truck, 
  AlertTriangle, 
  PlusCircle, 
  Barcode, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronLeft,
  Receipt,
  Clock,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { formatMAD, formatUnit } from '../../i18n/locales';

export const DashboardView: React.FC = () => {
  const { 
    business, 
    branch, 
    setCurrentView, 
    formatCurrency, 
    setIsBarcodeScannerOpen,
    setBarcodeScanTarget,
    setActiveSaleReceipt,
    dataVersion,
    lang
  } = useApp();

  // Compute live dashboard metrics from database
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allSales = db.getSales(business.id, branch.id);
    const allProducts = db.getProducts(business.id, branch.id);
    const allCustomers = db.getCustomers(business.id);
    const allSuppliers = db.getSuppliers(business.id);

    // Sales of today
    const todaySales = allSales.filter(s => s.created_at.startsWith(todayStr));
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

    // Real gross profit of today = Sum of (Item unit_price - Item purchase_price) * qty - discounts
    let todayProfit = 0;
    for (const sale of todaySales) {
      let saleProfit = 0;
      for (const item of sale.items) {
        saleProfit += (item.unit_price - item.purchase_price) * item.quantity;
      }
      saleProfit -= sale.discount;
      todayProfit += Math.max(0, saleProfit);
    }

    // Cash Treasury
    const currentCash = db.getCurrentCashBalance(business.id, branch.id);

    // Customer Debts (الكريدي)
    const totalCustomerDebt = allCustomers.reduce((acc, c) => acc + c.total_debt, 0);

    // Supplier Debts
    const totalSupplierDebt = allSuppliers.reduce((acc, s) => acc + s.total_debt, 0);

    // Low stock products
    const lowStockProducts = allProducts.filter(p => p.current_stock <= p.min_stock);

    // Top selling products
    const productSalesMap = new Map<string, { name: string; count: number; total: number }>();
    for (const s of allSales) {
      for (const it of s.items) {
        const existing = productSalesMap.get(it.product_name) || { name: it.product_name, count: 0, total: 0 };
        existing.count += it.quantity;
        existing.total += it.total;
        productSalesMap.set(it.product_name, existing);
      }
    }
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      todaySalesCount: todaySales.length,
      todaySalesTotal,
      todayProfit,
      currentCash,
      totalCustomerDebt,
      totalSupplierDebt,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 3),
      recentSales: allSales.slice(0, 5),
      topProducts,
    };
  }, [business.id, branch.id, dataVersion]);

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 space-y-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
      
      {/* Quick Action Bar (Mobile First) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* POS Sale Card */}
        <button
          onClick={() => setCurrentView('pos')}
          className={`group p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-md hover:shadow-lg hover:from-teal-700 hover:to-emerald-600 transition-all duration-200 active:scale-[0.98] ${lang === 'ar' ? 'text-right' : 'text-left'} w-full flex items-center gap-3.5 cursor-pointer border-0`}
        >
          <div className="p-3 rounded-xl bg-white/15 text-white group-hover:scale-105 transition-transform shrink-0 shadow-inner">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className={`flex-1 min-w-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <span className="block text-sm sm:text-base font-black text-white leading-tight">{lang === 'ar' ? 'بيع سريع (POS)' : 'Vente Caisse POS'}</span>
            <span className="block text-[10.5px] text-teal-100 mt-1">{lang === 'ar' ? 'فتح نقطة بيع وتسجيل طلبية جديدة' : 'Ouvrir la caisse et enregistrer une vente'}</span>
          </div>
          <ArrowLeftIcon lang={lang} className={`w-4 h-4 text-white/70 group-hover:text-white transition-all shrink-0 me-1 ${lang === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
        </button>

        {/* Scan Barcode Card */}
        <button
          onClick={() => {
            setBarcodeScanTarget('pos');
            setIsBarcodeScannerOpen(true);
          }}
          className={`group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all duration-200 active:scale-[0.98] ${lang === 'ar' ? 'text-right' : 'text-left'} w-full flex items-center gap-3.5 cursor-pointer`}
        >
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
            <Barcode className="w-5 h-5" />
          </div>
          <div className={`flex-1 min-w-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <span className="block text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-tight">{lang === 'ar' ? 'مسح باركود سلعة' : 'Scanner Code-barres'}</span>
            <span className="block text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">{lang === 'ar' ? 'قراءة كود السلعة عبر الكاميرا' : 'Lire le code-barres avec votre caméra'}</span>
          </div>
          <ArrowLeftIcon lang={lang} className={`w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 transition-all shrink-0 me-1 ${lang === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
        </button>

        {/* Add Product Card */}
        <button
          onClick={() => setCurrentView('products')}
          className={`group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all duration-200 active:scale-[0.98] ${lang === 'ar' ? 'text-right' : 'text-left'} w-full flex items-center gap-3.5 cursor-pointer`}
        >
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className={`flex-1 min-w-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <span className="block text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-tight">{lang === 'ar' ? 'إضافة سلعة جديدة' : 'Ajouter un Produit'}</span>
            <span className="block text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">{lang === 'ar' ? 'تعبئة وتحديث المخزون والسلع' : 'Trier, ajouter et réapprovisionner le stock'}</span>
          </div>
          <ArrowLeftIcon lang={lang} className={`w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-sky-600 transition-all shrink-0 me-1 ${lang === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
        </button>

        {/* Debts / Credit Card */}
        <button
          onClick={() => setCurrentView('debts')}
          className={`group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all duration-200 active:scale-[0.98] ${lang === 'ar' ? 'text-right' : 'text-left'} w-full flex items-center gap-3.5 cursor-pointer`}
        >
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 group-hover:scale-105 transition-transform shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className={`flex-1 min-w-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <span className="block text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-tight">{lang === 'ar' ? 'دفتر الكريدي والديون' : 'Registre des Crédits (Mhata)'}</span>
            <span className="block text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">{lang === 'ar' ? 'تتبع ديون العملاء والمستحقات' : 'Suivi des dettes des clients & règlements'}</span>
          </div>
          <ArrowLeftIcon lang={lang} className={`w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 transition-all shrink-0 me-1 ${lang === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
        </button>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-bold">{lang === 'ar' ? 'مبيعات اليوم' : "Ventes d'aujourd'hui"}</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(metrics.todaySalesTotal)}
          </div>
          <div className="mt-2 text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
            <span>{metrics.todaySalesCount} {lang === 'ar' ? 'عملية بيع مسجلة' : 'vente(s) enregistrée(s)'}</span>
          </div>
        </div>

        {/* Real Net Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-bold">{lang === 'ar' ? 'الأرباح الصافية اليوم' : 'Bénéfice Net Réel'}</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics.todayProfit)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {lang === 'ar' ? 'محتسبة بعد خصم ثمن الشراء' : "Calculé après déduction du coût d'achat"}
          </div>
        </div>

        {/* Cash in Drawer / Treasury */}
        <div 
          onClick={() => setCurrentView('cash')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-teal-400 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-bold">{lang === 'ar' ? 'رصيد الصندوق (الخزينة)' : 'Solde du Coffre / Caisse'}</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(metrics.currentCash)}
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <span>{lang === 'ar' ? 'عرض تفاصيل الصندوق' : 'Voir les détails de la caisse'}</span>
            <ChevronLeft className="w-3 h-3" />
          </div>
        </div>

        {/* Customer Debts (الكريدي) */}
        <div 
          onClick={() => setCurrentView('debts')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-bold">{lang === 'ar' ? 'ديون العملاء (كريدي)' : 'Créances Clients (Crédits)'}</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {formatCurrency(metrics.totalCustomerDebt)}
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-semibold flex items-center gap-1">
            <span>{lang === 'ar' ? 'استخلاص الديون الآن' : 'Recouvrer les créances maintenant'}</span>
            <ChevronLeft className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {metrics.lowStockCount > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                {lang === 'ar' ? `تنبيه: ${metrics.lowStockCount} سلع قاربت على النفاد من المحل!` : `Alerte: ${metrics.lowStockCount} articles sont en rupture de stock !`}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {metrics.lowStockProducts.map(p => `${p.name} (${p.current_stock} ${formatUnit(p.unit, lang)})`).join(lang === 'ar' ? '، ' : ', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('stock')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            {lang === 'ar' ? 'إعادة تزويد المخزون' : 'Réapprovisionner le stock'}
          </button>
        </div>
      )}

      {/* Main Grid: Recent Sales & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Sales List (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'آخر فواتير المبيعات' : 'Dernières factures de vente'}
              </h2>
            </div>
            <button
              onClick={() => setCurrentView('sales')}
              className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
            >
              <span>{lang === 'ar' ? 'سجل المبيعات بالكامل' : 'Historique complet des ventes'}</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.recentSales.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {lang === 'ar' ? 'لا توجد مبيعات بعد اليوم. افتح شاشة البيع POS وابدأ أول عملية بيع!' : 'Aucune vente pour aujourd\'hui. Ouvrez la caisse et commencez votre première vente !'}
              </div>
            ) : (
              metrics.recentSales.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => setActiveSaleReceipt(sale)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl px-2.5 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                      {sale.items.length}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {sale.invoice_number}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{sale.customer_name || (lang === 'ar' ? 'زبون عام (Comptoir)' : 'Client Comptoir')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sale.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </div>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      sale.payment_method === 'CASH'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                        : sale.payment_method === 'CREDIT'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60'
                    }`}>
                      {sale.payment_method === 'CASH' 
                        ? (lang === 'ar' ? 'نقداً' : 'Espèces') 
                        : sale.payment_method === 'CREDIT' 
                        ? (lang === 'ar' ? 'كريدي' : 'Crédit') 
                        : sale.payment_method}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Selling Products (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'السلع الأكثر مبيعاً' : 'Top des ventes'}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {metrics.topProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {lang === 'ar' ? 'سيتم ترتيب المنتجات الأكثر طلباً عند تسجيل عمليات بيع' : 'Les produits les plus demandés s\'afficheront ici après les premières ventes.'}
              </div>
            ) : (
              metrics.topProducts.map((p, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    <span className="font-bold text-teal-600 text-[11px] shrink-0">
                      {p.count} {lang === 'ar' ? 'مباعة' : 'vendus'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>{lang === 'ar' ? 'إجمالي المبيعات' : 'Ventes totales'}</span>
                    <span className="font-semibold">{formatCurrency(p.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

const ArrowLeftIcon: React.FC<{ className?: string; lang?: string }> = ({ className, lang }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
