/**
 * Tajer Thermal & Bluetooth Printing Service
 * Specialized for mobile (Android/iOS) and desktop thermal POS printers (58mm / 80mm).
 * Supports:
 * 1. Web Bluetooth API (Direct connection to ESC/POS Bluetooth printers from Chrome/Edge)
 * 2. RawBT Android Driver (One-click thermal print helper for Android phones)
 * 3. High-Fidelity ESC/POS Raster Bit-Image rendering for flawless Arabic calligraphy
 */

import html2canvas from 'html2canvas';

// Common Bluetooth Printer GATT Services & Characteristics
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Serial Port (MPT-II, POS-58, Xprinter, Goojprt)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // BLE Serial
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic POS Serial
  '0000ae00-0000-1000-8000-00805f9b34fb', // Rongta / Milestone
];

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

export class ThermalPrinterService {
  private connectedDevice: any = null;
  private writeCharacteristic: any = null;

  public isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  public isAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
  }

  public isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getSavedPrinterName(): string {
    return localStorage.getItem('tajer_bt_printer_name') || '';
  }

  public setSavedPrinterName(name: string): void {
    localStorage.setItem('tajer_bt_printer_name', name);
  }

  /**
   * Open the current app directly inside Google Chrome (useful on Android when inside PWA)
   */
  public openInChrome(targetUrl?: string): void {
    if (typeof window === 'undefined') return;
    const url = targetUrl || window.location.href;
    if (this.isAndroid()) {
      // Android Intent to open URL directly in Google Chrome app
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const chromeIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
      window.location.href = chromeIntent;
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Connect to a Bluetooth ESC/POS printer via Web Bluetooth API
   */
  public async connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      if (this.isStandalone()) {
        return {
          success: false,
          error: 'في تطبيق الشاشة الرئيسية (PWA)، يمنع نظام الهاتف تشغيل خاصية Web Bluetooth المباشرة للمتصفح. يمكنك الطباعة فوراً بنقرة واحدة عبر تطبيق RawBT، أو عبر نظام الهاتف، أو فتح الفاتورة في متصفح Google Chrome.'
        };
      }
      if (this.isIOS()) {
        return {
          success: false,
          error: 'نظام iOS (أجهزة آيفون) لا يدعم خاصية Web Bluetooth في المتصفحات. يرجى استخدام زر "طباعة عادية" أو مشاركة الفاتورة عبر الواتساب.'
        };
      }
      return {
        success: false,
        error: 'متصفحك لا يدعم خاصية Web Bluetooth. يرجى استخدام متصفح Google Chrome على هاتف أندرويد أو جهاز الكمبيوتر، أو الطباعة المباشرة عبر RawBT.'
      };
    }

    try {
      const nav: any = navigator;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
      });

      if (!device) {
        return { success: false, error: 'لم يتم اختيار أي طابعة' };
      }

      const server = await device.gatt.connect();
      
      // Search across known printer services
      let characteristic: any = null;
      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              characteristic = c;
              break;
            }
          }
          if (characteristic) break;
        } catch {
          // Continue searching other services
        }
      }

      // Fallback: search all available services if known ones didn't match
      if (!characteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                characteristic = c;
                break;
              }
            }
            if (characteristic) break;
          }
        } catch (e) {
          console.warn('Fallback service enumeration failed', e);
        }
      }

      if (!characteristic) {
        device.gatt.disconnect();
        return {
          success: false,
          error: 'تم الاتصال بالطابعة ولكن تعذر العثور على قناة إرسال البيانات (GATT Write Channel).'
        };
      }

      this.connectedDevice = device;
      this.writeCharacteristic = characteristic;
      const devName = device.name || 'طابعة حرارية بلوتوث';
      this.setSavedPrinterName(devName);

      // Listen for unexpected disconnect
      device.addEventListener('gattserverdisconnected', () => {
        this.connectedDevice = null;
        this.writeCharacteristic = null;
      });

      return { success: true, deviceName: devName };
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        return { success: false, error: 'تم إلغاء عملية اختيار الطابعة' };
      }
      return { success: false, error: err.message || 'تعذر الاتصال بالطابعة عبر البلوتوث' };
    }
  }

  /**
   * Disconnect active Bluetooth printer
   */
  public disconnect(): void {
    if (this.connectedDevice && this.connectedDevice.gatt?.connected) {
      try {
        this.connectedDevice.gatt.disconnect();
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }
    this.connectedDevice = null;
    this.writeCharacteristic = null;
  }

  /**
   * Send binary data in small chunks (BLE safe buffer chunks)
   */
  private async sendChunks(data: Uint8Array, chunkSize: number = 100): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error('الطابعة غير متصلة');
    }

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.writeCharacteristic.properties.writeWithoutResponse) {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.writeCharacteristic.writeValue(chunk);
      }
      // Small pause to prevent buffer overflow in BLE controller
      await new Promise(r => setTimeout(r, 15));
    }
  }

  /**
   * Print a test ticket to verify Bluetooth communication
   */
  public async printTestTicket(lang: string = 'ar'): Promise<{ success: boolean; error?: string }> {
    const isConnected = this.connectedDevice?.gatt?.connected && this.writeCharacteristic;
    if (!isConnected) {
      const conn = await this.connectBluetoothPrinter();
      if (!conn.success) return { success: false, error: conn.error };
    }

    try {
      // Build test canvas
      const canvas = document.createElement('canvas');
      const width = 384; // 58mm standard
      canvas.width = width;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, canvas.height);

      // Text setup
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';

      // Title
      ctx.font = 'bold 24px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? 'تطبيق تاجر - TAJER' : 'TAJER POS APP', width / 2, 45);

      // Subtitle
      ctx.font = '16px Cairo, sans-serif';
      ctx.fillText(lang === 'ar' ? 'اختبار اتصال الطابعة الحرارية ناجح ✓' : 'Test Impression Thermique Réussi ✓', width / 2, 85);

      // Separator
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(width - 20, 110);
      ctx.stroke();

      // Details
      ctx.font = '14px Cairo, monospace';
      const timeStr = new Date().toLocaleString('fr-FR');
      ctx.fillText(lang === 'ar' ? `التاريخ: ${timeStr}` : `Date: ${timeStr}`, width / 2, 145);
      ctx.fillText(lang === 'ar' ? 'الطابعة متصلة وجاهزة للعمل 100%' : 'Imprimante connectée et prête', width / 2, 175);

      // Footer
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.fillText('www.tajer.ma', width / 2, 215);

      // Convert to ESC/POS Raster and send
      const escposData = this.canvasToEscPosRaster(canvas);
      await this.sendChunks(escposData);

      return { success: true };
    } catch (e: any) {
      console.error('Print test ticket error:', e);
      return { success: false, error: e?.message || 'فشلت الطباعة' };
    }
  }

  /**
   * Convert an HTML Canvas into ESC/POS Raster Bit-Image (GS v 0) bytes.
   * This is universally compatible with all thermal printers in Morocco and ensures
   * crystal-clear Arabic calligraphy without missing or broken characters!
   */
  public canvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    const widthBytes = Math.ceil(width / 8);
    const rasterData: number[] = [];

    // 1. Initialize printer: ESC @
    rasterData.push(0x1B, 0x40);

    // 2. Line spacing: ESC 3 0 (minimum line feed)
    rasterData.push(0x1B, 0x33, 0x00);

    // 3. GS v 0 Header: GS v 0 m xL xH yL yH
    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    rasterData.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    // 4. Pixel data (1 = black dot, 0 = white dot)
    for (let y = 0; y < height; y++) {
      for (let b = 0; b < widthBytes; b++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = b * 8 + bit;
          if (x < width) {
            const idx = (y * width + x) * 4;
            // Grayscale luminance
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const bVal = pixels[idx + 2];
            const a = pixels[idx + 3];
            const brightness = (r * 0.299 + g * 0.587 + bVal * 0.114);
            // Black threshold with alpha check
            if (a > 128 && brightness < 170) {
              byteVal |= (1 << (7 - bit));
            }
          }
        }
        rasterData.push(byteVal);
      }
    }

    // 5. Feed paper and cut (ESC d 4 + GS V 66 0)
    rasterData.push(0x1B, 0x64, 0x04); // Feed 4 lines
    rasterData.push(0x1D, 0x56, 0x42, 0x00); // Partial cut

    return new Uint8Array(rasterData);
  }

  /**
   * Convert DOM Element to high resolution Canvas using html2canvas with robust offscreen rendering
   */
  public async renderElementToCanvas(
    element: HTMLElement, 
    paperWidth: '58mm' | '80mm' = '80mm'
  ): Promise<HTMLCanvasElement> {
    const targetWidth = paperWidth === '58mm' ? 384 : 576;
    
    // Create offscreen container properly rendered by browser layout
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = `${targetWidth}px`;
    clone.style.maxWidth = `${targetWidth}px`;
    clone.style.background = '#ffffff';
    clone.style.color = '#000000';
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.opacity = '0.001';
    clone.style.zIndex = '-9999';
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);

    // Give browser time to layout and paint
    await new Promise(r => setTimeout(r, 250));

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: targetWidth,
        windowWidth: targetWidth,
        logging: false,
      });
      return canvas;
    } catch (e) {
      console.error('html2canvas render error:', e);
      // Fallback: draw actual text lines from element if html2canvas fails
      const textContent = clone.innerText || 'فاتورة مبيعات';
      const lines = textContent.split('\n').filter(l => l.trim().length > 0);
      
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = targetWidth;
      const lineHeight = 24;
      fallbackCanvas.height = Math.max(400, lines.length * lineHeight + 80);
      const ctx = fallbackCanvas.getContext('2d')!;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      
      let y = 40;
      for (const line of lines.slice(0, 50)) {
        ctx.fillText(line, targetWidth - 20, y);
        y += lineHeight;
      }
      return fallbackCanvas;
    } finally {
      if (clone.parentNode) {
        document.body.removeChild(clone);
      }
    }
  }

  /**
   * Print a given receipt DOM element directly to Bluetooth Printer
   */
  public async printReceiptViaBluetooth(
    element: HTMLElement,
    paperWidth: '58mm' | '80mm' = '80mm'
  ): Promise<{ success: boolean; error?: string }> {
    const isConnected = this.connectedDevice?.gatt?.connected && this.writeCharacteristic;
    if (!isConnected) {
      const conn = await this.connectBluetoothPrinter();
      if (!conn.success) return { success: false, error: conn.error };
    }

    try {
      const canvas = await this.renderElementToCanvas(element, paperWidth);
      const escposData = this.canvasToEscPosRaster(canvas);
      await this.sendChunks(escposData);
      return { success: true };
    } catch (e: any) {
      console.error('Bluetooth print receipt error:', e);
      return { success: false, error: e?.message || 'فشلت عملية الطباعة' };
    }
  }

  /**
   * One-Click Print via RawBT (Free Android Thermal Driver)
   * Supports direct Android Intent with Play Store fallback if not yet installed.
   */
  public async printReceiptViaRawBT(
    element: HTMLElement,
    paperWidth: '58mm' | '80mm' = '80mm'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const canvas = await this.renderElementToCanvas(element, paperWidth);
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

      // Android Intent with Play Store fallback
      const playStoreFallback = encodeURIComponent('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter');
      const intentUrl = `intent:data:image/png;base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=${playStoreFallback};end;`;

      const link = document.createElement('a');
      link.href = intentUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 1000);

      return { success: true };
    } catch (e: any) {
      console.error('RawBT print error, trying rawbt: scheme:', e);
      try {
        const canvas = await this.renderElementToCanvas(element, paperWidth);
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        window.location.href = `rawbt:data:image/png;base64,${base64}`;
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'تعذر تشغيل تطبيق RawBT' };
      }
    }
  }

  /**
   * Share ticket directly as a high resolution PNG image (Web Share API)
   * Allows sharing to Bluetooth devices, WhatsApp, or any printer apps installed on Android/iOS.
   */
  public async shareReceiptAsImage(
    element: HTMLElement,
    title: string = 'فاتورة مبيعات',
    paperWidth: '58mm' | '80mm' = '80mm'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const canvas = await this.renderElementToCanvas(element, paperWidth);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('فشل إنشاء صورة الفاتورة');

      const file = new File([blob], `ticket-${Date.now()}.png`, { type: 'image/png' });

      const nav: any = navigator;
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          title,
          text: title,
          files: [file],
        });
        return { success: true };
      } else {
        // Fallback: download PNG image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        return { success: true };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return { success: true };
      console.error('Share ticket image error:', e);
      return { success: false, error: e?.message || 'فشلت مشاركة الفاتورة' };
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService();
