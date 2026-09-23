import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Search, PlusCircle, Zap, ZapOff, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playBeep } from '../../services/barcode';
import { db } from '../../services/db';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export const BarcodeScannerModal: React.FC = () => {
  const {
    isBarcodeScannerOpen,
    setIsBarcodeScannerOpen,
    barcodeScanTarget,
    barcodeScanCallback,
    setBarcodeScanCallback,
    business,
    addToCart,
    setCurrentView,
    lang,
  } = useApp();

  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = () => {
    if (setBarcodeScanCallback) {
      setBarcodeScanCallback(null);
    }
    setIsBarcodeScannerOpen(false);
  };

  const handleBarcodeFound = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    playBeep();

    // If a custom callback is provided (e.g. from Product form when adding/editing a product)
    if (barcodeScanCallback) {
      barcodeScanCallback(clean);
      setBarcodeScanCallback(null);
      setIsBarcodeScannerOpen(false);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Stop scanner error", err));
      }
      return;
    }

    const prod = db.getProductByBarcode(clean, business.id);

    if (prod) {
      if (barcodeScanTarget === 'pos') {
        addToCart(prod);
      }
      setIsBarcodeScannerOpen(false);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Stop scanner error", err));
      }
    } else {
      // Show "product not found, do you want to add it?"
      setNotFoundBarcode(clean);
      setIsScannerPaused(true);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.pause();
      }
    }
  };

  const handleIgnoreNotFound = () => {
    setNotFoundBarcode(null);
    setIsScannerPaused(false);
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.resume();
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore - torch is supported by browsers that support it
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch not supported on this device/camera", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    setIsProcessingImage(true);
    try {
      const result = await scannerRef.current.scanFile(file, true);
      if (result) {
        handleBarcodeFound(result);
      }
    } catch (err) {
      alert(lang === 'ar' ? 'تعذر قراءة الباركود من هذه الصورة، يرجى التقاط صورة أوضح أو إدخال الرقم يدوياً.' : 'Impossible de lire le code-barres depuis cette image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    let html5QrcodeScanner: Html5Qrcode | null = null;

    if (isBarcodeScannerOpen) {
      setCameraError(null);
      setCameraActive(false);
      setNotFoundBarcode(null);
      setManualCode('');
      setIsScannerPaused(false);
      setIsTorchOn(false);
      setHasTorch(false);

      // Explicitly register all standard retail product barcode formats
      const supportedFormats = [
        Html5QrcodeSupportedFormats.EAN_13, // Standard Moroccan & International retail
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      // Wait 150ms for DOM element '#reader-container' to render in modal
      const timer = setTimeout(() => {
        try {
          html5QrcodeScanner = new Html5Qrcode("reader-container", {
            formatsToSupport: supportedFormats,
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true, // Uses native iOS/Android hardware barcode detector
            },
          });
          scannerRef.current = html5QrcodeScanner;

          const startScanner = (facing: "environment" | "user") => {
            if (!html5QrcodeScanner) return Promise.reject("Scanner not initialized");
            return html5QrcodeScanner.start(
              {
                facingMode: facing,
                // Request crisp resolution for iPhone cameras so thin barcode lines are clear
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              {
                fps: 15,
                qrbox: (width, height) => {
                  // Generous scanning area so barcodes are easily detected even if tilted
                  const boxWidth = Math.min(Math.floor(width * 0.9), 360);
                  const boxHeight = Math.min(Math.floor(height * 0.65), 220);
                  return { width: Math.max(boxWidth, 240), height: Math.max(boxHeight, 150) };
                },
                aspectRatio: 1.333333,
                disableFlip: false,
              },
              (decodedText) => {
                handleBarcodeFound(decodedText);
              },
              () => {
                // frame scanning exceptions
              }
            );
          };

          startScanner("environment")
            .then(() => {
              setCameraActive(true);
              // Check if device track has torch capability
              try {
                if (html5QrcodeScanner) {
                  const capabilities = html5QrcodeScanner.getRunningTrackCapabilities();
                  // @ts-ignore
                  if (capabilities && 'torch' in capabilities) {
                    setHasTorch(true);
                  }
                }
              } catch {
                // Ignore capability check
              }
            })
            .catch((err) => {
              console.warn("Camera start failed for environment, trying user-facing camera", err);
              startScanner("user")
                .then(() => {
                  setCameraActive(true);
                })
                .catch((err2) => {
                  console.error("Camera start failed completely", err2);
                  setCameraError(lang === 'ar' ? "تعذر فتح الكاميرا (يرجى منح الإذن للكاميرا في Safari أو إدخال الباركود يدوياً)" : "Impossible d'ouvrir la caméra (veuillez autoriser l'accès dans Safari)");
                });
            });
        } catch (e) {
          console.error("Failed to init Html5Qrcode", e);
          setCameraError(lang === 'ar' ? "فشل تهيئة قارئ الباركود" : "Échec de l'initialisation du scanner");
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
          html5QrcodeScanner.stop().catch(err => console.error("Error stopping scanner", err));
        }
      };
    }
  }, [isBarcodeScannerOpen, lang]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      handleBarcodeFound(manualCode);
    }
  };

  if (!isBarcodeScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150`}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Camera className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'ماسح الباركود الذكي' : 'Scanner de code-barres'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title={lang === 'ar' ? 'تشغيل الفلاش' : 'Activer la torche'}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isTorchOn 
                    ? 'bg-amber-500 text-white border-amber-600' 
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                }`}
              >
                {isTorchOn ? <Zap className="w-4 h-4 fill-white" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Viewfinder */}
        <div className="p-4">
          <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[240px]">
            {/* The html5-qrcode target container element */}
            <div id="reader-container" className="w-full h-full object-cover [&_video]:rounded-2xl" />

            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs gap-3">
                <Camera className="w-10 h-10 animate-pulse text-teal-500" />
                <p>{lang === 'ar' ? 'جاري تشغيل الكاميرا وتفعيل قارئ الباركود...' : 'Démarrage de la caméra...'}</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-400 text-xs text-center gap-3">
                <Camera className="w-10 h-10 text-slate-600" />
                <p>{cameraError}</p>
              </div>
            )}

            {cameraActive && !isScannerPaused && (
              <>
                {/* Visual Scanning Guide Line */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse pointer-events-none z-10" />

                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none z-10">
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-[11px] text-white font-medium shadow-sm">
                    {lang === 'ar' ? 'أبعد الهاتف 15 إلى 20 سم حتى تتضح خطوط الباركود' : 'Gardez 15-20 cm pour la mise au point'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Not Found Alert */}
          {notFoundBarcode && (
            <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                {lang === 'ar' ? `هذا المنتج غير مسجل بعد (${notFoundBarcode})` : `Ce produit n'est pas encore enregistré (${notFoundBarcode})`}
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-[11px] mb-2">
                {lang === 'ar' ? 'هل تريد إضافة هذا المنتج الجديد الآن إلى المخزون والسلع؟' : 'Voulez-vous enregistrer ce produit dans le stock maintenant ?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsBarcodeScannerOpen(false);
                    setCurrentView('products');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إضافة السلعة الآن' : 'Ajouter le produit'}</span>
                </button>
                <button
                  onClick={handleIgnoreNotFound}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                >
                  {lang === 'ar' ? 'تجاهل' : 'Ignorer'}
                </button>
              </div>
            </div>
          )}

          {/* Quick Manual Entry Input & Upload Photo */}
          <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder={lang === 'ar' ? 'أو أدخل رقم الباركود يدوياً...' : 'Ou entrez le code-barres manuellement...'}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بحث' : 'Rechercher'}</span>
            </button>
          </form>

          {/* Photo upload / capture option */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              id="barcode-image-input"
            />
            <label
              htmlFor="barcode-image-input"
              className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 hover:underline cursor-pointer font-bold py-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isProcessingImage ? (lang === 'ar' ? 'جاري فحص الصورة...' : 'Analyse en cours...') : (lang === 'ar' ? 'مسح باركود من صورة / التقاط صورة' : 'Scanner depuis une photo')}</span>
            </label>
          </div>

          {/* Fast Quick Product Buttons for Simulation / Test */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              {lang === 'ar' ? 'سلع تجريبية سريعة:' : 'Articles rapides pour test :'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {db.getProducts(business.id).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleBarcodeFound(p.barcode)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {p.name.slice(0, 14)}...
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
