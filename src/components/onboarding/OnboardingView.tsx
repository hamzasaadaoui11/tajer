import React, { useState } from 'react';
import { 
  Store, 
  MapPin, 
  FileText, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { generateSeedData } from '../../services/seed';
import { MerchantActivity } from '../../types';

export const OnboardingView: React.FC = () => {
  const { business, branch, completeOnboarding } = useApp();
  const [isFinishing, setIsFinishing] = useState(false);

  const [step, setStep] = useState<number>(1);
  const [storeName, setStoreName] = useState(business.name || 'متجر البركة');
  const [activity, setActivity] = useState(business.activity || 'grocery');
  const [phone, setPhone] = useState(business.phone || '06 61 23 45 67');
  const [city, setCity] = useState(business.city || 'الدار البيضاء');
  const [address, setAddress] = useState(business.address || 'حي المعاريف');
  const [ice, setIce] = useState(business.ice || '');
  const [ifNumber, setIfNumber] = useState(business.ifNumber || '');
  const [rc, setRc] = useState(business.rc || '');
  const [patente, setPatente] = useState(business.patente || '');
  const [dataChoice, setDataChoice] = useState<'demo' | 'empty'>('demo');

  const activities: { id: MerchantActivity; label: string; icon: string }[] = [
    { id: 'grocery', label: 'بقالة ومواد غذائية (Épicerie)', icon: '🛒' },
    { id: 'clothing', label: 'ملابس وأحذية (Prêt-à-porter)', icon: '👕' },
    { id: 'spare_parts', label: 'دروكري وعقاقير وقطع غيار (Droguerie / Quincaillerie)', icon: '🔧' },
    { id: 'general_store', label: 'مستحضرات تجميل وتجارة عامة (Cosmétique)', icon: '💄' },
    { id: 'electronics', label: 'إلكترونيات وهواتف (Téléphonie)', icon: '📱' },
    { id: 'pharmacy', label: 'شبه صيدلية (Parapharmacie)', icon: '💊' },
    { id: 'food_store', label: 'مأكولات ومخبزة (Alimentation)', icon: '🥐' },
    { id: 'other', label: 'تجارة أخرى (Autre commerce)', icon: '🏬' },
  ];

  const moroccanCities = [
    'الدار البيضاء', 'الرباط', 'مراكش', 'طنجة', 'فاس', 'أكادير', 'وجدة', 'القنيطرة', 'تطوان', 'مكناس', 'تمارة', 'الناظور', 'بني ملال', 'المحمدية', 'الجديدة', 'خريبكة'
  ];

  const handleFinish = () => {
    setIsFinishing(true);
    try {
      // 1. Update business
      const updated = {
        ...business,
        name: storeName.trim() || 'متجر البركة',
        activity,
        phone: phone.trim() || '06 61 00 11 22',
        city: city.trim() || 'الدار البيضاء',
        address: address.trim() || 'حي المسيرة',
        ice: ice.trim(),
        ifNumber: ifNumber.trim(),
        rc: rc.trim(),
        patente: patente.trim(),
        updated_at: new Date().toISOString(),
      };

      // 2. Handle demo data or empty store
      if (dataChoice === 'demo') {
        const seed = generateSeedData(business.id, branch.id);
        db.set('categories', seed.categories);
        db.set('suppliers', seed.suppliers);
        db.set('customers', seed.customers);
        db.set('products', seed.products);
      } else {
        db.resetToEmptyStore(business.id, branch.id);
      }

      // 3. Mark onboarding complete in AppContext
      completeOnboarding(updated);
    } catch (e) {
      console.error('Error completing onboarding:', e);
      setIsFinishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      {/* Wizard Progress Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-right">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                  step === s
                    ? 'bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-950'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">الخطوة {step} من 4</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {step === 1 && 'اسم المتجر والنشاط'}
              {step === 2 && 'الموقع والاتصال'}
              {step === 3 && 'الهوية الضريبية بالمغرب (اختياري)'}
              {step === 4 && 'تجهيز المتجر والبيانات'}
            </div>
          </div>
        </div>

        {/* STEP 1: Name and Activity */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم المحل أو المتجر التجاري *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="مثال: متجر النور للمواد الغذائية"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                مجال النشاط التجاري
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activities.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActivity(a.id)}
                    className={`p-3 rounded-2xl border text-right transition flex items-center gap-3 cursor-pointer ${
                      activity === a.id
                        ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 font-bold ring-1 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Location and Phone */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المدينة المغربية *
              </label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
              >
                {moroccanCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                العنوان والحي *
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="مثال: زنقة طارق بن زياد، رقم 18، حي القدس"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الهاتف (الواتساب والمحل) *
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="مثال: 06 61 00 22 33"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Tax Identification */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              هذه المعلومات اختيارية وتظهر في أعلى فواتير الزبائن والموردين لتكون مطابقة للقانون المغربي:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم التعريف الموحد للمقاولة (ICE - 15 رقماً)
              </label>
              <input
                type="text"
                value={ice}
                onChange={e => setIce(e.target.value)}
                placeholder="001234567000089"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-left"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الضريبي (Identifiant Fiscal - IF)
                </label>
                <input
                  type="text"
                  value={ifNumber}
                  onChange={e => setIfNumber(e.target.value)}
                  placeholder="مثال: 45678901"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السجل التجاري (Registre de Commerce - RC)
                </label>
                <input
                  type="text"
                  value={rc}
                  onChange={e => setRc(e.target.value)}
                  placeholder="مثال: 123456"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الضريبة المهنية (Patente)
              </label>
              <input
                type="text"
                value={patente}
                onChange={e => setPatente(e.target.value)}
                placeholder="مثال: 345678"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Data Initialization Choice */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-500 mb-3">
              كيف ترغب في بدء استخدام تطبيق تاجر؟
            </p>

            <button
              type="button"
              onClick={() => setDataChoice('demo')}
              className={`w-full p-4 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer ${
                dataChoice === 'demo'
                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                  تجهيز المتجر بسلع مغربية تجريبية (موصى به)
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  إضافة تشكيلة سلع مغربية أصلية بالدرهم مع عملاء وموردين لتجربة شاشة البيع وتجربة التطبيق فوراً.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDataChoice('empty')}
              className={`w-full p-4 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer ${
                dataChoice === 'empty'
                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                  البدء بمتجر فارغ تماماً (Production Ready)
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  ابدأ مباشرة بإدخال سلعك الحقيقية وعملائك يدوياً أو عبر مسح الباركود دون أي بيانات افتراضية.
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isFinishing}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-75"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isFinishing ? 'جاري فتح المتجر...' : 'إنهاء وفتح المتجر'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
