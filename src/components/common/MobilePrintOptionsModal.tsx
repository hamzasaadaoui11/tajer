import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  Bluetooth, 
  Smartphone, 
  Share2, 
  Globe, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { thermalPrinterService } from '../../services/thermalPrinter';
import { Language } from '../../i18n/locales';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDirectBluetooth?: () => void;
  onSystemPrint: () => void;
  onShareImage: () => void;
  lang?: Language;
  paperFormat?: '58mm' | '80mm' | 'A4';
  setPaperFormat?: (format: '58mm' | '80mm' | 'A4') => void;
  isBtPrinting?: boolean;
}

export const MobilePrintOptionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onDirectBluetooth,
  onSystemPrint,
  onShareImage,
  lang = 'ar',
  paperFormat = '80mm',
  setPaperFormat,
  isBtPrinting = false
}) => {
  const [sharing, setSharing] = useState(false);
  const isStandalone = thermalPrinterService.isStandalone();
  const isAndroid = thermalPrinterService.isAndroid();
  const isWebBtSupported = thermalPrinterService.isWebBluetoothSupported();

  if (!isOpen) return null;

  const handleShareClick = async () => {
    setSharing(true);
    try {
      await onShareImage();
    } finally {
      setSharing(false);
    }
  };

  const handleOpenChrome = () => {
    thermalPrinterService.openInChrome();
  };

  const modalContent = (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center tajer-modal-backdrop p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        className={`w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${
          lang === 'ar' ? 'text-right' : 'text-left'
        } animate-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'طرق الطباعة من الهاتف' : 'Impression Mobile'}</span>
                {isStandalone && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                    {lang === 'ar' ? 'تطبيق الشاشة الرئيسية' : 'App Installée (PWA)'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar' 
                  ? 'اختر الطريقة الأنسب لك للطباعة إلى طابعتك الحرارية' 
                  : 'Choisissez la méthode d\'impression adaptée à votre imprimante'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Format Quick Selector */}
        {setPaperFormat && (
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'مقاس التذكرة (Format):' : 'Format du ticket:'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaperFormat('80mm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  paperFormat === '80mm'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {lang === 'ar' ? 'حراري 80mm' : '80mm'}
              </button>
              <button
                onClick={() => setPaperFormat('58mm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  paperFormat === '58mm'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {lang === 'ar' ? 'حراري 58mm' : '58mm'}
              </button>
              <button
                onClick={() => setPaperFormat('A4')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  paperFormat === 'A4'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                A4
              </button>
            </div>
          </div>
        )}

        {/* Options List */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">

          {/* Option 2: Web Bluetooth Direct Print (If supported or on desktop/Chrome) */}
          {onDirectBluetooth && isWebBtSupported && (
            <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'الاتصال المباشر (Web Bluetooth)' : 'Impression Bluetooth Directe'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' 
                      ? 'اقتران مباشر عبر المتصفح بطابعات البلوتوث المعتمدة (GATT)' 
                      : 'Connexion directe sans application via le protocole Web Bluetooth'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onDirectBluetooth();
                  onClose();
                }}
                disabled={isBtPrinting}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isBtPrinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bluetooth className="w-4 h-4" />
                )}
                <span>{lang === 'ar' ? 'البحث عن الطابعة والطباعة المباشرة' : 'Rechercher et imprimer via Bluetooth'}</span>
              </button>
            </div>
          )}

          {/* Option 3: Phone System Print / PDF */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'طباعة عبر نظام الهاتف (System Print / PDF)' : 'Gestionnaire d\'impression du système'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ar' 
                    ? 'الطباعة عبر نافذة الهاتف الرسمية مع إمكانية حفظ الفاتورة كملف PDF' 
                    : 'Utilise la boîte d\'impression Android/iOS ou enregistre en PDF'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onSystemPrint();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'فتح نافذة طباعة الهاتف' : 'Ouvrir l\'impression système'}</span>
            </button>
          </div>

          {/* Option 4: Share as Image (PNG) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'مشاركة الفاتورة كـ صورة (Image PNG)' : 'Partager comme image'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ar' 
                    ? 'إرسال صورة التذكرة واضحة عبر البلوتوث، الواتساب، أو تطبيقات الطباعة الأخرى' 
                    : 'Partage l\'image du ticket vers WhatsApp, Bluetooth ou autres applications'}
                </p>
              </div>
            </div>

            <button
              onClick={handleShareClick}
              disabled={sharing}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>{lang === 'ar' ? 'مشاركة صورة الفاتورة الآن' : 'Partager l\'image du ticket'}</span>
            </button>
          </div>

          {/* Option 5: Open in Google Chrome (if inside Standalone PWA on Android) */}
          {isAndroid && isStandalone && (
            <div className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {lang === 'ar' ? 'ترغب بالاقتران عبر Web Bluetooth؟' : 'Ouvrir dans Chrome ?'}
                </span>
              </div>
              <button
                onClick={handleOpenChrome}
                className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                <span>{lang === 'ar' ? 'فتح في متصفح Chrome' : 'Dans Chrome'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {lang === 'ar' ? `مقاس الورق المحدد: ${paperFormat}` : `Format: ${paperFormat}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
