-- ====================================================================
-- حل مشكلة مزامنة الحذف والـ Realtime بين الأجهزة (TAJER REALTIME & DELETE FIX)
-- ====================================================================
-- تعليمات التشغيل:
-- 1. افتح مشروعك في Supabase (https://supabase.com/dashboard)
-- 2. اذهب إلى SQL Editor من القائمة الجانبية اليسرى
-- 3. انقر على "New Query"، الصق هذا الكود كاملاً، ثم اضغط على زر "Run" الأخضر.
-- ====================================================================

-- الخطوة 1: تمكين REPLICA IDENTITY FULL
-- ضروري جداً لكي يرسل Supabase بيانات السجل المحذوف القديم (payload.old) مع الـ ID
ALTER TABLE IF EXISTS public.products REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.categories REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.customers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sales REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.sale_returns REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.purchases REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.expenses REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.cash_transactions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.payment_transactions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.stock_movements REPLICA IDENTITY FULL;

-- الخطوة 2: تفعيل الـ Realtime للجداول الأساسية
-- (بدون هذه الخطوة، لا يرسل Supabase أي إشعار فوري للأجهزة الأخرى عند الحذف أو التعديل)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- الخطوة 3: إنشاء جدول السجلات المحذوفة (deleted_records)
-- يضمن حذف أي منتج أو زبون أو مورد حتى لو كان الجهاز الآخر مغلقاً أو بدون إنترنت أثناء عملية الحذف
CREATE TABLE IF NOT EXISTS public.deleted_records (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_del_rec_biz ON public.deleted_records (business_id, table_name);

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all anon and auth deleted_records" ON public.deleted_records;
CREATE POLICY "Allow all anon and auth deleted_records" ON public.deleted_records FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.deleted_records REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deleted_records;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- الخطوة 4: مشغل قاعدة البيانات التلقائي (PostgreSQL Trigger)
-- كلما تم حذف منتج أو صنف أو زبون من Supabase، يسجل المشغل تلقائياً في deleted_records
CREATE OR REPLACE FUNCTION public.handle_tajer_record_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.deleted_records (id, table_name, record_id, business_id, deleted_at)
    VALUES (
        'del-' || TG_TABLE_NAME || '-' || OLD.id || '-' || extract(epoch from clock_timestamp())::bigint,
        TG_TABLE_NAME,
        OLD.id,
        COALESCE(OLD.business_id, 'default'),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tajer_delete_product ON public.products;
CREATE TRIGGER trg_tajer_delete_product
AFTER DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_tajer_record_deletion();

DROP TRIGGER IF EXISTS trg_tajer_delete_category ON public.categories;
CREATE TRIGGER trg_tajer_delete_category
AFTER DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.handle_tajer_record_deletion();

DROP TRIGGER IF EXISTS trg_tajer_delete_customer ON public.customers;
CREATE TRIGGER trg_tajer_delete_customer
AFTER DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_tajer_record_deletion();

DROP TRIGGER IF EXISTS trg_tajer_delete_supplier ON public.suppliers;
CREATE TRIGGER trg_tajer_delete_supplier
AFTER DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.handle_tajer_record_deletion();

-- الخطوة 5: التحقق من صلاحيات الأمان (RLS) للسماح بالحذف والقراءة والكتابة
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
            'payment_transactions', 'stock_movements', 'deleted_records'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Allow all anon and auth ' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', 'Allow all anon and auth ' || tbl, tbl);
    END LOOP;
END $$;
