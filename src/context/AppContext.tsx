import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Business,
  Branch,
  User,
  SaleItem,
  Customer,
  Sale,
  PrintSettings,
  NotificationItem
} from '../types';
import { translations, Language, formatMAD } from '../i18n/locales';
import { db } from '../services/db';
import { getSupabase } from '../services/supabase';

export type AppView = 
  | 'dashboard' 
  | 'pos' 
  | 'products' 
  | 'stock' 
  | 'sales' 
  | 'purchases' 
  | 'customers' 
  | 'suppliers' 
  | 'debts' 
  | 'expenses' 
  | 'cash' 
  | 'reports' 
  | 'users' 
  | 'branches' 
  | 'settings'
  | 'onboarding';

interface CartItem extends SaleItem {
  max_stock: number;
}

interface AppContextType {
  // Navigation & View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  
  // Entities
  business: Business;
  setBusiness: (biz: Business) => void;
  updateBusiness: (bizData: Partial<Business>) => void;
  branch: Branch;
  setBranch: (branch: Branch) => void;
  user: User;
  setUser: (user: User) => void;
  switchUser: (u: User) => void;
  branches: Branch[];

  // Localization & Theme
  lang: Language;
  setLang: (lang: Language) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.ar) => string;
  formatCurrency: (amount: number) => string;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Onboarding
  isOnboardingComplete: boolean;
  completeOnboarding: (bizData: Partial<Business>, userData?: Partial<User>) => void;

  // Authentication & Supabase User
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  authEmail: string;
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginOfflineDemo: () => void;
  logout: () => Promise<void>;

  // Offline & Sync
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  triggerSync: () => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // POS State
  cart: CartItem[];
  addToCart: (product: { id: string; name: string; barcode: string; sale_price: number; purchase_price: number; current_stock: number; tax_rate?: number }) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  cartDiscount: number;
  setCartDiscount: (discount: number) => void;
  cartCustomer: Customer | null;
  setCartCustomer: (customer: Customer | null) => void;
  clearCart: () => void;
  cartTotals: {
    subtotal: number;
    discount: number;
    taxTotal: number;
    total: number;
  };

  // Modals & Triggers
  activeSaleReceipt: Sale | null;
  setActiveSaleReceipt: (sale: Sale | null) => void;
  isBarcodeScannerOpen: boolean;
  setIsBarcodeScannerOpen: (open: boolean) => void;
  barcodeScanTarget: 'pos' | 'product_search' | 'stock_check' | 'custom';
  setBarcodeScanTarget: (target: 'pos' | 'product_search' | 'stock_check' | 'custom') => void;
  barcodeScanCallback: ((code: string) => void) | null;
  setBarcodeScanCallback: (cb: ((code: string) => void) | null) => void;
  openBarcodeScanner: (target?: 'pos' | 'product_search' | 'stock_check' | 'custom', callback?: (code: string) => void) => void;

  // Print settings
  printSettings: PrintSettings;
  updatePrintSettings: (settings: PrintSettings) => void;

  // Data Refresh Trigger
  dataVersion: number;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from DB
  const [initData] = useState(() => db.initialize());
  const [business, setBusinessState] = useState<Business>(initData.business);
  const [branch, setBranchState] = useState<Branch>(initData.branch);
  const [user, setUserState] = useState<User>(initData.user);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [dataVersion, setDataVersion] = useState<number>(1);

  // 1.1 Supabase Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>(() => {
    return localStorage.getItem('tajer_remembered_email') || '';
  });

  // Check Supabase session on app mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      setIsAuthChecking(true);
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user) {
            if (isMounted) {
              db.setTenantId(session.user.id);
              const tenantInit = db.initialize({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
              });
              setBusinessState(tenantInit.business);
              setBranchState(tenantInit.branch);
              setUserState(tenantInit.user);
              setAuthEmail(session.user.email || '');
              setIsOnboardingComplete(db.isOnboardingComplete());
              setIsAuthenticated(true);
              setIsAuthChecking(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Session verification notice:', err);
        }
      }

      if (isMounted) {
        setIsAuthenticated(false);
        setIsAuthChecking(false);
      }
    };

    checkSession();

    // Listen to Supabase auth events
    const supabase = getSupabase();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          db.setTenantId(session.user.id);
          const tenantInit = db.initialize({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
          });
          setBusinessState(tenantInit.business);
          setBranchState(tenantInit.branch);
          setUserState(tenantInit.user);
          setAuthEmail(session.user.email || '');
          setIsOnboardingComplete(db.isOnboardingComplete());
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setAuthEmail('');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithSupabase = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { 
        success: false, 
        error: lang === 'ar' ? 'تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.' : 'Connexion au serveur impossible. Vérifiez votre connexion internet.' 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        let msg = lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Email ou mot de passe incorrect.';
        if (!error.message?.toLowerCase().includes('invalid login credentials')) {
          msg = error.message;
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        localStorage.removeItem('tajer_demo_mode');
        db.setTenantId(data.user.id);
        const tenantInit = db.initialize({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
        });
        setBusinessState(tenantInit.business);
        setBranchState(tenantInit.branch);
        setUserState(tenantInit.user);
        setAuthEmail(data.user.email || '');
        const isDone = db.isOnboardingComplete();
        setIsOnboardingComplete(isDone);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        return { success: true };
      }

      return { success: false, error: lang === 'ar' ? 'فشل تسجيل الدخول' : 'Échec de connexion' };
    } catch (err: any) {
      return { success: false, error: err?.message || (lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Une erreur est survenue') };
    }
  };

  const loginOfflineDemo = () => {
    localStorage.setItem('tajer_demo_mode', 'true');
    db.setTenantId('demo');
    const demoInit = db.initialize();
    setBusinessState(demoInit.business);
    setBranchState(demoInit.branch);
    setUserState(demoInit.user);
    setAuthEmail('demo@tajer.ma');
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const logout = async () => {
    localStorage.removeItem('tajer_demo_mode');
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setIsAuthenticated(false);
    setAuthEmail('');
  };

  // 2. Localization
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('tajer_lang') as Language) || 'ar';
  });

  const [isDark, setIsDarkState] = useState<boolean>(() => {
    return localStorage.getItem('tajer_theme') === 'dark';
  });

  // 3. Online Status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(
    navigator.onLine ? 'synced' : 'offline'
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 1200);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = useCallback(() => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }, 1500);
  }, []);

  // Set HTML dir and lang based on chosen language
  useEffect(() => {
    localStorage.setItem('tajer_lang', lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('tajer_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const setLang = (newLang: Language) => setLangState(newLang);
  const setIsDark = (val: boolean) => setIsDarkState(val);
  const toggleTheme = () => setIsDarkState(prev => !prev);

  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(() => {
    return db.isOnboardingComplete();
  });

  const completeOnboarding = (bizData: Partial<Business>, userData?: Partial<User>) => {
    const updatedBiz = { ...business, ...bizData };
    setBusinessState(updatedBiz);
    db.saveBusiness(updatedBiz);
    if (userData) {
      const updatedUser = { ...user, ...userData };
      setUserState(updatedUser);
      db.saveUser(updatedUser);
    }
    db.setOnboardingComplete(true);
    setIsOnboardingComplete(true);
    setCurrentView('dashboard');
    refreshData();
  };

  const updateBusiness = (bizData: Partial<Business>) => {
    const updated = { ...business, ...bizData };
    setBusinessState(updated);
    db.saveBusiness(updated);
    refreshData();
  };

  const switchUser = (u: User) => {
    setUserState(u);
    refreshData();
  };

  const t = useCallback(
    (key: keyof typeof translations.ar): string => {
      return translations[lang]?.[key] || translations.ar[key] || (key as string);
    },
    [lang]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      return formatMAD(amount, lang);
    },
    [lang]
  );

  const refreshData = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  // Update business
  const setBusiness = (biz: Business) => {
    db.updateBusiness(biz);
    setBusinessState(biz);
    refreshData();
  };

  const setBranch = (b: Branch) => {
    setBranchState(b);
    refreshData();
  };

  const setUser = (u: User) => {
    db.saveUser(u);
    setUserState(u);
    refreshData();
  };

  const branches = useMemo(() => {
    return db.getBranches(business.id);
  }, [business.id, dataVersion]);

  // Notifications
  const notifications = useMemo(() => {
    return db.getNotifications(business.id);
  }, [business.id, dataVersion]);

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markNotificationRead = (id: string) => {
    db.markNotificationAsRead(id);
    refreshData();
  };

  const markAllNotificationsRead = () => {
    db.markAllNotificationsAsRead(business.id);
    refreshData();
  };

  // --- POS CART ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [cartCustomer, setCartCustomer] = useState<Customer | null>(null);
  const [activeSaleReceipt, setActiveSaleReceipt] = useState<Sale | null>(null);

  // Barcode Scanner Modal State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeScanTarget, setBarcodeScanTarget] = useState<'pos' | 'product_search' | 'stock_check' | 'custom'>('pos');
  const [barcodeScanCallback, setBarcodeScanCallback] = useState<((code: string) => void) | null>(null);

  const openBarcodeScanner = useCallback((
    target: 'pos' | 'product_search' | 'stock_check' | 'custom' = 'pos',
    callback?: (code: string) => void
  ) => {
    setBarcodeScanTarget(target);
    setBarcodeScanCallback(() => (callback ? callback : null));
    setIsBarcodeScannerOpen(true);
  }, []);

  // Print settings
  const [printSettings, setPrintSettingsState] = useState<PrintSettings>(() => db.getPrintSettings());
  const updatePrintSettings = (settings: PrintSettings) => {
    db.savePrintSettings(settings);
    setPrintSettingsState(settings);
  };

  const addToCart = (product: {
    id: string;
    name: string;
    barcode: string;
    sale_price: number;
    purchase_price: number;
    current_stock: number;
    tax_rate?: number;
  }) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unit_price,
                total: (item.quantity + 1) * item.unit_price - item.discount,
              }
            : item
        );
      }
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unit_price: product.sale_price,
        purchase_price: product.purchase_price,
        discount: 0,
        subtotal: product.sale_price,
        tax_amount: 0,
        total: product.sale_price,
        max_stock: product.current_stock,
      };
      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.unit_price,
              total: Math.max(0, quantity * item.unit_price - item.discount),
            }
          : item
      )
    );
  };

  const updateCartDiscount = (productId: string, discount: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId
          ? {
              ...item,
              discount,
              total: Math.max(0, item.quantity * item.unit_price - discount),
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
    setCartCustomer(null);
  };

  const cartTotals = useMemo(() => {
    const rawSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
    const totalDiscount = itemDiscounts + cartDiscount;
    const finalTotal = Math.max(0, rawSubtotal - totalDiscount);
    const rate = business.defaultTaxRate ?? 20;
    const taxTotal = business.taxEnabled ? (finalTotal * rate) / (100 + rate) : 0; // tax included calculation

    return {
      subtotal: rawSubtotal,
      discount: totalDiscount,
      taxTotal,
      total: finalTotal,
    };
  }, [cart, cartDiscount, business.taxEnabled, business.defaultTaxRate]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        business,
        setBusiness,
        updateBusiness,
        branch,
        setBranch,
        user,
        setUser,
        switchUser,
        branches,
        lang,
        setLang,
        language: lang,
        setLanguage: setLang,
        t,
        formatCurrency,
        isDark,
        setIsDark,
        theme: isDark ? 'dark' : 'light',
        toggleTheme,
        isOnboardingComplete,
        completeOnboarding,
        isAuthenticated,
        isAuthChecking,
        authEmail,
        loginWithSupabase,
        loginOfflineDemo,
        logout,
        isOnline,
        syncStatus,
        triggerSync,
        notifications,
        unreadNotifsCount,
        markNotificationRead,
        markAllNotificationsRead,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        updateCartDiscount,
        cartDiscount,
        setCartDiscount,
        cartCustomer,
        setCartCustomer,
        clearCart,
        cartTotals,
        activeSaleReceipt,
        setActiveSaleReceipt,
        isBarcodeScannerOpen,
        setIsBarcodeScannerOpen,
        barcodeScanTarget,
        setBarcodeScanTarget,
        barcodeScanCallback,
        setBarcodeScanCallback,
        openBarcodeScanner,
        printSettings,
        updatePrintSettings,
        dataVersion,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
