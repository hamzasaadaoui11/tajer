import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Share2, 
  X, 
  CheckCircle2, 
  Copy,
  Receipt,
  MessageCircle,
  Bluetooth,
  Smartphone,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatMAD } from '../../i18n/locales';
import { generateSaleWhatsAppText, openWhatsApp } from '../../services/whatsapp';
import { thermalPrinterService } from '../../services/thermalPrinter';
import { ThermalPrinterGuideModal } from './ThermalPrinterGuideModal';
import { MobilePrintOptionsModal } from './MobilePrintOptionsModal';

// Arabic number to words converter for Moroccan Dirhams (MAD)
export function convertNumberToArabicWords(amount: number): string {
  if (amount === 0) return 'صفر درهم';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (t > 0 || u > 0) {
      if (result !== '') result += ' و ';
      
      if (t === 0) {
        result += units[u];
      } else if (t === 1) {
        result += units[10 + u];
      } else {
        if (u > 0) {
          result += units[u] + ' و ' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  function convertInteger(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    // Millions
    const millions = Math.floor(n / 1000000);
    const millionsRemainder = n % 1000000;
    if (millions > 0) {
      if (millions === 1) result += 'مليون';
      else if (millions === 2) result += 'مليونان';
      else if (millions >= 3 && millions <= 10) result += convertGroup(millions) + ' ملايين';
      else result += convertGroup(millions) + ' مليون';
    }

    // Thousands
    const thousands = Math.floor(millionsRemainder / 1000);
    const remainder = millionsRemainder % 1000;
    if (thousands > 0) {
      if (result !== '') result += ' و ';
      if (thousands === 1) result += 'ألف';
      else if (thousands === 2) result += 'ألفان';
      else if (thousands >= 3 && thousands <= 10) result += convertGroup(thousands) + ' آلاف';
      else result += convertGroup(thousands) + ' ألف';
    }

    // Hundreds, Tens, Units
    if (remainder > 0) {
      if (result !== '') result += ' و ';
      result += convertGroup(remainder);
    }

    return result;
  }

  let text = convertInteger(integerPart);
  
  // Append Currency
  if (integerPart === 1) text += ' درهم';
  else if (integerPart === 2) text += ' درهمان';
  else if (integerPart >= 3 && integerPart <= 10) text += ' دراهم';
  else text += ' درهم';

  // Append Centimes if any
  if (decimalPart > 0) {
    let centimesText = '';
    if (decimalPart === 1) centimesText = 'سنتيم واحد';
    else if (decimalPart === 2) centimesText = 'سنتيمان';
    else if (decimalPart >= 3 && decimalPart <= 10) centimesText = convertGroup(decimalPart) + ' سنتيمات';
    else centimesText = convertGroup(decimalPart) + ' سنتيم';
    
    text += ' و ' + centimesText;
  }

  return text;
}

export function convertNumberToFrenchWords(amount: number): string {
  if (amount === 0) return 'Zéro dirham';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    if (n < 20) return units[n];
    const u = n % 10;
    const t = Math.floor(n / 10);
    
    if (t === 7) {
      return 'soixante-' + (u === 1 ? 'et-onze' : units[10 + u]);
    }
    if (t === 9) {
      return 'quatre-vingt-' + units[10 + u];
    }
    
    if (u === 0) return tens[t];
    if (u === 1) return tens[t] + '-et-un';
    return tens[t] + '-' + units[u];
  }

  function convertInteger(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    // Millions
    const millions = Math.floor(n / 1000000);
    const millionsRemainder = n % 1000000;
    if (millions > 0) {
      result += convertInteger(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
    }

    // Thousands
    const thousands = Math.floor(millionsRemainder / 1000);
    const remainder = millionsRemainder % 1000;
    if (thousands > 0) {
      if (thousands === 1) {
        result += 'mille ';
      } else {
        result += convertInteger(thousands) + ' mille ';
      }
    }

    // Hundreds, Tens, Units
    if (remainder > 0) {
      const h = Math.floor(remainder / 100);
      const tu = remainder % 100;
      
      if (h > 0) {
        if (h === 1) {
          result += 'cent ';
        } else {
          result += units[h] + ' cent' + (tu === 0 ? 's' : '') + ' ';
        }
      }
      
      if (tu > 0) {
        result += convertGroup(tu);
      }
    }

    return result.trim();
  }

  let text = convertInteger(integerPart);
  text += ' dirham' + (integerPart > 1 ? 's' : '');

  if (decimalPart > 0) {
    text += ' et ' + convertGroup(decimalPart) + ' centime' + (decimalPart > 1 ? 's' : '');
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const ReceiptModal: React.FC = () => {
  const {
    activeSaleReceipt,
    setActiveSaleReceipt,
    business,
    printSettings,
    updatePrintSettings,
    t,
    lang
  } = useApp();

  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm' | 'A4'>(printSettings.paperSize || '80mm');
  const [copied, setCopied] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState(0.45);

  // Mobile & Bluetooth Printing State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [btSuccess, setBtSuccess] = useState(false);

  const isMobile = thermalPrinterService.isMobile();
  const isAndroid = thermalPrinterService.isAndroid();
  const isStandalone = thermalPrinterService.isStandalone();
  const isWebBtSupported = thermalPrinterService.isWebBluetoothSupported();

  const handleBluetoothPrint = async () => {
    const printEl = document.getElementById('printable-receipt');
    if (!printEl) return;

    setIsBtPrinting(true);
    setBtSuccess(false);
    try {
      const res = await thermalPrinterService.printReceiptViaBluetooth(
        printEl,
        paperFormat === '58mm' ? '58mm' : '80mm'
      );
      if (res.success) {
        setBtSuccess(true);
        setTimeout(() => setBtSuccess(false), 3000);
      } else {
        // If failed due to lack of Web Bluetooth (like in standalone PWA or non-supported browser),
        // gracefully present the Mobile Print Options Modal rather than a dead-end alert!
        if (isMobile || isStandalone || !isWebBtSupported) {
          setIsMobileOptionsOpen(true);
        } else {
          alert(res.error || (lang === 'ar' ? 'تعذر الاتصال بالطابعة عبر البلوتوث' : 'Erreur de connexion Bluetooth'));
        }
      }
    } catch (e: any) {
      if (isMobile || isStandalone) {
        setIsMobileOptionsOpen(true);
      } else {
        alert(e?.message || (lang === 'ar' ? 'حدث خطأ أثناء الاتصال' : 'Erreur'));
      }
    } finally {
      setIsBtPrinting(false);
    }
  };

  const handleRawBTPrint = async () => {
    const printEl = document.getElementById('printable-receipt');
    if (!printEl) return;
    try {
      await thermalPrinterService.printReceiptViaRawBT(
        printEl,
        paperFormat === '58mm' ? '58mm' : '80mm'
      );
    } catch (e: any) {
      alert(e?.message || 'Erreur RawBT');
    }
  };

  const handleShareImage = async () => {
    const printEl = document.getElementById('printable-receipt');
    if (!printEl || !activeSaleReceipt) return;
    const invNum = activeSaleReceipt.invoice_number || activeSaleReceipt.id.slice(-6);
    await thermalPrinterService.shareReceiptAsImage(
      printEl,
      lang === 'ar' ? `فاتورة-${invNum}` : `Facture-${invNum}`,
      paperFormat === '58mm' ? '58mm' : '80mm'
    );
  };

  /**
   * Smart Thermal Print trigger:
   * If in Home Screen PWA or without Web Bluetooth on Android:
   * Uses RawBT direct intent which prints 100% directly without browser restrictions!
   */
  const handleThermalPrint = async () => {
    if (isStandalone && isAndroid) {
      // Direct print without opening Chrome
      await handleRawBTPrint();
      return;
    }

    if (!isWebBtSupported) {
      setIsMobileOptionsOpen(true);
      return;
    }

    await handleBluetoothPrint();
  };

  // Auto-calculate scale on mobile/desktop so the full A4 sheet fits 100% without horizontal scroll or zooming
  useEffect(() => {
    if (paperFormat !== 'A4') return;
    const calculateScale = () => {
      const el = previewContainerRef.current;
      const clientW = el ? el.clientWidth : 0;
      const availableWidth = clientW > 40 ? clientW - 24 : Math.min(window.innerWidth - 32, 794);
      if (availableWidth > 0) {
        // Standard A4 width at 96 DPI is 794px
        const scale = Math.min(1, Math.max(0.25, availableWidth / 794));
        setA4Scale(scale);
      }
    };
    calculateScale();
    const t1 = setTimeout(calculateScale, 50);
    const t2 = setTimeout(calculateScale, 200);
    window.addEventListener('resize', calculateScale);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calculateScale);
    };
  }, [paperFormat]);

  if (!activeSaleReceipt) return null;

  const handlePrint = () => {
    try {
      const printContent = document.getElementById('printable-receipt');
      if (!printContent) {
        window.print();
        return;
      }

      // Clone node to strip inline transform / scale from screen preview
      const cloned = printContent.cloneNode(true) as HTMLElement;
      cloned.style.transform = 'none';
      cloned.style.transformOrigin = 'unset';
      cloned.style.position = 'relative';
      cloned.style.top = '0';
      cloned.style.left = '0';
      cloned.style.right = '0';
      cloned.style.bottom = '0';
      cloned.style.boxShadow = 'none';
      cloned.style.border = 'none';
      cloned.style.margin = '0 auto';

      if (paperFormat === 'A4') {
        cloned.style.width = '100%';
        cloned.style.maxWidth = '100%';
        cloned.style.minHeight = 'auto';
        cloned.style.padding = '0';
      } else {
        cloned.style.width = paperFormat === '58mm' ? '58mm' : '80mm';
        cloned.style.maxWidth = paperFormat === '58mm' ? '58mm' : '80mm';
        cloned.style.minHeight = 'auto';
        cloned.style.padding = paperFormat === '80mm' ? '4mm' : '3mm';
      }

      const newWin = window.open('', '_blank');
      if (!newWin) {
        const alertMsg = lang === 'ar' 
          ? '⚠️ يرجى تفعيل "السماح بالنوافذ المنبثقة" (Popups) في متصفحك لفتح الفاتورة في صفحة جديدة صالحة للطباعة.'
          : lang === 'fr'
          ? '⚠️ Veuillez activer les fenêtres surgissantes (Popups) dans votre navigateur pour ouvrir la facture sur une nouvelle page imprimable.'
          : '⚠️ Please enable popups in your browser to open and print the invoice.';
        alert(alertMsg);
        window.print();
        return;
      }

      const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      newWin.document.open();
      newWin.document.write(`<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${lang === 'ar' ? 'طباعة فاتورة رقم' : 'Impression Facture N°'} ${activeSaleReceipt.invoice_number}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Cairo', 'sans-serif'],
            }
          }
        }
      }
    </script>
    ${headStyles}
    <style>
      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
      }
      @page {
        size: ${paperFormat === '58mm' ? '58mm auto' : paperFormat === '80mm' ? '80mm auto' : 'A4 portrait'};
        margin: ${paperFormat === 'A4' ? '10mm 8mm' : '0'};
      }
      @media print {
        .no-print {
          display: none !important;
        }
        body {
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
        }
        #printable-receipt {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
      }
      @media screen {
        body {
          background: #f1f5f9 !important;
          padding: 20px 10px !important;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .print-toolbar {
          background: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          font-family: 'Cairo', sans-serif;
          z-index: 100;
        }
        .print-btn {
          background: #0d9488;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .close-btn {
          background: #334155;
          color: #cbd5e1;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
        }
        #printable-receipt {
          background: #ffffff !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
          border: 1px solid #e2e8f0 !important;
          padding: ${paperFormat === 'A4' ? '12mm 10mm' : paperFormat === '80mm' ? '4mm' : '3mm'} !important;
          width: ${paperFormat === 'A4' ? '210mm' : paperFormat === '80mm' ? '80mm' : '58mm'} !important;
          max-width: 100% !important;
        }
      }
      #printable-receipt {
        transform: none !important;
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
        box-sizing: border-box !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
    </style>
  </head>
  <body>
    <div class="print-toolbar no-print">
      <span style="font-weight: bold; font-size: 13px;">
        📄 ${lang === 'ar' ? 'معاينة الفاتورة' : 'Aperçu Facture'} (${activeSaleReceipt.invoice_number})
      </span>
      <button onclick="window.print()" class="print-btn">
        🖨️ ${lang === 'ar' ? 'طباعة الآن' : 'Imprimer maintenant'}
      </button>
      <button onclick="window.close()" class="close-btn">
        ✕ ${lang === 'ar' ? 'إغلاق' : 'Fermer'}
      </button>
    </div>
    ${cloned.outerHTML}
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 450);
      };
      window.onafterprint = function() {
        setTimeout(function() {
          try { window.close(); } catch(e) {}
        }, 1200);
      };
    </script>
  </body>
</html>`);
      newWin.document.close();
    } catch (e) {
      console.error('Window print error, falling back to window.print()', e);
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const text = generateSaleWhatsAppText(activeSaleReceipt, business);
    const phone = activeSaleReceipt.customer_name ? '' : ''; // customer phone if available
    openWhatsApp(phone, text);
  };

  const handleCopy = () => {
    const text = generateSaleWhatsAppText(activeSaleReceipt, business);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Injected Print Stylesheet for Thermal and Standard A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: ${paperFormat === '58mm' ? '58mm' : paperFormat === '80mm' ? '80mm' : '210mm'} !important;
            max-width: ${paperFormat === '58mm' ? '58mm' : paperFormat === '80mm' ? '80mm' : '210mm'} !important;
            min-height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
            margin: 0 !important;
            padding: ${paperFormat === 'A4' ? '15mm' : '2mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: ${paperFormat === 'A4' ? 'sans-serif' : "'Courier New', Courier, monospace"} !important;
          }
          @page {
            size: ${paperFormat === '58mm' ? '58mm 210mm' : paperFormat === '80mm' ? '80mm 297mm' : 'A4'};
            margin: 0 !important;
          }
        }
      `}</style>

      <div className={`w-full ${paperFormat === 'A4' ? 'max-w-3xl' : 'max-w-md'} bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150 my-auto transition-all`}>
        
        {/* Modal Top Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 no-print">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Receipt className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'فاتورة المبيعات' : 'Facture de Vente'} ({activeSaleReceipt.invoice_number})</span>
          </div>
          <button
            onClick={() => setActiveSaleReceipt(null)}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Format Selector Tabs & Mobile Helper */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 no-print">
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            <button
              onClick={() => setPaperFormat('80mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                paperFormat === '80mm'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {lang === 'ar' ? 'حراري 80mm' : 'Thermique 80mm'}
            </button>
            <button
              onClick={() => setPaperFormat('58mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                paperFormat === '58mm'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {lang === 'ar' ? 'حراري 58mm (محمول)' : 'Thermique 58mm (portable)'}
            </button>
            <button
              onClick={() => setPaperFormat('A4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                paperFormat === 'A4'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {lang === 'ar' ? 'ورق قياسي A4' : 'Standard A4'}
            </button>
          </div>

          {/* Quick Phone Printer Help Button */}
          {paperFormat !== 'A4' && (
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer mx-auto sm:mx-0"
              title={lang === 'ar' ? 'دليل ربط الطابعة بالهاتف وحل المشاكل' : 'Guide connexion téléphone'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'ar' ? 'ربط الطابعة بالهاتف؟' : 'Aide Bluetooth'}</span>
            </button>
          )}
        </div>

        {/* The Printable Invoice Container */}
        <div
          ref={previewContainerRef}
          className="p-2 sm:p-4 overflow-x-hidden overflow-y-auto max-h-[72vh] bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center"
        >
          {paperFormat === 'A4' ? (
            /* Standard A4 Scaled Preview Container */
            <div
              style={{
                width: `${Math.round(794 * a4Scale)}px`,
                height: `${Math.round(1123 * a4Scale)}px`,
              }}
              className="relative overflow-visible shrink-0 mx-auto transition-all shadow-2xl rounded-sm"
            >
              <div
                id="printable-receipt"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${a4Scale})`,
                  transformOrigin: 'top left',
                }}
                className="bg-white p-12 text-slate-900 font-sans absolute top-0 left-0 flex flex-col justify-between box-border border border-slate-300 shadow-sm"
              >
                <div>
                  {/* Top Header: Business Name Right & FACTURE Left */}
                  <div style={{ borderColor: business.invoiceColor || '#C02626' }} className="flex justify-between items-start pb-6 border-b-2">
                    <div className={`${lang === 'ar' ? 'text-right' : 'text-left'} flex items-start gap-4`}>
                      {business.logo && (
                        <img src={business.logo} alt="Company Logo" className="w-16 h-16 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1 shrink-0" />
                      )}
                      <div>
                        <h1 style={{ color: business.invoiceColor || '#C02626' }} className="text-3xl font-black tracking-tight">
                          {business.name}
                        </h1>
                        {business.activity ? (
                          <p className="text-xs font-semibold text-slate-500 mt-1">
                            {business.activity}
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {business.address} - {business.city}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{lang === 'ar' ? 'الهاتف :' : 'Tél :'} {business.phone}</p>
                      </div>
                    </div>

                    <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                      <h2 style={{ color: business.invoiceColor || '#C02626' }} className="text-3xl font-black tracking-wider">
                        {lang === 'ar' ? 'فاتورة بيع' : 'Facture de Vente'}
                      </h2>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                        {lang === 'ar' ? 'رقم الفاتورة :' : 'N° Facture :'} {activeSaleReceipt.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {lang === 'ar' ? 'التاريخ :' : 'Date :'} {new Date(activeSaleReceipt.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Client Box: ADRESSÉ À / موجه إلى */}
                  <div className="flex justify-start my-6">
                    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-3.5 w-72 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {lang === 'ar' ? 'فاتورة موجهة إلى :' : 'Facturé à :'}
                      </p>
                      <p className="text-base font-black text-slate-900 mt-0.5">
                        {activeSaleReceipt.customer_name || (lang === 'ar' ? 'زبون عام (Comptoir)' : 'Client Comptoir')}
                      </p>
                    </div>
                  </div>

                  {/* Items Table with Red Header */}
                  <div className="my-6">
                    <table className={`w-full border-collapse border border-slate-200 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <thead>
                        <tr style={{ backgroundColor: business.invoiceColor || '#C02626' }} className="text-white text-xs font-extrabold tracking-wider">
                          <th className={`py-2.5 px-4 whitespace-nowrap ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'السلعة / البيان' : 'Désignation / Article'}</th>
                          <th className="py-2.5 px-4 text-center w-24 whitespace-nowrap">{lang === 'ar' ? 'الكمية' : 'Qté'}</th>
                          <th className={`py-2.5 px-4 w-32 whitespace-nowrap ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'ثمن الوحدة' : 'Prix Unitaire'}</th>
                          <th className={`py-2.5 px-4 w-32 whitespace-nowrap ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {activeSaleReceipt.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className={`py-3 px-4 font-bold text-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{item.product_name}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                            <td className={`py-3 px-4 font-mono ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{formatMAD(item.unit_price, lang)}</td>
                            <td className={`py-3 px-4 font-mono font-bold text-slate-900 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{formatMAD(item.total, lang)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Notes Row */}
                  <div className="flex justify-between items-start gap-8 mt-6">
                    {/* Arrêté la presente facture a la somme de */}
                    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-3.5 max-w-sm ${lang === 'ar' ? 'text-right' : 'text-left'} flex-1`}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {lang === 'ar' ? 'صُفّيت هذه الفاتورة عند المبلغ الإجمالي التالي :' : 'Arrêtée la présente facture à la somme de :'}
                      </p>
                      <p className="text-xs font-bold text-slate-800 mt-1.5 leading-relaxed">
                        <span className="text-teal-700 font-black">
                          {lang === 'ar' ? convertNumberToArabicWords(activeSaleReceipt.total) : convertNumberToFrenchWords(activeSaleReceipt.total)}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] block mt-1">
                          {lang === 'ar' 
                            ? `أي ما يعادل: ${formatMAD(activeSaleReceipt.total, 'ar')}${business.taxEnabled ? ' (بما فيها جميع الرسوم والضرائب)' : ''}` 
                            : `Soit un montant de : ${formatMAD(activeSaleReceipt.total, 'fr')}${business.taxEnabled ? ' (Toutes Taxes Comprises)' : ''}`}
                        </span>
                      </p>
                    </div>

                    {/* Totals Breakdown */}
                    <div className="w-64 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600 font-semibold">
                          {business.taxEnabled 
                            ? (lang === 'ar' ? 'المجموع الفرعي (HT)' : 'Sous-total (HT)')
                            : (lang === 'ar' ? 'المجموع الفرعي :' : 'Sous-total :')}
                        </span>
                        <span className="font-mono font-bold text-slate-800">{formatMAD(activeSaleReceipt.subtotal, lang)}</span>
                      </div>
                      {activeSaleReceipt.discount > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                          <span className="font-semibold">{lang === 'ar' ? 'الخصم المطبق :' : 'Remise :'}</span>
                          <span className="font-mono font-bold">-{formatMAD(activeSaleReceipt.discount, lang)}</span>
                        </div>
                      )}
                      {business.taxEnabled && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-semibold">{lang === 'ar' ? 'الضريبة' : 'TVA'} (TVA {business.defaultTaxRate ?? 20}%)</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatMAD(activeSaleReceipt.tax_total || 0, lang)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 text-sm font-black text-slate-900 border-t border-slate-300">
                        <span>
                          {business.taxEnabled 
                            ? (lang === 'ar' ? 'الإجمالي الصافي (TTC)' : 'Total Net (TTC)')
                            : (lang === 'ar' ? 'المجموع الإجمالي الصافي :' : 'Total Net :')}
                        </span>
                        <span style={{ color: business.invoiceColor || '#C02626' }} className="font-mono text-base font-bold">{formatMAD(activeSaleReceipt.total, lang)}</span>
                      </div>
                    </div>
                  </div>

                    {/* Cachet & Signature with authentic blue company stamp */}
                    {(business.stampEnabled !== false && business.stamp !== 'DISABLED') && (
                      <div className="mt-8 flex justify-start">
                        <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                          <p className="text-xs font-semibold text-slate-700 underline">{lang === 'ar' ? 'الختم والتوقيع (Cachet & Signature)' : 'Cachet & Signature'}</p>
                          <div className="relative inline-block w-48 h-28 mt-2">
                            {business.stamp && business.stamp !== 'DISABLED' ? (
                              <img
                                src={business.stamp}
                                alt="Company Stamp"
                                className={`w-full h-full object-contain ${lang === 'ar' ? 'object-right' : 'object-left'}`}
                              />
                            ) : (
                              <svg viewBox="0 0 200 120" className="w-full h-full text-blue-700/85">
                                <ellipse cx="100" cy="60" rx="80" ry="44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 2" opacity="0.8" />
                                <ellipse cx="100" cy="60" rx="74" ry="38" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
                                <text x="100" y="44" textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor">
                                  {business.name.toUpperCase()}
                                </text>
                                <text x="100" y="58" textAnchor="middle" fontSize="7.5" fill="currentColor">
                                  {business.activity || (lang === 'ar' ? 'تجارة عامة' : 'Commerce Général')}
                                </text>
                                <text x="100" y="70" textAnchor="middle" fontSize="7" fill="currentColor">
                                  {lang === 'ar' ? 'هاتف : ' : 'Tél : '}{business.phone}
                                </text>
                                {business.ice?.trim() && (
                                  <text x="100" y="81" textAnchor="middle" fontSize="6.5" fill="currentColor">
                                    ICE: {business.ice.trim()}
                                  </text>
                                )}
                                <path
                                  d="M 40 85 C 60 40, 80 90, 110 50 C 130 30, 150 70, 175 45 C 190 35, 170 85, 140 75 C 100 65, 80 85, 55 95"
                                  fill="none"
                                  stroke="#1d4ed8"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity="0.9"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Legal Footer Bottom Line */}
                <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono">
                  {business.a4Footer && (
                    <div className="font-sans font-medium text-slate-800 mb-2 text-[11px] text-center border-b border-dashed border-slate-200 pb-2 whitespace-pre-line">
                      {business.a4Footer}
                    </div>
                  )}
                  <p className="font-semibold text-slate-700">
                    {[
                      business.name ? business.name : null,
                      business.capital?.trim() ? `${lang === 'ar' ? 'رأس المال :' : 'Capital :'} ${business.capital.trim()}` : null,
                      business.phone?.trim() ? `${lang === 'ar' ? 'الهاتف :' : 'Tél :'} ${business.phone.trim()}` : null,
                      [business.address?.trim(), business.city?.trim()].filter(Boolean).join(' - ') || null,
                    ].filter(Boolean).join(' | ')}
                  </p>

                  {/* Legal Identifiers (ONLY display identifiers that user actually entered) */}
                  {(() => {
                    const legalItems: string[] = [];
                    if (business.ice?.trim()) legalItems.push(`ICE: ${business.ice.trim()}`);
                    if (business.rc?.trim()) legalItems.push(`RC: ${business.rc.trim()}`);
                    if (business.ifNumber?.trim()) legalItems.push(`IF: ${business.ifNumber.trim()}`);
                    if (business.patente?.trim()) legalItems.push(`TP: ${business.patente.trim()}`);
                    if (business.cnss?.trim()) legalItems.push(`CNSS: ${business.cnss.trim()}`);
                    if (business.bankInfo?.trim()) legalItems.push(`RIB: ${business.bankInfo.trim()}`);
                    if (legalItems.length === 0) return null;
                    return (
                      <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                        {legalItems.join(' | ')}
                      </p>
                    );
                  })()}

                  <div className={`flex ${lang === 'ar' ? 'justify-start' : 'justify-end'} text-[9px] text-slate-400 mt-1`}>
                    <span>{lang === 'ar' ? 'صفحة 1/1' : 'Page 1/1'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Continuous Thermal Receipt Engine */
            <div
              id="printable-receipt"
              style={{
                width: paperFormat === '58mm' ? '58mm' : '80mm',
                maxWidth: paperFormat === '58mm' ? '58mm' : '80mm',
              }}
              className={`bg-white text-slate-900 transition-all select-text box-border mx-auto h-fit shadow-md ${
                paperFormat === '58mm'
                  ? 'p-3 font-mono text-[11px] leading-tight border border-slate-200'
                  : 'p-4 font-mono text-xs leading-normal border border-slate-200'
              }`}
            >
              {/* Header / Store details */}
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="font-extrabold text-base tracking-tight">{business.name}</h2>
                <div className="text-[11px] mt-0.5">{business.address} - {business.city}</div>
                <div className="text-[11px] font-bold mt-0.5">{lang === 'ar' ? 'الهاتف:' : 'Tél:'} {business.phone}</div>
                
                {/* Moroccan Fiscal Identification (clean without defaults) */}
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.2">
                  {business.ice?.trim() && <div>ICE: {business.ice.trim()}</div>}
                  {[
                    business.ifNumber?.trim() ? `IF: ${business.ifNumber.trim()}` : null, 
                    business.rc?.trim() ? `RC: ${business.rc.trim()}` : null
                  ].filter(Boolean).length > 0 && (
                    <div>
                      {[
                        business.ifNumber?.trim() ? `IF: ${business.ifNumber.trim()}` : null, 
                        business.rc?.trim() ? `RC: ${business.rc.trim()}` : null
                      ].filter(Boolean).join(' | ')}
                    </div>
                  )}
                  {business.patente?.trim() && <div>Patente: {business.patente.trim()}</div>}
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'رقم الفاتورة:' : 'N° Facture:'}</span>
                  <span className="font-bold">{activeSaleReceipt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                  <span>{new Date(activeSaleReceipt.created_at).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                </div>
                {activeSaleReceipt.customer_name && (
                  <div className="flex justify-between font-bold">
                    <span>{lang === 'ar' ? 'العميل:' : 'Client:'}</span>
                    <span>{activeSaleReceipt.customer_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'المستخدم / الكاشير:' : 'Caissier:'}</span>
                  <span>{activeSaleReceipt.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'طريقة الدفع:' : 'Paiement:'}</span>
                  <span className="font-bold">
                    {activeSaleReceipt.payment_method === 'CASH' 
                      ? (lang === 'ar' ? 'نقداً (كاش)' : 'Espèces') 
                      : activeSaleReceipt.payment_method === 'CREDIT' 
                      ? (lang === 'ar' ? 'دين / كريدي' : 'Crédit') 
                      : activeSaleReceipt.payment_method === 'CARD' 
                      ? (lang === 'ar' ? 'بطاقة بنكية' : 'Carte Bancaire') 
                      : activeSaleReceipt.payment_method === 'TRANSFER' 
                      ? (lang === 'ar' ? 'تحويل بنكي' : 'Virement') 
                      : activeSaleReceipt.payment_method === 'CHEQUE' 
                      ? (lang === 'ar' ? 'شيك' : 'Chèque') 
                      : activeSaleReceipt.payment_method}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-600">
                      <th className={`py-1 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'السلعة' : 'Désignation'}</th>
                      <th className="text-center py-1">{lang === 'ar' ? 'الكمية' : 'Qté'}</th>
                      <th className={`py-1 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {activeSaleReceipt.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className={`py-1 font-medium leading-tight ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                          {item.product_name}
                          <div className="text-[9px] text-slate-500 font-sans">
                            {formatMAD(item.unit_price, lang)} {lang === 'ar' ? 'لقطعة' : '/pc'}
                          </div>
                        </td>
                        <td className="text-center py-1 font-bold">{item.quantity}</td>
                        <td className={`py-1 font-bold ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{formatMAD(item.total, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>{lang === 'ar' ? 'المجموع الفرعي:' : 'Sous-total:'}</span>
                  <span>{formatMAD(activeSaleReceipt.subtotal, lang)}</span>
                </div>
                {activeSaleReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{lang === 'ar' ? 'الخصم المطبق:' : 'Remise:'}</span>
                    <span>-{formatMAD(activeSaleReceipt.discount, lang)}</span>
                  </div>
                )}
                {business.taxEnabled && (
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>{lang === 'ar' ? 'ضريبة القيمة المضافة (TVA 20%):' : 'TVA 20% (incluse):'}</span>
                    <span>{formatMAD(activeSaleReceipt.tax_total, lang)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>{lang === 'ar' ? 'الإجمالي الصافي:' : 'Total Net:'}</span>
                  <span className="text-teal-900">{formatMAD(activeSaleReceipt.total, lang)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{lang === 'ar' ? 'المدفوع:' : 'Payé:'}</span>
                  <span>{formatMAD(activeSaleReceipt.amount_paid, lang)}</span>
                </div>
                {activeSaleReceipt.amount_due > 0 && (
                  <div className="flex justify-between font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                    <span>{lang === 'ar' ? 'المتبقي في الذمة (كريدي):' : 'Reste à payer (Crédit):'}</span>
                    <span>{formatMAD(activeSaleReceipt.amount_due, lang)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-500 leading-tight">
                <div>{business.receiptFooter || (lang === 'ar' ? 'شكراً لزيارتكم! نتشرف بخدمتكم دائماً' : 'Merci de votre visite !')}</div>
                <div className="mt-1 text-[9px] text-slate-400">{lang === 'ar' ? 'تطبيق تاجر لإدارة المبيعات والمتاجر بالمغرب' : 'Application Tajer pour la gestion au Maroc'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Bar (Print, Bluetooth, WhatsApp) */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap sm:flex-nowrap gap-2 no-print justify-center items-center">
          <button
            onClick={handleWhatsApp}
            className="flex-1 min-w-[120px] h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95"
            title={lang === 'ar' ? 'إرسال عبر واتساب' : 'Envoyer via WhatsApp'}
          >
            <MessageCircle className="w-4 h-4 fill-current shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ar' ? 'إرسال واتساب' : 'WhatsApp'}</span>
          </button>

          {/* Thermal / Bluetooth Direct Print Button (Available for 58mm & 80mm) */}
          {paperFormat !== 'A4' && (
            <button
              onClick={handleThermalPrint}
              disabled={isBtPrinting}
              className={`flex-1 min-w-[120px] h-11 flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50 ${
                btSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : isStandalone && isAndroid
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={
                isStandalone
                  ? (lang === 'ar' ? 'طباعة تذكرة حرارية لتطبيق الشاشة الرئيسية' : 'Imprimer Ticket PWA')
                  : (lang === 'ar' ? 'طباعة مباشرة عبر البلوتوث للهاتف المحمول أو الكمبيوتر' : 'Impression Bluetooth Directe')
              }
            >
              {isBtPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : btSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : isStandalone ? (
                <Smartphone className="w-4 h-4 shrink-0" />
              ) : (
                <Bluetooth className="w-4 h-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isBtPrinting 
                  ? (lang === 'ar' ? 'جاري الاتصال...' : 'Connexion...') 
                  : btSuccess 
                  ? (lang === 'ar' ? 'تمت الطباعة!' : 'Imprimé !')
                  : isStandalone
                  ? (lang === 'ar' ? 'طباعة تذكرة' : 'Imprimer')
                  : (lang === 'ar' ? 'طباعة بلوتوث' : 'Bluetooth')}
              </span>
            </button>
          )}

          {/* Quick Mobile Print Options (RawBT, System, Share, Chrome) */}
          {paperFormat !== 'A4' && (isMobile || isStandalone) && (
            <button
              onClick={() => setIsMobileOptionsOpen(true)}
              className="h-11 px-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs shadow-xs active:scale-95 transition cursor-pointer shrink-0"
              title={lang === 'ar' ? 'خيارات الطباعة في الهاتف وتطبيق الشاشة الرئيسية' : 'Options d\'impression mobile'}
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline text-[11px]">{lang === 'ar' ? 'خيارات الهاتف' : 'Options'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex-1 min-w-[110px] h-11 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-95 transition cursor-pointer"
            title={lang === 'ar' ? 'طباعة عادية عبر نافذة النظام' : 'Impression Standard'}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{paperFormat === 'A4' ? (lang === 'ar' ? 'طباعة الفاتورة' : 'Imprimer') : (lang === 'ar' ? 'طباعة عادية' : 'Système')}</span>
          </button>
        </div>

      </div>

      {/* Mobile Printing Options Modal */}
      <MobilePrintOptionsModal
        isOpen={isMobileOptionsOpen}
        onClose={() => setIsMobileOptionsOpen(false)}
        onDirectBluetooth={isWebBtSupported ? handleBluetoothPrint : undefined}
        onRawBTPrint={handleRawBTPrint}
        onSystemPrint={handlePrint}
        onShareImage={handleShareImage}
        lang={lang}
        paperFormat={paperFormat as any}
        isBtPrinting={isBtPrinting}
      />

      {/* Mobile Thermal Printer Guide & Troubleshooter Modal */}
      <ThermalPrinterGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />
    </div>
  );
};
