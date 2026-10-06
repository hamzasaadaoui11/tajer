/**
 * Access Control & Subscription Enforcement Service
 * Manages blocked/suspended accounts due to non-payment or expired licenses.
 */

// Permanent hardcoded blocked list requested by admin
const HARDCODED_BLOCKED_EMAILS = [
  'zozo@gmail.com'
];

export interface BlockReason {
  ar: string;
  fr: string;
}

export const DEFAULT_BLOCK_REASON: BlockReason = {
  ar: 'تم توقيف هذا الحساب مؤقتاً لعدم تسديد واجب الاشتراك. يرجى تسوية المستحقات المالية لإعادة تشغيل الحساب.',
  fr: 'Ce compte a été temporairement suspendu pour défaut de paiement. Veuillez régulariser votre abonnement pour débloquer votre accès.'
};

/**
 * Check if a given email is blocked from accessing the application
 */
export function isAccountBlocked(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // Check hardcoded blocked list
  if (HARDCODED_BLOCKED_EMAILS.includes(normalized)) {
    return true;
  }

  // Check dynamic localStorage blocked list (set by admin)
  try {
    const raw = localStorage.getItem('tajer_blocked_accounts');
    if (raw) {
      const dynamicList: string[] = JSON.parse(raw);
      if (Array.isArray(dynamicList)) {
        return dynamicList.some(e => typeof e === 'string' && e.trim().toLowerCase() === normalized);
      }
    }
  } catch (e) {
    console.warn('Error reading blocked accounts list:', e);
  }

  return false;
}

/**
 * Get block reason message according to language
 */
export function getBlockReason(lang: string = 'ar'): string {
  if (lang === 'fr') return DEFAULT_BLOCK_REASON.fr;
  return DEFAULT_BLOCK_REASON.ar;
}

/**
 * Dynamically block an email (stored in browser/admin storage)
 */
export function blockEmail(email: string): void {
  try {
    const raw = localStorage.getItem('tajer_blocked_accounts') || '[]';
    const list: string[] = JSON.parse(raw);
    const normalized = email.trim().toLowerCase();
    if (!list.includes(normalized)) {
      list.push(normalized);
      localStorage.setItem('tajer_blocked_accounts', JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to block email:', e);
  }
}

/**
 * Dynamically unblock an email
 */
export function unblockEmail(email: string): void {
  try {
    const raw = localStorage.getItem('tajer_blocked_accounts') || '[]';
    const list: string[] = JSON.parse(raw);
    const normalized = email.trim().toLowerCase();
    const updated = list.filter(e => e.trim().toLowerCase() !== normalized);
    localStorage.setItem('tajer_blocked_accounts', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to unblock email:', e);
  }
}
