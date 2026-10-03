import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Truck,
  MessageCircle,
  FileText,
  Bluetooth,
  Smartphone,
  HelpCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Purchase, Supplier } from '../../types';
import { formatMAD } from '../../i18n/locales';
import { openWhatsApp } from '../../services/whatsapp';
import { convertNumberToArabicWords, convertNumberToFrenchWords } from '../common/ReceiptModal';
import { thermalPrinterService } from '../../services/thermalPrinter';
import { ThermalPrinterGuideModal } from '../common/ThermalPrinterGuideModal';
import { MobilePrintOptionsModal } from '../common/MobilePrintOptionsModal';
import { ReceiptImageModal } from '../common/ReceiptImageModal';

interface PurchaseReceiptModalProps {
  purchase: Purchase | null;
  supplier?: Supplier;
  onClose: () => void;
}

export const PurchaseReceiptModal: React.FC<PurchaseReceiptModalProps> = ({
  purchase,
  supplier,
  onClose
}) => {
  const { business, lang } = useApp();
  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm' | 'A4'>('80mm');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [a4Scale, setA4Scale] = useState(0.45);

  // Bluetooth & Mobile Printing State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [btSuccess, setBtSuccess] = useState(false);

  const isMobile = thermalPrinterService.isMobile();
  const isAndroid = thermalPrinterService.isAndroid();
  const isStandalone = thermalPrinterService.isStandalone();
  const isWebBtSupported = thermalPrinterService.isWebBluetoothSupported();

  const handleBluetoothPrint = async () => {
    const printEl = document.getElementById('printable-purchase-receipt');
    if (!printEl) return;

    if (isMobile || isStandalone || !isWebBtSupported) {
      setIsMobileOptionsOpen(true);
      return;
    }

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
        setIsMobileOptionsOpen(true);
      }
    } catch (e: any) {
      setIsMobileOptionsOpen(true);
    } finally {
      setIsBtPrinting(false);
    }
  };

  const handleShareImage = async () => {
    const printEl = document.getElementById('printable-purchase-receipt');
    if (!printEl || !purchase) return;
    const invNum = purchase.invoice_number || purchase.id.slice(-6);
    try {
      const canvas = await thermalPrinterService.renderElementToCanvas(
        printEl,
        paperFormat === '58mm' ? '58mm' : '80mm'
      );
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewImageUrl(dataUrl);
    } catch (e: any) {
      alert(e?.message || (lang === 'ar' ? 'فشل توليد صورة الفاتورة' : 'Erreur'));
    }
  };

  const handleThermalPrint = async () => {
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

  if (!purchase) return null;

  const handlePrint = () => {
    try {
      const printContent = document.getElementById('printable-purchase-receipt');
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
      cloned.style.boxSizing = 'border-box';

      if (paperFormat === 'A4') {
        cloned.style.width = '210mm';
        cloned.style.maxWidth = '210mm';
        cloned.style.minHeight = '297mm';
        cloned.style.height = '297mm';
        cloned.style.padding = '14mm 16mm';
        cloned.style.display = 'flex';
        cloned.style.flexDirection = 'column';
        cloned.style.justifyContent = 'space-between';
        cloned.style.background = '#ffffff';
      } else {
        cloned.style.width = '80mm';
        cloned.style.maxWidth = '80mm';
        cloned.style.minHeight = 'auto';
        cloned.style.padding = '4mm';
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

      // Extract all compiled rules from document.styleSheets
      let allCssRules = '';
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            if (sheet.cssRules) {
              for (const rule of Array.from(sheet.cssRules)) {
                allCssRules += rule.cssText + '\n';
              }
            }
          } catch (e) {
            if (sheet.href) {
              allCssRules += `@import url("${sheet.href}");\n`;
            }
          }
        }
      } catch (e) {
        console.warn('Could not extract styleSheets', e);
      }

      const headTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      newWin.document.open();
      newWin.document.write(`<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${lang === 'ar' ? 'طباعة فاتورة شراء رقم' : 'Impression Bon Commande N°'} ${purchase.invoice_number}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    ${headTags}
    <style>
      ${allCssRules}
    </style>
    <style>
      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        font-family: 'Cairo', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
      }
      @page {
        size: ${paperFormat === '58mm' ? '58mm 210mm' : paperFormat === '80mm' ? '80mm 297mm' : 'A4'};
        margin: 0 !important;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          width: ${paperFormat === 'A4' ? '210mm' : paperFormat === '58mm' ? '58mm' : '80mm'} !important;
        }
        #printable-purchase-receipt {
          width: ${paperFormat === 'A4' ? '210mm' : paperFormat === '58mm' ? '58mm' : '80mm'} !important;
          max-width: ${paperFormat === 'A4' ? '210mm' : paperFormat === '58mm' ? '58mm' : '80mm'} !important;
          min-height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
          height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
          padding: ${paperFormat === 'A4' ? '14mm 16mm' : paperFormat === '80mm' ? '4mm' : '3mm'} !important;
          display: ${paperFormat === 'A4' ? 'flex' : 'block'} !important;
          flex-direction: ${paperFormat === 'A4' ? 'column' : 'initial'} !important;
          justify-content: ${paperFormat === 'A4' ? 'space-between' : 'initial'} !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
        }
      }
      @media screen {
        body {
          background: #f1f5f9 !important;
          padding: 24px 0 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
        }
        .print-toolbar {
          background: #0f172a;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
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
        #printable-purchase-receipt {
          background: #ffffff !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12) !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 2px;
          padding: ${paperFormat === 'A4' ? '14mm 16mm' : '4mm'} !important;
          width: ${paperFormat === 'A4' ? '210mm' : '80mm'} !important;
          min-height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
          height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
          display: ${paperFormat === 'A4' ? 'flex' : 'block'} !important;
          flex-direction: ${paperFormat === 'A4' ? 'column' : 'initial'} !important;
          justify-content: ${paperFormat === 'A4' ? 'space-between' : 'initial'} !important;
          box-sizing: border-box !important;
        }
      }
      #printable-purchase-receipt {
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
        📄 ${lang === 'ar' ? 'معاينة وصل الشراء' : 'Aperçu Bon Réception'} (${purchase.invoice_number})
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
      function triggerPrint() {
        window.print();
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(triggerPrint, 300);
        });
      } else {
        window.onload = function() {
          setTimeout(triggerPrint, 500);
        };
      }
      window.onafterprint = function() {
        setTimeout(function() {
          try { window.close(); } catch(e) {}
        }, 1500);
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

  const handleShareWhatsApp = () => {
    const lines = [
      `*BON DE RÉCEPTION / ACHAT N° ${purchase.invoice_number}*`,
      `المتجر: ${business.name}`,
      `المورد: ${purchase.supplier_name}`,
      `التاريخ: ${new Date(purchase.created_at).toLocaleDateString('ar-MA')}`,
      `-----------------------------`,
      ...purchase.items.map(it => `• ${it.product_name} × ${it.quantity} = ${formatMAD(it.total)}`),
      `-----------------------------`,
      `*الإجمالي: ${formatMAD(purchase.total)}*`,
      `المدفوع: ${formatMAD(purchase.amount_paid)}`,
      purchase.amount_due > 0 ? `المتبقي في الذمة: ${formatMAD(purchase.amount_due)}` : `الحالة: مدفوع بالكامل`,
      `طريقة الدفع: ${purchase.payment_method}`
    ];
    openWhatsApp(supplier?.phone || '', lines.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-2 sm:p-4 overflow-y-auto">
      {/* Injected Print Stylesheet for A4 and Thermal */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-purchase-receipt, #printable-purchase-receipt * {
            visibility: visible !important;
          }
          #printable-purchase-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: ${paperFormat === '80mm' ? '80mm' : '210mm'} !important;
            max-width: ${paperFormat === '80mm' ? '80mm' : '210mm'} !important;
            min-height: ${paperFormat === 'A4' ? '297mm' : 'auto'} !important;
            margin: 0 !important;
            padding: ${paperFormat === 'A4' ? '15mm' : '3mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: ${paperFormat === 'A4' ? 'sans-serif' : "'Courier New', Courier, monospace"} !important;
          }
          @page {
            size: ${paperFormat === '80mm' ? '80mm auto' : 'A4'};
            margin: 0 !important;
          }
        }
      `}</style>

      <div className={`w-full ${paperFormat === 'A4' ? 'max-w-3xl' : 'max-w-md'} bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150 my-auto transition-all`}>
        
        {/* Modal Top Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 no-print">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Truck className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'فاتورة شراء وتوريد' : "Bon d'achat & d'approvisionnement"} ({purchase.invoice_number})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Format Selector Tabs & Help */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            <button
              onClick={() => setPaperFormat('80mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                paperFormat === '80mm'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حراري 80mm' : 'Thermique 80mm'}</span>
            </button>
            <button
              onClick={() => setPaperFormat('58mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                paperFormat === '58mm'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حراري 58mm' : 'Thermique 58mm'}</span>
            </button>
            <button
              onClick={() => setPaperFormat('A4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                paperFormat === 'A4'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'ar' ? 'ورق قياسي A4' : 'Standard A4'}</span>
            </button>
          </div>

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

        {/* Printable Container */}
        <div
          ref={previewContainerRef}
          className="p-2 sm:p-4 overflow-x-hidden overflow-y-auto max-h-[72vh] bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center"
        >
          {paperFormat === 'A4' ? (
            /* Scaled Standard A4 Sheet */
            <div
              style={{
                width: `${Math.round(794 * a4Scale)}px`,
                height: `${Math.round(1123 * a4Scale)}px`,
              }}
              className="relative overflow-visible shrink-0 mx-auto transition-all shadow-2xl rounded-sm"
            >
              <div
                id="printable-purchase-receipt"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  transform: `scale(${a4Scale})`,
                  transformOrigin: 'top left',
                }}
                className={`bg-white p-12 text-slate-900 font-sans absolute top-0 left-0 flex flex-col justify-between box-border border border-slate-300 shadow-sm ${lang === 'ar' ? 'text-right' : 'text-left'}`}
              >
                <div>
                  {/* Top Header: Business Name Right & BON DE RECEPTION Left */}
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
                        {(business.address?.trim() || business.city?.trim()) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {[business.address?.trim(), business.city?.trim()].filter(Boolean).join(' - ')}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 font-mono">{lang === 'ar' ? 'الهاتف :' : 'Tél :'} {business.phone}</p>
                      </div>
                    </div>

                    <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                      <h2 style={{ color: business.invoiceColor || '#C02626' }} className="text-3xl font-black tracking-wider">
                        {lang === 'ar' ? 'وصل استلام ومشتريات' : "Bon d'achat & de réception"}
                      </h2>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {lang === 'ar' ? 'فاتورة شراء ودخول المخزون' : "Bon d'achat et entrée stock"}
                      </p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">
                        {lang === 'ar' ? 'رقم الفاتورة :' : 'N° Facture :'} {purchase.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {lang === 'ar' ? 'التاريخ :' : 'Date :'} {new Date(purchase.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')} {new Date(purchase.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Parties Details (Fournisseur & Acheteur) */}
                  <div className={`grid grid-cols-2 gap-6 my-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    {/* Fournisseur */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div style={{ color: business.invoiceColor || '#C02626' }} className="text-[10px] font-bold tracking-wider mb-1">
                        {lang === 'ar' ? 'المورد / الموزع :' : 'Fournisseur / Distributeur :'}
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {purchase.supplier_name}
                      </div>
                      {supplier?.phone && (
                        <div className="text-xs text-slate-600 font-mono mt-0.5">
                          {lang === 'ar' ? 'الهاتف :' : 'Tél :'} {supplier.phone}
                        </div>
                      )}
                      {supplier?.ice && (
                        <div className="text-xs text-slate-600 font-mono mt-0.5">
                          ICE : {supplier.ice}
                        </div>
                      )}
                      {supplier?.address && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {supplier.address} {supplier.city ? `- ${supplier.city}` : ''}
                        </div>
                      )}
                    </div>

                    {/* Acheteur / Magasin */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-1">
                        {lang === 'ar' ? 'المستلم / المشتري :' : 'Destinataire / Acheteur :'}
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {business.name}
                      </div>
                      {(business.address?.trim() || business.city?.trim()) && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          {[business.address?.trim(), business.city?.trim()].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      <div className="text-xs text-slate-600 font-mono mt-0.5">
                        {[
                          business.ice?.trim() ? `ICE: ${business.ice.trim()}` : null,
                          business.phone?.trim() ? `${lang === 'ar' ? 'الهاتف :' : 'Tél :'} ${business.phone.trim()}` : null,
                        ].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                  </div>

                  {/* Articles Table */}
                  <table className={`w-full border-collapse my-6 border border-slate-200 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead>
                      <tr style={{ backgroundColor: business.invoiceColor || '#C02626' }} className="text-white text-xs font-extrabold tracking-wider">
                        <th className={`py-2.5 px-3 rounded-r whitespace-nowrap ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'السلعة / البيان' : 'Désignation / Article'}</th>
                        <th className="py-2.5 px-3 text-center w-24 whitespace-nowrap">{lang === 'ar' ? 'الكمية' : 'Qté'}</th>
                        <th className={`py-2.5 px-3 w-32 whitespace-nowrap ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'ثمن الشراء' : 'Prix d\'achat'}</th>
                        <th className={`py-2.5 px-3 rounded-l w-32 whitespace-nowrap ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {purchase.items.map((it, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : ''}>
                          <td className={`py-2 px-3 font-semibold text-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            {it.product_name}
                          </td>
                          <td className="py-2 px-3 text-center font-bold font-mono text-slate-800">
                            {it.quantity}
                          </td>
                          <td className={`py-2 px-3 font-mono text-slate-700 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                            {formatMAD(it.unit_cost, lang)}
                          </td>
                          <td className={`py-2 px-3 font-mono font-bold text-slate-900 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                            {formatMAD(it.total, lang)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals & Payment Summary */}
                  <div className="flex justify-between items-start mt-6 gap-6">
                    <div className={`w-1/2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {/* Arrêté la presente facture a la somme de */}
                      <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {lang === 'ar' ? 'صُفّيت هذه الفاتورة عند المبلغ الإجمالي التالي :' : 'Arrêté le présent bon d\'achat à la somme de :'}
                        </p>
                        <p className="text-xs font-bold text-slate-800 mt-1.5 leading-relaxed">
                          <span className="text-teal-700 font-black">
                            {lang === 'ar' ? convertNumberToArabicWords(purchase.total) : convertNumberToFrenchWords(purchase.total)}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] block mt-1">
                            {lang === 'ar' 
                              ? `أي ما يعادل: ${formatMAD(purchase.total, 'ar')}${business.taxEnabled ? ' (بما فيها جميع الرسوم والضرائب)' : ''}` 
                              : `Soit un montant de : ${formatMAD(purchase.total, 'fr')}${business.taxEnabled ? ' (Toutes Taxes Comprises)' : ''}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className={`w-5/12 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between text-slate-600">
                          <span>{lang === 'ar' ? 'المجموع الإجمالي :' : 'Total Brut :'}</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatMAD(purchase.subtotal, lang)}
                          </span>
                        </div>
                        {purchase.discount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>{lang === 'ar' ? 'الخصم / التخفيض :' : 'Remise :'}</span>
                            <span className="font-mono font-bold">
                              -{formatMAD(purchase.discount, lang)}
                            </span>
                          </div>
                        )}
                        {purchase.extra_fees > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>{lang === 'ar' ? 'مصاريف إضافية (شحن) :' : 'Frais de transport :'}</span>
                            <span className="font-mono font-bold">
                              +{formatMAD(purchase.extra_fees, lang)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 text-sm font-black text-slate-900 border-t border-slate-300">
                          <span>{lang === 'ar' ? 'الإجمالي الصافي :' : 'Total Net :'}</span>
                          <span style={{ color: business.invoiceColor || '#C02626' }} className="font-mono text-base font-bold">
                            {formatMAD(purchase.total, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures & Stamp */}
                  <div className={`grid grid-cols-2 gap-8 mt-12 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="border border-dashed border-slate-300 p-4 rounded-xl min-h-[90px] flex flex-col justify-between">
                      <p className="text-xs font-semibold text-slate-700 underline">
                        {lang === 'ar' ? 'توقيع وموافقة المورد :' : 'Signature & accord fournisseur :'}
                      </p>
                      <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'بموجب الاتفاق والتسليم المتبادل' : 'Selon accord et livraison mutuelle'}</p>
                    </div>

                    <div className="border border-dashed border-slate-300 p-4 rounded-xl min-h-[90px] flex flex-col justify-between relative">
                      <p className="text-xs font-semibold text-slate-700 underline">
                        {lang === 'ar' ? 'توقيع وختم الاستلام :' : 'Signature & cachet de réception :'}
                      </p>
                      {/* Stamp SVG */}
                      {(business.stampEnabled !== false && business.stamp !== 'DISABLED') && (
                        <div className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} bottom-2 w-32 h-20 opacity-80 pointer-events-none`}>
                          {business.stamp ? (
                            <img
                              src={business.stamp}
                              alt="Company Stamp"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <svg viewBox="0 0 200 120" className="w-full h-full text-blue-700">
                              <ellipse cx="100" cy="60" rx="80" ry="44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 2" opacity="0.8" />
                              <ellipse cx="100" cy="60" rx="74" ry="38" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
                              <text x="100" y="44" textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor">
                                {business.name.slice(0, 20).toUpperCase()}
                              </text>
                              <text x="100" y="58" textAnchor="middle" fontSize="7.5" fill="currentColor">
                                {lang === 'ar' ? 'استلام مطابق' : 'Réception Conforme'}
                              </text>
                              <text x="100" y="72" textAnchor="middle" fontSize="7" fill="currentColor">
                                {lang === 'ar' ? 'الهاتف:' : 'Tél:'} {business.phone}
                              </text>
                              {business.ice?.trim() && (
                                <text x="100" y="83" textAnchor="middle" fontSize="6.5" fill="currentColor">
                                  ICE: {business.ice.trim()}
                                </text>
                              )}
                            </svg>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'تم فحص البضاعة واستلامها بالمحل' : 'Marchandise vérifiée et reçue'}</p>
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
                  <p className="font-semibold text-slate-700 uppercase">
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
            /* 80mm Thermal Receipt */
            <div
              id="printable-purchase-receipt"
              style={{ width: paperFormat === '58mm' ? '58mm' : '80mm', maxWidth: paperFormat === '58mm' ? '58mm' : '80mm' }}
              className="bg-white text-slate-900 p-3 font-mono text-xs leading-normal border border-slate-200 shadow-md box-border mx-auto"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="font-extrabold text-base tracking-tight">{business.name}</h2>
                <div className="text-[11px] text-slate-600">{lang === 'ar' ? 'وصل شراء وتوريد بضاعة' : 'Bon d\'achat et réception'}</div>
                <div className="text-[11px] mt-0.5">{business.address} - {business.city}</div>
                <div className="text-[11px] font-bold mt-0.5">{lang === 'ar' ? 'الهاتف:' : 'Tél:'} {business.phone}</div>
                {business.ice && <div className="text-[10px] text-slate-500 mt-0.5">ICE: {business.ice}</div>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'رقم الفاتورة:' : 'N° Facture:'}</span>
                  <span className="font-bold">{purchase.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'المورد:' : 'Fournisseur:'}</span>
                  <span className="font-bold">{purchase.supplier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                  <span>{new Date(purchase.created_at).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'طريقة الأداء:' : 'Paiement:'}</span>
                  <span className="font-bold">
                    {purchase.payment_method === 'CASH' 
                      ? (lang === 'ar' ? 'نقداً (كاش)' : 'Espèces') 
                      : purchase.payment_method === 'CREDIT' 
                      ? (lang === 'ar' ? 'دين / كريدي' : 'Crédit') 
                      : purchase.payment_method === 'CARD' 
                      ? (lang === 'ar' ? 'بطاقة بنكية' : 'Carte Bancaire') 
                      : purchase.payment_method === 'TRANSFER' 
                      ? (lang === 'ar' ? 'تحويل بنكي' : 'Virement') 
                      : purchase.payment_method === 'CHEQUE' 
                      ? (lang === 'ar' ? 'شيك' : 'Chèque') 
                      : purchase.payment_method}
                  </span>
                </div>
              </div>

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
                    {purchase.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className={`py-1 font-medium leading-tight ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                          {it.product_name}
                          <div className="text-[9px] text-slate-500 font-sans">
                            {formatMAD(it.unit_cost, lang)} {lang === 'ar' ? 'لقطعة' : '/pc'}
                          </div>
                        </td>
                        <td className="text-center py-1 font-bold">{it.quantity}</td>
                        <td className={`py-1 font-bold ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{formatMAD(it.total, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>{lang === 'ar' ? 'المجموع الفرعي:' : 'Sous-total:'}</span>
                  <span>{formatMAD(purchase.subtotal, lang)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>{lang === 'ar' ? 'إجمالي الفاتورة:' : 'Total net:'}</span>
                  <span className="text-teal-900">{formatMAD(purchase.total, lang)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{lang === 'ar' ? 'المبلغ المدفوع:' : 'Montant payé:'}</span>
                  <span>{formatMAD(purchase.amount_paid, lang)}</span>
                </div>
                {purchase.amount_due > 0 && (
                  <div className="flex justify-between font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                    <span>{lang === 'ar' ? 'الباقي للمورد:' : 'Reste à payer:'}</span>
                    <span>{formatMAD(purchase.amount_due, lang)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-500 leading-tight">
                <div>{lang === 'ar' ? 'تم استلام وتوريد البضاعة بنجاح' : 'Marchandise reçue avec succès.'}</div>
                <div className="mt-1 text-[9px] text-slate-400">{lang === 'ar' ? 'تطبيق تاجر لإدارة المبيعات والمتاجر بالمغرب' : 'Application Tajer pour la gestion au Maroc'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Bar (Print, Bluetooth, WhatsApp) */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap sm:flex-nowrap gap-2 no-print justify-center items-center">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 min-w-[120px] h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer active:scale-95"
            title={lang === 'ar' ? 'إرسال عبر واتساب' : 'Envoyer via WhatsApp'}
          >
            <MessageCircle className="w-4 h-4 fill-current shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ar' ? 'إرسال واتساب' : 'WhatsApp'}</span>
          </button>

          {/* Thermal / Bluetooth Direct Print Button (Available for Thermal 80mm) */}
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
                  ? (lang === 'ar' ? 'طباعة مباشرة لتطبيق الشاشة الرئيسية' : 'Impression directe PWA')
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
                  ? (lang === 'ar' ? 'طباعة عبر RawBT' : 'RawBT')
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
        onSystemPrint={handlePrint}
        onShareImage={handleShareImage}
        lang={lang}
        paperFormat={paperFormat as any}
        setPaperFormat={setPaperFormat as any}
        isBtPrinting={isBtPrinting}
      />

      {/* Mobile Thermal Printer Guide & Troubleshooter Modal */}
      <ThermalPrinterGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />

      {/* Receipt Image Preview & Share Modal */}
      <ReceiptImageModal
        isOpen={!!previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
        imageDataUrl={previewImageUrl || ''}
        title={lang === 'ar' ? `شراء-${purchase?.invoice_number || ''}` : `Achat-${purchase?.invoice_number || ''}`}
        lang={lang}
      />
    </div>
  );
};
