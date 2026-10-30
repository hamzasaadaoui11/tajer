-- ====================================================================
-- تاجر (TAJER) - كود SQL الشامل لجميع إعدادات وبيانات المحل في Supabase
-- يشمل: المعلومات العامة للمحل، الهوية البصرية، اللوجو، الفروع، الضرائب، والمعلومات القانونية والبنكية
-- انسخ هذا الكود بالكامل وضعه في: Supabase -> SQL Editor -> اضغط Run
-- ====================================================================

-- 1. التأكد من إنشاء جدول المحلات (businesses)
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
    logo_size NUMERIC DEFAULT 85,
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

-- 2. إضافة وتحديث جميع أعمدة جدول businesses إن كانت ناقصة (آمن ولا يمس أي بيانات قديمة)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT 'general_store';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ice TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS if_number TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rc TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS patente TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cnss TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_size NUMERIC DEFAULT 85;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stamp TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS invoice_color TEXT DEFAULT '#C02626';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS a4_footer TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS bank_info TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS capital TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. التأكد من إنشاء جدول الفروع (branches) لربط الهاتف والمدينة
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

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT true;

-- 4. التأكد من إنشاء جدول المستخدمين (users)
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

-- 5. فتح صلاحيات القراءة والحفظ والتعديل (RLS) لكل من anon و authenticated
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to businesses" ON public.businesses;
CREATE POLICY "Allow all access to businesses" 
ON public.businesses FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" 
ON public.branches FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to users" ON public.users;
CREATE POLICY "Allow all access to users" 
ON public.users FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 6. تفعيل المزامنة المباشرة (Realtime)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
