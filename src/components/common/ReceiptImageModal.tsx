import React, { useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { Language } from '../../i18n/locales';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string;
  title: string;
  lang?: Language;
}

export const ReceiptImageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  imageDataUrl,
  title,
  lang = 'ar'
}) => {
  if (!isOpen || !imageDataUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `${title || 'facture'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'facture.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text: title,
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.warn('File share error:', err);
      }

      try {
        await navigator.share({
          title,
          text: title,
          url: window.location.href,
        });
      } catch (err) {
        // user cancelled or failed
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950 p-3 sm:p-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150 my-auto`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-950/30 dark:to-teal-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'صورة الفاتورة جاهزة' : 'Image du ticket prête'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'قم بحفظ الصورة أو مشاركتها مع العميل' : 'Enregistrez ou partagez l\'image'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950/50 flex flex-col items-center justify-center max-h-[50vh] overflow-y-auto">
          <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 max-w-full">
            <img src={imageDataUrl} alt={title} className="max-h-[40vh] w-auto object-contain rounded-xl" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
            {lang === 'ar' ? '💡 نصيحة: يمكنك الضغط مطولاً على الصورة لحفظها مباشرة في هاتفك' : '💡 Astuce : Appuyez longuement sur l\'image pour l\'enregistrer'}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تحميل الصورة في الهاتف' : 'Télécharger l\'image'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مشاركة عبر واتساب / التطبيقات' : 'Partager'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
