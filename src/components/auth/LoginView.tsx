import React, { useState } from 'react';
import { 
  Store, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { loginWithSupabase, lang, setLang } = useApp();
  
  const [email, setEmail] = useState(() => localStorage.getItem('tajer_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Veuillez saisir votre email et mot de passe');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    if (rememberMe) {
      localStorage.setItem('tajer_remembered_email', email.trim());
    } else {
      localStorage.removeItem('tajer_remembered_email');
    }

    const res = await loginWithSupabase(email.trim(), password);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || (lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Email ou mot de passe incorrect'));
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/30 text-slate-800 font-sans p-4 sm:p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-slate-900 block leading-tight">تاجر • TAJER</span>
            <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">POS & STORE CLOUD</span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              lang === 'ar' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setLang('fr')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              lang === 'fr' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Français
          </button>
        </div>
      </div>

      {/* Main Login Form Container */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 space-y-6">
          
          {/* Welcome Text */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-teal-800 text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>{lang === 'ar' ? 'بوابة تسجيل الدخول الآمن' : 'Accès sécurisé utilisateur'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </h1>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'أدخل بيانات حسابك المخصص للولوج إلى متجرك ومبيعاتك' 
                : 'Connectez-vous à votre espace magasin et caisse'}
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {lang === 'ar' ? 'البريد الإلكتروني (Email)' : 'Adresse Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3 ps-11 text-xs text-slate-900 placeholder-slate-400 outline-none transition font-medium shadow-xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور (Mot de passe)' : 'Mot de passe'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 rounded-2xl px-4 py-3 ps-11 pe-11 text-xs text-slate-900 placeholder-slate-400 outline-none transition font-medium shadow-xs"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 end-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span>{lang === 'ar' ? 'تذكرني في هذا الجهاز' : 'Se souvenir de moi'}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 transition transform active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ar' ? 'تسجيل الدخول إلى المتجر' : 'Se connecter au magasin'}</span>
                  <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[11px] text-slate-400 py-2">
        <span>تاجر (TAJER) • نظام إدارة المحلات ونقاط البيع المغربي • 2026</span>
      </div>
    </div>
  );
};
