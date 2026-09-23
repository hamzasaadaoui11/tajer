export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SELLER' | 'STOCK_MANAGER';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHEQUE' | 'CREDIT' | 'SPLIT';

export type SaleStatus = 'COMPLETED' | 'CREDIT' | 'PARTIAL' | 'CANCELLED';

export type StockMovementType = 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'INITIAL';

export type MerchantActivity = 
  | 'grocery' // بقالة
  | 'clothing' // ملابس
  | 'electronics' // إلكترونيات
  | 'food_store' // مواد غذائية
  | 'spare_parts' // قطع الغيار
  | 'pharmacy' // صيدلية / شبه صيدلية
  | 'restaurant' // مطعم
  | 'cafe' // مقهى
  | 'general_store' // متجر عام
  | 'other';

export interface Business {
  id: string;
  name: string;
  activity: MerchantActivity;
  currency: string;
  phone: string;
  address: string;
  city: string;
  ice?: string; // Identifiant Commun de l'Entreprise (Morocco)
  ifNumber?: string; // Identifiant Fiscal
  rc?: string; // Registre de Commerce
  patente?: string; // Taxe Professionnelle
  cnss?: string;
  logo?: string;
  stamp?: string; // Cachet / Signature de l'entreprise (Base64)
  invoiceColor?: string; // Hex color for invoices (default '#C02626')
  receiptFooter?: string;
  a4Footer?: string; // Pied de page personnalisé pour Facture A4
  bankInfo?: string; // RIB / Nom de la banque
  capital?: string; // Capital social (ex: 100.000 DH)
  email?: string;
  taxEnabled: boolean;
  defaultTaxRate: number; // e.g. 20%
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  is_main: boolean;
  created_at: string;
}

export interface User {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  pin_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  ice?: string;
  ifNumber?: string;
  notes?: string;
  total_spent: number;
  total_debt: number; // مبلغ الدين المستحق
  credit_limit?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  ice?: string;
  ifNumber?: string;
  notes?: string;
  total_purchased: number;
  total_debt: number; // المبلغ المستحق للمورد
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  unit: string; // قطعة، كغ، لتر، متر، علبة
  purchase_price: number;
  sale_price: number;
  wholesale_price?: number;
  current_stock: number;
  min_stock: number;
  supplier_id?: string;
  tax_rate: number;
  description?: string;
  expiry_date?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  product_name: string;
  type: StockMovementType;
  quantity_before: number;
  quantity_change: number; // positive or negative
  quantity_after: number;
  reference_id?: string; // sale_id or purchase_id
  notes?: string;
  user_name: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  business_id: string;
  branch_id: string;
  product_id: string;
  system_qty: number;
  counted_qty: number;
  difference: number;
  reason: string;
  user_name: string;
  created_at: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  purchase_price: number; // stored at time of sale to compute exact profit
  discount: number; // amount
  subtotal: number;
  tax_amount: number;
  total: number;
}

export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_due: number; // الدين المتبقي
  payment_method: PaymentMethod;
  status: SaleStatus;
  user_name: string;
  notes?: string;
  created_at: string;
}

export interface SaleReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface SaleReturn {
  id: string;
  business_id: string;
  branch_id: string;
  sale_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  items: SaleReturnItem[];
  total_refund: number;
  reason: string;
  user_name: string;
  created_at: string;
}

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface Purchase {
  id: string;
  business_id: string;
  branch_id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseItem[];
  subtotal: number;
  extra_fees: number;
  discount: number;
  total: number;
  amount_paid: number;
  amount_due: number; // المستحق للمورد
  payment_method: PaymentMethod;
  user_name: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseReturn {
  id: string;
  business_id: string;
  branch_id: string;
  purchase_id: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseItem[];
  total_refund: number;
  reason: string;
  user_name: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  business_id: string;
  branch_id: string;
  type: 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT';
  entity_id: string; // customer_id or supplier_id
  entity_name: string;
  reference_id?: string; // invoice number or sale id
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  user_name: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  icon?: string;
}

export interface Expense {
  id: string;
  business_id: string;
  branch_id: string;
  category: string;
  amount: number;
  payment_method: PaymentMethod;
  description: string;
  user_name: string;
  receipt_url?: string;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  business_id: string;
  branch_id: string;
  type: 'IN' | 'OUT';
  category: 'SALE' | 'PURCHASE' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'EXPENSE' | 'REFUND' | 'MANUAL_IN' | 'MANUAL_OUT';
  amount: number;
  balance_after: number;
  reference?: string;
  description: string;
  user_name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  business_id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'DEBT_DUE' | 'EXPIRED' | 'SYSTEM';
  read: boolean;
  created_at: string;
}

export interface PrintSettings {
  paperSize: '58mm' | '80mm' | 'A4';
  autoPrintOnSale: boolean;
  showLogo: boolean;
  showTaxId: boolean; // ICE / IF
  showBarcode: boolean;
  footerNotes: string;
  copies: number;
}
