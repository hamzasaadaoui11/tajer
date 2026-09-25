import { getSupabase, isSupabaseConfigured } from './supabase';
import { db } from './db';
import { Product, Customer, Supplier } from '../types';

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
}

class SyncEngine {
  private currentSyncPromise: Promise<SyncResult> | null = null;
  private queuedSyncPromise: Promise<SyncResult> | null = null;

  public isSyncingNow(): boolean {
    return this.currentSyncPromise !== null;
  }

  public async syncAll(): Promise<SyncResult> {
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

    // If a sync is already running, wait for it or queue one follow-up pass
    if (this.currentSyncPromise) {
      if (!this.queuedSyncPromise) {
        this.queuedSyncPromise = (async () => {
          try {
            await this.currentSyncPromise;
          } catch {
            // ignore previous run errors
          }
          this.queuedSyncPromise = null;
          return this.syncAll();
        })();
      }
      return this.queuedSyncPromise;
    }

    this.currentSyncPromise = this.performSync(supabase);
    try {
      return await this.currentSyncPromise;
    } finally {
      this.currentSyncPromise = null;
    }
  }

  private async performSync(supabase: any): Promise<SyncResult> {
    const errors: string[] = [];
    let processed = 0;

    try {
      const init = db.initialize();
      const bizId = init.business.id;
      const branchId = init.branch.id;

      // Reconcile debts locally before any push
      db.reconcileCustomerDebts(bizId);
      db.reconcileSupplierDebts(bizId);

      // ==========================================
      // PHASE 1: FLUSH PENDING DELETIONS TO CLOUD FIRST
      // ==========================================
      const deletedProducts = db.getDeleteQueue('products');
      if (deletedProducts.length > 0) {
        const { error } = await supabase.from('products').delete().in('id', deletedProducts);
        if (!error) {
          db.clearDeleteQueue('products', deletedProducts);
          processed += deletedProducts.length;
        } else {
          console.warn('Error syncing deleted products:', error.message);
          errors.push(`حذف المنتجات: ${error.message}`);
        }
      }

      const deletedCategories = db.getDeleteQueue('categories');
      if (deletedCategories.length > 0) {
        const { error } = await supabase.from('categories').delete().in('id', deletedCategories);
        if (!error) {
          db.clearDeleteQueue('categories', deletedCategories);
          processed += deletedCategories.length;
        } else {
          console.warn('Error syncing deleted categories:', error.message);
          errors.push(`حذف الفئات: ${error.message}`);
        }
      }

      const deletedCustomers = db.getDeleteQueue('customers');
      if (deletedCustomers.length > 0) {
        const { error } = await supabase.from('customers').delete().in('id', deletedCustomers);
        if (!error) {
          db.clearDeleteQueue('customers', deletedCustomers);
          processed += deletedCustomers.length;
        } else {
          console.warn('Error syncing deleted customers:', error.message);
          errors.push(`حذف الزبائن: ${error.message}`);
        }
      }

      const deletedSuppliers = db.getDeleteQueue('suppliers');
      if (deletedSuppliers.length > 0) {
        const { error } = await supabase.from('suppliers').delete().in('id', deletedSuppliers);
        if (!error) {
          db.clearDeleteQueue('suppliers', deletedSuppliers);
          processed += deletedSuppliers.length;
        } else {
          console.warn('Error syncing deleted suppliers:', error.message);
          errors.push(`حذف الموردين: ${error.message}`);
        }
      }

      // ==========================================
      // PHASE 2: PUSH CURRENT LOCAL DATA TO SERVER
      // ==========================================

      // C1. Push Business Profile
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
        if (bizErr) {
          errors.push(`المتجر (Business): ${bizErr.message}`);
        } else {
          processed += 1;
        }
      } catch (e: any) {
        console.warn('Sync business error:', e);
      }

      // C2. Push Branches
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
          if (brErr) {
            errors.push(`الفروع (Branches): ${brErr.message}`);
          }
        }
      } catch (e: any) {
        console.warn('Sync branches error:', e);
      }

      // C3. Push Categories
      const localCategories = db.getCategories(bizId);
      const catTombstones = new Set(db.getTombstones('categories'));
      const catPendingDeletes = new Set(db.getDeleteQueue('categories'));
      const validCategories = localCategories.filter(c => !catTombstones.has(c.id) && !catPendingDeletes.has(c.id));

      if (validCategories.length > 0) {
        const catPayload = validCategories.map(c => ({
          id: c.id,
          business_id: c.business_id,
          name: c.name,
          color: c.color || '#0d9488',
          icon: c.icon || 'tag',
          created_at: c.created_at || new Date().toISOString(),
        }));
        const { error: catErr } = await supabase.from('categories').upsert(catPayload);
        if (catErr) {
          errors.push(`الفئات (Categories): ${catErr.message}`);
        } else {
          processed += validCategories.length;
          db.clearPendingCreates('categories', validCategories.map(c => c.id));
          const currentSynced = db.getSyncedIds('categories');
          const newSynced = Array.from(new Set([...currentSynced, ...validCategories.map(c => c.id)]));
          db.setSyncedIds('categories', newSynced);
        }
      }

      // C4. Push Products
      const localProducts = db.getProducts(bizId);
      const prodTombstones = new Set(db.getTombstones('products'));
      const prodPendingDeletes = new Set(db.getDeleteQueue('products'));
      const validLocalProducts = localProducts.filter(p => !prodTombstones.has(p.id) && !prodPendingDeletes.has(p.id) && p.is_active !== false);

      if (validLocalProducts.length > 0) {
        const prodPayload = validLocalProducts.map(p => ({
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
        if (prodErr) {
          errors.push(`السلع (Products): ${prodErr.message}`);
        } else {
          processed += validLocalProducts.length;
          db.clearPendingCreates('products', validLocalProducts.map(p => p.id));
          const currentSynced = db.getSyncedIds('products');
          const newSynced = Array.from(new Set([...currentSynced, ...validLocalProducts.map(p => p.id)]));
          db.setSyncedIds('products', newSynced);
        }
      }

      // C5. Push Customers
      const custTombstones = new Set(db.getTombstones('customers'));
      const custPendingDeletes = new Set(db.getDeleteQueue('customers'));
      const localCustomers = db.getCustomers(bizId).filter(c => 
        !['cust-1', 'cust-2', 'cust-3'].includes(c.id) &&
        !['السيد أحمد الإدريسي', 'السيدة فاطمة الزهراء العلوي', 'مقهى الأندلس (السيد رشيد)'].includes(c.name) &&
        !custTombstones.has(c.id) &&
        !custPendingDeletes.has(c.id)
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
        if (custErr) {
          errors.push(`الزبائن (Customers): ${custErr.message}`);
        } else {
          processed += localCustomers.length;
          // Add successfully pushed IDs to synced_customers list
          const currentSynced = db.getSyncedIds('customers');
          const newSynced = Array.from(new Set([...currentSynced, ...localCustomers.map(c => c.id)]));
          db.setSyncedIds('customers', newSynced);
        }
      }

      // C6. Push Suppliers
      const suppTombstones = new Set(db.getTombstones('suppliers'));
      const suppPendingDeletes = new Set(db.getDeleteQueue('suppliers'));
      const localSuppliers = db.getSuppliers(bizId).filter(s => 
        !['sup-1', 'sup-2'].includes(s.id) &&
        !['شركة توزيع الألبان المركزية', 'شركة التوزيع السريع المغرب', 'مجموعة المشروبات والمياه المعدنية'].includes(s.name) &&
        !suppTombstones.has(s.id) &&
        !suppPendingDeletes.has(s.id)
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
        if (suppErr) {
          errors.push(`الموردين (Suppliers): ${suppErr.message}`);
        } else {
          processed += localSuppliers.length;
          // Add successfully pushed IDs to synced_suppliers list
          const currentSynced = db.getSyncedIds('suppliers');
          const newSynced = Array.from(new Set([...currentSynced, ...localSuppliers.map(s => s.id)]));
          db.setSyncedIds('suppliers', newSynced);
        }
      }

      // C7. Push Sales & Invoices
      const localSales = db.getSales(bizId);
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
        if (salesErr) {
          errors.push(`المبيعات (Sales): ${salesErr.message}`);
        } else {
          processed += localSales.length;
        }
      }

      // C8. Push Sale Returns
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
        if (srErr) {
          errors.push(`مرتجعات المبيعات (Sale Returns): ${srErr.message}`);
        }
      }

      // C9. Push Purchases
      const localPurchases = db.getPurchases(bizId);
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
        if (purchErr) {
          errors.push(`المشتريات (Purchases): ${purchErr.message}`);
        } else {
          processed += localPurchases.length;
        }
      }

      // C10. Push Purchase Returns
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
        if (prErr) {
          errors.push(`مرتجعات المشتريات (Purchase Returns): ${prErr.message}`);
        }
      }

      // C11. Push Expenses
      const localExpenses = db.getExpenses(bizId);
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
        if (expErr) {
          errors.push(`المصاريف (Expenses): ${expErr.message}`);
        } else {
          processed += localExpenses.length;
        }
      }

      // C12. Push Cash Transactions
      const localCash = db.getCashTransactions(bizId);
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
        if (cashErr) {
          errors.push(`الصندوق (Cash): ${cashErr.message}`);
        } else {
          processed += localCash.length;
        }
      }

      // C13. Push Payment Transactions
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
        if (payErr) {
          errors.push(`تسديدات الديون (Payments): ${payErr.message}`);
        } else {
          processed += localPayments.length;
        }
      }

      // C14. Push Stock Movements
      const localStockMovements = db.getStockMovements(bizId);
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
        if (smErr) {
          errors.push(`حركات المخزون (Stock Movements): ${smErr.message}`);
        }
      }

      // ==========================================
      // PHASE 3: PULL MASTER DATA & SYNC DELETIONS FROM CLOUD
      // ==========================================

      // 2.0 Pull persistent tombstones from deleted_records if available
      try {
        const { data: remoteDeletes } = await supabase
          .from('deleted_records')
          .select('record_id, table_name')
          .eq('business_id', bizId);

        if (remoteDeletes && remoteDeletes.length > 0) {
          for (const dr of remoteDeletes) {
            if (dr.table_name === 'products') {
              db.removeProductLocally(dr.record_id);
              processed++;
            } else if (dr.table_name === 'categories') {
              db.removeCategoryLocally(dr.record_id);
              processed++;
            } else if (dr.table_name === 'customers') {
              db.removeCustomerLocally(dr.record_id);
              processed++;
            } else if (dr.table_name === 'suppliers') {
              db.removeSupplierLocally(dr.record_id);
              processed++;
            }
          }
        }
      } catch (e) {
        // deleted_records table is optional until user runs the SQL migration script
      }

      // 2.1 Pull Categories
      try {
        const { data: remoteCategories, error: catPullErr } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', bizId);
        if (!catPullErr && remoteCategories) {
          const remoteIds = new Set<string>((remoteCategories as any[]).map((rc: any) => rc.id as string));
          const pendingCatCreates = new Set(db.getPendingCreates('categories'));
          const tombstones = new Set(db.getTombstones('categories'));
          const pendingDeletes = new Set(db.getDeleteQueue('categories'));
          const syncedCatIds = new Set(db.getSyncedIds('categories'));

          // Filter local categories: remove if deleted remotely or tombstoned
          const localCats = db.getCategories(bizId);
          const filteredLocal = localCats.filter(c => {
            if (pendingDeletes.has(c.id) || tombstones.has(c.id)) return false;
            if (remoteIds.has(c.id)) return true;
            
            // If never synced to cloud, it is a new local item created on this device! Always keep it!
            const wasSynced = syncedCatIds.has(c.id);
            if (!wasSynced) return true;

            // Only if previously synced and now absent from remote, it was deleted on another device!
            db.addToTombstones('categories', c.id);
            db.removePendingCreate('categories', c.id);
            db.removeSyncedId('categories', c.id);
            processed++;
            return false;
          });

          if (filteredLocal.length !== localCats.length) {
            db.set('categories', filteredLocal);
            processed++;
          }

          // Save/update remote categories locally
          for (const rc of remoteCategories) {
            if (pendingDeletes.has(rc.id) || tombstones.has(rc.id)) continue;

            const existing = filteredLocal.find(lc => lc.id === rc.id);
            if (existing) {
              const localTime = (existing as any).updated_at ? new Date((existing as any).updated_at).getTime() : 0;
              const remoteTime = rc.updated_at ? new Date(rc.updated_at).getTime() : 0;
              if (localTime > remoteTime) {
                continue;
              }
            }
            if (!existing || existing.name !== rc.name || existing.color !== rc.color) {
              processed++;
            }

            db.saveCategory({
              id: rc.id,
              business_id: rc.business_id,
              name: rc.name,
              color: rc.color || '#0d9488',
              icon: rc.icon || 'tag',
              created_at: rc.created_at || new Date().toISOString(),
            });
          }

          db.setSyncedIds('categories', Array.from(remoteIds));
        }
      } catch (e) {
        console.warn('Pull categories notice:', e);
      }

      // 2.2 Pull Products & Delete any removed on other devices
      try {
        const { data: remoteProducts, error: prodPullErr } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', bizId);

        if (!prodPullErr && remoteProducts) {
          const remoteIds = new Set<string>((remoteProducts as any[]).map((rp: any) => rp.id as string));
          const pendingProdCreates = new Set(db.getPendingCreates('products'));
          const tombstones = new Set(db.getTombstones('products'));
          const pendingDeletes = new Set(db.getDeleteQueue('products'));
          const syncedProdIds = new Set(db.getSyncedIds('products'));

          // Filter local products: remove if deleted on another device, deactivated, or tombstoned
          const localProds = db.getProducts(bizId);
          const filteredLocal = localProds.filter(p => {
            if (pendingDeletes.has(p.id) || tombstones.has(p.id) || p.is_active === false) return false;
            if (remoteIds.has(p.id)) return true;
            
            // If never synced to cloud, it is a new local product created on this device! Always keep it!
            const wasSynced = syncedProdIds.has(p.id);
            if (!wasSynced) return true;

            // If it was in the cloud before and now absent, it was deleted on another device!
            db.addToTombstones('products', p.id);
            db.removePendingCreate('products', p.id);
            db.removeSyncedId('products', p.id);
            processed++;
            return false;
          });

          if (filteredLocal.length !== localProds.length) {
            db.set('products', filteredLocal);
            processed++;
          }

          // Save/update remote products locally
          for (const rp of remoteProducts) {
            if (pendingDeletes.has(rp.id) || tombstones.has(rp.id)) continue;
            if (rp.is_active === false) {
              // Product was deactivated/soft-deleted on remote! Prune locally
              db.addToTombstones('products', rp.id);
              continue;
            }

            const existing = filteredLocal.find(lp => lp.id === rp.id);
            if (existing) {
              const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              const remoteTime = rp.updated_at ? new Date(rp.updated_at).getTime() : 0;
              if (localTime > remoteTime) {
                continue;
              }
            }
            if (!existing || 
                existing.name !== rp.name || 
                existing.current_stock !== Number(rp.current_stock) || 
                existing.sale_price !== Number(rp.sale_price) || 
                existing.purchase_price !== Number(rp.purchase_price) || 
                existing.barcode !== rp.barcode ||
                existing.sku !== rp.sku ||
                existing.category_id !== rp.category_id ||
                existing.is_active !== (rp.is_active !== false)
            ) {
              processed++;
            }

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

          db.setSyncedIds('products', Array.from(remoteIds));
        }
      } catch (e) {
        console.warn('Pull products notice:', e);
      }

      // 2.3 Pull Customers & Delete any removed on other devices
      try {
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
          const remoteIds = new Set<string>((remoteCustomers as any[]).map((rc: any) => rc.id as string));
          const pendingCustCreates = new Set(db.getPendingCreates('customers'));
          const tombstones = new Set(db.getTombstones('customers'));
          const pendingDeletes = new Set(db.getDeleteQueue('customers'));
          const syncedCustIds = new Set(db.getSyncedIds('customers'));

          // Filter local customers: remove if deleted on another device
          const localCusts = db.getCustomers(bizId);
          const filteredLocal = localCusts.filter(c => {
            if (pendingDeletes.has(c.id) || tombstones.has(c.id)) return false;
            if (remoteIds.has(c.id)) return true;

            // If never synced to cloud, it is a new local customer created on this device! Always keep it!
            const wasSynced = syncedCustIds.has(c.id);
            if (!wasSynced) return true;

            db.addToTombstones('customers', c.id);
            db.removePendingCreate('customers', c.id);
            db.removeSyncedId('customers', c.id);
            processed++;
            return false;
          });

          if (filteredLocal.length !== localCusts.length) {
            db.set('customers', filteredLocal);
            processed++;
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
            if (pendingDeletes.has(rc.id) || tombstones.has(rc.id)) continue;

            const existing = filteredLocal.find(lc => lc.id === rc.id);
            if (!existing || existing.name !== rc.name || existing.phone !== rc.phone || existing.total_debt !== Number(rc.total_debt)) {
              processed++;
            }

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

          db.setSyncedIds('customers', Array.from(remoteIds));
        }
      } catch (e) {
        console.warn('Pull customers notice:', e);
      }

      // 2.4 Pull Suppliers & Delete any removed on other devices
      try {
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
          const remoteIds = new Set<string>((remoteSuppliers as any[]).map((rs: any) => rs.id as string));
          const pendingSuppCreates = new Set(db.getPendingCreates('suppliers'));
          const tombstones = new Set(db.getTombstones('suppliers'));
          const pendingDeletes = new Set(db.getDeleteQueue('suppliers'));
          const syncedSuppIds = new Set(db.getSyncedIds('suppliers'));

          // Filter local suppliers: remove if deleted on another device
          const localSupps = db.getSuppliers(bizId);
          const filteredLocal = localSupps.filter(s => {
            if (pendingDeletes.has(s.id) || tombstones.has(s.id)) return false;
            if (remoteIds.has(s.id)) return true;

            // If never synced to cloud, it is a new local supplier created on this device! Always keep it!
            const wasSynced = syncedSuppIds.has(s.id);
            if (!wasSynced) return true;

            db.addToTombstones('suppliers', s.id);
            db.removePendingCreate('suppliers', s.id);
            db.removeSyncedId('suppliers', s.id);
            processed++;
            return false;
          });

          if (filteredLocal.length !== localSupps.length) {
            db.set('suppliers', filteredLocal);
            processed++;
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
            if (pendingDeletes.has(rs.id) || tombstones.has(rs.id)) continue;

            const existing = filteredLocal.find(ls => ls.id === rs.id);
            if (existing) {
              const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
              const remoteTime = rs.updated_at ? new Date(rs.updated_at).getTime() : 0;
              if (localTime > remoteTime) {
                continue;
              }
            }
            if (!existing || existing.name !== rs.name || existing.phone !== rs.phone || existing.total_debt !== Number(rs.total_debt)) {
              processed++;
            }

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

          db.setSyncedIds('suppliers', Array.from(remoteIds));
        }
      } catch (e) {
        console.warn('Pull suppliers notice:', e);
      }

      // ==========================================
      // PHASE D: PULL APPEND-ONLY HISTORICAL DATA
      // ==========================================

      // D1. Pull Remote Sales
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

      // D2. Pull Remote Expenses
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

      // D3. Pull Remote Cash Transactions
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


      // D4. Pull Remote Payment Transactions
      try {
        const { data: remotePayments } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('business_id', bizId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (remotePayments && remotePayments.length > 0) {
          const localPay = db.getPaymentTransactions(bizId);
          const localPayIds = new Set(localPay.map(p => p.id));
          const toAddPay: any[] = [];

          for (const rp of remotePayments) {
            if (!localPayIds.has(rp.id)) {
              toAddPay.push({
                id: rp.id,
                business_id: rp.business_id,
                branch_id: rp.branch_id || branchId,
                type: rp.type,
                entity_id: rp.entity_id,
                entity_name: rp.entity_name,
                reference_id: rp.reference_id,
                amount: Number(rp.amount || 0),
                payment_method: rp.payment_method || 'CASH',
                notes: rp.notes,
                user_name: rp.user_name,
                created_at: rp.created_at || new Date().toISOString(),
              });
            }
          }
          if (toAddPay.length > 0) {
            db.set('payments', [...toAddPay, ...localPay]);
          }
        }
      } catch (e) {
        console.warn('Pull payments notice:', e);
      }

      // Reconcile all customer and supplier debts based on synced transactions
      db.reconcileCustomerDebts(bizId);
      db.reconcileSupplierDebts(bizId);
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
    }
  }

  // Instant multi-device product delete (Direct Cloud Delete + Local Tombstone)
  public async deleteProductEverywhere(id: string, businessId: string, userName: string = 'النظام'): Promise<{ success: boolean }> {
    // 1. Remove locally immediately and mark tombstone
    db.deleteProduct(id, businessId, userName);
    db.removePendingCreate('products', id);

    // 2. Direct cloud deletion if online
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        // Step 2a: Update is_active to false first. 
        // This fires an UPDATE event via Supabase Realtime which always delivers payload.new even without REPLICA IDENTITY FULL!
        await supabase
          .from('products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        // Step 2b: Delete from cloud
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
          db.clearDeleteQueue('products', [id]);
        } else {
          console.warn('Direct delete product error:', error.message);
        }

        // Step 2c: Record in deleted_records for offline device synchronization
        try {
          await supabase
            .from('deleted_records')
            .insert({
              id: `del-products-${id}-${Date.now()}`,
              table_name: 'products',
              record_id: id,
              business_id: businessId,
              deleted_at: new Date().toISOString(),
            });
        } catch {
          // Ignore if table not yet created
        }
      } catch (err) {
        console.warn('Direct delete product failed:', err);
      }
    }
    return { success: true };
  }

  // Instant multi-device product save/update
  public async saveProductEverywhere(product: Product, userName: string = 'النظام'): Promise<{ success: boolean }> {
    // 1. Save locally
    db.saveProduct(product, userName);

    // 2. Direct cloud upsert if online
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        const payload = {
          id: product.id,
          business_id: product.business_id,
          branch_id: product.branch_id,
          category_id: product.category_id || null,
          barcode: product.barcode || null,
          sku: product.sku || null,
          name: product.name,
          description: product.description || null,
          purchase_price: product.purchase_price || 0,
          sale_price: product.sale_price || 0,
          wholesale_price: product.wholesale_price || null,
          current_stock: product.current_stock || 0,
          min_stock: product.min_stock || 0,
          unit: product.unit || 'قطعة',
          tax_rate: product.tax_rate ?? 20,
          supplier_id: product.supplier_id || null,
          expiry_date: product.expiry_date || null,
          image_url: product.image_url || null,
          is_active: product.is_active !== false,
          created_at: product.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('products').upsert(payload);
        if (!error) {
          db.addSyncedId('products', product.id);
          db.clearPendingCreates('products', [product.id]);
        } else {
          console.warn('Direct save product error:', error.message);
          db.addPendingCreate('products', product.id);
        }
      } catch (err) {
        console.warn('Direct save product failed:', err);
        db.addPendingCreate('products', product.id);
      }
    } else {
      db.addPendingCreate('products', product.id);
    }
    return { success: true };
  }

  // Instant multi-device customer save/update
  public async saveCustomerEverywhere(customer: Customer): Promise<{ success: boolean }> {
    db.saveCustomer(customer);
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        const payload = {
          id: customer.id,
          business_id: customer.business_id,
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || null,
          city: customer.city || null,
          ice: customer.ice || null,
          if_number: customer.ifNumber || null,
          notes: customer.notes || null,
          credit_limit: customer.credit_limit || 0,
          total_spent: customer.total_spent || 0,
          total_debt: customer.total_debt || 0,
          created_at: customer.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('customers').upsert(payload);
        if (!error) {
          db.addSyncedId('customers', customer.id);
          db.clearPendingCreates('customers', [customer.id]);
        } else {
          console.warn('Direct save customer error:', error.message);
          db.addPendingCreate('customers', customer.id);
        }
      } catch (err) {
        console.warn('Direct save customer failed:', err);
        db.addPendingCreate('customers', customer.id);
      }
    } else {
      db.addPendingCreate('customers', customer.id);
    }
    return { success: true };
  }

  // Instant multi-device supplier save/update
  public async saveSupplierEverywhere(supplier: Supplier): Promise<{ success: boolean }> {
    db.saveSupplier(supplier);
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        const payload = {
          id: supplier.id,
          business_id: supplier.business_id,
          name: supplier.name,
          phone: supplier.phone || '',
          address: supplier.address || null,
          city: supplier.city || null,
          ice: supplier.ice || null,
          if_number: supplier.ifNumber || null,
          notes: supplier.notes || null,
          total_purchased: supplier.total_purchased || 0,
          total_debt: supplier.total_debt || 0,
          created_at: supplier.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('suppliers').upsert(payload);
        if (!error) {
          db.addSyncedId('suppliers', supplier.id);
          db.clearPendingCreates('suppliers', [supplier.id]);
        } else {
          console.warn('Direct save supplier error:', error.message);
          db.addPendingCreate('suppliers', supplier.id);
        }
      } catch (err) {
        console.warn('Direct save supplier failed:', err);
        db.addPendingCreate('suppliers', supplier.id);
      }
    } else {
      db.addPendingCreate('suppliers', supplier.id);
    }
    return { success: true };
  }

  public async deleteCustomerEverywhere(id: string, businessId?: string): Promise<{ success: boolean }> {
    db.deleteCustomer(id);
    db.removePendingCreate('customers', id);
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (!error) db.clearDeleteQueue('customers', [id]);
        if (businessId) {
          try {
            await supabase.from('deleted_records').insert({
              id: `del-customers-${id}-${Date.now()}`,
              table_name: 'customers',
              record_id: id,
              business_id: businessId,
              deleted_at: new Date().toISOString(),
            });
          } catch {
            // Ignore if table not yet created
          }
        }
      } catch (e) {
        console.warn('Cloud delete customer notice:', e);
      }
    }
    return { success: true };
  }

  public async deleteSupplierEverywhere(id: string, businessId?: string): Promise<{ success: boolean }> {
    db.deleteSupplier(id);
    db.removePendingCreate('suppliers', id);
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && navigator.onLine) {
      try {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (!error) db.clearDeleteQueue('suppliers', [id]);
        if (businessId) {
          try {
            await supabase.from('deleted_records').insert({
              id: `del-suppliers-${id}-${Date.now()}`,
              table_name: 'suppliers',
              record_id: id,
              business_id: businessId,
              deleted_at: new Date().toISOString(),
            });
          } catch {
            // Ignore if table not yet created
          }
        }
      } catch (e) {
        console.warn('Cloud delete supplier notice:', e);
      }
    }
    return { success: true };
  }
}

export const syncEngine = new SyncEngine();
