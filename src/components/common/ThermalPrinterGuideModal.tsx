import React, { useState } from 'react';
import { 
  Printer, 
  Bluetooth, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  X, 
  ExternalLink, 
  Play, 
  Loader2, 
  Settings 
} from 'lucide-react';
import { thermalPrinterService } from '../../services/thermalPrinter';
import { Language } from '../../i18n/locales';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const ThermalPrinterGuideModal: React.FC<Props> = ({ isOpen, onClose, lang = 'ar' }) => {
  const [testingBt, setTestingBt] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleTestPrint = async () => {
    setTestingBt(true);
    setTestResult(null);
    try {
      const res = await thermalPrinterService.printTestTicket(lang);
      if (res.success) {
        setTestResult({
          success: true,
          message: lang === 'ar' ? 'تمت طباعة التذكرة التجريبية بنجاح عبر البلوتوث!' : 'Ticket test imprimé avec succès via Bluetooth !'
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || (lang === 'ar' ? 'تعذر الاتصال بالطابعة' : 'Échec de connexion')
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || (lang === 'ar' ? 'حدث خطأ أثناء الاتصال' : 'Erreur de connexion')
      });
    } finally {
      setTestingBt(false);
    }
  };

  const isAndroid = thermalPrinterService.isAndroid();
  const isWebBtSupported = thermalPrinterService.isWebBluetoothSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className={`w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-50/50 dark:bg-teal-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'دليل ربط وتشغيل الطابعة الحرارية بالهاتف' : 'Guide Connexion Imprimante Thermique Mobile'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'حل مشكلة عدم اتصال طابعة البلوتوث بهاتفك المحمول' : 'Solution pour connecter l\'imprimante Bluetooth au téléphone'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          
          {/* Why phone didn't connect alert */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {lang === 'ar' ? 'لماذا لم تتعرف نافذة الطباعة العادية على الطابعة في هاتفك؟' : 'Pourquoi l\'imprimante n\'apparaît pas dans la boîte normale ?'}
              </span>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {lang === 'ar'
                  ? 'نافذة الطباعة العادية للهاتف تبحث فقط عن طابعات الواي فاي (Wi-Fi/AirPrint). طابعات الباركود والتذاكر الحرارية في المغرب تعمل ببروتوكول البلوتوث المباشر (Bluetooth ESC/POS). للطباعة منها بسلاسة، اختر إحدى الطريقتين التاليتين:'
                  : 'La boîte d\'impression standard cherche le Wi-Fi (AirPrint/Mopria). Les imprimantes thermiques mobiles fonctionnent en Bluetooth direct (ESC/POS). Utilisez l\'une des méthodes ci-dessous :'}
              </p>
            </div>
          </div>

          {/* Method 1: Web Bluetooth Direct Print */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
              <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bluetooth className="w-4 h-4 text-blue-600" />
                <span>{lang === 'ar' ? 'الطريقة الأولى: الطباعة المباشرة عبر البلوتوث (Google Chrome)' : 'Méthode 1 : Impression Bluetooth Directe'}</span>
              </h4>
            </div>

            <ol className={`space-y-2 list-decimal ${lang === 'ar' ? 'pr-4' : 'pl-4'} text-xs leading-relaxed`}>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">
                  {lang === 'ar' ? 'تشغيل البلوتوث واقتران الطابعة:' : 'Activer le Bluetooth : '}
                </strong>{' '}
                {lang === 'ar' 
                  ? 'شغّل الطابعة، وادخل لإعدادات الهاتف > البلوتوث، وقم بالاقتران بها (رمز PIN غالباً هو 0000 أو 1234).'
                  : 'Allumez l\'imprimante, allez dans Réglages > Bluetooth, et associez-la (code PIN souvent 0000 ou 1234).'}
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">
                  {lang === 'ar' ? 'الطباعة من التطبيق:' : 'Imprimer depuis Tajer : '}
                </strong>{' '}
                {lang === 'ar'
                  ? 'اضغط في الفاتورة على زر "طباعة عبر البلوتوث"، ستفتح لك قائمة بالأجهزة، اختر اسم طابعتك (مثلاً MPT-II أو POS-58 أو Bluetooth Printer) وستطبع فوراً.'
                  : 'Cliquez sur "Imprimer via Bluetooth", sélectionnez votre imprimante dans la liste Chrome et le ticket sort immédiatement.'}
              </li>
              <li>
                <span className="text-teal-700 dark:text-teal-400 font-semibold">
                  {lang === 'ar' 
                    ? '✓ ميزة: تطبع النصوص العربية بخط عربي واضح وكامل وبدون أي برامج إضافية.' 
                    : '✓ Avantage : Impression directe sans application supplémentaire.'}
                </span>
              </li>
            </ol>

            {/* Test Bluetooth Print Button */}
            <div className="pt-2">
              <button
                onClick={handleTestPrint}
                disabled={testingBt}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {testingBt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الاتصال بالطابعة وإرسال التذكرة...' : 'Connexion en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تجربة الاتصال وطباعة تذكرة اختبار الآن' : 'Tester la connexion & Imprimer un ticket test'}</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Method 2: RawBT App (Best & Most Stable for Android) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
              <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'ar' ? 'الطريقة الثانية: تطبيق RawBT المجاني (الأفضل والأضمن لهواتف أندرويد)' : 'Méthode 2 : Application gratuite RawBT (Android)'}</span>
              </h4>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {lang === 'ar'
                ? 'تطبيق RawBT هو المشغل الرسمي الأول والمعتمد لطابعات البلوتوث الحرارية في المغرب والعالم. بمجرد تثبيته وربطه بالطابعة مرة واحدة، يمكنك الطباعة بنقرة زر واحدة من تطبيق تاجر.'
                : 'RawBT est le pilote universel le plus stable pour les imprimantes thermiques sur Android. Une fois configuré, vous imprimez en un seul clic.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تحميل تطبيق RawBT من متجر Google Play' : 'Télécharger RawBT sur Google Play'}</span>
              </a>
            </div>
          </div>

          {/* Troubleshooting Checklist */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>{lang === 'ar' ? 'نصائح مهمة إذا لم تظهر الطابعة في البلوتوث:' : 'Conseils si l\'imprimante ne se connecte pas :'}</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  <strong>{lang === 'ar' ? 'تفعيل الموقع (GPS / Localisation):' : 'Activer la Localisation (GPS) :'}</strong>{' '}
                  {lang === 'ar' 
                    ? 'في هواتف أندرويد، تشترط جوجل تشغيل خاصية "الموقع" لكي يسمح المتصفح باكتشاف أجهزة البلوتوث القريبة.'
                    : 'Sur Android, Google exige que la localisation soit activée pour autoriser la recherche Bluetooth.'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  <strong>{lang === 'ar' ? 'شحن البطارية واتجاه الورق:' : 'Batterie et sens du papier :'}</strong>{' '}
                  {lang === 'ar'
                    ? 'تأكد من شحن بطارية الطابعة جيداً، وأن رول الورق الحراري موضوع بحيث يكون الوجه الأبيض اللامع للأعلى نحو الرأس الحراري.'
                    : 'Assurez-vous que la batterie est chargée et le papier inséré du bon côté.'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  <strong>{lang === 'ar' ? 'إعادة تشغيل البلوتوث:' : 'Redémarrage Bluetooth :'}</strong>{' '}
                  {lang === 'ar'
                    ? 'إذا كانت الطابعة مقترنة بجهاز هاتف آخر في نفس الوقت، أوقف البلوتوث في الجهاز الآخر لأن أغلب الطابعات ترتبط بجهاز واحد فقط في نفس الوقت.'
                    : 'Déconnectez l\'autre téléphone si l\'imprimante est déjà appairée ailleurs.'}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            {lang === 'ar' ? 'فهمت، حسناً' : 'J\'ai compris'}
          </button>
        </div>

      </div>
    </div>
  );
};
