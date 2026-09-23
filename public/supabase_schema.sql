-- ====================================================================
-- تاجر (TAJER) - SUPABASE POSTGRESQL COMPLETE DATABASE SCHEMA
-- Multi-Tenant, Offline-First Sync Ready, Row-Level Security (RLS)
-- Covers ALL App Modules: Store, Products, Sales, Debts, Purchases, 
-- Expenses, Cash Register, Stock Movements, Customers, and Suppliers.
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table (بيانات المحل والشعار والمعلومات القانونية والضريبية)
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    activity TEXT DEFAULT 'general_store',
    currency TEXT DEFAULT 'MAD',
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_number TEXT,
    rc TEXT,
    patente TEXT,
    cnss TEXT,
    logo TEXT,
    stamp TEXT,
    invoice_color TEXT DEFAULT '#C02626',
    receipt_footer TEXT,
    a4_footer TEXT,
    bank_info TEXT,
    capital TEXT,
    email TEXT,
    tax_enabled BOOLEAN DEFAULT false,
    default_tax_rate NUMERIC(5,2) DEFAULT 20.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Branches Table (الفروع)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    is_main BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users Table (مستخدمي المتجر والأدوار)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'CASHIER',
    pin_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Categories Table (فئات السلع)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT DEFAULT '#0d9488',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products Table (السلع والمخزون والأسعار والباركود)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    category_id TEXT,
    barcode TEXT,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12,2),
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    unit TEXT DEFAULT 'قطعة',
    tax_rate NUMERIC(5,2) DEFAULT 20.00,
    supplier_id TEXT,
    expiry_date TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customers Table (الزبائن والكريدي)
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_number TEXT,
    notes TEXT,
    credit_limit NUMERIC(15,2) DEFAULT 0.00,
    total_spent NUMERIC(15,2) DEFAULT 0.00,
    total_debt NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Suppliers Table (الموردين والشركات الموزعة)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    ice TEXT,
    if_number TEXT,
    notes TEXT,
    total_purchased NUMERIC(15,2) DEFAULT 0.00,
    total_debt NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sales Table (المبيعات وفواتير نقاط البيع)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    invoice_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT DEFAULT 'زبون عام',
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    discount NUMERIC(15,2) DEFAULT 0.00,
    tax_total NUMERIC(15,2) DEFAULT 0.00,
    total NUMERIC(15,2) DEFAULT 0.00,
    amount_paid NUMERIC(15,2) DEFAULT 0.00,
    amount_due NUMERIC(15,2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'CASH',
    status TEXT DEFAULT 'COMPLETED',
    user_name TEXT DEFAULT 'كاشير',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Sale Returns Table (مرتجعات المبيعات)
CREATE TABLE IF NOT EXISTS public.sale_returns (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    sale_id TEXT,
    invoice_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_refund NUMERIC(15,2) DEFAULT 0.00,
    reason TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Purchases Table (فواتير المشتريات وإدخال السلع)
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    invoice_number TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    extra_fees NUMERIC(15,2) DEFAULT 0.00,
    discount NUMERIC(15,2) DEFAULT 0.00,
    total NUMERIC(15,2) DEFAULT 0.00,
    amount_paid NUMERIC(15,2) DEFAULT 0.00,
    amount_due NUMERIC(15,2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'CASH',
    user_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Purchase Returns Table (مرتجعات المشتريات للموردين)
CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    purchase_id TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_refund NUMERIC(15,2) DEFAULT 0.00,
    reason TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Expenses Table (المصاريف اليومية والمحلية)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    category TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'CASH',
    description TEXT,
    user_name TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Cash Transactions Table (حركات الصندوق والكاسة)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    balance_after NUMERIC(15,2) DEFAULT 0.00,
    reference TEXT,
    description TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Payment Transactions Table (تسديدات الكريدي والديون)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    reference_id TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'CASH',
    notes TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Stock Movements Table (سجل حركات المخزون)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    branch_id TEXT,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity_before NUMERIC(12,2) DEFAULT 0.00,
    quantity_change NUMERIC(12,2) DEFAULT 0.00,
    quantity_after NUMERIC(12,2) DEFAULT 0.00,
    reference_id TEXT,
    notes TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Allows seamless read/write for authenticated users & anon sync
-- ====================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'businesses', 'branches', 'users', 'categories', 'products', 
            'customers', 'suppliers', 'sales', 'sale_returns', 'purchases', 
            'purchase_returns', 'expenses', 'cash_transactions', 
            'payment_transactions', 'stock_movements'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Allow all anon and auth ' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', 'Allow all anon and auth ' || tbl, tbl);
    END LOOP;
END $$;

-- ====================================================================
-- PERFORMANCE INDEXES (Optimized for Multi-Tenant querying)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_id ON public.businesses (id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products (business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON public.suppliers (business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business ON public.sales (business_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales (invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON public.purchases (business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON public.expenses (business_id);
CREATE INDEX IF NOT EXISTS idx_cash_business ON public.cash_transactions (business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payment_transactions (business_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_business ON public.stock_movements (business_id);
