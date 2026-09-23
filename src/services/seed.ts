import { Category, Product, Customer, Supplier, MerchantActivity } from '../types';

export const ACTIVITY_CATEGORIES: Record<MerchantActivity, string[]> = {
  grocery: [
    'مشروبات وعصائر',
    'معلبات وتصبير',
    'حليب ومشتقاته وأجبان',
    'بسكويت وشوكولاتة',
    'مواد التنظيف والغسيل',
    'شاي وقهوة وسكر',
    'مياه معدنية ومشروبات غازية',
    'توابل وبقوليات',
    'عناية شخصية'
  ],
  clothing: [
    'ملابس رجالية',
    'ملابس نسائية',
    'ملابس أطفال',
    'أحذية وصنادل',
    'جلابة وقندورة مغربية',
    'إكسسوارات وحقائب'
  ],
  electronics: [
    'هواتف ذكية وملحقاتها',
    'شواحن وكابلات',
    'سماعات وأجهزة صوت',
    'أجهزة منزلية',
    'حواسيب وملحقاتها'
  ],
  food_store: [
    'زيوت ودهون',
    'دقيق وسميد وعجائن',
    'أرز وسكر وقطاني',
    'شاي وقهوة',
    'معلبات وتونة'
  ],
  spare_parts: [
    'فرامل وتجهيزات',
    'زيوت وفلاتر ومحركات',
    'إطارات وعجلات',
    'أضواء وكهرباء سيارات',
    'قطع ميكانيكية'
  ],
  pharmacy: [
    'مكملات غذائية وفيتامينات',
    'عناية بالبشرة والوجه',
    'عناية بالأطفال وحليب رضّع',
    'إسعافات أولية وضمادات',
    'نظافة شخصية'
  ],
  restaurant: [
    'وجبات رئيسية وسندويشات',
    'طواجن ومشاوي مغربية',
    'مقبلات وسلطات',
    'مشروبات وعصائر طازجة',
    'حلويات وتحليات'
  ],
  cafe: [
    'قهوة ومشروبات ساخنة',
    'عصائر طبيعية ومثلجات',
    'فطور مغربي وحرشة وبغرير',
    'حلويات ومخبوزات',
    'مياه ومشروبات منعشة'
  ],
  general_store: [
    'أغذية عامة',
    'لوازم منزلية',
    'تنظيف وعناية',
    'قرطاسية وأدوات مكتبية',
    'متفرقات'
  ],
  other: [
    'منتجات عامة',
    'خدمات',
    'سلع متنوعة'
  ]
};

export function generateSeedData(businessId: string, branchId: string) {
  const categories: Category[] = [
    { id: 'cat-1', business_id: businessId, name: 'حليب ومشتقاته', icon: 'milk', color: '#0284c7', created_at: new Date().toISOString() },
    { id: 'cat-2', business_id: businessId, name: 'مشروبات وعصائر', icon: 'cup', color: '#ea580c', created_at: new Date().toISOString() },
    { id: 'cat-3', business_id: businessId, name: 'شاي وقهوة وسكر', icon: 'coffee', color: '#d97706', created_at: new Date().toISOString() },
    { id: 'cat-4', business_id: businessId, name: 'بسكويت وشوكولاتة', icon: 'cookie', color: '#8b5cf6', created_at: new Date().toISOString() },
    { id: 'cat-5', business_id: businessId, name: 'مواد التنظيف', icon: 'sparkles', color: '#10b981', created_at: new Date().toISOString() },
  ];

  const suppliers: Supplier[] = [];

  const customers: Customer[] = [];

  const products: Product[] = [
    {
      id: 'prod-1',
      business_id: businessId,
      branch_id: branchId,
      name: 'حليب معقم كامل الدسم سليم 1 لتر',
      sku: 'MILK-SLIM-1L',
      barcode: '6111234567890',
      category_id: 'cat-1',
      unit: 'علبة',
      purchase_price: 8.50,
      sale_price: 10.00,
      wholesale_price: 9.20,
      current_stock: 45,
      min_stock: 12,
      supplier_id: 'sup-1',
      tax_rate: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-2',
      business_id: businessId,
      branch_id: branchId,
      name: 'مياه معدنية طبيعية سيدي علي 1.5 لتر',
      sku: 'WATER-SA-15L',
      barcode: '6111245678901',
      category_id: 'cat-2',
      unit: 'قنينة',
      purchase_price: 4.80,
      sale_price: 6.00,
      wholesale_price: 5.30,
      current_stock: 60,
      min_stock: 15,
      supplier_id: 'sup-2',
      tax_rate: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-3',
      business_id: businessId,
      branch_id: branchId,
      name: 'شاي ممتاز الصويري 200 غرام',
      sku: 'TEA-SWR-200G',
      barcode: '6111256789012',
      category_id: 'cat-3',
      unit: 'علبة',
      purchase_price: 13.00,
      sale_price: 16.50,
      wholesale_price: 15.00,
      current_stock: 28,
      min_stock: 8,
      tax_rate: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-4',
      business_id: businessId,
      branch_id: branchId,
      name: 'قهوة مطحونة سمر 250 غرام',
      sku: 'COF-SMR-250G',
      barcode: '6111267890123',
      category_id: 'cat-3',
      unit: 'باكي',
      purchase_price: 21.00,
      sale_price: 26.00,
      wholesale_price: 23.50,
      current_stock: 18,
      min_stock: 6,
      tax_rate: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-5',
      business_id: businessId,
      branch_id: branchId,
      name: 'بسكويت هنريس الأصلي 42 غرام',
      sku: 'BSC-HEN-42G',
      barcode: '6111278901234',
      category_id: 'cat-4',
      unit: 'قطعة',
      purchase_price: 1.50,
      sale_price: 2.00,
      wholesale_price: 1.75,
      current_stock: 5, // low stock test
      min_stock: 10,
      tax_rate: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-6',
      business_id: businessId,
      branch_id: branchId,
      name: 'سائل غسيل الأواني ماجيك ليمون 750 مل',
      sku: 'CLN-MGK-750M',
      barcode: '6111289012345',
      category_id: 'cat-5',
      unit: 'قارورة',
      purchase_price: 11.50,
      sale_price: 15.00,
      wholesale_price: 13.00,
      current_stock: 22,
      min_stock: 5,
      tax_rate: 20,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return { categories, suppliers, customers, products };
}
