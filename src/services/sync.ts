import { getSupabase, isSupabaseConfigured } from './supabase';
import { db } from './db';

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
}

class SyncEngine {
  private isSyncing = false;

  public async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, processed: 0, errors: ['المزامنة جارية بالفعل (Synchronisation en cours)'] };
    }

    if (!navigator.onLine) {
      return { success: false, processed: 0, errors: ['الجهاز غير متصل بالإنترنت حالياً (Mode hors-ligne)'] };
    }

    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured()) {
      return { 
        success: false, 
        processed: 0, 
        errors: ['يرجى إدخال إعدادات Supabase (Project URL & Anon Key) في الإعدادات أولاً.'] 
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let processed = 0;

    try {
      const init = db.initialize();
      const bizId = init.business.id;
      const branchId = init.branch.id;

      // 1. Push Business Profile & Settings
      try {
        const bizPayload = {
          id: init.business.id,
          name: init.business.name,
          activity: init.business.activity,
          currency: init.business.currency || 'MAD',
          phone: init.business.phone || null,
          address: init.business.address || null,
          city: init.business.city || null,
          ice: init.business.ice || null,
          if_number: init.business.ifNumber || null,
          rc: init.business.rc || null,
          patente: init.business.patente || null,
          cnss: init.business.cnss || null,
          logo: init.business.logo || null,
          stamp: init.business.stamp || null,
          invoice_color: init.business.invoiceColor || '#C02626',
          receipt_footer: init.business.receiptFooter || null,
          a4_footer: init.business.a4Footer || null,
          bank_info: init.business.bankInfo || null,
          capital: init.business.capital || null,
          email: init.business.email || null,
          tax_enabled: init.business.taxEnabled || false,
          default_tax_rate: init.business.defaultTaxRate ?? 20,
          updated_at: new Date().toISOString(),
        };
        const { error: bizErr } = await supabase.from('businesses').upsert(bizPayload);
        if (bizErr && !bizErr.message.includes('does not exist')) {
          errors.push(`المتجر (Business): ${bizErr.message}`);
        } else if (!bizErr) {
          processed += 1;
        }
      } catch (e: any) {
        console.warn('Sync business error:', e);
      }

      // 2. Push Branches
      try {
        const branches = db.getBranches(bizId);
        if (branches.length > 0) {
          const branchPayload = branches.map(b => ({
            id: b.id,
            business_id: b.business_id,
            name: b.name,
            city: b.city || null,
            address: b.address || null,
            phone: b.phone || null,
            is_main: b.is_main ?? true,
            created_at: b.created_at || new Date().toISOString(),
          }));
          const { error: brErr } = await supabase.from('branches').upsert(branchPayload);
          if (brErr && !brErr.message.includes('does not exist')) {
            errors.push(`الفروع (Branches): ${brErr.message}`);
          }
        }
      } catch (e: any) {
        console.warn('Sync branches error:', e);
      }

      // 3. Push Categories
      const localCategories = db.getCategories(bizId);
      if (localCategories.length > 0) {
        const catPayload = localCategories.map(c => ({
          id: c.id,
          business_id: c.business_id,
          name: c.name,
          color: c.color || '#0d9488',
          icon: c.icon || 'tag',
          created_at: c.created_at || new Date().toISOString(),
        }));
        const { error: catErr } = await supabase.from('categories').upsert(catPayload);
        if (catErr && !catErr.message.includes('does not exist')) {
          errors.push(`الفئات (Categories): ${catErr.message}`);
        } else if (!catErr) {
          processed += localCategories.length;
        }
      }

      // 4. Push Products
      const localProducts = db.getProducts(bizId, branchId);
      if (localProducts.length > 0) {
        const prodPayload = localProducts.map(p => ({
          id: p.id,
          business_id: p.business_id,
          branch_id: p.branch_id,
          category_id: p.category_id || null,
          barcode: p.barcode || null,
          sku: p.sku || null,
          name: p.name,
          description: p.description || null,
          purchase_price: p.purchase_price || 0,
          sale_price: p.sale_price || 0,
          wholesale_price: p.wholesale_price || null,
          current_stock: p.current_stock || 0,
          min_stock: p.min_stock || 0,
          unit: p.unit || 'قطعة',
          tax_rate: p.tax_rate ?? 20,
          supplier_id: p.supplier_id || null,
          expiry_date: p.expiry_date || null,
          image_url: p.image_url || null,
          is_active: p.is_active !== false,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: prodErr } = await supabase.from('products').upsert(prodPayload);
        if (prodErr && !prodErr.message.includes('does not exist')) {
          errors.push(`السلع (Products): ${prodErr.message}`);
        } else if (!prodErr) {
          processed += localProducts.length;
        }
      }

      // 5. Push Customers & Debts
      const localCustomers = db.getCustomers(bizId);
      if (localCustomers.length > 0) {
        const custPayload = localCustomers.map(c => ({
          id: c.id,
          business_id: c.business_id,
          name: c.name,
          phone: c.phone || '',
          address: c.address || null,
          city: c.city || null,
          ice: c.ice || null,
          if_number: c.ifNumber || null,
          notes: c.notes || null,
          credit_limit: c.credit_limit || 0,
          total_spent: c.total_spent || 0,
          total_debt: c.total_debt || 0,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: custErr } = await supabase.from('customers').upsert(custPayload);
        if (custErr && !custErr.message.includes('does not exist')) {
          errors.push(`الزبائن (Customers): ${custErr.message}`);
        } else if (!custErr) {
          processed += localCustomers.length;
        }
      }

      // 6. Push Suppliers & Debts
      const localSuppliers = db.getSuppliers(bizId);
      if (localSuppliers.length > 0) {
        const suppPayload = localSuppliers.map(s => ({
          id: s.id,
          business_id: s.business_id,
          name: s.name,
          phone: s.phone || '',
          address: s.address || null,
          city: s.city || null,
          ice: s.ice || null,
          if_number: s.ifNumber || null,
          notes: s.notes || null,
          total_purchased: s.total_purchased || 0,
          total_debt: s.total_debt || 0,
          created_at: s.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: suppErr } = await supabase.from('suppliers').upsert(suppPayload);
        if (suppErr && !suppErr.message.includes('does not exist')) {
          errors.push(`الموردين (Suppliers): ${suppErr.message}`);
        } else if (!suppErr) {
          processed += localSuppliers.length;
        }
      }

      // 7. Push Sales & Invoices
      const localSales = db.getSales(bizId, branchId);
      if (localSales.length > 0) {
        const salesPayload = localSales.map(s => ({
          id: s.id,
          business_id: s.business_id,
          branch_id: s.branch_id,
          invoice_number: s.invoice_number,
          customer_id: s.customer_id || null,
          customer_name: s.customer_name || 'زبون عام',
          items: s.items || [],
          subtotal: s.subtotal || 0,
          discount: s.discount || 0,
          tax_total: s.tax_total || 0,
          total: s.total || 0,
          amount_paid: s.amount_paid || 0,
          amount_due: s.amount_due || 0,
          payment_method: s.payment_method || 'CASH',
          status: s.status || 'COMPLETED',
          user_name: s.user_name || 'كاشير',
          notes: s.notes || null,
          created_at: s.created_at || new Date().toISOString(),
        }));
        const { error: salesErr } = await supabase.from('sales').upsert(salesPayload);
        if (salesErr && !salesErr.message.includes('does not exist')) {
          errors.push(`المبيعات (Sales): ${salesErr.message}`);
        } else if (!salesErr) {
          processed += localSales.length;
        }
      }

      // 8. Push Sale Returns
      const localSaleReturns = db.getSaleReturns(bizId);
      if (localSaleReturns.length > 0) {
        const saleReturnPayload = localSaleReturns.map(sr => ({
          id: sr.id,
          business_id: sr.business_id,
          branch_id: sr.branch_id,
          sale_id: sr.sale_id,
          invoice_number: sr.invoice_number,
          customer_id: sr.customer_id || null,
          customer_name: sr.customer_name || null,
          items: sr.items || [],
          total_refund: sr.total_refund || 0,
          reason: sr.reason || '',
          user_name: sr.user_name || '',
          created_at: sr.created_at || new Date().toISOString(),
        }));
        const { error: srErr } = await supabase.from('sale_returns').upsert(saleReturnPayload);
        if (srErr && !srErr.message.includes('does not exist')) {
          errors.push(`مرتجعات المبيعات (Sale Returns): ${srErr.message}`);
        }
      }

      // 9. Push Purchases
      const localPurchases = db.getPurchases(bizId, branchId);
      if (localPurchases.length > 0) {
        const purchasesPayload = localPurchases.map(p => ({
          id: p.id,
          business_id: p.business_id,
          branch_id: p.branch_id,
          invoice_number: p.invoice_number,
          supplier_id: p.supplier_id || null,
          supplier_name: p.supplier_name || 'مورد عام',
          items: p.items || [],
          subtotal: p.subtotal || 0,
          extra_fees: p.extra_fees || 0,
          discount: p.discount || 0,
          total: p.total || 0,
          amount_paid: p.amount_paid || 0,
          amount_due: p.amount_due || 0,
          payment_method: p.payment_method || 'CASH',
          user_name: p.user_name || 'مسؤول المشتريات',
          notes: p.notes || null,
          created_at: p.created_at || new Date().toISOString(),
        }));
        const { error: purchErr } = await supabase.from('purchases').upsert(purchasesPayload);
        if (purchErr && !purchErr.message.includes('does not exist')) {
          errors.push(`المشتريات (Purchases): ${purchErr.message}`);
        } else if (!purchErr) {
          processed += localPurchases.length;
        }
      }

      // 10. Push Purchase Returns
      const localPurchaseReturns = db.getPurchaseReturns(bizId);
      if (localPurchaseReturns.length > 0) {
        const purchReturnPayload = localPurchaseReturns.map(pr => ({
          id: pr.id,
          business_id: pr.business_id,
          branch_id: pr.branch_id,
          purchase_id: pr.purchase_id,
          supplier_id: pr.supplier_id,
          supplier_name: pr.supplier_name,
          items: pr.items || [],
          total_refund: pr.total_refund || 0,
          reason: pr.reason || '',
          user_name: pr.user_name || '',
          created_at: pr.created_at || new Date().toISOString(),
        }));
        const { error: prErr } = await supabase.from('purchase_returns').upsert(purchReturnPayload);
        if (prErr && !prErr.message.includes('does not exist')) {
          errors.push(`مرتجعات المشتريات (Purchase Returns): ${prErr.message}`);
        }
      }

      // 11. Push Expenses
      const localExpenses = db.getExpenses(bizId, branchId);
      if (localExpenses.length > 0) {
        const expPayload = localExpenses.map(e => ({
          id: e.id,
          business_id: e.business_id,
          branch_id: e.branch_id,
          category: e.category,
          amount: e.amount || 0,
          payment_method: e.payment_method || 'CASH',
          description: e.description || null,
          user_name: e.user_name || 'مسؤول',
          receipt_url: e.receipt_url || null,
          created_at: e.created_at || new Date().toISOString(),
        }));
        const { error: expErr } = await supabase.from('expenses').upsert(expPayload);
        if (expErr && !expErr.message.includes('does not exist')) {
          errors.push(`المصاريف (Expenses): ${expErr.message}`);
        } else if (!expErr) {
          processed += localExpenses.length;
        }
      }

      // 12. Push Cash Transactions
      const localCash = db.getCashTransactions(bizId, branchId);
      if (localCash.length > 0) {
        const cashPayload = localCash.map(c => ({
          id: c.id,
          business_id: c.business_id,
          branch_id: c.branch_id,
          type: c.type,
          category: c.category,
          amount: c.amount || 0,
          balance_after: c.balance_after || 0,
          reference: c.reference || null,
          description: c.description || null,
          user_name: c.user_name || 'كاشير',
          created_at: c.created_at || new Date().toISOString(),
        }));
        const { error: cashErr } = await supabase.from('cash_transactions').upsert(cashPayload);
        if (cashErr && !cashErr.message.includes('does not exist')) {
          errors.push(`الصندوق (Cash): ${cashErr.message}`);
        } else if (!cashErr) {
          processed += localCash.length;
        }
      }

      // 13. Push Payment Transactions (Debt repayments)
      const localPayments = db.getPaymentTransactions(bizId);
      if (localPayments.length > 0) {
        const payPayload = localPayments.map(p => ({
          id: p.id,
          business_id: p.business_id,
          branch_id: p.branch_id,
          type: p.type,
          entity_id: p.entity_id,
          entity_name: p.entity_name,
          reference_id: p.reference_id || null,
          amount: p.amount || 0,
          payment_method: p.payment_method || 'CASH',
          notes: p.notes || null,
          user_name: p.user_name || 'كاشير',
          created_at: p.created_at || new Date().toISOString(),
        }));
        const { error: payErr } = await supabase.from('payment_transactions').upsert(payPayload);
        if (payErr && !payErr.message.includes('does not exist')) {
          errors.push(`تسديدات الديون (Payments): ${payErr.message}`);
        } else if (!payErr) {
          processed += localPayments.length;
        }
      }

      // 14. Push Stock Movements
      const localStockMovements = db.getStockMovements(bizId, branchId);
      if (localStockMovements.length > 0) {
        const smPayload = localStockMovements.slice(0, 500).map(sm => ({
          id: sm.id,
          business_id: sm.business_id,
          branch_id: sm.branch_id,
          product_id: sm.product_id,
          product_name: sm.product_name,
          type: sm.type,
          quantity_before: sm.quantity_before || 0,
          quantity_change: sm.quantity_change || 0,
          quantity_after: sm.quantity_after || 0,
          reference_id: sm.reference_id || null,
          notes: sm.notes || null,
          user_name: sm.user_name || '',
          created_at: sm.created_at || new Date().toISOString(),
        }));
        const { error: smErr } = await supabase.from('stock_movements').upsert(smPayload);
        if (smErr && !smErr.message.includes('does not exist')) {
          errors.push(`حركات المخزون (Stock Movements): ${smErr.message}`);
        }
      }

      // 15. Pull remote products from Supabase
      const { data: remoteProducts, error: pullErr } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', bizId);

      if (!pullErr && remoteProducts && remoteProducts.length > 0) {
        for (const rp of remoteProducts) {
          const localMatch = db.getProductById(rp.id);
          if (!localMatch) {
            db.saveProduct({
              id: rp.id,
              business_id: rp.business_id,
              branch_id: rp.branch_id,
              category_id: rp.category_id,
              barcode: rp.barcode || '',
              sku: rp.sku || '',
              name: rp.name,
              description: rp.description,
              purchase_price: Number(rp.purchase_price || 0),
              sale_price: Number(rp.sale_price || 0),
              wholesale_price: rp.wholesale_price ? Number(rp.wholesale_price) : undefined,
              current_stock: Number(rp.current_stock || 0),
              min_stock: Number(rp.min_stock || 0),
              unit: rp.unit || 'قطعة',
              tax_rate: Number(rp.tax_rate ?? 20),
              is_active: rp.is_active !== false,
              image_url: rp.image_url,
              created_at: rp.created_at,
              updated_at: rp.updated_at,
            }, 'مزامنة السحابة');
          }
        }
      }

      return {
        success: errors.length === 0,
        processed,
        errors,
      };
    } catch (err: any) {
      return {
        success: false,
        processed,
        errors: [err.message || 'فشلت عملية المزامنة السحابية'],
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
