import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { ProductsView } from './components/products/ProductsView';
import { DebtsView } from './components/debts/DebtsView';
import { CashView } from './components/cash/CashView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { SalesView } from './components/sales/SalesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { ContactsView } from './components/contacts/ContactsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { ReceiptModal } from './components/common/ReceiptModal';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { LoginView } from './components/auth/LoginView';

const AppContent: React.FC = () => {
  const { 
    isAuthenticated, 
    isAuthChecking, 
    isOnboardingComplete, 
    currentView, 
    activeSaleReceipt,
    lang 
  } = useApp();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-800 gap-3 font-sans">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-bold tracking-wide">
          {lang === 'ar' ? 'جاري التحقق من الحساب...' : 'Vérification de la session...'}
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (!isOnboardingComplete) {
    return <OnboardingView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Application Header */}
      <Header />

      {/* Main Body View */}
      <main className={`flex-1 w-full ${currentView === 'pos' ? 'overflow-hidden h-[calc(100vh-7.5rem)] pb-2 sm:pb-0' : 'overflow-y-auto pb-20'}`}>
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'pos' && <POSView />}
        {(currentView === 'products' || currentView === 'stock') && <ProductsView />}
        {currentView === 'debts' && <DebtsView />}
        {currentView === 'cash' && <CashView />}
        {currentView === 'expenses' && <ExpensesView />}
        {currentView === 'sales' && <SalesView />}
        {currentView === 'purchases' && <PurchasesView />}
        {currentView === 'customers' && <ContactsView initialType="customers" />}
        {currentView === 'suppliers' && <ContactsView initialType="suppliers" />}
        {currentView === 'reports' && <ReportsView />}
        {(currentView === 'settings' || currentView === 'users' || currentView === 'branches') && <SettingsView />}
      </main>

      {/* Bottom Sticky Mobile Navigation */}
      <BottomNav />

      {/* Thermal & WhatsApp Invoice Modal */}
      {activeSaleReceipt && <ReceiptModal />}

      {/* Global Barcode Scanner Modal */}
      <BarcodeScannerModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
