import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Menu, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  Wallet, 
  DollarSign, 
  BarChart3, 
  Settings, 
  GitBranch, 
  ShieldCheck, 
  X,
  FileText,
  Boxes
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView, t, cart, lang } = useApp();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const mainTabs = [
    { id: 'dashboard' as AppView, label: t('navHome'), icon: LayoutDashboard },
    { id: 'pos' as AppView, label: lang === 'ar' ? 'POS البيع' : 'Caisse POS', icon: ShoppingCart, highlight: true, badge: cart.length },
    { id: 'products' as AppView, label: t('navStock'), icon: Package },
    { id: 'customers' as AppView, label: t('navCustomers'), icon: Users },
  ];

  const moreItems: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'sales', label: t('salesHistory'), icon: ShoppingBag },
    { id: 'purchases', label: t('purchasesTitle'), icon: Truck },
    { id: 'debts', label: t('debtsTitle'), icon: CreditCard },
    { id: 'cash', label: t('cashTitle'), icon: Wallet },
    { id: 'expenses', label: t('expensesTitle'), icon: DollarSign },
    { id: 'reports', label: t('reportsTitle'), icon: BarChart3 },
    { id: 'suppliers', label: t('suppliersTitle'), icon: Truck },
    { id: 'settings', label: t('settingsTitle'), icon: Settings },
  ];

  return (
    <>
      {/* Bottom Nav Bar on Mobile & Tablet */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id || (tab.id === 'stock' && currentView === 'products');
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentView(tab.id);
                  setShowMoreDrawer(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 relative transition cursor-pointer ${
                  tab.highlight 
                    ? 'text-teal-600 dark:text-teal-400 font-bold' 
                    : isActive 
                    ? 'text-teal-700 dark:text-teal-400 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                {tab.highlight ? (
                  <div className="relative -top-2.5 w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30 ring-4 ring-white dark:ring-slate-900 active:scale-95 transition">
                    <Icon className="w-5 h-5" />
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
                        {tab.badge}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  </div>
                )}
                <span className={`text-[11px] truncate max-w-full px-1 ${tab.highlight ? 'relative -top-1 font-extrabold' : ''}`}>
                  {tab.label}
                </span>
                {isActive && !tab.highlight && (
                  <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-teal-600" />
                )}
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setShowMoreDrawer(!showMoreDrawer)}
            className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
              showMoreDrawer || moreItems.some(i => i.id === currentView)
                ? 'text-teal-600 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px]">{t('navMore')}</span>
          </button>
        </div>
      </nav>

      {/* Slide-over / Bottom Sheet Drawer for "More" sections */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                <Boxes className="w-5 h-5 text-teal-600" />
                <span>{lang === 'ar' ? 'جميع أقسام تاجر' : 'Toutes les sections Tajar'}</span>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="p-3 overflow-y-auto grid grid-cols-2 gap-2 pb-6">
              {moreItems.map(item => {
                const Icon = item.icon;
                const isSelected = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setShowMoreDrawer(false);
                    }}
                    className={`${lang === 'ar' ? 'text-right' : 'text-left'} p-2.5 rounded-2xl border transition flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 ring-1 ring-teal-500'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
