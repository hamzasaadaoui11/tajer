import React from 'react';
import { createPortal } from 'react-dom';
import { X, Tag, Barcode, Package, Plus } from 'lucide-react';
import { Language } from '../../i18n/locales';

interface ProductImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id?: string;
    name: string;
    image_url?: string;
    sale_price: number;
    barcode?: string;
    current_stock?: number;
    [key: string]: any;
  } | null;
  lang?: Language;
  formatCurrency: (amount: number) => string;
  onAddToCart?: (product: any) => void;
}

export const ProductImageModal: React.FC<ProductImageModalProps> = ({
  isOpen,
  onClose,
  product,
  lang = 'ar',
  formatCurrency,
  onAddToCart,
}) => {
  if (!isOpen || !product) return null;

  const content = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center tajer-modal-backdrop p-4 animate-in fade-in duration-200"
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
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              {lang === 'ar' ? 'سعر البيع للزبون' : 'Prix de vente client'}
            </div>
            <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">
              {formatCurrency(product.sale_price)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {product.current_stock !== undefined && (
              <div className="text-center">
                <div className="text-[11px] text-slate-400 font-medium">
                  {lang === 'ar' ? 'المخزون' : 'Stock'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.current_stock}
                </div>
              </div>
            )}

            {onAddToCart && (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{lang === 'ar' ? 'إضافة إلى السلة' : 'Ajouter au panier'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
