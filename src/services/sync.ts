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

      // 0. Sync Deletions first
      const deletedProducts = db.getDeleteQueue('products');
      if (deletedProducts.length > 0) {
        const { error } = await supabase.from('products').delete().in('id', deletedProducts);
        if (!error) {
          db.clearDeleteQueue('products', deletedProducts);
          processed += deletedProducts.length;
        } else if (!error.message.includes('does not exist')) {
          console.warn('Error syncing deleted products:', error.message);
        }
      }

      const deletedCategories = db.getDeleteQueue('categories');
      if (deletedCategories.length > 0) {
        const { error } = await supabase.from('categories').delete().in('id', deletedCategories);
        if (!error) {
          db.clearDeleteQueue('categories', deletedCategories);
          processed += deletedCategories.length;
        } else if (!error.message.includes('does not exist')) {
          console.warn('Error syncing deleted categories:', error.message);
        }
      }

      const deletedCustomers = db.getDeleteQueue('customers');
      if (deletedCustomers.length > 0) {
        const { error } = await supabase.from('customers').delete().in('id', deletedCustomers);
        if (!error) {
          db.clearDeleteQueue('customers', deletedCustomers);
          processed += deletedCustomers.length;
        } else if (!error.message.includes('does not exist')) {
          console.warn('Error syncing deleted customers:', error.message);
        }
      }

      const deletedSuppliers = db.getDeleteQueue('suppliers');
      if (deletedSuppliers.length > 0) {
        const { error } = await supabase.from('suppliers').delete().in('id', deletedSuppliers);
        if (!error) {
          db.clearDeleteQueue('suppliers', deletedSuppliers);
          processed += deletedSuppliers.length;
        } else if (!error.message.includes('does not exist')) {
          console.warn('Error syncing deleted suppliers:', error.message);
        }
      }

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

      // 5. Push Customers & Debts (excluding mock seed data)
      const localCustomers = db.getCustomers(bizId).filter(c => 
        !['cust-1', 'cust-2', 'cust-3'].includes(c.id) &&
        !['السيد أحمد الإدريسي', 'السيدة فاطمة الزهراء العلوي', 'مقهى الأندلس (السيد رشيد)'].includes(c.name)
      );
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

      // 6. Push Suppliers & Debts (excluding mock seed data)
      const localSuppliers = db.getSuppliers(bizId).filter(s => 
        !['sup-1', 'sup-2'].includes(s.id) &&
        !['شركة توزيع الألبان المركزية', 'شركة التوزيع السريع المغرب', 'مجموعة المشروبات والمياه المعدنية'].includes(s.name)
      );
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

      // 15. Pull Remote Categories
      try {
        const { data: remoteCategories, error: catPullErr } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', bizId);
        if (!catPullErr && remoteCategories) {
          const remoteIds = new Set(remoteCategories.map(rc => rc.id));
          const pushSucceeded = !errors.some(e => e.includes('Categories') || e.includes('الفئات'));
          if (pushSucceeded) {
            const localCats = db.getCategories(bizId);
            const filteredLocal = localCats.filter(c => remoteIds.has(c.id));
            if (filteredLocal.length !== localCats.length) {
              db.set('categories', filteredLocal);
            }
          }

          for (const rc of remoteCategories) {
            if (deletedCategories.includes(rc.id)) continue;
            if (db.isTombstoned('categories', rc.id)) continue;
            db.saveCategory({
              id: rc.id,
              business_id: rc.business_id,
              name: rc.name,
              color: rc.color || '#0d9488',
              icon: rc.icon || 'tag',
              created_at: rc.created_at || new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Pull categories notice:', e);
      }

      // 16. Pull Remote Products & Update Stock / Details
      try {
        const { data: remoteProducts, error: prodPullErr } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', bizId);

        if (!prodPullErr && remoteProducts) {
          const remoteIds = new Set(remoteProducts.map(rp => rp.id));
          const pushSucceeded = !errors.some(e => e.includes('Products') || e.includes('السلع'));
          if (pushSucceeded) {
            const localProds = db.getProducts(bizId, branchId);
            const filteredLocal = localProds.filter(p => remoteIds.has(p.id));
            if (filteredLocal.length !== localProds.length) {
              db.set('products', filteredLocal);
            }
          }

          for (const rp of remoteProducts) {
            if (deletedProducts.includes(rp.id)) continue;
            if (db.isTombstoned('products', rp.id)) continue;
            db.saveProduct({
              id: rp.id,
              business_id: rp.business_id,
              branch_id: rp.branch_id || branchId,
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
              created_at: rp.created_at || new Date().toISOString(),
              updated_at: rp.updated_at || new Date().toISOString(),
            }, 'مزامنة السحابة', true);
          }
        }
      } catch (e) {
        console.warn('Pull products notice:', e);
      }

      // 17. Pull Remote Customers & Debts (excluding mock seed data)
      try {
        // Automatically purge any previously saved mock customers from Supabase
        await supabase
          .from('customers')
          .delete()
          .eq('business_id', bizId)
          .in('name', ['السيد أحمد الإدريسي', 'السيدة فاطمة الزهراء العلوي', 'مقهى الأندلس (السيد رشيد)']);
        await supabase
          .from('customers')
          .delete()
          .in('id', ['cust-1', 'cust-2', 'cust-3']);

        const { data: remoteCustomers, error: custPullErr } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', bizId);
        if (!custPullErr && remoteCustomers) {
          const remoteIds = new Set(remoteCustomers.map(rc => rc.id));
          const pushSucceeded = !errors.some(e => e.includes('Customers') || e.includes('الزبائن'));
          if (pushSucceeded) {
            const localCusts = db.getCustomers(bizId);
            const filteredLocal = localCusts.filter(c => remoteIds.has(c.id));
            if (filteredLocal.length !== localCusts.length) {
              db.set('customers', filteredLocal);
            }
          }

          const forbiddenCustNames = new Set([
            'السيد أحمد الإدريسي',
            'السيدة فاطمة الزهراء العلوي',
            'مقهى الأندلس (السيد رشيد)'
          ]);
          for (const rc of remoteCustomers) {
            if (['cust-1', 'cust-2', 'cust-3'].includes(rc.id) || forbiddenCustNames.has(rc.name)) {
              continue;
            }
            if (deletedCustomers.includes(rc.id)) continue;
            if (db.isTombstoned('customers', rc.id)) continue;
            db.saveCustomer({
              id: rc.id,
              business_id: rc.business_id,
              name: rc.name,
              phone: rc.phone || '',
              address: rc.address,
              city: rc.city,
              ice: rc.ice,
              ifNumber: rc.if_number,
              notes: rc.notes,
              credit_limit: Number(rc.credit_limit || 0),
              total_spent: Number(rc.total_spent || 0),
              total_debt: Number(rc.total_debt || 0),
              created_at: rc.created_at || new Date().toISOString(),
              updated_at: rc.updated_at || new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Pull customers notice:', e);
      }

      // 18. Pull Remote Suppliers & Debts (excluding mock seed data)
      try {
        // Automatically purge any previously saved mock suppliers from Supabase
        await supabase
          .from('suppliers')
          .delete()
          .eq('business_id', bizId)
          .in('name', ['شركة توزيع الألبان المركزية', 'شركة التوزيع السريع المغرب', 'مجموعة المشروبات والمياه المعدنية']);
        await supabase
          .from('suppliers')
          .delete()
          .in('id', ['sup-1', 'sup-2']);

        const { data: remoteSuppliers, error: suppPullErr } = await supabase
          .from('suppliers')
          .select('*')
          .eq('business_id', bizId);
        if (!suppPullErr && remoteSuppliers) {
          const remoteIds = new Set(remoteSuppliers.map(rs => rs.id));
          const pushSucceeded = !errors.some(e => e.includes('Suppliers') || e.includes('الموردين'));
          if (pushSucceeded) {
            const localSupps = db.getSuppliers(bizId);
            const filteredLocal = localSupps.filter(s => remoteIds.has(s.id));
            if (filteredLocal.length !== localSupps.length) {
              db.set('suppliers', filteredLocal);
            }
          }

          const forbiddenSuppNames = new Set([
            'شركة توزيع الألبان المركزية',
            'شركة التوزيع السريع المغرب',
            'مجموعة المشروبات والمياه المعدنية'
          ]);
          for (const rs of remoteSuppliers) {
            if (['sup-1', 'sup-2'].includes(rs.id) || forbiddenSuppNames.has(rs.name)) {
              continue;
            }
            if (deletedSuppliers.includes(rs.id)) continue;
            if (db.isTombstoned('suppliers', rs.id)) continue;
            db.saveSupplier({
              id: rs.id,
              business_id: rs.business_id,
              name: rs.name,
              phone: rs.phone || '',
              address: rs.address,
              city: rs.city,
              ice: rs.ice,
              ifNumber: rs.if_number,
              notes: rs.notes,
              total_purchased: Number(rs.total_purchased || 0),
              total_debt: Number(rs.total_debt || 0),
              created_at: rs.created_at || new Date().toISOString(),
              updated_at: rs.updated_at || new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Pull suppliers notice:', e);
      }

      // 19. Pull Remote Sales
      try {
        const { data: remoteSales } = await supabase
          .from('sales')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
          .limit(300);

        if (remoteSales && remoteSales.length > 0) {
          const localSales = db.getSales(bizId);
          const localIds = new Set(localSales.map(s => s.id));
          const toAdd: any[] = [];

          for (const rs of remoteSales) {
            if (!localIds.has(rs.id)) {
              toAdd.push({
                id: rs.id,
                business_id: rs.business_id,
                branch_id: rs.branch_id || branchId,
                invoice_number: rs.invoice_number,
                customer_id: rs.customer_id,
                customer_name: rs.customer_name || 'زبون عام',
                items: rs.items || [],
                subtotal: Number(rs.subtotal || 0),
                discount: Number(rs.discount || 0),
                tax_total: Number(rs.tax_total || 0),
                total: Number(rs.total || 0),
                amount_paid: Number(rs.amount_paid || 0),
                amount_due: Number(rs.amount_due || 0),
                payment_method: rs.payment_method || 'CASH',
                status: rs.status || 'COMPLETED',
                user_name: rs.user_name || 'كاشير',
                notes: rs.notes,
                created_at: rs.created_at || new Date().toISOString(),
              });
            }
          }
          if (toAdd.length > 0) {
            db.set('sales', [...toAdd, ...localSales]);
          }
        }
      } catch (e) {
        console.warn('Pull sales notice:', e);
      }

      // 20. Pull Remote Expenses
      try {
        const { data: remoteExpenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (remoteExpenses && remoteExpenses.length > 0) {
          const localExp = db.getExpenses(bizId);
          const localExpIds = new Set(localExp.map(e => e.id));
          const toAddExp: any[] = [];

          for (const re of remoteExpenses) {
            if (!localExpIds.has(re.id)) {
              toAddExp.push({
                id: re.id,
                business_id: re.business_id,
                branch_id: re.branch_id || branchId,
                category: re.category,
                amount: Number(re.amount || 0),
                payment_method: re.payment_method || 'CASH',
                description: re.description,
                user_name: re.user_name,
                receipt_url: re.receipt_url,
                created_at: re.created_at || new Date().toISOString(),
              });
            }
          }
          if (toAddExp.length > 0) {
            db.set('expenses', [...toAddExp, ...localExp]);
          }
        }
      } catch (e) {
        console.warn('Pull expenses notice:', e);
      }

      // 21. Pull Remote Cash Transactions
      try {
        const { data: remoteCash } = await supabase
          .from('cash_transactions')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (remoteCash && remoteCash.length > 0) {
          const localCash = db.getCashTransactions(bizId);
          const localCashIds = new Set(localCash.map(c => c.id));
          const toAddCash: any[] = [];

          for (const rc of remoteCash) {
            if (!localCashIds.has(rc.id)) {
              toAddCash.push({
                id: rc.id,
                business_id: rc.business_id,
                branch_id: rc.branch_id || branchId,
                type: rc.type,
                category: rc.category,
                amount: Number(rc.amount || 0),
                balance_after: Number(rc.balance_after || 0),
                reference: rc.reference,
                description: rc.description,
                user_name: rc.user_name,
                created_at: rc.created_at || new Date().toISOString(),
              });
            }
          }
          if (toAddCash.length > 0) {
            db.set('cash_transactions', [...toAddCash, ...localCash]);
          }
        }
      } catch (e) {
        console.warn('Pull cash notice:', e);
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
