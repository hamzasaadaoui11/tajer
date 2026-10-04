import React, { useState } from 'react';
import { 
  Lock, 
  Store, 
  MessageCircle, 
  LogOut, 
  RefreshCw, 
  User, 
  FileWarning, 
  ShieldAlert,
  Clock,
  PhoneCall
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getBlockReason } from '../../services/accessControl';

interface BlockedAccountViewProps {
  email: string;
}

export const BlockedAccountView: React.FC<BlockedAccountViewProps> = ({ email }) => {
  const { lang, setLang, logout, refreshData } = useApp();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = () => {
    setChecking(true);
    setTimeout(() => {
      refreshData();
      setChecking(false);
    }, 1200);
  };

  const handleWhatsAppSupport = () => {
    const text = lang === 'ar'
      ? `مرحباً إدارة تاجر، أريد تسوية واجب الاشتراك وتفعيل حسابي (${email}) في التطبيق.`
      : `Bonjour support Tajer, je souhaite régulariser le paiement de mon abonnement pour activer mon compte (${email}).`;
    
    // Open WhatsApp with prefilled message
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-rose-50 via-slate-50 to-slate-100 text-slate-800 font-sans p-4 sm:p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-slate-900 block leading-tight">تاجر • TAJER</span>
            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">ACCOUNT SUSPENDED</span>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              lang === 'ar' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setLang('fr')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              lang === 'fr' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Français
          </button>
        </div>
      </div>

      {/* Main Locked Card */}
      <div className="w-full max-w-lg mx-auto my-auto py-6">
        <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-900/10 space-y-6 text-center">
          
          {/* Animated Locked Shield Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-inner">
            <ShieldAlert className="w-11 h-11" />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>
              {lang === 'ar' ? 'الحساب معلق: في انتظار سداد الاشتراك' : 'Compte suspendu : En attente de paiement'}
            </span>
          </div>

          {/* Title & Email Display */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {lang === 'ar' ? 'تم توقيف هذا الحساب' : 'Accès à l\'application bloqué'}
            </h1>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{email}</span>
            </div>
          </div>

          {/* Detailed Reason Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed text-right space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{lang === 'ar' ? 'سبب التوقيف:' : 'Motif de suspension :'}</span>
            </div>
            <p className="text-amber-900/90 text-xs sm:text-sm">
              {getBlockReason(lang)}
            </p>
            <p className="text-[11px] text-amber-800/80 pt-1 border-t border-amber-200/60">
              {lang === 'ar' 
                ? 'لاستئناف العمل في المحل واسترجاع إمكانية تسجيل المبيعات والفواتير، يرجى تسوية الفاتورة والتواصل معنا لتفعيل الحساب فوراً.' 
                : 'Pour réactiver votre caisse et reprendre vos ventes, veuillez régler votre facture et nous contacter pour un déblocage immédiat.'}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* WhatsApp Contact Button */}
            <button
              type="button"
              onClick={handleWhatsAppSupport}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
              <span>{lang === 'ar' ? 'تواصل عبر واتساب لتسوية الدفع والتفعيل' : 'Contacter le support WhatsApp pour régler'}</span>
            </button>

            {/* Check Status Button */}
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-teal-600' : ''}`} />
              <span>
                {checking 
                  ? (lang === 'ar' ? 'جاري التحقق من التفعيل...' : 'Vérification en cours...') 
                  : (lang === 'ar' ? 'تحقق من حالة الدفع والتفعيل' : 'Vérifier l\'état d\'activation')}
              </span>
            </button>
          </div>

          {/* Logout Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition p-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تسجيل الخروج والتبديل لحساب آخر' : 'Se déconnecter / Changer de compte'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-lg mx-auto text-center text-[11px] text-slate-400 pb-2">
        <span>© {new Date().getFullYear()} تاجر • نظام إدارة المحلات ونقاط البيع</span>
      </div>
    </div>
  );
};
