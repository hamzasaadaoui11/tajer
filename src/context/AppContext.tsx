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
import { syncEngine } from '../services/sync';

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

  // Helper to check onboarding across local device AND cloud (Supabase metadata and businesses table)
  const resolveOnboardingStatusAndRestore = async (
    userId: string,
    userMetadata?: any
  ): Promise<{ completed: boolean; restoredBusiness?: Business }> => {
    // 1. If already marked complete in this browser's storage
    if (db.isOnboardingComplete()) {
      return { completed: true };
    }

    // 2. Check Supabase Auth user_metadata
    const hasMetadataFlag = !!userMetadata?.onboarding_completed;

    // 3. Query Supabase 'businesses' table directly in the cloud
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: remoteBiz, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && remoteBiz && remoteBiz.name) {
          const restored: Business = {
            id: remoteBiz.id,
            name: remoteBiz.name,
            activity: remoteBiz.activity || 'general_store',
            currency: remoteBiz.currency || 'MAD',
            phone: remoteBiz.phone || '',
            address: remoteBiz.address || '',
            city: remoteBiz.city || '',
            ice: remoteBiz.ice || '',
            ifNumber: remoteBiz.if_number || '',
            rc: remoteBiz.rc || '',
            patente: remoteBiz.patente || '',
            cnss: remoteBiz.cnss || '',
            logo: remoteBiz.logo || '',
            stamp: remoteBiz.stamp || '',
            invoiceColor: remoteBiz.invoice_color || '#C02626',
            receiptFooter: remoteBiz.receipt_footer || '',
            a4Footer: remoteBiz.a4_footer || '',
            bankInfo: remoteBiz.bank_info || '',
            capital: remoteBiz.capital || '',
            email: remoteBiz.email || '',
            taxEnabled: remoteBiz.tax_enabled ?? false,
            defaultTaxRate: Number(remoteBiz.default_tax_rate ?? 20),
            created_at: remoteBiz.created_at || new Date().toISOString(),
            updated_at: remoteBiz.updated_at || new Date().toISOString(),
          };

          db.saveBusiness(restored);
          db.setOnboardingComplete(true);

          // Restore branches if any
          try {
            const { data: remoteBranches } = await supabase
              .from('branches')
              .select('*')
              .eq('business_id', userId);
            if (remoteBranches && remoteBranches.length > 0) {
              for (const rb of remoteBranches) {
                db.addBranch({
                  id: rb.id,
                  business_id: rb.business_id,
                  name: rb.name,
                  city: rb.city || '',
                  address: rb.address || '',
                  phone: rb.phone || '',
                  is_main: rb.is_main ?? true,
                  created_at: rb.created_at,
                });
              }
            }
          } catch {}

          // Pull products, categories, customers down to this device
          syncEngine.syncAll().catch(e => console.warn('Sync on new device restore notice:', e));

          return { completed: true, restoredBusiness: restored };
        }
      } catch (e) {
        console.warn('Error resolving cloud onboarding status:', e);
      }
    }

    if (hasMetadataFlag) {
      db.setOnboardingComplete(true);
      syncEngine.syncAll().catch(e => console.warn('Sync on metadata hit notice:', e));
      return { completed: true };
    }

    return { completed: false };
  };

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
              setBranchState(tenantInit.branch);
              setUserState(tenantInit.user);
              setAuthEmail(session.user.email || '');

              // Check if account already completed onboarding in cloud/previous device
              const res = await resolveOnboardingStatusAndRestore(session.user.id, session.user.user_metadata);
              if (res.restoredBusiness) {
                setBusinessState(res.restoredBusiness);
              } else {
                setBusinessState(tenantInit.business);
              }

              if (isMounted) {
                setIsOnboardingComplete(res.completed);
                setIsAuthenticated(true);
                setIsAuthChecking(false);
                return;
              }
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
          setBranchState(tenantInit.branch);
          setUserState(tenantInit.user);
          setAuthEmail(session.user.email || '');

          const res = await resolveOnboardingStatusAndRestore(session.user.id, session.user.user_metadata);
          if (res.restoredBusiness) {
            setBusinessState(res.restoredBusiness);
          } else {
            setBusinessState(tenantInit.business);
          }
          setIsOnboardingComplete(res.completed);
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
        setBranchState(tenantInit.branch);
        setUserState(tenantInit.user);
        setAuthEmail(data.user.email || '');

        // Resolve onboarding from cloud to see if this account already finished on PC or another phone
        const res = await resolveOnboardingStatusAndRestore(data.user.id, data.user.user_metadata);
        if (res.restoredBusiness) {
          setBusinessState(res.restoredBusiness);
        } else {
          setBusinessState(tenantInit.business);
        }

        setIsOnboardingComplete(res.completed);
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

  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const res = await syncEngine.syncAll();
      if (res.success) {
        setSyncStatus('synced');
        setDataVersion(v => v + 1);
      } else {
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
      }
    } catch {
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }
  }, []);

  // Continuous Auto-Sync: Runs periodically and on app resume/focus
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Initial sync after login
    syncEngine.syncAll().then(res => {
      if (res.success) setDataVersion(v => v + 1);
    }).catch(() => {});

    // 2. Periodic sync every 20 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncEngine.syncAll().then(res => {
          if (res.success && res.processed > 0) setDataVersion(v => v + 1);
        }).catch(() => {});
      }
    }, 20000);

    // 3. Sync on app focus / tab switch / resume
    const handleResumeOrFocus = () => {
      if (navigator.onLine) {
        syncEngine.syncAll().then(res => {
          if (res.success) setDataVersion(v => v + 1);
        }).catch(() => {});
      }
    };

    window.addEventListener('focus', handleResumeOrFocus);
    window.addEventListener('online', handleResumeOrFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResumeOrFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleResumeOrFocus);
      window.removeEventListener('online', handleResumeOrFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated]);

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

    // Persist onboarding status to Supabase so ANY other phone or PC knows it's already done
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          business_name: updatedBiz.name,
        }
      }).catch(e => console.warn('Supabase updateUser meta error:', e));

      syncEngine.syncAll().catch(e => console.warn('Initial sync after onboarding error:', e));
    }
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
    // Background auto-sync to cloud when online
    if (navigator.onLine) {
      setTimeout(() => {
        syncEngine.syncAll().catch(() => {});
      }, 600);
    }
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
