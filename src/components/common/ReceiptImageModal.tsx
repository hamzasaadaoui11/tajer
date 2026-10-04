import React, { useState } from 'react';
import { X, Download, Share2, FileText, CheckCircle2 } from 'lucide-react';
import { Language } from '../../i18n/locales';
import { thermalPrinterService } from '../../services/thermalPrinter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string;
  canvas?: HTMLCanvasElement | null;
  paperFormat?: '58mm' | '80mm';
  title: string;
  lang?: Language;
}

export const ReceiptImageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  imageDataUrl,
  canvas,
  paperFormat = '80mm',
  title,
  lang = 'ar'
}) => {
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [downloadedPng, setDownloadedPng] = useState(false);

  if (!isOpen || !imageDataUrl) return null;

  const handleDownloadPdf = () => {
    if (canvas) {
      thermalPrinterService.downloadReceiptPdf(canvas, title || 'ticket', paperFormat);
      setDownloadedPdf(true);
      setTimeout(() => setDownloadedPdf(false), 2500);
    } else {
      handleDownloadImage();
    }
  };

  const handleDownloadImage = () => {
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `${title || 'facture'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadedPng(true);
    setTimeout(() => setDownloadedPng(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${title || 'ticket'}.png`, { type: 'image/png' });
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
      } catch {
        // user cancelled or failed
      }
    } else {
      handleDownloadPdf();
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150 my-auto`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تذكرة الفاتورة الحرارية' : 'Ticket Thermique'}
              </h3>
              <p className="text-xs text-slate-500">
                {paperFormat === '58mm'
                  ? (lang === 'ar' ? 'مقاس حراري دقيق: 58mm (384px)' : 'Format exact: 58mm')
                  : (lang === 'ar' ? 'مقاس حراري دقيق: 80mm (576px)' : 'Format exact: 80mm')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview Container (Clean, soft backdrop, exact ticket borders) */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center max-h-[55vh] overflow-y-auto">
          <div className="shadow-2xl border border-slate-700 rounded-sm overflow-hidden bg-white max-w-full">
            <img 
              src={imageDataUrl} 
              alt={title} 
              className="max-h-[44vh] w-auto object-contain block mx-auto" 
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 text-center font-medium">
            {lang === 'ar' ? '✅ المقاس والتنسيق مطابق 100% للتذكرة الأصلية' : '✅ Format et mise en page conformes à 100%'}
          </p>
        </div>

        {/* Actions: Download PDF, Download Image, Share */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          {/* Primary Action: Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
          >
            {downloadedPdf ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>
              {downloadedPdf
                ? (lang === 'ar' ? 'تم تنزيل ملف PDF!' : 'PDF téléchargé !')
                : (lang === 'ar' ? `تحميل كملف PDF (${paperFormat})` : `Télécharger PDF (${paperFormat})`)}
            </span>
          </button>

          <div className="flex gap-2">
            {/* Secondary Action: Download PNG */}
            <button
              onClick={handleDownloadImage}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
            >
              {downloadedPng ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{lang === 'ar' ? 'صورة (PNG)' : 'Image (PNG)'}</span>
            </button>

            {/* Share via Apps */}
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'مشاركة' : 'Partager'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
