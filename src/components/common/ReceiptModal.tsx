import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Share2, 
  X, 
  CheckCircle2, 
  Copy,
  Receipt,
  MessageCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatMAD } from '../../i18n/locales';
import { generateSaleWhatsAppText, openWhatsApp } from '../../services/whatsapp';

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
    // Detect if we are inside a sandboxed iframe (like AI Studio preview), where direct window.print() is blocked by browser policies
    const isIframe = window.self !== window.top;
    
    if (isIframe) {
      try {
        const printContent = document.getElementById('printable-receipt');
        if (!printContent) {
          window.print();
          return;
        }

        const newWin = window.open('', '_blank');
        if (!newWin) {
          const alertMsg = lang === 'ar' 
            ? '⚠️ يرجى تفعيل "السماح بالنوافذ المنبثقة" (Popups) في متصفحك لفتح الفاتورة في صفحة جديدة صالحة للطباعة.'
            : lang === 'fr'
            ? '⚠️ Veuillez activer les fenêtres surgissantes (Popups) dans votre navigateur pour ouvrir la facture sur une nouvelle page imprimable.'
            : '⚠️ Please enable popups in your browser to open and print the invoice.';
          alert(alertMsg);
          return;
        }

        newWin.document.write(`
          <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
            <head>
              <title>${lang === 'ar' ? 'طباعة فاتورة رقم' : 'Impression Facture N°'} ${activeSaleReceipt.invoice_number}</title>
              <!-- Load Tailwind Play CDN to render every layout utility class flawlessly -->
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
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
                
                * {
                  box-sizing: border-box !important;
                }
                
                body {
                  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
                  margin: 0 !important;
                  padding: ${paperFormat === 'A4' ? '20px' : '0'} !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Override and lock precise dimensions based on the chosen format */
                #printable-receipt {
                  transform: none !important;
                  position: relative !important;
                  top: 0 !important;
                  left: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  background: #ffffff !important;
                  
                  /* Dimension constraints */
                  width: ${paperFormat === '58mm' ? '58mm' : paperFormat === '80mm' ? '80mm' : '794px'} !important;
                  max-width: ${paperFormat === '58mm' ? '58mm' : paperFormat === '80mm' ? '80mm' : '794px'} !important;
                  min-height: ${paperFormat === 'A4' ? '1123px' : 'auto'} !important;
                  
                  /* Exact padding settings */
                  padding: ${paperFormat === 'A4' ? '12mm' : paperFormat === '80mm' ? '4mm' : '3mm'} !important;
                }

                /* Ensure tables inside thermal print are clear and concise */
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                }

                @media print {
                  body {
                    padding: 0 !important;
                    background: #ffffff !important;
                  }
                  #printable-receipt {
                    border: none !important;
                    box-shadow: none !important;
                  }
                  @page {
                    size: ${paperFormat === '58mm' ? '58mm 210mm' : paperFormat === '80mm' ? '80mm 297mm' : 'A4'};
                    margin: 0 !important;
                  }
                }
              </style>
            </head>
            <body>
              ${printContent.outerHTML}
              <script>
                // We wait for Tailwind to compile and style the elements before printing
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                      window.close();
                    }, 800);
                  }, 800);
                };
              </script>
            </body>
          </html>
        `);
        newWin.document.close();
      } catch (e) {
        console.error('Bypass printing failed, executing window.print()', e);
        window.print();
      }
    } else {
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

        {/* Paper Format Selector Tabs */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex justify-center gap-1.5 no-print">
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
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          {lang === 'ar' ? 'شركة' : 'Société'} {business.name}
                        </p>
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
                            ? `أي ما يعادل: ${formatMAD(activeSaleReceipt.total, 'ar')} (بما فيها جميع الرسوم والضرائب)` 
                            : `Soit un montant de : ${formatMAD(activeSaleReceipt.total, 'fr')} (Toutes Taxes Comprises)`}
                        </span>
                      </p>
                    </div>

                    {/* Totals Breakdown */}
                    <div className="w-64 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600 font-semibold">{lang === 'ar' ? 'المجموع الفرعي (HT)' : 'Sous-total (HT)'}</span>
                        <span className="font-mono font-bold text-slate-800">{formatMAD(activeSaleReceipt.subtotal, lang)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600 font-semibold">{lang === 'ar' ? 'الضريبة' : 'TVA'} (TVA {business.defaultTaxRate ?? 20}%)</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatMAD(activeSaleReceipt.tax_total || (activeSaleReceipt.subtotal * ((business.defaultTaxRate ?? 20) / 100)), lang)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-black text-slate-900 border-t border-slate-300">
                        <span>{lang === 'ar' ? 'الإجمالي الصافي (TTC)' : 'Total Net (TTC)'}</span>
                        <span style={{ color: business.invoiceColor || '#C02626' }} className="font-mono text-base font-bold">{formatMAD(activeSaleReceipt.total, lang)}</span>
                      </div>
                    </div>
                  </div>

                   {/* Cachet & Signature with authentic blue company stamp */}
                  <div className="mt-8 flex justify-start">
                    <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                      <p className="text-xs font-semibold text-slate-700 underline">{lang === 'ar' ? 'الختم والتوقيع (Cachet & Signature)' : 'Cachet & Signature'}</p>
                      <div className="relative inline-block w-48 h-28 mt-2">
                        {business.stamp ? (
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
                            <text x="100" y="81" textAnchor="middle" fontSize="6.5" fill="currentColor">
                              ICE: {business.ice || '002938475000031'}
                            </text>
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
                </div>

                {/* Legal Footer Bottom Line */}
                <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono">
                  {business.a4Footer && (
                    <div className="font-sans font-medium text-slate-800 mb-2 text-[11px] text-center border-b border-dashed border-slate-200 pb-2 whitespace-pre-line">
                      {business.a4Footer}
                    </div>
                  )}
                  <p className="font-semibold text-slate-700">
                    {lang === 'ar' ? 'شركة' : 'Société'} {business.name} {business.capital ? `| ${lang === 'ar' ? 'رأس المال :' : 'Capital :'} ${business.capital}` : ''} | {lang === 'ar' ? 'الهاتف :' : 'Tél :'} {business.phone} | {business.address} - {business.city}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    ICE: {business.ice || '002938475000031'} | RC: {business.rc || '173273'} | IF: {business.ifNumber || '68923589'} | TP: {business.patente || '46491839'} {business.bankInfo ? `| RIB : ${business.bankInfo}` : ''}
                  </p>
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
                <div className="text-[11px] text-slate-600">{business.activity}</div>
                <div className="text-[11px] mt-0.5">{business.address} - {business.city}</div>
                <div className="text-[11px] font-bold mt-0.5">{lang === 'ar' ? 'الهاتف:' : 'Tél:'} {business.phone}</div>
                
                {/* Moroccan Fiscal Identification */}
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.2">
                  {business.ice && <div>ICE: {business.ice}</div>}
                  {business.ifNumber && <div>IF: {business.ifNumber} | RC: {business.rc || '-'}</div>}
                  {business.patente && <div>Patente: {business.patente}</div>}
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

        {/* Actions Bar (Print, WhatsApp) */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 no-print justify-center items-center">
          <button
            onClick={handleWhatsApp}
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95"
            title={lang === 'ar' ? 'إرسال عبر واتساب' : 'Envoyer via WhatsApp'}
          >
            <MessageCircle className="w-4 h-4 fill-current shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ar' ? 'إرسال واتساب' : 'WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-95 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ar' ? 'طباعة الفاتورة' : 'Imprimer'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
