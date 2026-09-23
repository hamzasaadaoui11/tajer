import React, { useState } from 'react';
import { 
  Store, 
  Bell, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ChevronDown, 
  User as UserIcon, 
  Globe, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertTriangle,
  X,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Language } from '../../i18n/locales';

export const Header: React.FC = () => {
  const {
    business,
    branch,
    branches,
    setBranch,
    user,
    lang,
    setLang,
    t,
    isDark,
    setIsDark,
    syncStatus,
    triggerSync,
    notifications,
    unreadNotifsCount,
    markNotificationRead,
    markAllNotificationsRead,
    setCurrentView,
    logout,
    authEmail
  } = useApp();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-15 flex items-center justify-between gap-2">
        
        {/* Right side in RTL (Store branding & Branch) */}
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 text-right min-w-0 group cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate tracking-tight max-w-[110px] sm:max-w-none">
                  {business.name}
                </h1>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                  {business.currency}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <span className="truncate max-w-[90px] sm:max-w-none">
                  {lang === 'fr' && branch.name === 'الفرع الرئيسي' ? 'Succursale principale' : branch.name}
                </span>
                {branches.length > 1 && <span className="text-[10px] text-teal-600 shrink-0">({branches.length})</span>}
              </div>
            </div>
          </button>

          {/* Branch Selector Dropdown (if multi-branch) */}
          {branches.length > 1 && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowBranchMenu(!showBranchMenu)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showBranchMenu && (
                <div className="absolute top-full mt-1.5 start-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 z-50">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('branchesManagement')}
                  </div>
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBranch(b);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                        b.id === branch.id
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{b.name}</span>
                      {b.id === branch.id && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Left side in RTL (Controls, Sync, Notifications, Profile) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Sync & Offline Status Indicator */}
          <button
            onClick={triggerSync}
            title={t('syncStatus')}
            className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : syncStatus === 'syncing'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {syncStatus === 'synced' && <Wifi className="w-3.5 h-3.5" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {syncStatus === 'offline' && <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {syncStatus === 'synced' ? t('synced') : syncStatus === 'syncing' ? t('syncing') : t('offline')}
            </span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={t('notifications')}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-0.5 end-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotifsCount > 9 ? '+9' : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotifMenu && (
              <div className="absolute top-full mt-2 end-0 w-72 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <Bell className="w-4 h-4 text-teal-600" />
                    <span>{t('notifications')}</span>
                    {unreadNotifsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-xs">
                        {unreadNotifsCount}
                      </span>
                    )}
                  </div>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Tout marquer comme lu'}
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      {lang === 'ar' ? 'لا توجد إشعارات جديدة حالياً' : 'Aucune nouvelle notification'}
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3 text-xs transition cursor-pointer ${lang === 'ar' ? 'text-right' : 'text-left'} ${
                          !n.read 
                            ? 'bg-teal-50/50 dark:bg-teal-950/20 font-medium' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${n.type === 'LOW_STOCK' ? 'text-amber-500' : 'text-teal-500'}`} />
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 dark:text-white mb-0.5">{n.title}</div>
                            <div className="text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(n.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher (hidden on small mobile, available in Settings or tablet) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={t('language')}
            >
              <Globe className="w-5 h-5" />
            </button>
            {showLangMenu && (
              <div className="absolute top-full mt-2 end-0 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 z-50">
                <button
                  onClick={() => { setLang('ar'); setShowLangMenu(false); }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    lang === 'ar' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60' : 'hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>العربية</span>
                  {lang === 'ar' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                </button>
                <button
                  onClick={() => { setLang('fr'); setShowLangMenu(false); }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    lang === 'fr' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60' : 'hover:bg-slate-50 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>Français</span>
                  {lang === 'fr' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Dark / Light Mode Toggle (hidden on small mobile, available in Settings or tablet) */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:inline-flex"
            title={lang === 'ar' ? 'تبديل المظهر' : 'Changer de thème'}
          >
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 sm:ps-2.5 sm:pe-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-24 truncate">
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full mt-2 end-0 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{authEmail || user.email}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {user.role}
                  </span>
                </div>
                <div className="pt-1.5 space-y-0.5">
                  <button
                    onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }}
                    className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer`}
                  >
                    <span>{t('settingsTitle')}</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView('users'); setShowUserMenu(false); }}
                    className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer`}
                  >
                    <span>{t('usersManagement')}</span>
                  </button>
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-between cursor-pointer`}
                    >
                      <span>{lang === 'ar' ? 'تسجيل الخروج (Déconnexion)' : 'Se déconnecter'}</span>
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
