import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Truck,
  MessageCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Purchase, Supplier } from '../../types';
import { formatMAD } from '../../i18n/locales';
import { openWhatsApp } from '../../services/whatsapp';
import { convertNumberToArabicWords, convertNumberToFrenchWords } from '../common/ReceiptModal';

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
  const [paperFormat, setPaperFormat] = useState<'A4' | '80mm'>('A4');
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

  if (!purchase) return null;

  const handlePrint = () => {
    // Detect if we are inside a sandboxed iframe (like AI Studio preview), where direct window.print() is blocked by browser policies
    const isIframe = window.self !== window.top;
    
    if (isIframe) {
      try {
        const printContent = document.getElementById('printable-purchase-receipt');
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
              <title>${lang === 'ar' ? 'طباعة فاتورة شراء رقم' : 'Impression Bon Commande N°'} ${purchase.invoice_number}</title>
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
                #printable-purchase-receipt {
                  transform: none !important;
                  position: relative !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  background: #ffffff !important;
                  
                  /* Dimension constraints */
                  width: ${paperFormat === '80mm' ? '80mm' : '794px'} !important;
                  max-width: ${paperFormat === '80mm' ? '80mm' : '794px'} !important;
                  min-height: ${paperFormat === 'A4' ? '1123px' : 'auto'} !important;
                  
                  /* Exact padding settings */
                  padding: ${paperFormat === 'A4' ? '12mm' : '4mm'} !important;
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
                  #printable-purchase-receipt {
                    border: none !important;
                    box-shadow: none !important;
                  }
                  @page {
                    size: ${paperFormat === '80mm' ? '80mm 297mm' : 'A4'};
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
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

        {/* Paper Format Selector Tabs */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex justify-center gap-2 no-print">
          <button
            onClick={() => setPaperFormat('A4')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              paperFormat === 'A4'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{lang === 'ar' ? 'ورق قياسي A4 (Facture A4)' : 'Standard A4'}</span>
          </button>
          <button
            onClick={() => setPaperFormat('80mm')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              paperFormat === '80mm'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ar' ? 'وصل حراري 80mm' : 'Thermique 80mm'}</span>
          </button>
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
                        {lang === 'ar' ? 'شركة' : 'Société'} {business.name}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {business.address} - {business.city}
                      </div>
                      <div className="text-xs text-slate-600 font-mono mt-0.5">
                        ICE : {business.ice || '002938475000031'} | {lang === 'ar' ? 'الهاتف :' : 'Tél :'} {business.phone}
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
                              ? `أي ما يعادل: ${formatMAD(purchase.total, 'ar')} (بما فيها جميع الرسوم والضرائب)` 
                              : `Soit un montant de : ${formatMAD(purchase.total, 'fr')} (Toutes Taxes Comprises)`}
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
                      <div className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} bottom-2 w-32 h-20 opacity-80 pointer-events-none`}>
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
                          <text x="100" y="83" textAnchor="middle" fontSize="6.5" fill="currentColor">
                            ICE: {business.ice || '002938475000031'}
                          </text>
                        </svg>
                      </div>
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
            /* 80mm Thermal Receipt */
            <div
              id="printable-purchase-receipt"
              style={{ width: '80mm', maxWidth: '80mm' }}
              className="bg-white text-slate-900 p-4 font-mono text-xs leading-normal border border-slate-200 shadow-md box-border mx-auto"
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

        {/* Actions Bar (Print, WhatsApp) */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 no-print justify-center items-center">
          <button
            onClick={handleShareWhatsApp}
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
