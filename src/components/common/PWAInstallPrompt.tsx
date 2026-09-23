import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const { lang } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed on Android / iOS)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowAndroidModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div className="bg-teal-900 text-white px-3 py-2 text-xs flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2 min-w-0">
          <Smartphone className="w-4 h-4 text-teal-300 shrink-0" />
          <span className="text-xs leading-snug">
            {lang === 'ar' ? (
              <>تثبيت <strong>تطبيق تاجر</strong> للعمل بدون إنترنت</>
            ) : (
              <>Installer <strong>l'application Tajer</strong> pour travailler hors-ligne</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تثبيت الآن' : 'Installer'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-teal-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'ar' ? 'تثبيت تاجر على iPhone / iPad' : 'Installer Tajer sur iPhone / iPad'}
            </h3>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'ar' ? (
                <>
                  1. اضغط على زر المشاركة <strong>Share (المربع مع السهم)</strong> في شريط Safari.<br />
                  2. انزل إلى الأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.<br />
                  3. سيظهر تطبيق تاجر مباشرة على شاشة هاتفك مثل أي تطبيق أصلي!
                </>
              ) : (
                <>
                  1. Appuyez sur le bouton <strong>Partager (carré avec flèche)</strong> dans Safari.<br />
                  2. Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.<br />
                  3. L'application Tajer sera accessible directement sur votre écran d'accueil !
                </>
              )}
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 cursor-pointer"
            >
              {lang === 'ar' ? 'حسناً، فهمت' : 'Compris'}
            </button>
          </div>
        </div>
      )}

      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-teal-600" />
              <span>{lang === 'ar' ? 'تثبيت التطبيق على أندرويد' : 'Installer l\'application sur Android'}</span>
            </h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {lang === 'ar' ? 'لإضافة التطبيق إلى هاتفك :' : 'Pour ajouter l\'application à votre téléphone :'}
              </p>
              <ol className={`list-decimal space-y-1.5 ${lang === 'ar' ? 'pr-4' : 'pl-4'}`}>
                <li>
                  {lang === 'ar' 
                    ? <>اضغط على <strong>النقاط الثلاث (⋮)</strong> في أعلى يمين المتصفح.</> 
                    : <>Appuyez sur les <strong>trois points (⋮)</strong> en haut à droite du navigateur.</>}
                </li>
                <li>
                  {lang === 'ar'
                    ? <>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Ajouter à l'écran d'accueil).</>
                    : <>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</>}
                </li>
                <li>
                  {lang === 'ar'
                    ? <>اضغط على <strong>«تثبيت» (Installer)</strong> للتأكيد.</>
                    : <>Appuyez sur <strong>« Installer »</strong> pour confirmer.</>}
                </li>
              </ol>
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200">
                {lang === 'ar'
                  ? '💡 ملاحظة: إذا فتحت الرابط من تطبيق واتساب، اضغط على (⋮) أولاً واختر "الفتح في متصفح Chrome" (Ouvrir dans Chrome).'
                  : '💡 Note : Si vous êtes dans WhatsApp, appuyez d\'abord sur (⋮) puis "Ouvrir dans Chrome".'}
              </div>
            </div>
            <button
              onClick={() => setShowAndroidModal(false)}
              className="mt-5 w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 cursor-pointer"
            >
              {lang === 'ar' ? 'حسناً، فهمت' : 'Compris'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

