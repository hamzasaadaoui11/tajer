import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Globe, 
  Moon, 
  Sun, 
  LogOut,
  Palette,
  Image,
  FileText,
  ShieldCheck,
  Trash2,
  Upload,
  Check,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCheck,
  Printer,
  Bluetooth,
  HelpCircle,
  Smartphone,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Code,
  Copy,
  Database,
  Save
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { Category } from '../../types';
import { thermalPrinterService } from '../../services/thermalPrinter';
import { ThermalPrinterGuideModal } from '../common/ThermalPrinterGuideModal';
import { CURRENT_APP_BUILD, forceFullCleanUpdate } from '../../services/appUpdater';

export const SettingsView: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    language, 
    setLanguage, 
    theme, 
    toggleTheme, 
    lang,
    logout,
    authEmail,
    dataVersion,
    refreshData,
    user,
    updatePassword,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'general' | 'categories' | 'security'>('store');
  const [storeSection, setStoreSection] = useState<'branding' | 'general' | 'legal' | 'footer'>('branding');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Printer Test State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerTestMsg, setPrinterTestMsg] = useState<{ success?: boolean; text?: string } | null>(null);
  const [savedPrinter, setSavedPrinter] = useState(thermalPrinterService.getSavedPrinterName());
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  const handleForceCleanUpdate = async () => {
    setIsUpdatingApp(true);
    await forceFullCleanUpdate();
  };

  const handleTestPrinter = async () => {
    setIsTestingPrinter(true);
    setPrinterTestMsg(null);
    try {
      const res = await thermalPrinterService.printTestTicket(lang);
      if (res.success) {
        setSavedPrinter(thermalPrinterService.getSavedPrinterName());
        setPrinterTestMsg({
          success: true,
          text: lang === 'ar' ? 'تمت طباعة التذكرة بنجاح عبر البلوتوث!' : 'Ticket test imprimé avec succès via Bluetooth !'
        });
      } else {
        setPrinterTestMsg({
          success: false,
          text: res.error || (lang === 'ar' ? 'تعذر الاتصال بالطابعة' : 'Échec de connexion')
        });
      }
    } catch (e: any) {
      setPrinterTestMsg({
        success: false,
        text: e?.message || 'Erreur'
      });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  // New Categories State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#0284c7');
  const [newCatIcon, setNewCatIcon] = useState('tag');

  const categoryColors = [
    { value: '#0284c7', name: 'Teal/Sky' },
    { value: '#ea580c', name: 'Orange' },
    { value: '#d97706', name: 'Amber' },
    { value: '#8b5cf6', name: 'Purple' },
    { value: '#10b981', name: 'Green' },
    { value: '#f43f5e', name: 'Rose/Red' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#64748b', name: 'Slate' },
  ];

  // Business form state
  const [name, setName] = useState(business.name);
  const [activity, setActivity] = useState(
    business.activity && business.activity !== 'grocery' && business.activity !== 'general_store'
      ? business.activity
      : ''
  );
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
  const [stamp, setStamp] = useState(business.stamp === 'DISABLED' ? '' : (business.stamp || ''));
  const [stampEnabled, setStampEnabled] = useState(
    business.stampEnabled !== undefined
      ? business.stampEnabled
      : (business.stamp !== 'DISABLED')
  );
  const [invoiceColor, setInvoiceColor] = useState(business.invoiceColor || '#C02626');

  // TVA Settings States
  const [taxEnabled, setTaxEnabled] = useState(business.taxEnabled ?? false);
  const [defaultTaxRate, setDefaultTaxRate] = useState(business.defaultTaxRate ?? 20);

  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [stampSaving, setStampSaving] = useState(false);
  const [stampSaved, setStampSaved] = useState(false);
  const [colorSaving, setColorSaving] = useState(false);
  const [colorSaved, setColorSaved] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [storeSaveLoading, setStoreSaveLoading] = useState(false);
  const [storeSaveSuccess, setStoreSaveSuccess] = useState(false);

  // Sync state if business object updates from DB or Supabase
  React.useEffect(() => {
    if (business.name !== undefined) setName(business.name || '');
    if (business.activity !== undefined) {
      setActivity(
        business.activity && business.activity !== 'grocery' && business.activity !== 'general_store'
          ? business.activity
          : ''
      );
    }
    if (business.phone !== undefined) setPhone(business.phone || '');
    if (business.city !== undefined) setCity(business.city || '');
    if (business.address !== undefined) setAddress(business.address || '');
    if (business.ice !== undefined) setIce(business.ice || '');
    if (business.rc !== undefined) setRc(business.rc || '');
    if (business.ifNumber !== undefined) setIfNumber(business.ifNumber || '');
    if (business.patente !== undefined) setPatente(business.patente || '');
    if (business.capital !== undefined) setCapital(business.capital || '');
    if (business.bankInfo !== undefined) setBankInfo(business.bankInfo || '');
    if (business.receiptFooter !== undefined) setReceiptFooter(business.receiptFooter || '');
    if (business.a4Footer !== undefined) setA4Footer(business.a4Footer || '');
    if (business.logo !== undefined) setLogo(business.logo || '');
    if (business.stamp !== undefined) setStamp(business.stamp === 'DISABLED' ? '' : (business.stamp || ''));
    if (business.stampEnabled !== undefined) setStampEnabled(business.stampEnabled);
    if (business.invoiceColor !== undefined) setInvoiceColor(business.invoiceColor || '#C02626');
    if (business.taxEnabled !== undefined) setTaxEnabled(business.taxEnabled ?? false);
    if (business.defaultTaxRate !== undefined) setDefaultTaxRate(business.defaultTaxRate ?? 20);
  }, [
    business.name,
    business.activity,
    business.phone,
    business.city,
    business.address,
    business.ice,
    business.rc,
    business.ifNumber,
    business.patente,
    business.capital,
    business.bankInfo,
    business.receiptFooter,
    business.a4Footer,
    business.logo,
    business.stamp,
    business.stampEnabled,
    business.invoiceColor,
    business.taxEnabled,
    business.defaultTaxRate,
  ]);

  // Helper to compress images automatically
  const compressImage = (file: File, maxDim = 320, quality = 0.60): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Logo Upload with automatic compression and instant cloud persistence
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoSaving(true);
    setLogoSaved(false);
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setLogo(compressed);
      await updateBusiness({ logo: compressed });
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 4000);
    } catch {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const res = event.target?.result as string;
        setLogo(res);
        await updateBusiness({ logo: res });
        setLogoSaved(true);
        setTimeout(() => setLogoSaved(false), 4000);
      };
      reader.readAsDataURL(file);
    } finally {
      setLogoSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogo('');
    setLogoSaved(false);
    await updateBusiness({ logo: '' });
  };

  // Stamp Upload with automatic compression and instant cloud persistence
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampSaving(true);
    setStampSaved(false);
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setStamp(compressed);
      await updateBusiness({ stamp: compressed, stampEnabled: true });
      setStampSaved(true);
      setTimeout(() => setStampSaved(false), 4000);
    } catch {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const res = event.target?.result as string;
        setStamp(res);
        await updateBusiness({ stamp: res, stampEnabled: true });
        setStampSaved(true);
        setTimeout(() => setStampSaved(false), 4000);
      };
      reader.readAsDataURL(file);
    } finally {
      setStampSaving(false);
    }
  };

  const handleRemoveStamp = async () => {
    setStamp('');
    setStampSaved(false);
    await updateBusiness({ stamp: '', stampEnabled: false });
  };

  // Instant save invoice theme color
  const handleColorSelect = async (newColor: string) => {
    setInvoiceColor(newColor);
    setColorSaving(true);
    setColorSaved(false);
    try {
      await updateBusiness({ invoiceColor: newColor });
      setColorSaved(true);
      setTimeout(() => setColorSaved(false), 3000);
    } finally {
      setColorSaving(false);
    }
  };

  // Instant toggle stamp
  const handleStampToggle = async (enabled: boolean) => {
    setStampEnabled(enabled);
    setStampSaving(true);
    try {
      await updateBusiness({
        stampEnabled: enabled,
        stamp: enabled ? (stamp || '') : 'DISABLED'
      });
      setStampSaved(true);
      setTimeout(() => setStampSaved(false), 3000);
    } finally {
      setStampSaving(false);
    }
  };

  // Direct branding save button
  const handleSaveBrandingNow = async () => {
    setBrandingSaving(true);
    setBrandingSaved(false);
    try {
      await updateBusiness({
        logo,
        stamp: stampEnabled ? stamp : 'DISABLED',
        stampEnabled,
        invoiceColor,
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 4000);
    } finally {
      setBrandingSaving(false);
    }
  };

  // Load categories
  const categoriesList = React.useMemo(() => {
    return db.getCategories(business.id);
  }, [business.id, dataVersion]);

  // Save/Create a new Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Check if category name already exists
    const exists = categoriesList.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (exists) {
      alert(lang === 'ar' ? 'هذه الفئة موجودة بالفعل!' : 'Cette catégorie existe déjà !');
      return;
    }

    const newCategory: Category = {
      id: 'cat-' + Math.random().toString(36).substring(2, 9),
      business_id: business.id,
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      created_at: new Date().toISOString(),
    };

    db.saveCategory(newCategory);
    setNewCatName('');
    refreshData();
    alert(lang === 'ar' ? 'تمت إضافة الفئة بنجاح!' : 'Catégorie ajoutée avec succès !');
  };

  // Delete Category
  const handleDeleteCategory = (catId: string, catName: string) => {
    const confirmMessage = lang === 'ar' 
      ? `هل أنت متأكد من حذف فئة "${catName}"؟ السلع المرتبطة بها ستبقى في المحل ولكن بدون فئة.` 
      : `Voulez-vous vraiment supprimer la catégorie "${catName}" ? Les articles associés resteront mais sans catégorie.`;
    
    if (window.confirm(confirmMessage)) {
      db.deleteCategory(catId);
      refreshData();
    }
  };

  // Password Change Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword) {
      setPasswordError(
        lang === 'ar' ? 'يرجى إدخال كلمة المرور الجديدة' : 'Veuillez saisir le nouveau mot de passe'
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        lang === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام' : 'Le mot de passe doit comporter au moins 6 caractères'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        lang === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'Les mots de passe ne correspondent pas'
      );
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await updatePassword(newPassword, currentPassword.trim() || undefined);
      setPasswordLoading(false);

      if (res.success) {
        setPasswordSuccess(
          lang === 'ar' 
            ? 'تم تغيير وتحديث كلمة المرور بنجاح في السحابة! يمكنك الآن استخدامها للدخول.' 
            : 'Mot de passe mis à jour avec succès dans le Cloud !'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Impossible de modifier le mot de passe'));
      }
    } catch (err: any) {
      setPasswordLoading(false);
      setPasswordError(err?.message || (lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Une erreur est survenue'));
    }
  };

  // Quick save for General Store Information
  const handleSaveGeneralNow = async () => {
    setGeneralSaving(true);
    setGeneralSaved(false);
    try {
      const res = await updateBusiness({
        name: name.trim() || business.name,
        activity: activity.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
      });
      setGeneralSaving(false);
      if (res && res.success === false) {
        alert(lang === 'ar' ? 'فشل الحفظ في السحابة: ' + res.error : 'Erreur: ' + res.error);
      } else {
        setGeneralSaved(true);
        setTimeout(() => setGeneralSaved(false), 3000);
      }
    } catch (err: any) {
      setGeneralSaving(false);
      alert(lang === 'ar' ? 'حدث خطأ: ' + (err?.message || '') : 'Erreur: ' + (err?.message || ''));
    }
  };

  // Save Store Settings
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSaveLoading(true);
    setStoreSaveSuccess(false);

    try {
      const res = await updateBusiness({
        name: name.trim() || business.name,
        activity: activity.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        ice: ice.trim(),
        rc: rc.trim(),
        ifNumber: ifNumber.trim(),
        patente: patente.trim(),
        capital: capital.trim(),
        bankInfo: bankInfo.trim(),
        receiptFooter,
        a4Footer,
        logo,
        stamp: stampEnabled ? stamp : 'DISABLED',
        stampEnabled,
        invoiceColor,
        taxEnabled,
        defaultTaxRate,
      });
      if (res && res.success === false) {
        alert(lang === 'ar' ? 'تنبيه: تم الحفظ محلياً لكن تعذر التحديث في السحاب: ' + res.error : 'Erreur cloud: ' + res.error);
      } else {
        setStoreSaveSuccess(true);
        setTimeout(() => setStoreSaveSuccess(false), 4000);
        alert(lang === 'ar' ? '✓ تم حفظ إعدادات وبيانات المتجر ومزامنتها سحابياً بنجاح!' : '✓ Paramètres enregistrés avec succès !');
      }
    } catch (err: any) {
      alert(lang === 'ar' ? 'حدث خطأ أثناء الحفظ: ' + (err?.message || '') : 'Erreur: ' + (err?.message || ''));
    } finally {
      setStoreSaveLoading(false);
    }
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
                ? 'تخصيص بيانات المحل، الهوية البصرية، والمظهر واللغة' 
                : 'Personnalisation des données du magasin, identité et langue'}
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
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 sm:p-1.5 rounded-2xl text-xs font-bold gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 whitespace-nowrap ${
                activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                <span className="sm:hidden">{lang === 'ar' ? 'المحل' : 'Magasin'}</span>
                <span className="hidden sm:inline">{lang === 'ar' ? 'بيانات المحل' : 'Infos Magasin'}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 whitespace-nowrap ${
                activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                <span className="sm:hidden">{lang === 'ar' ? 'الفئات' : 'Catégories'}</span>
                <span className="hidden sm:inline">{lang === 'ar' ? 'إدارة الفئات' : 'Catégories'}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 whitespace-nowrap ${
                activeTab === 'security' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                <span className="sm:hidden">{lang === 'ar' ? 'الأمان' : 'Sécurité'}</span>
                <span className="hidden sm:inline">{lang === 'ar' ? 'الأمان وكلمة المرور' : 'Sécurité & Mot de passe'}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 whitespace-nowrap ${
                activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                <span className="sm:hidden">{lang === 'ar' ? 'المظهر' : 'Général'}</span>
                <span className="hidden sm:inline">{lang === 'ar' ? 'المظهر واللغة' : 'Apparence & Langue'}</span>
              </span>
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
                            onClick={handleRemoveLogo}
                            disabled={logoSaving}
                            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
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
                          {lang === 'ar' ? 'صيغة PNG أو JPG أو SVG (يُحفظ تلقائياً)' : 'Format PNG, JPG ou SVG (auto-sauvegardé)'}
                        </span>

                        {logoSaving && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === 'ar' ? 'جاري الحفظ في قاعدة البيانات...' : 'Sauvegarde dans la base de données...'}</span>
                          </div>
                        )}

                        {logoSaved && !logoSaving && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? '✓ تم حفظ الشعار سحابياً بنجاح!' : '✓ Logo enregistré avec succès !'}</span>
                          </div>
                        )}
                        
                        <label className={`inline-block mt-2 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-bold cursor-pointer transition ${logoSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload className="w-3 h-3 inline-block me-1" />
                          <span>{logo ? (lang === 'ar' ? 'تغيير الشعار' : 'Changer le logo') : (lang === 'ar' ? 'تحميل الشعار' : 'Téléverser le logo')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={logoSaving}
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Stamp / Cachet Upload Card with Activate/Deactivate Toggle */}
                    <div className={`p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 space-y-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {/* Top Row: Title + Toggle Switch */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                            {lang === 'ar' ? 'ختم وتوقيع المحل (Cachet)' : 'Cachet & signature (Tampon)'}
                          </span>
                          <span className="block text-[10.5px] text-slate-400 mt-0.5">
                            {stampEnabled
                              ? (lang === 'ar' ? 'مفعل: سيظهر الختم أسفل فواتير المبيعات A4' : 'Activé : s\'affiche au bas des factures A4')
                              : (lang === 'ar' ? 'معطل: لن يظهر أي ختم أو توقيع افتراضي على الفاتورة' : 'Désactivé : aucun cachet par défaut sur la facture')}
                          </span>
                        </div>

                        {/* Toggle switch */}
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0" title={stampEnabled ? (lang === 'ar' ? 'تعطيل الختم' : 'Désactiver') : (lang === 'ar' ? 'تفعيل الختم' : 'Activer')}>
                          <input
                            type="checkbox"
                            checked={stampEnabled}
                            onChange={(e) => handleStampToggle(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                        </label>
                      </div>

                      {/* Content when enabled */}
                      {stampEnabled ? (
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-3.5 animate-in fade-in duration-200">
                          {stamp ? (
                            <div className="relative group shrink-0">
                              <img
                                src={stamp}
                                alt="Company Stamp"
                                className="w-14 h-14 rounded-xl object-contain border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1"
                              />
                              <button
                                type="button"
                                onClick={handleRemoveStamp}
                                disabled={stampSaving}
                                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                                title={lang === 'ar' ? 'حذف الختم' : 'Supprimer le cachet'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900 text-slate-400 shrink-0">
                              <FileText className="w-5 h-5 stroke-1" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              {stamp 
                                ? (lang === 'ar' ? 'ختم مخصص مرفوع (محفوظ سحابياً)' : 'Cachet personnalisé importé')
                                : (lang === 'ar' ? 'الختم الأزرق الرسمي الافتراضي للمحل' : 'Cachet officiel bleu par défaut')}
                            </span>

                            {stampSaving && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{lang === 'ar' ? 'جاري الحفظ سحابياً...' : 'Sauvegarde en cours...'}</span>
                              </div>
                            )}

                            {stampSaved && !stampSaving && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{lang === 'ar' ? '✓ تم حفظ الختم بنجاح!' : '✓ Cachet enregistré !'}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1.5">
                              <label className={`inline-flex items-center px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-bold cursor-pointer transition ${stampSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload className="w-3 h-3 inline-block me-1" />
                                <span>{stamp ? (lang === 'ar' ? 'تغيير صورة الختم' : 'Changer') : (lang === 'ar' ? 'تحميل ختم مخصص' : 'Téléverser')}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={stampSaving}
                                  onChange={handleStampUpload}
                                  className="hidden"
                                />
                              </label>

                              {stamp && (
                                <button
                                  type="button"
                                  onClick={handleRemoveStamp}
                                  disabled={stampSaving}
                                  className="text-[11px] text-slate-400 hover:text-rose-600 underline cursor-pointer disabled:opacity-50"
                                >
                                  {lang === 'ar' ? 'الرجوع للافتراضي' : 'Par défaut'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                          <span>
                            {lang === 'ar' 
                              ? 'الختم معطل: ستطبع الفواتير نظيفة بدون أي خاتم أو توقيع افتراضي.'
                              : 'Cachet désactivé : les factures s\'imprimeront sans aucun tampon ni signature par défaut.'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Theme Color Picker Card */}
                    <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 flex flex-col justify-between ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            {lang === 'ar' ? 'لون الفاتورة الرسمي' : 'Couleur officielle des factures'}
                          </span>
                          {colorSaving && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{lang === 'ar' ? 'جاري الحفظ...' : 'Sauvegarde...'}</span>
                            </span>
                          )}
                          {colorSaved && !colorSaving && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{lang === 'ar' ? '✓ تم الحفظ' : '✓ Enregistré'}</span>
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {lang === 'ar' 
                            ? 'سيتم تطبيق هذا اللون على فواتير المبيعات ووصولات التوريد A4 (يُحفظ تلقائياً)' 
                            : 'Appliqué sur les factures et bons au format A4 (auto-sauvegardé)'}
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
                              onClick={() => handleColorSelect(col.hex)}
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
                            onChange={e => handleColorSelect(e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden bg-transparent shrink-0"
                            title={lang === 'ar' ? 'لون مخصص' : 'Couleur personnalisée'}
                          />
                          <input
                            type="text"
                            value={invoiceColor.toUpperCase()}
                            onChange={e => {
                              if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                                setInvoiceColor(e.target.value);
                                if (e.target.value.length === 7) {
                                  handleColorSelect(e.target.value);
                                }
                              }
                            }}
                            className="w-16 px-1.5 py-1 rounded border border-slate-200 text-[10px] font-mono text-center text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                            placeholder="#C02626"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Action Bar for Branding */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSqlModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700/70 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition active:scale-95"
                    >
                      <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>{lang === 'ar' ? 'كود SQL لتحديث جداول Supabase' : 'Script SQL Supabase'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {brandingSaved && !brandingSaving && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'تم الحفظ والمزامنة!' : 'Enregistré avec succès !'}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveBrandingNow}
                        disabled={brandingSaving}
                        className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95 ${
                          brandingSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
                        }`}
                      >
                        {brandingSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === 'ar' ? 'جاري الحفظ سحابياً...' : 'Sauvegarde...'}</span>
                          </>
                        ) : brandingSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تم حفظ الهوية' : 'Enregistré'}</span>
                          </>
                        ) : (
                          <>
                            <Palette className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'حفظ الهوية واللوجو سحابياً الآن' : 'Enregistrer le logo & l\'identité'}</span>
                          </>
                        )}
                      </button>
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
                    placeholder={lang === 'ar' ? 'مثال: زنقة 15، حي الأمل...' : 'Ex: Rue 15, Quartier...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Direct save button for General info */}
                <div className="sm:col-span-2 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700/70 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{lang === 'ar' ? 'كود SQL لتحديث جداول Supabase' : 'Script SQL Supabase'}</span>
                  </button>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {generalSaved && !generalSaving && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'تم الحفظ في السحابة!' : 'Enregistré avec succès !'}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveGeneralNow}
                      disabled={generalSaving}
                      className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95 ${
                        generalSaving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      {generalSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{lang === 'ar' ? 'جاري الحفظ سحابياً...' : 'Sauvegarde...'}</span>
                        </>
                      ) : generalSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'تم الحفظ' : 'Enregistré'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'حفظ معلومات المحل سحابياً الآن' : 'Enregistrer les coordonnées'}</span>
                        </>
                      )}
                    </button>
                  </div>
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
          <div className={`pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}>
            {storeSaveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تم الحفظ والمزامنة بنجاح!' : 'Enregistré avec succès !'}</span>
              </span>
            )}
            <button
              type="submit"
              disabled={storeSaveLoading}
              className={`px-6 py-3 rounded-2xl text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition flex items-center gap-2 ${
                storeSaveLoading ? 'bg-teal-400 cursor-not-allowed opacity-80' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {storeSaveLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ar' ? 'جاري حفظ ومزامنة البيانات...' : 'Enregistrement en cours...'}</span>
                </>
              ) : storeSaveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تم الحفظ' : 'Enregistré'}</span>
                </>
              ) : (
                <span>{lang === 'ar' ? 'حفظ كل التعديلات' : 'Enregistrer les modifications'}</span>
              )}
            </button>
          </div>
        </form>
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

          {/* Thermal & Bluetooth Printer Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ar' ? 'الطابعة الحرارية والبلوتوث (الهاتف والكمبيوتر)' : 'Imprimante Thermique & Bluetooth'}</span>
              </h4>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'دليل ربط الهاتف' : 'Guide mobile'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'يمكنك ربط طابعات البلوتوث الحرارية المحمولة (58mm أو 80mm) بهاتفك الذكي أو حاسوبك وطباعة الفواتير مباشرة مع دعم كامل للخط العربي.'
                : 'Connectez directement vos imprimantes thermiques Bluetooth (58mm ou 80mm) et imprimez vos tickets.'}
            </p>



            {savedPrinter && (
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-teal-900 dark:text-teal-200">{savedPrinter}</span>
                </div>
                <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
                  {lang === 'ar' ? 'طابعة مقترنة ومحفوظة' : 'Imprimante mémorisée'}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestPrinter}
                disabled={isTestingPrinter}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isTestingPrinter ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الاتصال والطباعة...' : 'Impression en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                    <span>{lang === 'ar' ? 'اختبار اتصال البلوتوث وطباعة تذكرة تجريبية' : 'Tester la connexion Bluetooth'}</span>
                  </>
                )}
              </button>



              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'ar' ? 'دليل ربط الطابعة بالهاتف' : 'Comment connecter au smartphone'}</span>
              </button>
            </div>

            {printerTestMsg && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                printerTestMsg.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200'
              }`}>
                {printerTestMsg.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{printerTestMsg.text}</span>
              </div>
            )}
            {/* App Version & Self-Healing Cache Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-teal-600" />
                  <span>{lang === 'ar' ? 'تحديث التطبيق ومسح الكاش التلقائي' : 'Mise à jour & Vidage du cache'}</span>
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Build {CURRENT_APP_BUILD}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar'
                  ? 'يقوم هذا الخيار بمسح ملفات الكاش وتحديث التطبيق لأحدث نسخة سحابية فوراً دون تسجيل الخروج ودون الحاجة لحذف التطبيق أو استخدام المتصفح الخاص.'
                  : 'Met à jour l\'application et vide le cache du navigateur sans vous déconnecter et sans réinstaller l\'application.'}
              </p>

              <button
                type="button"
                onClick={handleForceCleanUpdate}
                disabled={isUpdatingApp}
                className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingApp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري التحديث والتنظيف...' : 'Mise à jour en cours...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تحديث التطبيق وتنظيف الكاش بنقرة واحدة' : 'Mettre à jour et vider le cache'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Categories Settings */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {/* Column 1: Add Category Form */}
          <form onSubmit={handleAddCategory} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 h-fit">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-1.5">
                {lang === 'ar' ? 'إضافة فئة جديدة للمحل' : 'Créer une nouvelle catégorie'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' 
                  ? 'قم بإضافة تصنيفات مخصصة لترتيب بضائعك وتسهيل الوصول إليها في شاشة المبيعات وباقي أقسام التطبيق' 
                  : 'Ajoutez des catégories personnalisées pour organiser vos articles et y accéder rapidement.'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'اسم الفئة / التصنيف *' : 'Nom de la catégorie *'}
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مواد تنظيف، عطور، مشروبات...' : 'Ex: Détergents, Parfums, Boissons...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'ar' ? 'اللون المميز للمبيعات' : 'Couleur distinctive'}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {categoryColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewCatColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition active:scale-95 cursor-pointer relative ${
                        newCatColor === color.value 
                          ? 'border-teal-600 dark:border-teal-400 scale-110 shadow-xs' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {newCatColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          <Check className="w-4 h-4 drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{lang === 'ar' ? 'إضافة الفئة الجديدة' : 'Ajouter la catégorie'}</span>
            </button>
          </form>

          {/* Column 2: Categories List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-full min-h-[350px]">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-1.5">
                {lang === 'ar' ? 'قائمة الفئات المتوفرة' : 'Catégories disponibles'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' 
                  ? `إجمالي الفئات المسجلة: ${categoriesList.length} فئة` 
                  : `Total : ${categoriesList.length} catégories`}
              </p>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800 pr-1 max-h-[400px]">
              {categoriesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {lang === 'ar' ? 'لا توجد فئات مخصصة حالياً.' : 'Aucune catégorie personnalisée.'}
                </div>
              ) : (
                categoriesList.map(cat => (
                  <div key={cat.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-xs shrink-0" 
                        style={{ backgroundColor: cat.color || '#0284c7' }} 
                      />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition opacity-80 hover:opacity-100 cursor-pointer"
                      title={lang === 'ar' ? 'حذف الفئة' : 'Supprimer'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <p className="mt-4 text-[9.5px] text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-800 pt-3">
              {lang === 'ar' 
                ? '💡 تذكير: يمكنك استعمال هذه الفئات مباشرة أثناء إضافة أو تعديل أي سلعة في المحل لتبسيط تنظيم متجرك.'
                : '💡 Astuce : Vous pouvez utiliser ces catégories lors de l\'ajout ou de l\'modification de vos produits.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Security & Password */}
      {activeTab === 'security' && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          {/* Card 1: Change Password Form */}
          <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 h-fit">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تغيير كلمة المرور' : 'Modifier le mot de passe'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ar' ? 'قم بتحديث كلمة مرور حسابك لتأمين الدخول' : 'Mettez à jour le mot de passe de votre compte'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{passwordError}</span>
              </div>
            )}

            {/* Success Message */}
            {passwordSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-bold leading-relaxed">{passwordSuccess}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'ar' ? 'كلمة المرور الحالية' : 'Mot de passe actuel'}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'ar' ? 'أدخل كلمة المرور الحالية لتأكيد هويتك' : 'Entrez votre mot de passe actuel pour vérification'}
              </p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'ar' ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'ar' ? 'يجب أن تحتوي على 6 أحرف أو أرقام على الأقل' : 'Doit comporter au moins 6 caractères'}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirmer le nouveau mot de passe'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer`}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ar' ? 'جاري تحديث كلمة المرور...' : 'Mise à jour en cours...'}</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تحديث وحفظ كلمة المرور الجديدة' : 'Enregistrer le nouveau mot de passe'}</span>
                </>
              )}
            </button>
          </form>

          {/* Card 2: Account Overview & Security Tips */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'معلومات حساب المتجر' : 'Informations du compte'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' ? 'بيانات الجلسة السحابية الحالية' : 'Session Cloud active'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 font-medium">{lang === 'ar' ? 'البريد الإلكتروني:' : 'Email :'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    {authEmail || user?.email || (lang === 'ar' ? 'حساب محلي' : 'Compte local')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 font-medium">{lang === 'ar' ? 'الدور والصلاحية:' : 'Rôle :'}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.role === 'ADMIN' ? (lang === 'ar' ? 'المدير العام (Admin)' : 'Administrateur') : user?.role || 'Admin'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-500 font-medium">{lang === 'ar' ? 'حالة السحابة:' : 'Statut Cloud :'}</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {lang === 'ar' ? 'متصل ومحمي' : 'Connecté & Sécurisé'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent rounded-3xl p-6 border border-teal-200/50 dark:border-teal-900/30 text-xs space-y-3">
              <h4 className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ar' ? 'حماية وأمان الحساب' : 'Sécurité de votre compte'}</span>
              </h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{lang === 'ar' ? 'بمجرد تغيير كلمة المرور، ستتمكن من تسجيل الدخول بها في هاتفك، حاسوبك، أو طابليط في آن واحد.' : 'Une fois modifié, vous pouvez vous connecter avec votre nouveau mot de passe sur tous vos appareils.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{lang === 'ar' ? 'يتم تشفير كلمات المرور باستخدام أحدث معايير الأمان السحابية لحماية بيانات متجرك وأرباحك.' : 'Vos identifiants sont chiffrés avec les normes de sécurité les plus strictes.'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Thermal Printer Guide & Troubleshooter Modal */}
      <ThermalPrinterGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />

      {/* Supabase SQL Helper Modal for Branding & Schema */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'كود SQL الشامل لإعدادات وبيانات المحل في Supabase' : 'Code SQL complet pour Supabase (Magasin, Identité & Branches)'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'ar' ? 'انسخ الكود وشغله في SQL Editor لضمان وجود جميع الأعمدة والجداول وصلاحيات الحفظ' : 'Copiez et exécutez ce script dans Supabase SQL Editor'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl p-3 border border-teal-200/50 dark:border-teal-900/50 text-xs text-teal-900 dark:text-teal-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ar' ? 'طريقة التشغيل السهلة في 3 خطوات:' : 'Instructions en 3 étapes :'}</span>
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5 pr-1">
                <li>{lang === 'ar' ? 'ادخل لحسابك في موقع Supabase وافتح مشروعك.' : 'Ouvrez votre projet sur Supabase.'}</li>
                <li>{lang === 'ar' ? 'اضغط من القائمة الجانبية على "SQL Editor" ثم اضغط "New Query".' : 'Cliquez sur SQL Editor puis New Query.'}</li>
                <li>{lang === 'ar' ? 'الصق الكود التالي واضغط على الزر الأخضر "Run".' : 'Collez le code ci-dessous et cliquez sur Run.'}</li>
              </ol>
            </div>

            {/* SQL Code Block */}
            <div className="relative flex-1 min-h-[160px] max-h-[300px] overflow-auto rounded-2xl bg-slate-950 text-slate-200 p-4 font-mono text-[11px] leading-relaxed border border-slate-800 text-left dir-ltr">
              <pre className="whitespace-pre">{`-- 1. جدول بيانات المحل والهوية واللوجو والضرائب
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    activity TEXT DEFAULT 'general_store',
    currency TEXT DEFAULT 'MAD',
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_number TEXT,
    rc TEXT,
    patente TEXT,
    cnss TEXT,
    logo TEXT,
    stamp TEXT,
    invoice_color TEXT DEFAULT '#C02626',
    receipt_footer TEXT,
    a4_footer TEXT,
    bank_info TEXT,
    capital TEXT,
    email TEXT,
    tax_enabled BOOLEAN DEFAULT false,
    default_tax_rate NUMERIC(5,2) DEFAULT 20.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إضافة وتحديث جميع أعمدة businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT 'general_store';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ice TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS if_number TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rc TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS patente TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnss TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stamp TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS invoice_color TEXT DEFAULT '#C02626';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS a4_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS bank_info TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS capital TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. جدول الفروع (branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    is_main BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT true;

-- 4. تفعيل صلاحيات القراءة والحفظ والتعديل
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to businesses" ON public.businesses;
CREATE POLICY "Allow all access to businesses" 
ON public.businesses FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" 
ON public.branches FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);`}</pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const sqlText = `-- ====================================================================
-- تاجر (TAJER) - كود SQL الشامل لجميع إعدادات وبيانات المحل في Supabase
-- ====================================================================

-- 1. جدول بيانات المحل والهوية واللوجو والضرائب
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    activity TEXT DEFAULT 'general_store',
    currency TEXT DEFAULT 'MAD',
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_number TEXT,
    rc TEXT,
    patente TEXT,
    cnss TEXT,
    logo TEXT,
    stamp TEXT,
    invoice_color TEXT DEFAULT '#C02626',
    receipt_footer TEXT,
    a4_footer TEXT,
    bank_info TEXT,
    capital TEXT,
    email TEXT,
    tax_enabled BOOLEAN DEFAULT false,
    default_tax_rate NUMERIC(5,2) DEFAULT 20.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إضافة وتحديث جميع أعمدة businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT 'general_store';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ice TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS if_number TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rc TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS patente TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnss TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stamp TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS invoice_color TEXT DEFAULT '#C02626';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS a4_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS bank_info TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS capital TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. جدول الفروع (branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    is_main BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT true;

-- 4. تفعيل صلاحيات القراءة والحفظ والتعديل
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to businesses" ON public.businesses;
CREATE POLICY "Allow all access to businesses" 
ON public.businesses FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" 
ON public.branches FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

-- 5. تفعيل المزامنة المباشرة
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;`;
                  navigator.clipboard.writeText(sqlText);
                  setSqlCopied(true);
                  setTimeout(() => setSqlCopied(false), 3000);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition active:scale-95 ${
                  sqlCopied ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                }`}
              >
                {sqlCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تم نسخ كود SQL بنجاح!' : 'Copié avec succès !'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'نسخ كود SQL بالكامل' : 'Copier tout le code SQL'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
