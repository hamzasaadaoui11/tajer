import React from 'react';
import { X, Tag, Barcode, Package } from 'lucide-react';
import { Language } from '../../i18n/locales';

interface ProductImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    image_url?: string;
    sale_price: number;
    barcode?: string;
    current_stock?: number;
  } | null;
  lang?: Language;
  formatCurrency: (amount: number) => string;
}

export const ProductImageModal: React.FC<ProductImageModalProps> = ({
  isOpen,
  onClose,
  product,
  lang = 'ar',
  formatCurrency,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-right animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🖼️
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                {product.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {product.barcode || (lang === 'ar' ? 'بدون باركود' : 'Sans code-barres')}
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

        {/* Large Product Image Container */}
        <div className="p-4 bg-slate-950 flex items-center justify-center relative min-h-[300px] max-h-[50vh] overflow-hidden">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="max-h-[45vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
            />
          ) : (
            <div className="w-32 h-32 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-4xl shadow-inner">
              📦
            </div>
          )}
        </div>

        {/* Product Details Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              {lang === 'ar' ? 'سعر البيع للزبون' : 'Prix de vente client'}
            </div>
            <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">
              {formatCurrency(product.sale_price)}
            </div>
          </div>

          {product.current_stock !== undefined && (
            <div className="text-left">
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' ? 'المخزون المتوفر' : 'Stock disponible'}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {product.current_stock} {lang === 'ar' ? 'قطعة' : 'unités'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
