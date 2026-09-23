// Web Audio Barcode scanner beep feedback
export function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.debug('Audio context error', e);
  }
}

// Generate random unique Moroccan standard EAN-13 style barcode starting with 611 (Morocco GS1 prefix)
export function generateRandomBarcode(): string {
  const prefix = '611';
  let body = '';
  for (let i = 0; i < 9; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  const raw12 = prefix + body;
  
  // Calculate EAN-13 checksum digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return raw12 + checksum.toString();
}
