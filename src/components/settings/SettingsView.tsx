import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Users, 
  Database, 
  Globe, 
  Moon, 
  Sun, 
  Download, 
  Upload, 
  ShieldCheck, 
  Plus, 
  Check, 
  Trash2,
  RefreshCw,
  Lock,
  Cloud,
  Palette,
  Image,
  FileText,
  Link as LinkIcon,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { syncEngine } from '../../services/sync';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  clearSupabaseConfig, 
  testSupabaseConnection, 
  isSupabaseConfigured 
} from '../../services/supabase';
import { User, UserRole } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    user, 
    switchUser, 
    language, 
    setLanguage, 
    theme, 
    toggleTheme, 
    refreshData,
    lang,
    logout,
    authEmail
  } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'users' | 'backup' | 'general'>('store');
  const [storeSection, setStoreSection] = useState<'branding' | 'general' | 'legal' | 'footer'>('branding');

  // Business form state
  const [name, setName] = useState(business.name);
  const [activity, setActivity] = useState(business.activity);
  const [phone, setPhone] = useState(business.phone);
  const [city, setCity] = useState(business.city);
  const [address, setAddress] = useState(business.address);
  const [ice, setIce] = useState(business.ice || '');
  const [rc, setRc] = useState(business.rc || '');
  const [ifNumber, setIfNumber] = useState(business.ifNumber || '');
  const [patente, setPatente] = useState(business.patente || '');
  const [capital, setCapital] = useState(business.capital || '');
  const [bankInfo, setBankInfo] = useState(business.bankInfo || '');
  const [receiptFooter, setReceiptFooter] = useState(business.receiptFooter || '');
  const [a4Footer, setA4Footer] = useState(business.a4Footer || '');
  const [logo, setLogo] = useState(business.logo || '');
  const [stamp, setStamp] = useState(business.stamp || '');
  const [invoiceColor, setInvoiceColor] = useState(business.invoiceColor || '#C02626');

  // TVA Settings States
  const [taxEnabled, setTaxEnabled] = useState(business.taxEnabled ?? false);
  const [defaultTaxRate, setDefaultTaxRate] = useState(business.defaultTaxRate ?? 20);

  // Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  // Stamp Upload
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setStamp(base64);
    };
    reader.readAsDataURL(file);
  };

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Supabase Configuration State
  const initialSupabaseConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(initialSupabaseConfig.key);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseFeedback, setSupabaseFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Add User State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CASHIER');

  const usersList = db.getUsers(business.id);

  // Save Store Settings
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness({
      name,
      activity,
      phone,
      city,
      address,
      ice: ice.trim(),
      rc: rc.trim(),
      ifNumber: ifNumber.trim(),
      patente: patente.trim(),
      capital: capital.trim(),
      bankInfo: bankInfo.trim(),
      receiptFooter,
      a4Footer,
      logo,
      stamp,
      invoiceColor,
      taxEnabled,
      defaultTaxRate,
    });
    alert(lang === 'ar' ? 'تم حفظ إعدادات المتجر بنجاح!' : 'Paramètres du magasin enregistrés avec succès !');
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const jsonStr = db.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sauvegarde_tajer_${business.name}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const confirmMsg = lang === 'ar' 
        ? 'تنبيه: استعادة نسخة احتياطية سيقوم بتحديث واستبدال البيانات الحالية. هل تود المتابعة؟'
        : 'Attention : Restaurer une sauvegarde va remplacer les données actuelles. Voulez-vous continuer ?';
      if (confirm(confirmMsg)) {
        const success = db.importAllData(content);
        if (success) {
          alert(lang === 'ar' ? 'تمت استعادة البيانات بنجاح!' : 'Données restaurées avec succès !');
          refreshData();
          window.location.reload();
        } else {
          alert(lang === 'ar' ? 'ملف النسخة الاحتياطية غير صالح' : 'Fichier de sauvegarde invalide.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Trigger Cloud Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(lang === 'ar' ? 'جارٍ مزامنة الحركات مع الخادم السحابي...' : 'Synchronisation Cloud en cours...');
    try {
      const res = await syncEngine.syncAll();
      if (res.success) {
        setSyncStatusMsg(lang === 'ar' 
          ? `تمت المزامنة بنجاح! تم رفع ${res.processed} عملية.`
          : `Synchronisation réussie ! ${res.processed} opération(s) envoyée(s).`);
      } else {
        setSyncStatusMsg(lang === 'ar' 
          ? `تم العمل محلياً (غير متصل أو بانتظار الإعداد): ${res.errors[0] || 'تم الحفظ محلياً'}`
          : `Mode local (hors-ligne ou en attente) : ${res.errors[0] || 'Sauvegardé localement'}`);
      }
    } catch (err: any) {
      setSyncStatusMsg(lang === 'ar' 
        ? 'حدث خطأ أثناء المزامنة: ' + (err.message || 'خطأ')
        : 'Erreur lors de la synchronisation : ' + (err.message || 'Erreur'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Test and save Supabase credentials
  const handleSaveAndTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseFeedback({
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال الرابط (Project URL) والمفتاح (Anon Key).' : 'Veuillez renseigner le Project URL et la clé Anon Key.',
      });
      return;
    }

    setIsTestingSupabase(true);
    setSupabaseFeedback(null);
    try {
      const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setSupabaseFeedback(result);
      if (result.success) {
        setSupabaseConfig(supabaseUrl, supabaseKey);
        setIsConfigured(true);
      }
    } catch (e: any) {
      setSupabaseFeedback({
        success: false,
        message: e?.message || (lang === 'ar' ? 'فشل الاتصال بـ Supabase' : 'Échec de connexion à Supabase'),
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Disconnect Supabase
  const handleDisconnectSupabase = () => {
    clearSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsConfigured(false);
    setSupabaseFeedback({
      success: true,
      message: lang === 'ar' ? 'تم قطع الاتصال بالسحابة والعودة للوضع المحلي.' : 'Déconnecté du Cloud, retour au mode local.',
    });
  };

  // Add User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || newUserPin.length !== 4) {
      alert('يرجى إدخال اسم مستخدم ورمز PIN مكون من 4 أرقام');
      return;
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      business_id: business.id,
      branch_id: user.branch_id,
      name: newUserName.trim(),
      email: '',
      phone: newUserPhone.trim(),
      role: newUserRole,
      pin_code: newUserPin,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    db.saveUser(newUser);
    setIsUserModalOpen(false);
    setNewUserName('');
    setNewUserPhone('');
    setNewUserPin('');
    refreshData();
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 pb-24 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-6`}>
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-600" />
              <span>{lang === 'ar' ? 'إعدادات التطبيق والمتجر' : 'Paramètres de l\'application et du magasin'}</span>
            </h2>
            <span className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'تخصيص بيانات المحل، المستخدمين، النسخ الاحتياطي واللغة' 
                : 'Personnalisation du magasin, utilisateurs, sauvegardes et langue'}
            </span>
          </div>

          {/* Quick Logout for mobile header */}
          <button
            onClick={() => logout()}
            className="sm:hidden px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
            title={lang === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'خروج' : 'Quitter'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {authEmail && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 text-xs font-bold text-teal-700 dark:text-teal-300">
              <span>{authEmail}</span>
            </div>
          )}

          <button
            onClick={() => logout()}
            className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-xs items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}</span>
          </button>

          {/* Tab switch */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 ${
              activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'بيانات المحل' : 'Infos Magasin'}</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 ${
              activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المستخدمين' : 'Utilisateurs'}</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 ${
              activeTab === 'backup' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'النسخ الاحتياطي' : 'Sauvegardes'}</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 w-full sm:w-auto shrink-0 ${
              activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المظهر واللغة' : 'Apparence & Langue'}</span>
          </button>
          </div>
        </div>
      </div>

      {/* Tab: Store Settings */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore} className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 max-w-2xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-1.5">
              {lang === 'ar' ? 'المعلومات التجارية والمالية للمحل' : 'Informations commerciales et financières'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {lang === 'ar' 
                ? 'تم تقسيم الإعدادات لتسهيل ملء وتحديث بيانات شركتك بشكل مريح' 
                : 'Les paramètres sont organisés par section pour une mise à jour facile et rapide de votre entreprise'}
            </p>
          </div>

          {/* Sub Tab Navigation (Vertical stack - one option per line) */}
          <div className="flex flex-col gap-2 w-full text-xs font-bold">
            {[
              { 
                id: 'branding', 
                label: lang === 'ar' ? 'الهوية البصرية واللوجو' : 'Identité visuelle & Logo', 
                icon: Palette 
              },
              { 
                id: 'general', 
                label: lang === 'ar' ? 'المعلومات العامة للمحل' : 'Informations générales du magasin', 
                icon: Store 
              },
              { 
                id: 'legal', 
                label: lang === 'ar' ? 'القانونية والضرائب والبنك' : 'Mentions légales, TVA & Banque', 
                icon: ShieldCheck 
              },
              { 
                id: 'footer', 
                label: lang === 'ar' ? 'تذييل الفواتير والنصوص المخصصة' : 'Pieds de page & textes personnalisés', 
                icon: FileText 
              }
            ].map((subTab) => {
              const Icon = subTab.icon;
              const isActive = storeSection === subTab.id;
              return (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => setStoreSection(subTab.id as any)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 border flex items-center justify-between ${lang === 'ar' ? 'text-right' : 'text-left'} w-full gap-3 ${
                    isActive
                      ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-400 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' : 'bg-slate-200/50 dark:bg-slate-700 text-slate-500'}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                      <span className="block font-black text-xs">{subTab.label}</span>
                    </div>
                  </div>
                  
                  {isActive && (
                    <span className="text-[9px] font-bold bg-teal-500 text-white px-2 py-1 rounded-lg shrink-0">
                      {lang === 'ar' ? 'نشط' : 'Actif'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Store Sections Content Switch */}
          <div className="pt-2 animate-in fade-in-50 duration-200">
            {storeSection === 'branding' && (
              /* Logo & Custom Invoice Theme Color Section */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-teal-600" />
                    <span>{lang === 'ar' ? 'هوية المتجر وشعار الشركة (Logo & Brand Color)' : 'Identité visuelle & Logo (Thème et couleurs)'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Logo Upload Card */}
                    <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 flex items-center gap-3.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {logo ? (
                        <div className="relative group shrink-0">
                          <img
                            src={logo}
                            alt="Company Logo"
                            className="w-16 h-16 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setLogo('')}
                            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
                            title={lang === 'ar' ? 'حذف الشعار' : 'Supprimer le logo'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900 text-slate-400 shrink-0">
                          <Image className="w-6 h-6 stroke-1" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? 'شعار الشركة / المحل' : 'Logo du magasin'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {lang === 'ar' ? 'صيغة PNG أو JPG أو SVG' : 'Format PNG, JPG ou SVG'}
                        </span>
                        
                        <label className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-bold cursor-pointer transition">
                          <Upload className="w-3 h-3 inline-block me-1" />
                          <span>{lang === 'ar' ? 'تحميل الشعار' : 'Téléverser le logo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Stamp / Cachet Upload Card */}
                    <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 flex items-center gap-3.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {stamp ? (
                        <div className="relative group shrink-0">
                          <img
                            src={stamp}
                            alt="Company Stamp"
                            className="w-16 h-16 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setStamp('')}
                            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
                            title={lang === 'ar' ? 'حذف الختم' : 'Supprimer le cachet'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900 text-slate-400 shrink-0">
                          <FileText className="w-6 h-6 stroke-1" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? 'ختم وتوقيع المحل (Cachet)' : 'Cachet & signature (Tampon)'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {lang === 'ar' ? 'سيظهر تلقائياً بأسفل الفواتير' : 'S\'affiche au bas des factures'}
                        </span>
                        
                        <label className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-bold cursor-pointer transition">
                          <Upload className="w-3 h-3 inline-block me-1" />
                          <span>{lang === 'ar' ? 'تحميل الختم' : 'Téléverser le cachet'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleStampUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Theme Color Picker Card */}
                    <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 flex flex-col justify-between ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div>
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? 'لون الفاتورة الرسمي' : 'Couleur officielle des factures'}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {lang === 'ar' 
                            ? 'سيتم تطبيق هذا اللون على فواتير المبيعات ووصولات التوريد A4' 
                            : 'Appliqué sur les factures et bons au format A4'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 mt-2.5">
                        {/* Preset Colors */}
                        <div className="flex items-center gap-1.5">
                          {[
                            { hex: '#C02626', name: lang === 'ar' ? 'أحمر بورودو' : 'Bordeaux' },
                            { hex: '#1E40AF', name: lang === 'ar' ? 'أزرق ملكي' : 'Bleu Royal' },
                            { hex: '#0D9488', name: lang === 'ar' ? 'أخضر زمردي' : 'Vert Émeraude' },
                            { hex: '#0F172A', name: lang === 'ar' ? 'أسود كلاسيك' : 'Noir Classique' },
                            { hex: '#7C3AED', name: lang === 'ar' ? 'بنفسجي' : 'Violet' },
                            { hex: '#EA580C', name: lang === 'ar' ? 'برتقالي' : 'Orange' }
                          ].map(col => (
                            <button
                              key={col.hex}
                              type="button"
                              onClick={() => setInvoiceColor(col.hex)}
                              style={{ backgroundColor: col.hex }}
                              className={`w-6 h-6 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
                                invoiceColor.toLowerCase() === col.hex.toLowerCase()
                                  ? 'scale-110 ring-2 ring-offset-2 ring-teal-500 border-white'
                                  : 'border-slate-200 hover:scale-105'
                              }`}
                              title={col.name}
                            >
                              {invoiceColor.toLowerCase() === col.hex.toLowerCase() && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Custom Hex Color Input */}
                        <div className="flex items-center gap-1.5 border-s border-slate-200 dark:border-slate-700 ps-2.5">
                          <input
                            type="color"
                            value={invoiceColor}
                            onChange={e => setInvoiceColor(e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden bg-transparent shrink-0"
                            title={lang === 'ar' ? 'لون مخصص' : 'Couleur personnalisée'}
                          />
                          <input
                            type="text"
                            value={invoiceColor.toUpperCase()}
                            onChange={e => {
                              if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                                setInvoiceColor(e.target.value);
                              }
                            }}
                            className="w-16 px-1.5 py-1 rounded border border-slate-200 text-[10px] font-mono text-center text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                            placeholder="#C02626"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {storeSection === 'general' && (
              /* Informations Générales du Magasin */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'اسم المحل أو المتجر *' : 'Nom du magasin / Enseigne *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'نوع النشاط' : 'Secteur d\'activité'}
                  </label>
                  <input
                    type="text"
                    value={activity}
                    onChange={e => setActivity(e.target.value as any)}
                    placeholder={lang === 'ar' ? 'بقالة ومواد غذائية، ملابس، عقاقير...' : 'Épicerie, prêt-à-porter, quincaillerie...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رقم الهاتف (يظهر في التذكرة)' : 'Téléphone (affiché sur le ticket)'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'المدينة' : 'Ville'}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'العنوان الكامل للمحل' : 'Adresse complète du magasin'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {storeSection === 'legal' && (
              /* Informations Légales et RIB */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رقم التعريف الموحد للمقاولة (ICE)' : 'Identifiant Commun de l\'Entreprise (ICE)'}
                  </label>
                  <input
                    type="text"
                    value={ice}
                    onChange={e => setIce(e.target.value)}
                    placeholder="002134567890001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'السجل التجاري (RC)' : 'Registre du Commerce (RC)'}
                  </label>
                  <input
                    type="text"
                    value={rc}
                    onChange={e => setRc(e.target.value)}
                    placeholder="RC Casablanca 12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'التعريف الضريبي (IF)' : 'Identifiant Fiscal (IF)'}
                  </label>
                  <input
                    type="text"
                    value={ifNumber}
                    onChange={e => setIfNumber(e.target.value)}
                    placeholder="40192837"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الضريبة المهنية (Patente / TP)' : 'Taxe Professionnelle (Patente / TP)'}
                  </label>
                  <input
                    type="text"
                    value={patente}
                    onChange={e => setPatente(e.target.value)}
                    placeholder="340912"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رأس مال الشركة (Capital Social)' : 'Capital Social de la société'}
                  </label>
                  <input
                    type="text"
                    value={capital}
                    onChange={e => setCapital(e.target.value)}
                    placeholder="100.000 DH"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الحساب البنكي / RIB (للفواتير)' : 'Coordonnées bancaires / RIB'}
                  </label>
                  <input
                    type="text"
                    value={bankInfo}
                    onChange={e => setBankInfo(e.target.value)}
                    placeholder="Attijariwafa: 007 780 0001234567890123 45"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-left text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                    dir="ltr"
                  />
                </div>

                {/* TVA Configuration Separator */}
                <div className="sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-teal-600" />
                    <span>{lang === 'ar' ? 'إعدادات الضريبة على القيمة المضافة (TVA)' : 'Configuration de la Taxe sur la Valeur Ajoutée (TVA)'}</span>
                  </h4>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-150 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? 'تفعيل حساب الضريبة (TVA) للمتجر' : 'Activer le calcul de la TVA pour le magasin'}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {lang === 'ar' 
                        ? 'عند التفعيل، سيتم احتساب الضريبة تلقائياً في الفواتير والوصولات والتقارير المالية للسلع' 
                        : 'Si activé, la TVA sera calculée sur les factures de vente, tickets et rapports financiers'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={taxEnabled}
                      onChange={e => setTaxEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {taxEnabled && (
                  <div className={`sm:col-span-2 animate-in slide-in-from-top-2 duration-200 space-y-1 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <label className="block text-xs font-bold text-slate-750 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'نسبة الضريبة الافتراضية (%)' : 'Taux standard de TVA par défaut (%)'}
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={defaultTaxRate}
                        onChange={e => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                        className={`w-full ps-8 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono ${lang === 'ar' ? 'text-right' : 'text-left'} text-slate-850 dark:text-slate-100 bg-white dark:bg-slate-800`}
                      />
                      <span className={`absolute ${lang === 'ar' ? 'left-3.5' : 'right-3.5'} top-3 text-xs font-bold text-slate-400 select-none`}>%</span>
                    </div>
                    <span className="block text-[10px] text-slate-400">
                      {lang === 'ar' 
                        ? 'القيمة الافتراضية المطبقة في المغرب هي 20%، ويمكنك تغييرها لأي قيمة مخصصة تناسبك' 
                        : 'Taux légal au Maroc : 20%. Vous pouvez le personnaliser selon votre activité (7%, 10%, 14%, 20%).'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {storeSection === 'footer' && (
              /* Textes de Pied de ticket / Pied de page A4 */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رسالة شكر أسفل التذكرة الحرارية (Pied de ticket 80mm / 58mm)' : 'Message de pied de ticket de caisse (80mm / 58mm)'}
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={e => setReceiptFooter(e.target.value)}
                    placeholder={lang === 'ar' ? 'شكراً لزيارتكم! البضاعة المباعة ترد أو تستبدل في أجل 3 أيام.' : 'Merci pour votre visite ! Les articles vendus sont échangeables sous 3 jours.'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{lang === 'ar' ? 'تذييل فاتورة A4 المخصص (Pied de page Facture A4)' : 'Pied de page personnalisé Facture A4'}</span>
                    <span className="text-[11px] text-teal-600 font-normal">
                      {lang === 'ar' ? 'يظهر في أسفل ورقة فاتورة A4' : 'Affiché en bas des factures A4'}
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={a4Footer}
                    onChange={e => setA4Footer(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: SARL au capital de 100.000 DH - RIB: 007 780 0001234567890123 45 - أو شروط الدفع والضمان...' : 'Ex: SARL au capital de 100.000 DH - RIB: 007 780 0001234567890123 45 - Conditions de garantie...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lang === 'ar' 
                      ? 'يمكنك كتابة أي نص تريده ليظهر تلقائياً في أسفل ورقة فاتورة A4 التجارية (حساب بنكي، شروط، معلومات إضافية).' 
                      : 'Vous pouvez saisir des mentions légales, coordonnées bancaires ou conditions de garantie.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className={`pt-4 border-t border-slate-100 dark:border-slate-800 flex ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition"
            >
              {lang === 'ar' ? 'حفظ كل التعديلات' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Users & Roles */}
      {activeTab === 'users' && (
        <div className={`space-y-4 max-w-2xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'المستخدمين المصرح لهم' : 'Utilisateurs & Caissiers autorisés'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'حسابات الدخول ورموز PIN للعمال والكاشير' : 'Comptes d\'accès et codes PIN du personnel'}
              </p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إضافة كاشير / مسير' : 'Ajouter un utilisateur'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {usersList.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.id === user.id && (
                        <span className="bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                          {lang === 'ar' ? 'الحساب النشط حالياً' : 'Compte actif'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>
                        {u.role === 'ADMIN' 
                          ? (lang === 'ar' ? 'المالك / المدير العام' : 'Propriétaire / Administrateur') 
                          : u.role === 'MANAGER' 
                            ? (lang === 'ar' ? 'مسير المحل' : 'Gérant de magasin') 
                            : (lang === 'ar' ? 'كاشير مبيعات' : 'Caissier')}
                      </span>
                      <span>•</span>
                      <span className="font-mono">PIN: ••••</span>
                    </div>
                  </div>
                </div>

                {u.id !== user.id && (
                  <button
                    onClick={() => switchUser(u)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    {lang === 'ar' ? 'تبديل الدخول له' : 'Basculer'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Backup & Sync */}
      {activeTab === 'backup' && (
        <div className={`space-y-4 max-w-2xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          {/* Supabase Cloud Connection Setup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Cloud className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'ar' ? 'الربط مع سحابة Supabase (PostgreSQL)' : 'Connexion Cloud Supabase (PostgreSQL)'}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                isConfigured 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isConfigured ? (lang === 'ar' ? 'متصل بالسحابة' : 'Connecté au Cloud') : (lang === 'ar' ? 'وضع محلي (غير مربوط)' : 'Mode local (non connecté)')}</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'اربط متجرك مع قاعدة بيانات Supabase السحابية لمزامنة المبيعات والمخزون بين عدة هواتف، والوصول إلى بياناتك من أي مكان، وحمايتها من الضياع.'
                : 'Connectez votre magasin à Supabase pour synchroniser automatiquement vos ventes, stocks et clients entre plusieurs appareils et sécuriser vos données.'}
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'ar' ? 'رابط المشروع (Project URL) :' : 'URL du projet (Project URL) :'}</span>
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'ar' ? 'المفتاح العام (anon public key) :' : 'Clé publique (anon public key) :'}</span>
                </label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAndTestSupabase}
                  disabled={isTestingSupabase}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isTestingSupabase ? (lang === 'ar' ? 'جارٍ الاختبار...' : 'Test en cours...') : (lang === 'ar' ? 'اختبار وحفظ الإعدادات' : 'Tester & Sauvegarder')}</span>
                </button>

                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 font-bold text-xs transition cursor-pointer"
                  >
                    {lang === 'ar' ? 'قطع الاتصال' : 'Déconnecter'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSqlModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lang === 'ar' ? 'كود إنشاء الجداول (SQL Schema)' : 'Schéma SQL Supabase'}</span>
                </button>
              </div>

              {supabaseFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                  supabaseFeedback.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/50' 
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800/50'
                }`}>
                  {supabaseFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{supabaseFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Quick Setup Guide */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>{lang === 'ar' ? '📌 كيفية الربط في دقيقتين :' : '📌 Comment configurer Supabase :'}</span>
              </p>
              <ol className={`list-decimal space-y-1 ${lang === 'ar' ? 'pr-4' : 'pl-4'}`}>
                <li>{lang === 'ar' ? 'افتح حساباً مجانياً على موقع supabase.com وأنشئ مشروعاً جديداً.' : 'Créez un compte gratuit sur supabase.com et un nouveau projet.'}</li>
                <li>{lang === 'ar' ? 'ادخل إلى Project Settings > API وانسخ Project URL و anon public key والصقهما هنا.' : 'Dans Project Settings > API, copiez l\'URL et l\'anon key puis collez-les ici.'}</li>
                <li>{lang === 'ar' ? 'اضغط على "كود إنشاء الجداول (SQL Schema)" وانسخه ثم ألصقه في SQL Editor في Supabase واضغط Run.' : 'Cliquez sur "Schéma SQL Supabase", copiez le code dans l\'éditeur SQL de Supabase et exécutez-le.'}</li>
              </ol>
            </div>
          </div>

          {/* Cloud Sync Action */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-sm">
              <RefreshCw className="w-5 h-5" />
              <span>{lang === 'ar' ? 'مزامنة البيانات السحابية (Synchronisation)' : 'Synchronisation Cloud'}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'ar' 
                ? 'اضغط هنا لرفع كل السلع والزبائن والمبيعات الجديدة إلى السحابة، وسحب أي تحديثات تمت من أجهزة أخرى.' 
                : 'Synchronisez immédiatement vos données locales avec la base de données Supabase.'}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing 
                    ? (lang === 'ar' ? 'جارٍ المزامنة...' : 'Synchronisation...') 
                    : (lang === 'ar' ? 'مزامنة السحابية الآن' : 'Synchroniser maintenant')}
                </span>
              </button>
            </div>

            {syncStatusMsg && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {syncStatusMsg}
              </div>
            )}
          </div>

          {/* Local File Backup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Database className="w-5 h-5 text-teal-600" />
              <span>{lang === 'ar' ? 'النسخ الاحتياطي المحلي الكامل (Sauvegarde Locale)' : 'Sauvegarde locale complète (Export / Import)'}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'ar' 
                ? 'يمكنك تحميل نسخة كاملة من جميع سلعك، فواتيرك، زبائنك وديونك بملف JSON آمن وتخزينه في هاتفك أو إرساله إلى واتساب.' 
                : 'Téléchargez une copie complète de vos articles, ventes, clients et créances au format JSON pour la conserver ou la transférer.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تصدير نسخة احتياطية (Télécharger JSON)' : 'Exporter sauvegarde (Télécharger JSON)'}</span>
              </button>

              <label className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{lang === 'ar' ? 'استعادة نسخة (Restaurer JSON)' : 'Restaurer sauvegarde (Importer JSON)'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab: General & Theme */}
      {activeTab === 'general' && (
        <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-6 max-w-2xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          {/* Language */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2">
              {lang === 'ar' ? 'لغة التطبيق (Langue)' : 'Langue de l\'application'}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('ar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  language === 'ar' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                العربية (المغرب)
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  language === 'fr' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Français
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2">
              {lang === 'ar' ? 'المظهر والإضاءة (Thème)' : 'Apparence & Thème'}
            </h4>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
              <span>
                {lang === 'ar' 
                  ? (theme === 'dark' ? 'التبديل إلى الوضع النهاري (Clair)' : 'التبديل إلى الوضع الليلي (Sombre)')
                  : (theme === 'dark' ? 'Passer au mode Clair' : 'Passer au mode Sombre')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              {lang === 'ar' ? 'إضافة مستخدم جديد' : 'Ajouter un nouvel utilisateur'}
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {lang === 'ar' ? 'اسم المستخدم *' : 'Nom de l\'utilisateur *'}
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder={lang === 'ar' ? 'ياسين الكاشير' : 'Ex: Yassine'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {lang === 'ar' ? 'رقم الهاتف' : 'Numéro de téléphone'}
                </label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {lang === 'ar' ? 'الدور والصلاحية' : 'Rôle et autorisations'}
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white dark:bg-slate-800"
                >
                  <option value="CASHIER">
                    {lang === 'ar' ? 'كاشير مبيعات (POS وبيع فقط)' : 'Caissier (POS & Vente uniquement)'}
                  </option>
                  <option value="MANAGER">
                    {lang === 'ar' ? 'مسير متجر (إدارة المخزون والمشتريات)' : 'Gérant (Stock, Achats et Caisse)'}
                  </option>
                  <option value="ADMIN">
                    {lang === 'ar' ? 'مالك ومدير عام (كل الصلاحيات)' : 'Administrateur (Tous les droits)'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {lang === 'ar' ? 'رمز PIN للدخول (4 أرقام) *' : 'Code PIN d\'accès (4 chiffres) *'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newUserPin}
                  onChange={e => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full px-3 py-2 rounded-xl border border-teal-500 text-center font-extrabold text-sm tracking-widest"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ المستخدم' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'مخطط قاعدة بيانات Supabase (SQL Schema)' : 'Schéma SQL Supabase'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'ar'
                  ? 'قم بنسخ هذا الكود بالكامل، ثم افتح مشروعك في Supabase واذهب إلى SQL Editor، ألصق الكود واضغط على Run. سيتم إنشاء جميع الجداول اللازمة تلقائياً.'
                  : 'Copiez ce code SQL, ouvrez votre projet Supabase dans le "SQL Editor", collez-le et cliquez sur "Run" pour créer toutes les tables automatiquement.'}
              </p>

              <div className="relative">
                <a
                  href="/supabase_schema.sql"
                  download="tajer_supabase_schema.sql"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 mb-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحميل ملف tajer_supabase_schema.sql' : 'Télécharger le fichier SQL'}</span>
                </a>
              </div>

              <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-slate-800 leading-relaxed select-all">
                <pre>{`-- TAJER POS SUPABASE SCHEMA (Summary)
-- Run the full file downloaded above or visit /supabase_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  branch_id TEXT,
  category_id TEXT,
  barcode TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  min_selling_price NUMERIC,
  stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'unit',
  tax_rate NUMERIC DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  ice TEXT,
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  branch_id TEXT,
  cashier_id TEXT,
  cashier_name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  invoice_number TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PAID',
  amount_paid NUMERIC DEFAULT 0,
  amount_change NUMERIC DEFAULT 0,
  amount_remaining NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  fetch('/supabase_schema.sql')
                    .then(r => r.text())
                    .then(txt => {
                      navigator.clipboard.writeText(txt);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 3000);
                    })
                    .catch(() => {
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 3000);
                    });
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? (lang === 'ar' ? 'تم نسخ الكود بالكامل!' : 'Copié !') : (lang === 'ar' ? 'نسخ الكود الكامل (Copier Tout)' : 'Copier Tout le SQL')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
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
