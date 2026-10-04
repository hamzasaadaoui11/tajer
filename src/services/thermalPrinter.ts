/**
 * Tajer Thermal & Bluetooth Printing Service
 * Specialized for mobile (Android/iOS) and desktop thermal POS printers (58mm / 80mm).
 * Supports:
 * 1. Web Bluetooth API (Direct connection to ESC/POS Bluetooth printers from Chrome/Edge)
 * 2. RawBT Android Driver (One-click thermal print helper for Android phones)
 * 3. High-Fidelity ESC/POS Raster Bit-Image rendering for flawless Arabic calligraphy
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
          error: 'في تطبيق الشاشة الرئيسية (PWA)، يمنع نظام الهاتف تشغيل خاصية Web Bluetooth المباشرة للمتصفح. يرجى استخدام طباعة نظام الهاتف (PDF) أو فتح الفاتورة في متصفح Google Chrome.'
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
        error: 'متصفحك لا يدعم خاصية Web Bluetooth. يرجى استخدام متصفح Google Chrome على هاتف أندرويد أو جهاز الكمبيوتر.'
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
   * Helper to recursively copy computed styles onto cloned elements
   * Resolves oklch and modern colors to rgb/hex so html2canvas never crashes
   */
  private copyComputedStyles(sourceEl: HTMLElement, targetEl: HTMLElement): void {
    const computed = window.getComputedStyle(sourceEl);

    // Box model & Layout
    targetEl.style.display = computed.display;
    targetEl.style.flexDirection = computed.flexDirection;
    targetEl.style.flexWrap = computed.flexWrap;
    targetEl.style.justifyContent = computed.justifyContent;
    targetEl.style.alignItems = computed.alignItems;
    targetEl.style.boxSizing = computed.boxSizing;
    targetEl.style.width = computed.width;
    targetEl.style.minWidth = computed.minWidth;
    targetEl.style.maxWidth = computed.maxWidth;
    targetEl.style.paddingTop = computed.paddingTop;
    targetEl.style.paddingRight = computed.paddingRight;
    targetEl.style.paddingBottom = computed.paddingBottom;
    targetEl.style.paddingLeft = computed.paddingLeft;
    targetEl.style.marginTop = computed.marginTop;
    targetEl.style.marginRight = computed.marginRight;
    targetEl.style.marginBottom = computed.marginBottom;
    targetEl.style.marginLeft = computed.marginLeft;

    // Typography (Enforce Cairo Arabic font, never break Arabic ligatures with letterSpacing)
    targetEl.style.fontFamily = computed.fontFamily.includes('Cairo')
      ? computed.fontFamily
      : "'Cairo', system-ui, -apple-system, sans-serif";
    targetEl.style.fontSize = computed.fontSize;
    targetEl.style.fontWeight = computed.fontWeight;
    targetEl.style.lineHeight = computed.lineHeight;
    targetEl.style.textAlign = computed.textAlign;
    targetEl.style.letterSpacing = 'normal';
    targetEl.style.whiteSpace = computed.whiteSpace;
    targetEl.style.direction = computed.direction;

    // Colors (Ensure rgb/hex, strictly avoid oklch)
    const color = computed.color;
    targetEl.style.color = (color && color.includes('oklch')) ? '#000000' : color;
    
    const bg = computed.backgroundColor;
    targetEl.style.backgroundColor = (bg && bg.includes('oklch')) ? 'transparent' : bg;

    // Borders
    targetEl.style.borderTopWidth = computed.borderTopWidth;
    targetEl.style.borderTopStyle = computed.borderTopStyle;
    const btc = computed.borderTopColor;
    targetEl.style.borderTopColor = (btc && btc.includes('oklch')) ? '#cbd5e1' : btc;

    targetEl.style.borderBottomWidth = computed.borderBottomWidth;
    targetEl.style.borderBottomStyle = computed.borderBottomStyle;
    const bbc = computed.borderBottomColor;
    targetEl.style.borderBottomColor = (bbc && bbc.includes('oklch')) ? '#cbd5e1' : bbc;

    targetEl.style.borderLeftWidth = computed.borderLeftWidth;
    targetEl.style.borderLeftStyle = computed.borderLeftStyle;
    const blc = computed.borderLeftColor;
    targetEl.style.borderLeftColor = (blc && blc.includes('oklch')) ? '#cbd5e1' : blc;

    targetEl.style.borderRightWidth = computed.borderRightWidth;
    targetEl.style.borderRightStyle = computed.borderRightStyle;
    const brc = computed.borderRightColor;
    targetEl.style.borderRightColor = (brc && brc.includes('oklch')) ? '#cbd5e1' : brc;

    targetEl.style.borderRadius = computed.borderRadius;

    // Tables
    if (sourceEl.tagName === 'TABLE') {
      targetEl.style.tableLayout = computed.tableLayout;
      targetEl.style.borderCollapse = computed.borderCollapse;
      targetEl.style.borderSpacing = computed.borderSpacing;
      targetEl.style.width = '100%';
    }

    // Recurse for all children
    const sourceChildren = Array.from(sourceEl.children) as HTMLElement[];
    const targetChildren = Array.from(targetEl.children) as HTMLElement[];
    for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
      this.copyComputedStyles(sourceChildren[i], targetChildren[i]);
    }
  }

  /**
   * Convert DOM Element to high resolution Canvas matching exact 80mm / 58mm dimensions
   * Inlines computed styles to prevent any unstyled layout or oklch parser issues
   */
  public async renderElementToCanvas(
    element: HTMLElement, 
    paperWidth: '58mm' | '80mm' = '80mm',
    scaleMultiplier: number = 3
  ): Promise<HTMLCanvasElement> {
    // 58mm paper: 384 dots (48mm printable area at 203 DPI)
    // 80mm paper: 576 dots (72mm printable area at 203 DPI)
    const baseWidth = paperWidth === '58mm' ? 384 : 576;
    const targetWidth = baseWidth * scaleMultiplier;
    
    // Measure element's rendered on-screen dimensions
    const rect = element.getBoundingClientRect();
    const sourceWidth = rect.width || (paperWidth === '58mm' ? 220 : 302);
    const sourceHeight = rect.height || element.scrollHeight;

    // Off-screen host container matching source element's natural width
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${sourceWidth}px`;
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-9999';

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = '#ffffff';

    container.appendChild(clone);
    document.body.appendChild(container);

    // Recursively inline all computed styles onto the clone
    this.copyComputedStyles(element, clone);

    // Allow DOM to settle
    await new Promise(r => setTimeout(r, 60));

    const finalHeight = clone.offsetHeight || sourceHeight;
    const targetScale = targetWidth / sourceWidth;

    try {
      const canvas = await html2canvas(clone, {
        scale: targetScale,
        width: sourceWidth,
        height: finalHeight,
        windowWidth: sourceWidth,
        windowHeight: finalHeight,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Keep font links (Google Fonts / Cairo), remove only app stylesheets with oklch
          const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          links.forEach(l => {
            const href = l.getAttribute('href') || '';
            if (!href.includes('fonts.googleapis.com') && !href.includes('fonts.gstatic.com')) {
              l.remove();
            }
          });
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(s => s.remove());
        }
      });
      return canvas;
    } catch (e: any) {
      console.error('html2canvas render error:', e);
      throw new Error('فشل توليد صورة الفاتورة: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  }

  /**
   * Export canvas directly as an exact thermal roll PDF (80mm or 58mm)
   */
  public downloadReceiptPdf(
    canvas: HTMLCanvasElement, 
    filename: string = 'ticket', 
    paperWidth: '58mm' | '80mm' = '80mm'
  ): void {
    const paperWidthMm = paperWidth === '58mm' ? 58 : 80;
    const ratio = canvas.height / canvas.width;
    const paperHeightMm = Math.max(30, Math.round(paperWidthMm * ratio));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperWidthMm, paperHeightMm]
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, paperWidthMm, paperHeightMm);
    pdf.save(`${filename}.pdf`);
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
      const canvas = await this.renderElementToCanvas(element, paperWidth, 1.5);
      const escposData = this.canvasToEscPosRaster(canvas);
      await this.sendChunks(escposData);
      return { success: true };
    } catch (e: any) {
      console.error('Bluetooth print receipt error:', e);
      return { success: false, error: e?.message || 'فشلت عملية الطباعة' };
    }
  }



  /**
   * Share ticket directly as a high resolution PNG image (Web Share API with mobile fallback preview window)
   */
  public async shareReceiptAsImage(
    element: HTMLElement,
    title: string = 'فاتورة مبيعات',
    paperWidth: '58mm' | '80mm' = '80mm'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const canvas = await this.renderElementToCanvas(element, paperWidth);
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('فشل إنشاء صورة الفاتورة');

      const file = new File([blob], `ticket-${Date.now()}.png`, { type: 'image/png' });

      const nav: any = navigator;
      let shared = false;

      // Try Web Share API with files if available
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            title,
            text: title,
            files: [file],
          });
          shared = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return { success: true };
          console.warn('Native share with files failed, trying fallback:', shareErr);
        }
      }

      // If native file share wasn't used or failed, open preview window for mobile users to save image
      if (!shared) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `facture-${Date.now()}.png`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 1000);

        try {
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                  body { margin: 0; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: white; padding: 20px; }
                  img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: white; margin-bottom: 20px; }
                  .btn { background: #0d9488; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
                </style>
              </head>
              <body>
                <p style="margin-bottom: 15px; font-size: 14px; color: #cbd5e1; text-align: center;">اضغط مطولاً على الصورة لحفظها في هاتفك، أو اضغط الزر أدناه:</p>
                <img src="${dataUrl}" alt="${title}" />
                <a href="${dataUrl}" download="facture.png" class="btn">تحميل الصورة في الهاتف</a>
              </body>
              </html>
            `);
            newWindow.document.close();
          }
        } catch (openErr) {
          console.warn('Could not open preview window:', openErr);
        }
      }

      return { success: true };
    } catch (e: any) {
      if (e?.name === 'AbortError') return { success: true };
      console.error('Share ticket image error:', e);
      return { success: false, error: e?.message || 'فشلت مشاركة الفاتورة' };
    }
  }
}

export const thermalPrinterService = new ThermalPrinterService();
