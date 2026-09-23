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
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
    authEmail
  } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'general'>('store');
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
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 ${
                activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{lang === 'ar' ? 'بيانات المحل' : 'Infos Magasin'}</span>
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial shrink-0 ${
                activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Globe className="w-4 h-4" />
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

    </div>
  );
};
