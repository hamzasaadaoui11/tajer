import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tajer ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRecover = () => {
    try {
      // Clear legacy bloated cache that could cause WebKit memory spikes
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('tajer_db_') && k.includes('products'))) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch {}
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k));
        });
      }
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans text-right" dir="rtl">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-700 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                تعذر فتح الصفحة بشكل غير متوقع
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                حدث خطأ في قراءة ذاكرة الهاتف المؤقتة. اضغط على الزر أسفله لإعادة فتح التطبيق وحل المشكل تلقائياً.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleRecover}
                className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل التطبيق وإصلاح الذاكرة</span>
              </button>

              <button
                onClick={this.handleFullReset}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>العودة لشاشة الدخول الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
