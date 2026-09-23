import { Sale, Customer, Business } from '../types';
import { formatMAD } from '../i18n/locales';

/**
 * Format local Moroccan phone into international WhatsApp phone number
 * e.g. 0661234567 -> 212661234567
 */
export function formatToWhatsAppNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('06') || clean.startsWith('07')) {
    return '212' + clean.slice(1);
  }
  if (clean.startsWith('212')) {
    return clean;
  }
  return clean;
}

/**
 * Generate formatted WhatsApp message for Sale Receipt
 */
export function generateSaleWhatsAppText(sale: Sale, business: Business): string {
  const itemsText = sale.items
    .map(i => `▪ ${i.product_name} x ${i.quantity} = ${formatMAD(i.total)}`)
    .join('\n');

  return `🧾 *فاتورة مبيعات - ${business.name}*
رقم الفاتورة: ${sale.invoice_number}
التاريخ: ${new Date(sale.created_at).toLocaleDateString('ar-MA')}

*السلع والمشتريات:*
${itemsText}

----------------------------
المجموع: ${formatMAD(sale.subtotal)}
${sale.discount > 0 ? `الخصم: -${formatMAD(sale.discount)}\n` : ''}*الإجمالي الصافي: ${formatMAD(sale.total)}*
المدفوع: ${formatMAD(sale.amount_paid)}
${sale.amount_due > 0 ? `*المتبقي (كريدي): ${formatMAD(sale.amount_due)}*\n` : ''}
${business.ice ? `ICE: ${business.ice}\n` : ''}هاتف المحل: ${business.phone}
${business.receiptFooter || 'شكراً لتعاملكم معنا!'}`;
}

/**
 * Generate formatted WhatsApp message for Customer Statement of Account
 */
export function generateCustomerStatementWhatsAppText(
  customer: Customer,
  sales: Sale[],
  business: Business
): string {
  const customerSales = sales.filter(s => s.customer_id === customer.id).slice(0, 5);
  const salesSummary = customerSales.length > 0 
    ? customerSales.map(s => `▪ ${new Date(s.created_at).toLocaleDateString('ar-MA')} | ${s.invoice_number}: ${formatMAD(s.total)} (باقي: ${formatMAD(s.amount_due)})`).join('\n')
    : 'لا توجد فواتير حديثة مسجلة';

  return `📋 *كشف حساب العميل - ${business.name}*
العميل المحترم: *${customer.name}*
الهاتف: ${customer.phone}
التاريخ: ${new Date().toLocaleDateString('ar-MA')}

*ملخص الحساب الحالي:*
إجمالي المشتريات: ${formatMAD(customer.total_spent)}
🔴 *الرصيد المستحق (الكريدي الحالي): ${formatMAD(customer.total_debt)}*

*آخر المعاملات:*
${salesSummary}

يرجى تسوية المستحقات عند أقرب فرصة.
للاستفسار: ${business.phone}
شكراً جزيلاً!`;
}

/**
 * Open WhatsApp directly with pre-filled message
 */
export function openWhatsApp(phone: string, text: string): void {
  const targetNumber = formatToWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text);
  const url = targetNumber ? `https://wa.me/${targetNumber}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank');
}
