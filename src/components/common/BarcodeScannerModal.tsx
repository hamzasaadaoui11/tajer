import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Search, 
  PlusCircle, 
  Zap, 
  ZapOff, 
  Image as ImageIcon, 
  RefreshCw, 
  FlipHorizontal, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playBeep } from '../../services/barcode';
import { db } from '../../services/db';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

// Setup ZXing Hints for ultrafast barcode scanning focusing on retail/product EANs
const hints = new Map();
const formats = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];
hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
hints.set(DecodeHintType.TRY_HARDER, true); // Deep scan optimization for low-light or fuzzy images

const codeReader = new BrowserMultiFormatReader(hints);

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
  const [cameraSlowNotice, setCameraSlowNotice] = useState(false);
  const [currentFacing, setCurrentFacing] = useState<'environment' | 'user'>('environment');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [camerasList, setCamerasList] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopActiveScanner = () => {
    try {
      codeReader.reset();
    } catch (e) {
      console.warn('Error resetting ZXing reader:', e);
    } finally {
      setCameraActive(false);
      setIsTorchOn(false);
      setHasTorch(false);
    }
  };

  const handleClose = () => {
    stopActiveScanner();
    if (setBarcodeScanCallback) {
      setBarcodeScanCallback(null);
    }
    setIsBarcodeScannerOpen(false);
  };

  const handleBarcodeFound = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    playBeep();

    // If custom callback is provided (e.g. from Product form when adding/editing)
    if (barcodeScanCallback) {
      stopActiveScanner();
      barcodeScanCallback(clean);
      setBarcodeScanCallback(null);
      setIsBarcodeScannerOpen(false);
      return;
    }

    const prod = db.getProductByBarcode(clean, business.id);

    if (prod) {
      if (barcodeScanTarget === 'pos') {
        addToCart(prod);
      }
      stopActiveScanner();
      setIsBarcodeScannerOpen(false);
    } else {
      // Product not found in local inventory
      setNotFoundBarcode(clean);
      setIsScannerPaused(true);
    }
  };

  const handleIgnoreNotFound = () => {
    setNotFoundBarcode(null);
    setIsScannerPaused(false);
  };

  const toggleTorch = async () => {
    if (!videoRef.current) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream?.getVideoTracks()?.[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities && 'torch' in capabilities) {
          const nextTorch = !isTorchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextTorch }]
          });
          setIsTorchOn(nextTorch);
        }
      }
    } catch (e) {
      console.warn("Torch not supported on this device/camera", e);
    }
  };

  const checkTorchSupport = (stream: MediaStream) => {
    try {
      const track = stream.getVideoTracks()?.[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        setHasTorch(!!(capabilities && 'torch' in capabilities));
      }
    } catch {
      setHasTorch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const result = await codeReader.decodeFromImageElement(img);
      if (result) {
        handleBarcodeFound(result.getText());
      }
    } catch (err) {
      console.warn('Scan file result:', err);
      alert(lang === 'ar' 
        ? 'تعذر قراءة الباركود من هذه الصورة. يرجى التأكد من وضوح الصورة وتوسط خطوط الباركود، أو إدخال الرقم يدوياً.' 
        : 'Impossible de lire le code-barres depuis cette image. Veuillez réessayer ou entrer le numéro manuellement.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startCamera = async (deviceIdOrFacing: string) => {
    setIsStarting(true);
    setCameraError(null);
    setCameraSlowNotice(false);

    try {
      // 1. Reset any running reader sessions first
      codeReader.reset();

      // 2. Fetch lists of cameras
      const devices = await codeReader.listVideoInputDevices().catch(() => []);
      setCamerasList(devices);

      let targetDeviceId: string | null = null;

      if (deviceIdOrFacing === 'environment' || deviceIdOrFacing === 'user') {
        const isEnv = deviceIdOrFacing === 'environment';
        
        // Target back/rear camera on environment, and front/user camera on user
        const filtered = devices.filter(d => {
          const label = d.label.toLowerCase();
          if (isEnv) {
            // Find standard environment/rear cameras, avoid wide or ultra-wide lenses (0.5x, 0.6x, etc.)
            return /back|rear|environment|خلف/i.test(label) && !/ultra|wide|0\./i.test(label);
          } else {
            return /front|user|أمام|selfie/i.test(label);
          }
        });

        const bestCam = filtered.length > 0 ? filtered[0] : devices.find(d => {
          const label = d.label.toLowerCase();
          return isEnv ? /back|rear|environment|خلف/i.test(label) : /front|user|أمام|selfie/i.test(label);
        });

        if (bestCam) {
          targetDeviceId = bestCam.deviceId;
        } else if (devices.length > 0) {
          const backFallback = devices.find(d => /back|rear|environment/i.test(d.label.toLowerCase()));
          targetDeviceId = backFallback ? backFallback.deviceId : devices[0].deviceId;
        }
      } else {
        targetDeviceId = deviceIdOrFacing;
      }

      const facingMode = deviceIdOrFacing === 'user' ? 'user' : 'environment';
      setCurrentFacing(facingMode);

      if (targetDeviceId) {
        setActiveCameraId(targetDeviceId);
      }

      // Check DOM video element is ready
      if (!videoRef.current) {
        throw new Error("Video element ref not ready");
      }

      // 3. Define optimized HD constraints for razor-sharp barcodes
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId ? {
          deviceId: { exact: targetDeviceId },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        } : {
          facingMode: facingMode,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        }
      };

      // 4. Start ZXing continuous decoding
      await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (result && !isScannerPaused) {
            handleBarcodeFound(result.getText());
          }
        }
      );

      setCameraActive(true);
      setCameraError(null);

      // Check and detect flash support
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        checkTorchSupport(stream);
      }

    } catch (err: any) {
      console.error('ZXing Camera start failed:', err);
      const isDenied = err?.name === 'NotAllowedError' || /permission|denied|allowed/i.test(err?.message || '');
      if (isDenied) {
        setCameraError(
          lang === 'ar'
            ? 'تم حظر إذن الكاميرا. يرجى تفعيل إذن الكاميرا (Autoriser la caméra) في إعدادات المتصفح، أو التقاط صورة للسلعة مباشرة بالزر أسفله.'
            : 'Accès caméra refusé. Veuillez autoriser la caméra dans les paramètres de votre navigateur, ou scanner via une photo.'
        );
      } else {
        setCameraError(
          lang === 'ar'
            ? 'تعذر تشغيل كاميرا البث المباشر. يمكنك النقر على "إعادة المحاولة" أو استخدام كاميرا الهاتف لالتقاط صورة.'
            : 'Impossible de démarrer la caméra en direct. Vous pouvez réessayer ou prendre une photo du code-barres.'
        );
      }
      setCameraActive(false);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!isBarcodeScannerOpen) return;

    setCameraError(null);
    setCameraActive(false);
    setCameraSlowNotice(false);
    setNotFoundBarcode(null);
    setManualCode('');
    setIsScannerPaused(false);
    setIsTorchOn(false);
    setHasTorch(false);

    // Timeout alert if camera takes too long
    const slowTimer = setTimeout(() => {
      setCameraSlowNotice(true);
    }, 4500);

    const timer = setTimeout(() => {
      startCamera('environment');
    }, 150);

    return () => {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      stopActiveScanner();
    };
  }, [isBarcodeScannerOpen]);

  const handleFlipCamera = async () => {
    if (camerasList.length > 1 && activeCameraId) {
      const currentIndex = camerasList.findIndex(c => c.id === activeCameraId);
      const nextIndex = (currentIndex + 1) % camerasList.length;
      const nextCam = camerasList[nextIndex];
      const isUser = /front|user|أمام/i.test(nextCam.label || '');
      setCurrentFacing(isUser ? 'user' : 'environment');
      await startCamera(nextCam.id);
    } else {
      const nextFacing = currentFacing === 'environment' ? 'user' : 'environment';
      await startCamera(nextFacing);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeFound(manualCode.trim());
    }
  };

  if (!isBarcodeScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'} animate-in zoom-in-95 duration-150`}>
        
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Camera className="w-5 h-5 text-teal-600" />
            <span>{lang === 'ar' ? 'ماسح الباركود الاحترافي (ZXing)' : 'Scanner de code-barres (ZXing)'}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Flip Camera */}
            {cameraActive && (
              <button
                type="button"
                onClick={handleFlipCamera}
                title={lang === 'ar' ? 'تبديل الكاميرا' : 'Changer de caméra'}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* Torch */}
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

            {/* Close */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="p-3.5 space-y-3">
          <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[250px] h-[260px] shadow-inner">
            
            {/* Native Video Feed */}
            <video 
              ref={videoRef}
              id="scanner-video-element"
              className={`w-full h-full object-contain bg-slate-950 ${
                currentFacing === 'user' ? 'scale-x-[-1]' : ''
              }`}
              playsInline
              muted
            />

            {/* Loading / Starting State */}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-slate-300 text-xs gap-3 p-4 text-center z-10">
                <Camera className="w-12 h-12 text-teal-400 animate-pulse" />
                <p className="font-bold">{lang === 'ar' ? 'جاري تشغيل الكاميرا وتفعيل قارئ الباركود...' : 'Démarrage de la caméra...'}</p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'ar' ? 'إذا ظهر لك طلب إذن الكاميرا، اضغط "سماح" (Autoriser)' : 'Veuillez accepter l\'accès à la caméra si demandé'}
                </p>

                {cameraSlowNotice && (
                  <div className="pt-2 flex flex-col gap-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => startCamera(activeCameraId || 'environment')}
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                      <span>{lang === 'ar' ? 'إعادة محاولة تشغيل الكاميرا' : 'Réessayer'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                      <span>{lang === 'ar' ? 'التقاط صورة للسلعة مباشرة' : 'Prendre une photo'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Camera Error State */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-5 bg-slate-950/95 text-slate-200 text-xs text-center gap-3 z-10">
                <AlertCircle className="w-10 h-10 text-amber-500" />
                <p className="text-slate-300 leading-relaxed font-medium">{cameraError}</p>
                
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => startCamera(activeCameraId || 'environment')}
                    className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                    <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Réessayer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                    <span>{lang === 'ar' ? 'التقاط صورة للباركود' : 'Prendre une photo'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Visual Guide Line when Active */}
            {cameraActive && !isScannerPaused && (
              <>
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse pointer-events-none z-10" />

                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none z-10">
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-[11px] text-white font-medium shadow-sm">
                    {lang === 'ar' ? 'ضع خطوط الباركود داخل المربع بوضوح' : 'Placez le code-barres dans la zone'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pro iPhone/Android Camera Tip */}
          {cameraActive && !isScannerPaused && (
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-200 flex items-start gap-1.5 leading-relaxed">
              <span className="shrink-0 text-xs">💡</span>
              <div>
                {lang === 'ar' ? (
                  <>
                    <strong>نصيحة للمسح السريع:</strong> أبعد الهاتف قليلاً عن الباركود (حوالي 25-30 سم) لتفادي الضبابية، واستخدم زر 🔄 بالأعلى للتبديل بين كاميرات الهاتف الخلفية المتعددة حتى تظهر لك كاميرا التركيز الدقيقة 1x.
                  </>
                ) : (
                  <>
                    <strong>Astuce :</strong> Éloignez le téléphone du code-barres (25-30 cm) pour faire la mise au point. Utilisez le bouton 🔄 en haut pour basculer entre vos différents objectifs arrière.
                  </>
                )}
              </div>
            </div>
          )}

          {/* Not Found Alert */}
          {notFoundBarcode && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                {lang === 'ar' ? `هذا المنتج غير مسجل بعد (${notFoundBarcode})` : `Ce produit n'est pas encore enregistré (${notFoundBarcode})`}
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-[11px] mb-2">
                {lang === 'ar' ? 'هل تريد إضافة هذا المنتج الجديد الآن إلى المخزون والسلع؟' : 'Voulez-vous enregistrer ce produit dans le stock maintenant ?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    stopActiveScanner();
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

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder={lang === 'ar' ? 'أو أدخل رقم الباركود يدوياً...' : 'Ou entrez le code-barres manuellement...'}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-hidden text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بحث' : 'Rechercher'}</span>
            </button>
          </form>

          {/* Native Camera Capture Button (100% Reliable for Phones) */}
          <div className="pt-1">
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
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 font-bold text-xs cursor-pointer transition shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>
                {isProcessingImage 
                  ? (lang === 'ar' ? 'جارٍ قراءة وفحص الصورة...' : 'Analyse en cours...') 
                  : (lang === 'ar' ? '📷 التقاط صورة للباركود بكاميرا الهاتف' : '📷 Prendre une photo du code-barres')}
              </span>
            </label>
          </div>

          {/* Fast Quick Products for testing */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 mb-1">
              {lang === 'ar' ? 'سلع مسجلة سريعة للتجربة :' : 'Articles enregistrés pour test rapide :'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {db.getProducts(business.id).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBarcodeFound(p.barcode)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {p.name.slice(0, 16)} ({p.barcode || '---'})
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
