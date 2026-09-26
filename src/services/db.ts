import {
  Business,
  Branch,
  User,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnItem,
  Purchase,
  PurchaseReturn,
  StockMovement,
  StockAdjustment,
  PaymentTransaction,
  Expense,
  CashTransaction,
  AuditLog,
  NotificationItem,
  PrintSettings,
  PaymentMethod
} from '../types';
import { generateSeedData } from './seed';

const STORAGE_KEY_PREFIX = 'tajer_db_';

class LocalDatabase {
  private tenantId: string = localStorage.getItem('tajer_active_tenant') || 'default';

  public setTenantId(id: string): void {
    this.tenantId = id || 'default';
    localStorage.setItem('tajer_active_tenant', this.tenantId);
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  private getPrefix(): string {
    return `tajer_db_${this.tenantId}_`;
  }

  public get<T>(collection: string): T[] {
    try {
      let data = localStorage.getItem(`${this.getPrefix()}${collection}`);
      if (!data && this.tenantId === 'default') {
        data = localStorage.getItem(`tajer_db_${collection}`);
      }
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public set<T>(collection: string, data: T[]): void {
    try {
      localStorage.setItem(`${this.getPrefix()}${collection}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save ${collection}`, e);
    }
  }

  // --- Deletion Queue for Syncing ---
  public addToDeleteQueue(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}deleted_${collection}`;
      const queue: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!queue.includes(id)) {
        queue.push(id);
        localStorage.setItem(key, JSON.stringify(queue));
      }
    } catch (e) {
      console.error(`Failed to add to delete queue for ${collection}`, e);
    }
  }

  public getDeleteQueue(collection: string): string[] {
    try {
      const key = `${this.getPrefix()}deleted_${collection}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  public clearDeleteQueue(collection: string, ids: string[]): void {
    try {
      const key = `${this.getPrefix()}deleted_${collection}`;
      const queue: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = queue.filter((id: string) => !ids.includes(id));
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error(`Failed to clear delete queue for ${collection}`, e);
    }
  }

  // --- Tombstones for Robust Deletions ---
  public addToTombstones(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}tombstones_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.error(`Failed to add to tombstones for ${collection}`, e);
    }
  }

  public getTombstones(collection: string): string[] {
    try {
      const key = `${this.getPrefix()}tombstones_${collection}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  public isTombstoned(collection: string, id: string): boolean {
    return this.getTombstones(collection).includes(id);
  }

  public removeFromTombstones(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}tombstones_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = list.filter((i: string) => i !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error(`Failed to remove from tombstones for ${collection}`, e);
    }
  }

  // --- Synced IDs for delta syncing ---
  public getSyncedIds(collection: string): string[] {
    try {
      const key = `${this.getPrefix()}synced_${collection}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  public addSyncedId(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}synced_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.error(`Failed to add synced ID for ${collection}`, e);
    }
  }

  public removeSyncedId(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}synced_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = list.filter((i: string) => i !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error(`Failed to remove synced ID for ${collection}`, e);
    }
  }

  public setSyncedIds(collection: string, ids: string[]): void {
    try {
      const key = `${this.getPrefix()}synced_${collection}`;
      localStorage.setItem(key, JSON.stringify(ids));
    } catch (e) {
      console.error(`Failed to set synced IDs for ${collection}`, e);
    }
  }

  // --- Pending Local Creates (items created locally while offline) ---
  public addPendingCreate(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}pending_create_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.error(`Failed to add pending create for ${collection}`, e);
    }
  }

  public getPendingCreates(collection: string): string[] {
    try {
      const key = `${this.getPrefix()}pending_create_${collection}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  public removePendingCreate(collection: string, id: string): void {
    try {
      const key = `${this.getPrefix()}pending_create_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = list.filter(item => item !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error(`Failed to remove pending create for ${collection}`, e);
    }
  }

  public clearPendingCreates(collection: string, ids: string[]): void {
    try {
      const key = `${this.getPrefix()}pending_create_${collection}`;
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = list.filter(id => !ids.includes(id));
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error(`Failed to clear pending creates for ${collection}`, e);
    }
  }

  public removeProductLocally(id: string): void {
    const list = this.get<Product>('products');
    this.set('products', list.filter(p => p.id !== id));
    this.addToTombstones('products', id);
    this.removeSyncedId('products', id);
    this.removePendingCreate('products', id);
  }

  public removeCategoryLocally(id: string): void {
    const list = this.get<Category>('categories');
    this.set('categories', list.filter(c => c.id !== id));
    this.addToTombstones('categories', id);
    this.removeSyncedId('categories', id);
    this.removePendingCreate('categories', id);
  }

  public removeCustomerLocally(id: string): void {
    const list = this.get<Customer>('customers');
    this.set('customers', list.filter(c => c.id !== id));
    this.addToTombstones('customers', id);
    this.removeSyncedId('customers', id);
    this.removePendingCreate('customers', id);
  }

  public removeSupplierLocally(id: string): void {
    const list = this.get<Supplier>('suppliers');
    this.set('suppliers', list.filter(s => s.id !== id));
    this.addToTombstones('suppliers', id);
    this.removeSyncedId('suppliers', id);
    this.removePendingCreate('suppliers', id);
  }

  // --- Initial Setup & Verification ---
  public initialize(customUser?: { id?: string; email?: string; name?: string }): { business: Business; branch: Branch; user: User } {
    let businesses = this.get<Business>('businesses');
    let branches = this.get<Branch>('branches');
    let users = this.get<User>('users');

    if (businesses.length === 0) {
      const defaultStoreName = customUser?.name 
        ? `متجر ${customUser.name}` 
        : customUser?.email 
          ? `متجر ${customUser.email.split('@')[0]}`
          : 'متجر التيسير للتجارة العامة';

      // Create initial Moroccan store
      const initialBusiness: Business = {
        id: 'biz-' + (customUser?.id ? customUser.id.substring(0, 8) : Math.random().toString(36).substring(2, 9)),
        name: defaultStoreName,
        activity: 'general_store',
        currency: 'MAD',
        phone: '06 61 00 11 22',
        address: 'شارع الحسن الثاني',
        city: 'الدار البيضاء',
        ice: '002938475000031',
        ifNumber: '40192837',
        rc: '120456',
        patente: '340912',
        taxEnabled: true,
        defaultTaxRate: 20,
        receiptFooter: 'شكراً لزيارتكم! البضاعة المباعة ترد أو تستبدل خلال 48 ساعة مع الفاتورة',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const initialBranch: Branch = {
        id: 'br-' + initialBusiness.id + '-main',
        business_id: initialBusiness.id,
        name: 'الفرع الرئيسي',
        city: 'الدار البيضاء',
        address: 'حي المسيرة، رقم 45',
        phone: '06 61 00 11 22',
        is_main: true,
        created_at: new Date().toISOString(),
      };

      const initialUser: User = {
        id: 'usr-' + (customUser?.id ? customUser.id.substring(0, 8) : Math.random().toString(36).substring(2, 9)),
        business_id: initialBusiness.id,
        branch_id: initialBranch.id,
        name: customUser?.name ? customUser.name : defaultStoreName,
        email: customUser?.email ? customUser.email : 'admin@tajer.ma',
        phone: '06 61 00 11 22',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      businesses = [initialBusiness];
      branches = [initialBranch];
      users = [initialUser];

      this.set('businesses', businesses);
      this.set('branches', branches);
      this.set('users', users);

      // Start with clean empty tables by default as requested
      this.set('categories', []);
      this.set('suppliers', []);
      this.set('customers', []);
      this.set('products', []);

      // Initial cash balance
      const initialCash: CashTransaction = {
        id: 'cash-init',
        business_id: initialBusiness.id,
        branch_id: initialBranch.id,
        type: 'IN',
        category: 'MANUAL_IN',
        amount: 2500,
        balance_after: 2500,
        reference: 'SOLDE-DEPART',
        description: 'رصيد افتتاح الصندوق (Fonds de caisse initial)',
        user_name: initialUser.name,
        created_at: new Date().toISOString(),
      };
      this.set('cash_transactions', [initialCash]);

      // Default print settings
      const defaultPrint: PrintSettings = {
        paperSize: '80mm',
        autoPrintOnSale: false,
        showLogo: true,
        showTaxId: true,
        showBarcode: true,
        footerNotes: initialBusiness.receiptFooter || '',
        copies: 1,
      };
      localStorage.setItem(`${this.getPrefix()}print_settings`, JSON.stringify(defaultPrint));

      // Initial audit log
      this.addAuditLog(initialBusiness.id, initialUser.name, 'إنشاء متجر جديد', `تم إنشاء المتجر وتجهيز البيانات الافتراضية`);
    }

    // Migration for existing users: If the user name is still "حمزة" or starts with "حمزة", update it to the store's name
    if (users.length > 0 && (users[0].name === 'حمزة (المدير العام)' || users[0].name.startsWith('حمزة'))) {
      const bizName = businesses[0]?.name || 'المدير العام';
      users[0].name = bizName;
      this.set('users', users);
    }

    return {
      business: businesses[0],
      branch: branches[0],
      user: users[0],
    };
  }

  // --- Print Settings ---
  public getPrintSettings(): PrintSettings {
    try {
      const data = localStorage.getItem(`${this.getPrefix()}print_settings`) || localStorage.getItem(`tajer_db_print_settings`);
      return data ? JSON.parse(data) : {
        paperSize: '80mm',
        autoPrintOnSale: false,
        showLogo: true,
        showTaxId: true,
        showBarcode: true,
        footerNotes: '',
        copies: 1,
      };
    } catch {
      return {
        paperSize: '80mm',
        autoPrintOnSale: false,
        showLogo: true,
        showTaxId: true,
        showBarcode: true,
        footerNotes: '',
        copies: 1,
      };
    }
  }

  public savePrintSettings(settings: PrintSettings): void {
    localStorage.setItem(`${this.getPrefix()}print_settings`, JSON.stringify(settings));
  }

  // --- Onboarding Status per Tenant/User ---
  public isOnboardingComplete(): boolean {
    const val = localStorage.getItem(`${this.getPrefix()}onboarding_done`);
    return val === 'true';
  }

  public setOnboardingComplete(completed: boolean): void {
    localStorage.setItem(`${this.getPrefix()}onboarding_done`, completed ? 'true' : 'false');
  }

  // --- Businesses & Branches ---
  public getBusiness(id: string): Business | undefined {
    return this.get<Business>('businesses').find(b => b.id === id);
  }

  public updateBusiness(business: Business): void {
    const list = this.get<Business>('businesses');
    const idx = list.findIndex(b => b.id === business.id);
    if (idx !== -1) {
      list[idx] = { ...business, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...business, updated_at: new Date().toISOString() });
    }
    this.set('businesses', list);
  }

  public saveBusiness(business: Business): void {
    this.updateBusiness(business);
  }

  public getBranches(businessId: string): Branch[] {
    return this.get<Branch>('branches').filter(b => b.business_id === businessId);
  }

  public addBranch(branch: Branch): void {
    const list = this.get<Branch>('branches');
    list.push(branch);
    this.set('branches', list);
  }

  // --- Users & Roles ---
  public getUsers(businessId: string): User[] {
    return this.get<User>('users').filter(u => u.business_id === businessId);
  }

  public saveUser(user: User): void {
    const list = this.get<User>('users');
    const idx = list.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    this.set('users', list);
  }

  public deleteUser(userId: string): void {
    const list = this.get<User>('users').filter(u => u.id !== userId);
    this.set('users', list);
  }

  // --- Categories ---
  public getCategories(businessId: string): Category[] {
    return this.get<Category>('categories').filter(c => c.business_id === businessId);
  }

  public saveCategory(category: Category): void {
    const list = this.get<Category>('categories');
    const idx = list.findIndex(c => c.id === category.id);
    if (idx !== -1) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    this.set('categories', list);
  }

  public deleteCategory(id: string): void {
    const list = this.get<Category>('categories').filter(c => c.id !== id);
    this.set('categories', list);
    this.addToDeleteQueue('categories', id);
    this.addToTombstones('categories', id);
    this.removeSyncedId('categories', id);
    this.removePendingCreate('categories', id);
  }

  // --- Products ---
  public getProducts(businessId?: string, branchId?: string): Product[] {
    let all = this.get<Product>('products');
    if (businessId) {
      all = all.filter(p => !p.business_id || p.business_id === businessId);
      // Auto-heal any products missing business_id so they sync cleanly
      let healed = false;
      for (const p of all) {
        if (!p.business_id) {
          p.business_id = businessId;
          healed = true;
        }
      }
      if (healed) {
        this.set('products', all);
      }
    }
    return all;
  }

  public getProductById(id: string): Product | undefined {
    return this.get<Product>('products').find(p => p.id === id);
  }

  public getProductByBarcode(barcode: string, businessId: string): Product | undefined {
    return this.get<Product>('products').find(p => p.business_id === businessId && (p.barcode === barcode || p.sku === barcode));
  }

  public saveProduct(product: Product, userName: string = 'النظام', silent: boolean = false): void {
    const list = this.get<Product>('products');
    const idx = list.findIndex(p => p.id === product.id);
    const isNew = idx === -1;
    const isSync = silent || userName.includes('مزامنة') || userName.includes('sync') || userName === 'مزامنة السحابة';

    if (isNew) {
      list.push(product);
      if (!isSync) {
        this.addStockMovement({
          id: 'mov-' + Date.now(),
          business_id: product.business_id,
          branch_id: product.branch_id,
          product_id: product.id,
          product_name: product.name,
          type: 'INITIAL',
          quantity_before: 0,
          quantity_change: product.current_stock,
          quantity_after: product.current_stock,
          notes: 'مخزون افتتاحي عند إنشاء المنتج',
          user_name: userName,
          created_at: new Date().toISOString(),
        });
        this.addAuditLog(product.business_id, userName, 'إضافة منتج', `إضافة منتج جديد: ${product.name} بسعر ${product.sale_price} DH`);
      }
    } else {
      const old = list[idx];
      if (!isSync && old.current_stock !== product.current_stock) {
        this.addStockMovement({
          id: 'mov-' + Date.now(),
          business_id: product.business_id,
          branch_id: product.branch_id,
          product_id: product.id,
          product_name: product.name,
          type: 'ADJUSTMENT',
          quantity_before: old.current_stock,
          quantity_change: product.current_stock - old.current_stock,
          quantity_after: product.current_stock,
          notes: 'تعديل يدوي للمخزون من بطاقة المنتج',
          user_name: userName,
          created_at: new Date().toISOString(),
        });
      }
      if (!isSync) {
        this.addAuditLog(product.business_id, userName, 'تعديل منتج', `تعديل بيانات المنتج: ${product.name}`);
      }
      list[idx] = { ...product, updated_at: product.updated_at || new Date().toISOString() };
    }
    this.set('products', list);
  }

  public deleteProduct(id: string, businessId: string, userName: string = 'النظام'): void {
    const list = this.get<Product>('products');
    const prod = list.find(p => p.id === id);
    if (prod) {
      this.set('products', list.filter(p => p.id !== id));
      this.addToDeleteQueue('products', id);
      this.addToTombstones('products', id);
      this.removeSyncedId('products', id);
      this.removePendingCreate('products', id);
      this.addAuditLog(businessId, userName, 'حذف منتج', `حذف المنتج: ${prod.name}`);
    }
  }

  // --- Customers ---
  public getCustomers(businessId: string): Customer[] {
    this.reconcileCustomerDebts(businessId);
    return this.get<Customer>('customers').filter(c => c.business_id === businessId);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.get<Customer>('customers').find(c => c.id === id);
  }

  public saveCustomer(customer: Customer): void {
    const list = this.get<Customer>('customers');
    const idx = list.findIndex(c => c.id === customer.id);
    if (idx !== -1) {
      list[idx] = { ...customer, updated_at: new Date().toISOString() };
    } else {
      list.push(customer);
    }
    this.set('customers', list);
    this.addPendingCreate('customers', customer.id);
    this.removeFromTombstones('customers', customer.id);
  }

  public deleteCustomer(id: string): void {
    this.set('customers', this.get<Customer>('customers').filter(c => c.id !== id));
    this.addToDeleteQueue('customers', id);
    this.addToTombstones('customers', id);
    this.removeSyncedId('customers', id);
    this.removePendingCreate('customers', id);
  }

  // Auto-reconcile customer debts based on actual sales, returns, and payments
  public reconcileCustomerDebts(businessId: string): void {
    try {
      const customers = this.get<Customer>('customers');
      const sales = this.get<Sale>('sales').filter(s => !s.business_id || s.business_id === businessId);
      const payments = this.get<PaymentTransaction>('payments').filter(p => !p.business_id || p.business_id === businessId);
      const returns = this.get<SaleReturn>('sale_returns').filter(r => !r.business_id || r.business_id === businessId);

      let changed = false;

      for (const cust of customers) {
        if (cust.business_id && cust.business_id !== businessId) continue;

        // Match sales by customer_id or matching non-generic name
        const custSales = sales.filter(s => 
          s.customer_id === cust.id || 
          (!s.customer_id && s.customer_name && s.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase() && cust.name !== 'زبون عام (Comptoir)' && cust.name !== 'Client Comptoir')
        );

        // Fix sales missing customer_id
        for (const s of custSales) {
          if (!s.customer_id) {
            s.customer_id = cust.id;
            changed = true;
          }
        }

        const totalCreditSales = custSales.reduce((sum, s) => {
          let due = s.amount_due;
          if (due === undefined || due === null) {
            due = s.payment_method === 'CREDIT' ? s.total : Math.max(0, s.total - (s.amount_paid || 0));
          } else if (s.payment_method === 'CREDIT' && due <= 0 && s.total > 0 && (!s.amount_paid || s.amount_paid === 0)) {
            due = s.total;
          }
          return sum + Math.max(0, due);
        }, 0);

        const custPayments = payments.filter(p => 
          p.type === 'CUSTOMER_PAYMENT' && 
          (p.entity_id === cust.id || (p.entity_name && p.entity_name.trim().toLowerCase() === cust.name.trim().toLowerCase()))
        );
        const totalPayments = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const custReturns = returns.filter(r => 
          r.customer_id === cust.id || 
          (!r.customer_id && r.customer_name && r.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
        );
        const totalReturns = custReturns.reduce((sum, r) => sum + (r.total_refund || 0), 0);

        const calculatedDebt = Math.max(0, totalCreditSales - totalPayments - totalReturns);
        const calculatedTotalSpent = custSales.reduce((sum, s) => sum + (s.total || 0), 0);

        // Self-heal if debt was wiped out or out of sync with actual invoices
        if (calculatedDebt > (cust.total_debt || 0) || (cust.total_debt === 0 && calculatedDebt > 0)) {
          cust.total_debt = calculatedDebt;
          cust.total_spent = Math.max(cust.total_spent || 0, calculatedTotalSpent);
          cust.updated_at = new Date().toISOString();
          changed = true;
          this.addPendingCreate('customers', cust.id);
        } else if (calculatedTotalSpent > (cust.total_spent || 0)) {
          cust.total_spent = calculatedTotalSpent;
          cust.updated_at = new Date().toISOString();
          changed = true;
        }
      }

      if (changed) {
        this.set('customers', customers);
        this.set('sales', sales);
      }
    } catch (e) {
      console.warn('reconcileCustomerDebts notice:', e);
    }
  }

  // --- Suppliers ---
  public getSuppliers(businessId: string): Supplier[] {
    this.reconcileSupplierDebts(businessId);
    return this.get<Supplier>('suppliers').filter(s => s.business_id === businessId);
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.get<Supplier>('suppliers').find(s => s.id === id);
  }

  public saveSupplier(supplier: Supplier): void {
    const list = this.get<Supplier>('suppliers');
    const idx = list.findIndex(s => s.id === supplier.id);
    if (idx !== -1) {
      list[idx] = { ...supplier, updated_at: new Date().toISOString() };
    } else {
      list.push(supplier);
    }
    this.set('suppliers', list);
    this.addPendingCreate('suppliers', supplier.id);
    this.removeFromTombstones('suppliers', supplier.id);
  }

  public deleteSupplier(id: string): void {
    this.set('suppliers', this.get<Supplier>('suppliers').filter(s => s.id !== id));
    this.addToDeleteQueue('suppliers', id);
    this.addToTombstones('suppliers', id);
    this.removeSyncedId('suppliers', id);
    this.removePendingCreate('suppliers', id);
  }

  // Auto-reconcile supplier debts based on actual purchases, returns, and payments
  public reconcileSupplierDebts(businessId: string): void {
    try {
      const suppliers = this.get<Supplier>('suppliers');
      const purchases = this.getPurchases(businessId);
      const payments = this.get<PaymentTransaction>('payments').filter(p => !p.business_id || p.business_id === businessId);
      const returns = this.getPurchaseReturns(businessId);

      let changed = false;

      for (const supp of suppliers) {
        if (supp.business_id && supp.business_id !== businessId) continue;

        const suppPurchases = purchases.filter(p => 
          p.supplier_id === supp.id || 
          (!p.supplier_id && p.supplier_name && p.supplier_name.trim().toLowerCase() === supp.name.trim().toLowerCase() && supp.name !== 'مورد عام' && supp.name !== 'Fournisseur')
        );

        for (const p of suppPurchases) {
          if (!p.supplier_id) {
            p.supplier_id = supp.id;
            changed = true;
          }
        }

        const totalCreditPurchases = suppPurchases.reduce((sum, p) => {
          let due = p.amount_due;
          if (due === undefined || due === null) {
            due = p.payment_method === 'CREDIT' ? p.total : Math.max(0, p.total - (p.amount_paid || 0));
          } else if (p.payment_method === 'CREDIT' && due <= 0 && p.total > 0 && (!p.amount_paid || p.amount_paid === 0)) {
            due = p.total;
          }
          return sum + Math.max(0, due);
        }, 0);

        const suppPayments = payments.filter(p => 
          p.type === 'SUPPLIER_PAYMENT' && 
          (p.entity_id === supp.id || (p.entity_name && p.entity_name.trim().toLowerCase() === supp.name.trim().toLowerCase()))
        );
        const totalPayments = suppPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const suppReturns = returns.filter(r => 
          r.supplier_id === supp.id || 
          (!r.supplier_id && r.supplier_name && r.supplier_name.trim().toLowerCase() === supp.name.trim().toLowerCase())
        );
        const totalReturns = suppReturns.reduce((sum, r) => sum + (r.total_refund || 0), 0);

        const calculatedDebt = Math.max(0, totalCreditPurchases - totalPayments - totalReturns);
        const calculatedTotalPurchased = suppPurchases.reduce((sum, p) => sum + (p.total || 0), 0);

        if (calculatedDebt > (supp.total_debt || 0) || (supp.total_debt === 0 && calculatedDebt > 0)) {
          supp.total_debt = calculatedDebt;
          supp.total_purchased = Math.max(supp.total_purchased || 0, calculatedTotalPurchased);
          supp.updated_at = new Date().toISOString();
          changed = true;
          this.addPendingCreate('suppliers', supp.id);
        } else if (calculatedTotalPurchased > (supp.total_purchased || 0)) {
          supp.total_purchased = calculatedTotalPurchased;
          supp.updated_at = new Date().toISOString();
          changed = true;
        }
      }

      if (changed) {
        this.set('suppliers', suppliers);
        this.set('purchases', purchases);
      }
    } catch (e) {
      console.warn('reconcileSupplierDebts notice:', e);
    }
  }

  // Direct manual debt adjustment for customers
  public addManualCustomerDebt(businessId: string, customerId: string, amount: number, notes: string = 'تسجيل دين يدوي', userName: string = 'النظام'): void {
    const customers = this.get<Customer>('customers');
    const cIdx = customers.findIndex(c => c.id === customerId);
    if (cIdx !== -1) {
      customers[cIdx].total_debt = Math.max(0, (customers[cIdx].total_debt || 0) + amount);
      customers[cIdx].updated_at = new Date().toISOString();
      this.set('customers', customers);
      this.addPendingCreate('customers', customerId);

      this.addAuditLog(
        businessId,
        userName,
        'إضافة دين عميل',
        `تسجيل دين بمبلغ ${amount} DH على العميل ${customers[cIdx].name} (${notes})`
      );
    }
  }

  // Direct manual debt adjustment for suppliers
  public addManualSupplierDebt(businessId: string, supplierId: string, amount: number, notes: string = 'تسجيل مستحق يدوي', userName: string = 'النظام'): void {
    const suppliers = this.get<Supplier>('suppliers');
    const sIdx = suppliers.findIndex(s => s.id === supplierId);
    if (sIdx !== -1) {
      suppliers[sIdx].total_debt = Math.max(0, (suppliers[sIdx].total_debt || 0) + amount);
      suppliers[sIdx].updated_at = new Date().toISOString();
      this.set('suppliers', suppliers);
      this.addPendingCreate('suppliers', supplierId);

      this.addAuditLog(
        businessId,
        userName,
        'إضافة مستحق مورد',
        `تسجيل مستحق بمبلغ ${amount} DH للمورد ${suppliers[sIdx].name} (${notes})`
      );
    }
  }

  // --- Purge any default mock customers/suppliers ---
  public cleanupDemoContacts(businessId?: string): void {
    const demoCustIds = new Set(['cust-1', 'cust-2', 'cust-3']);
    const demoCustNames = new Set([
      'السيد أحمد الإدريسي',
      'السيدة فاطمة الزهراء العلوي',
      'مقهى الأندلس (السيد رشيد)'
    ]);
    const demoSuppIds = new Set(['sup-1', 'sup-2']);
    const demoSuppNames = new Set([
      'شركة توزيع الألبان المركزية',
      'شركة التوزيع السريع المغرب',
      'مجموعة المشروبات والمياه المعدنية'
    ]);

    const customers = this.get<Customer>('customers');
    const filteredCustomers = customers.filter(c => 
      (!businessId || c.business_id === businessId) 
        ? (!demoCustIds.has(c.id) && !demoCustNames.has(c.name))
        : true
    );
    if (filteredCustomers.length !== customers.length) {
      this.set('customers', filteredCustomers);
    }

    const suppliers = this.get<Supplier>('suppliers');
    const filteredSuppliers = suppliers.filter(s => 
      (!businessId || s.business_id === businessId)
        ? (!demoSuppIds.has(s.id) && !demoSuppNames.has(s.name))
        : true
    );
    if (filteredSuppliers.length !== suppliers.length) {
      this.set('suppliers', filteredSuppliers);
    }
  }

  // --- Stock Movements & Inventory Count ---
  public getStockMovements(businessId: string, branchId?: string): StockMovement[] {
    const all = this.get<StockMovement>('stock_movements').filter(m => !m.business_id || m.business_id === businessId);
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addStockMovement(movement: StockMovement): void {
    const list = this.get<StockMovement>('stock_movements');
    list.unshift(movement);
    this.set('stock_movements', list);
  }

  public applyPhysicalInventory(adjustment: StockAdjustment): void {
    const products = this.get<Product>('products');
    const idx = products.findIndex(p => p.id === adjustment.product_id);
    if (idx !== -1) {
      const prod = products[idx];
      const diff = adjustment.counted_qty - prod.current_stock;
      this.addStockMovement({
        id: 'mov-' + Date.now(),
        business_id: adjustment.business_id,
        branch_id: adjustment.branch_id,
        product_id: prod.id,
        product_name: prod.name,
        type: 'ADJUSTMENT',
        quantity_before: prod.current_stock,
        quantity_change: diff,
        quantity_after: adjustment.counted_qty,
        notes: `جرد فعلي: الفرق (${diff > 0 ? '+' + diff : diff}). السبب: ${adjustment.reason}`,
        user_name: adjustment.user_name,
        created_at: new Date().toISOString(),
      });
      prod.current_stock = adjustment.counted_qty;
      prod.updated_at = new Date().toISOString();
      this.set('products', products);

      const adjustments = this.get<StockAdjustment>('stock_adjustments');
      adjustments.unshift(adjustment);
      this.set('stock_adjustments', adjustments);

      this.addAuditLog(adjustment.business_id, adjustment.user_name, 'جرد مخزون', `تسوية جرد للمنتج ${prod.name} بالكمية ${adjustment.counted_qty}`);
    }
  }

  // --- Sales Execution (Transactions) ---
  public getSales(businessId: string, branchId?: string): Sale[] {
    const all = this.get<Sale>('sales').filter(s => !s.business_id || s.business_id === businessId);
    let healed = false;
    for (const s of all) {
      if (!s.business_id) {
        s.business_id = businessId;
        healed = true;
      }
    }
    if (healed) {
      this.set('sales', all);
    }
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createSale(sale: Sale): Sale {
    const sales = this.get<Sale>('sales');
    const products = this.get<Product>('products');
    const customers = this.get<Customer>('customers');

    // 1. Process items and decrement stock
    for (const item of sale.items) {
      const pIdx = products.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const oldQty = prod.current_stock;
        const newQty = oldQty - item.quantity;
        prod.current_stock = newQty;
        prod.updated_at = new Date().toISOString();

        // Record stock movement
        this.addStockMovement({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          business_id: sale.business_id,
          branch_id: sale.branch_id,
          product_id: prod.id,
          product_name: prod.name,
          type: 'SALE',
          quantity_before: oldQty,
          quantity_change: -item.quantity,
          quantity_after: newQty,
          reference_id: sale.invoice_number,
          notes: `فاتورة بيع ${sale.invoice_number}`,
          user_name: sale.user_name,
          created_at: new Date().toISOString(),
        });

        // Trigger low stock notification
        if (newQty <= prod.min_stock) {
          this.addNotification({
            id: 'notif-' + Date.now() + Math.random().toString(36).substring(2, 5),
            business_id: sale.business_id,
            title: 'تنبيه مخزون منخفض',
            message: `المنتج "${prod.name}" وصل إلى ${newQty} ${prod.unit} (الحد الأدنى: ${prod.min_stock})`,
            type: 'LOW_STOCK',
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
    this.set('products', products);

    // 2. Process Cash Register if paid in cash or partial cash
    if (sale.amount_paid > 0 && (sale.payment_method === 'CASH' || sale.payment_method === 'SPLIT')) {
      const currentCash = this.getCurrentCashBalance(sale.business_id, sale.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-' + Date.now(),
        business_id: sale.business_id,
        branch_id: sale.branch_id,
        type: 'IN',
        category: 'SALE',
        amount: sale.amount_paid,
        balance_after: currentCash + sale.amount_paid,
        reference: sale.invoice_number,
        description: `مقبوضات بيع ${sale.invoice_number} ${sale.customer_name ? '(' + sale.customer_name + ')' : ''}`,
        user_name: sale.user_name,
        created_at: new Date().toISOString(),
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    // 3. Process Customer Debt if Credit / On Account
    if (sale.payment_method === 'CREDIT' && (sale.amount_due === undefined || sale.amount_due <= 0)) {
      sale.amount_due = Math.max(0, sale.total - (sale.amount_paid || 0));
    }

    const debtToAdd = (sale.amount_due && sale.amount_due > 0)
      ? sale.amount_due
      : (sale.payment_method === 'CREDIT' ? Math.max(0, sale.total - (sale.amount_paid || 0)) : 0);

    if (sale.customer_id) {
      const cIdx = customers.findIndex(c => c.id === sale.customer_id);
      if (cIdx !== -1) {
        if (debtToAdd > 0) {
          customers[cIdx].total_debt = Math.max(0, (customers[cIdx].total_debt || 0) + debtToAdd);
        }
        customers[cIdx].total_spent = (customers[cIdx].total_spent || 0) + sale.total;
        customers[cIdx].updated_at = new Date().toISOString();
        this.set('customers', customers);
        this.addPendingCreate('customers', sale.customer_id);
      }
    }

    // 4. Save sale record
    sales.unshift(sale);
    this.set('sales', sales);

    // 5. Audit Log
    this.addAuditLog(
      sale.business_id,
      sale.user_name,
      'عملية بيع',
      `فاتورة ${sale.invoice_number} بمبلغ إجمالي ${sale.total} DH (${sale.payment_method}${debtToAdd > 0 ? ' - باقي دين: ' + debtToAdd + ' DH' : ''})`
    );

    return sale;
  }

  // Update sale payment status & recalculate debts
  public updateSalePaymentStatus(
    businessId: string,
    saleId: string, 
    newPaymentMethod: PaymentMethod, 
    newAmountPaid: number, 
    customerId?: string, 
    customerName?: string,
    userName: string = 'النظام'
  ): Sale | null {
    const sales = this.get<Sale>('sales');
    const sIdx = sales.findIndex(s => s.id === saleId);
    if (sIdx === -1) return null;

    const sale = sales[sIdx];
    const newAmountDue = Math.max(0, sale.total - newAmountPaid);
    
    sale.payment_method = newPaymentMethod;
    sale.amount_paid = newAmountPaid;
    sale.amount_due = newAmountDue;
    if (customerId) sale.customer_id = customerId;
    if (customerName) sale.customer_name = customerName;

    sales[sIdx] = sale;
    this.set('sales', sales);

    // Reconcile all customer debts
    this.reconcileCustomerDebts(businessId);

    this.addAuditLog(
      businessId,
      userName,
      'تعديل حالة دفع الفاتورة',
      `تعديل الفاتورة ${sale.invoice_number}: طريقة الدفع ${newPaymentMethod}، المبلغ المدفوع ${newAmountPaid} DH، الباقي ${newAmountDue} DH`
    );

    return sale;
  }

  // --- Sales Return ---
  public createSaleReturn(returnData: SaleReturn): void {
    const returns = this.get<SaleReturn>('sale_returns');
    const sales = this.get<Sale>('sales');
    const products = this.get<Product>('products');
    const customers = this.get<Customer>('customers');

    // 1. Restock returned items
    for (const item of returnData.items) {
      const pIdx = products.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const oldQty = prod.current_stock;
        const newQty = oldQty + item.quantity;
        prod.current_stock = newQty;
        prod.updated_at = new Date().toISOString();

        this.addStockMovement({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          business_id: returnData.business_id,
          branch_id: returnData.branch_id,
          product_id: prod.id,
          product_name: prod.name,
          type: 'SALE_RETURN',
          quantity_before: oldQty,
          quantity_change: item.quantity,
          quantity_after: newQty,
          reference_id: returnData.invoice_number,
          notes: `مرتجع مبيعات ${returnData.invoice_number}: ${returnData.reason}`,
          user_name: returnData.user_name,
          created_at: new Date().toISOString(),
        });
      }
    }
    this.set('products', products);

    // 2. Adjust Customer balance or refund Cash
    if (returnData.customer_id) {
      const cIdx = customers.findIndex(c => c.id === returnData.customer_id);
      if (cIdx !== -1) {
        customers[cIdx].total_debt = Math.max(0, customers[cIdx].total_debt - returnData.total_refund);
        customers[cIdx].updated_at = new Date().toISOString();
        this.set('customers', customers);
      }
    } else {
      // Cash refund from drawer
      const currentCash = this.getCurrentCashBalance(returnData.business_id, returnData.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-' + Date.now(),
        business_id: returnData.business_id,
        branch_id: returnData.branch_id,
        type: 'OUT',
        category: 'REFUND',
        amount: returnData.total_refund,
        balance_after: currentCash - returnData.total_refund,
        reference: returnData.invoice_number,
        description: `استرجاع نقد لمرتجع ${returnData.invoice_number}`,
        user_name: returnData.user_name,
        created_at: new Date().toISOString(),
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    // 3. Mark sale status if full return or updated
    const sIdx = sales.findIndex(s => s.id === returnData.sale_id);
    if (sIdx !== -1) {
      // Keep sales history intact with note
      sales[sIdx].notes = (sales[sIdx].notes || '') + ` [مرتجع بقيمة ${returnData.total_refund} DH]`;
      this.set('sales', sales);
    }

    returns.unshift(returnData);
    this.set('sale_returns', returns);

    this.addAuditLog(
      returnData.business_id,
      returnData.user_name,
      'مرتجع بيع',
      `مرتجع للفاتورة ${returnData.invoice_number} بقيمة ${returnData.total_refund} DH`
    );
  }

  public getSaleReturns(businessId: string): SaleReturn[] {
    return this.get<SaleReturn>('sale_returns').filter(r => r.business_id === businessId);
  }

  // --- Purchases Execution ---
  public getPurchases(businessId: string, branchId?: string): Purchase[] {
    const all = this.get<Purchase>('purchases').filter(p => !p.business_id || p.business_id === businessId);
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createPurchase(purchase: Purchase): Purchase {
    const purchases = this.get<Purchase>('purchases');
    const products = this.get<Product>('products');
    const suppliers = this.get<Supplier>('suppliers');

    // 1. Increase stock and update purchase price
    for (const item of purchase.items) {
      const pIdx = products.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const oldQty = prod.current_stock;
        const newQty = oldQty + item.quantity;
        prod.current_stock = newQty;
        prod.purchase_price = item.unit_cost; // update latest cost
        prod.updated_at = new Date().toISOString();

        this.addStockMovement({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          business_id: purchase.business_id,
          branch_id: purchase.branch_id,
          product_id: prod.id,
          product_name: prod.name,
          type: 'PURCHASE',
          quantity_before: oldQty,
          quantity_change: item.quantity,
          quantity_after: newQty,
          reference_id: purchase.invoice_number,
          notes: `شراء من ${purchase.supplier_name}`,
          user_name: purchase.user_name,
          created_at: new Date().toISOString(),
        });
      }
    }
    this.set('products', products);

    // 2. Cash Drawer deduction if paid cash
    if (purchase.amount_paid > 0 && purchase.payment_method === 'CASH') {
      const currentCash = this.getCurrentCashBalance(purchase.business_id, purchase.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-' + Date.now(),
        business_id: purchase.business_id,
        branch_id: purchase.branch_id,
        type: 'OUT',
        category: 'PURCHASE',
        amount: purchase.amount_paid,
        balance_after: currentCash - purchase.amount_paid,
        reference: purchase.invoice_number,
        description: `أداء شراء سلع من ${purchase.supplier_name}`,
        user_name: purchase.user_name,
        created_at: new Date().toISOString(),
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    // 3. Supplier payable balance
    const sIdx = suppliers.findIndex(s => s.id === purchase.supplier_id);
    if (sIdx !== -1) {
      suppliers[sIdx].total_purchased += purchase.total;
      suppliers[sIdx].total_debt += purchase.amount_due;
      suppliers[sIdx].updated_at = new Date().toISOString();
      this.set('suppliers', suppliers);
    }

    purchases.unshift(purchase);
    this.set('purchases', purchases);

    this.addAuditLog(
      purchase.business_id,
      purchase.user_name,
      'عملية شراء وتوريد',
      `شراء سلع بقيمة ${purchase.total} DH من المورد ${purchase.supplier_name}`
    );

    return purchase;
  }

  // --- Purchase Return ---
  public createPurchaseReturn(returnData: PurchaseReturn): void {
    const returns = this.get<PurchaseReturn>('purchase_returns');
    const products = this.get<Product>('products');
    const suppliers = this.get<Supplier>('suppliers');

    for (const item of returnData.items) {
      const pIdx = products.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const oldQty = prod.current_stock;
        const newQty = Math.max(0, oldQty - item.quantity);
        prod.current_stock = newQty;
        prod.updated_at = new Date().toISOString();

        this.addStockMovement({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          business_id: returnData.business_id,
          branch_id: returnData.branch_id,
          product_id: prod.id,
          product_name: prod.name,
          type: 'PURCHASE_RETURN',
          quantity_before: oldQty,
          quantity_change: -item.quantity,
          quantity_after: newQty,
          reference_id: returnData.purchase_id,
          notes: `إرجاع سلع للمورد: ${returnData.reason}`,
          user_name: returnData.user_name,
          created_at: new Date().toISOString(),
        });
      }
    }
    this.set('products', products);

    // Update supplier debt
    const sIdx = suppliers.findIndex(s => s.id === returnData.supplier_id);
    if (sIdx !== -1) {
      suppliers[sIdx].total_debt = Math.max(0, suppliers[sIdx].total_debt - returnData.total_refund);
      suppliers[sIdx].updated_at = new Date().toISOString();
      this.set('suppliers', suppliers);
    }

    returns.unshift(returnData);
    this.set('purchase_returns', returns);

    this.addAuditLog(
      returnData.business_id,
      returnData.user_name,
      'مرتجع شراء',
      `إرجاع سلع بقيمة ${returnData.total_refund} DH للمورد ${returnData.supplier_name}`
    );
  }

  public getPurchaseReturns(businessId: string): PurchaseReturn[] {
    return this.get<PurchaseReturn>('purchase_returns').filter(r => r.business_id === businessId);
  }

  // --- Payments & Debt settlement ---
  public getPaymentTransactions(businessId: string): PaymentTransaction[] {
    return this.get<PaymentTransaction>('payments')
      .filter(p => p.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public recordCustomerPayment(tx: PaymentTransaction): void {
    const payments = this.get<PaymentTransaction>('payments');
    const customers = this.get<Customer>('customers');

    const cIdx = customers.findIndex(c => c.id === tx.entity_id);
    if (cIdx !== -1) {
      customers[cIdx].total_debt = Math.max(0, customers[cIdx].total_debt - tx.amount);
      customers[cIdx].updated_at = new Date().toISOString();
      this.set('customers', customers);
    }

    if (tx.payment_method === 'CASH') {
      const currentCash = this.getCurrentCashBalance(tx.business_id, tx.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-' + Date.now(),
        business_id: tx.business_id,
        branch_id: tx.branch_id,
        type: 'IN',
        category: 'CUSTOMER_PAYMENT',
        amount: tx.amount,
        balance_after: currentCash + tx.amount,
        reference: tx.reference_id || 'RECOUVREMENT',
        description: `سداد دين من العميل ${tx.entity_name}`,
        user_name: tx.user_name,
        created_at: new Date().toISOString(),
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    payments.unshift(tx);
    this.set('payments', payments);

    this.addAuditLog(
      tx.business_id,
      tx.user_name,
      'سداد دين عميل',
      `تسجيل دفعة بقيمة ${tx.amount} DH من العميل ${tx.entity_name} (${tx.payment_method})`
    );
  }

  public recordSupplierPayment(tx: PaymentTransaction): void {
    const payments = this.get<PaymentTransaction>('payments');
    const suppliers = this.get<Supplier>('suppliers');

    const sIdx = suppliers.findIndex(s => s.id === tx.entity_id);
    if (sIdx !== -1) {
      suppliers[sIdx].total_debt = Math.max(0, suppliers[sIdx].total_debt - tx.amount);
      suppliers[sIdx].updated_at = new Date().toISOString();
      this.set('suppliers', suppliers);
    }

    if (tx.payment_method === 'CASH') {
      const currentCash = this.getCurrentCashBalance(tx.business_id, tx.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-' + Date.now(),
        business_id: tx.business_id,
        branch_id: tx.branch_id,
        type: 'OUT',
        category: 'SUPPLIER_PAYMENT',
        amount: tx.amount,
        balance_after: currentCash - tx.amount,
        reference: tx.reference_id || 'PAIEMENT-FOURNISSEUR',
        description: `تسديد مستحقات للمورد ${tx.entity_name}`,
        user_name: tx.user_name,
        created_at: new Date().toISOString(),
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    payments.unshift(tx);
    this.set('payments', payments);

    this.addAuditLog(
      tx.business_id,
      tx.user_name,
      'تسديد دين مورد',
      `تسديد دفعة بقيمة ${tx.amount} DH للمورد ${tx.entity_name}`
    );
  }

  // --- Expenses ---
  public getExpenses(businessId: string, branchId?: string): Expense[] {
    const all = this.get<Expense>('expenses').filter(e => !e.business_id || e.business_id === businessId);
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createExpense(expense: Expense): void {
    const expenses = this.get<Expense>('expenses');
    const expenseDate = expense.created_at || new Date().toISOString();

    if (expense.payment_method === 'CASH') {
      const currentCash = this.getCurrentCashBalance(expense.business_id, expense.branch_id);
      const cashTx: CashTransaction = {
        id: 'cash-exp-' + expense.id,
        business_id: expense.business_id,
        branch_id: expense.branch_id,
        type: 'OUT',
        category: 'EXPENSE',
        amount: expense.amount,
        balance_after: currentCash - expense.amount,
        reference: expense.category,
        description: `مصروف: ${expense.description} (${expense.category})`,
        user_name: expense.user_name,
        created_at: expenseDate,
      };
      const cashList = this.get<CashTransaction>('cash_transactions');
      cashList.unshift(cashTx);
      this.set('cash_transactions', cashList);
    }

    expenses.unshift({
      ...expense,
      created_at: expenseDate
    });
    this.set('expenses', expenses);

    this.addAuditLog(
      expense.business_id,
      expense.user_name,
      'تسجيل مصروف',
      `تسجيل مصروف بقيمة ${expense.amount} DH [${expense.category}]`
    );
  }

  public deleteExpense(expenseId: string, businessId: string, userName: string): void {
    const expenses = this.get<Expense>('expenses');
    const target = expenses.find(e => e.id === expenseId);
    if (!target) return;

    // Remove matching cash transaction if it was CASH
    if (target.payment_method === 'CASH') {
      const cashList = this.get<CashTransaction>('cash_transactions');
      const filteredCash = cashList.filter(tx => tx.id !== 'cash-exp-' + expenseId);
      
      // Recalculate cash balances after the deleted transaction to keep the history accurate
      // For simplicity, we just filter it out. Let's filter it out.
      this.set('cash_transactions', filteredCash);
    }

    const filteredExpenses = expenses.filter(e => e.id !== expenseId);
    this.set('expenses', filteredExpenses);

    this.addAuditLog(
      businessId,
      userName,
      'حذف مصروف',
      `حذف مصروف بقيمة ${target.amount} DH [${target.category}] - ${target.description}`
    );
  }

  // --- Cash Treasury / Caisse ---
  public getCashTransactions(businessId: string, branchId?: string): CashTransaction[] {
    const all = this.get<CashTransaction>('cash_transactions').filter(c => !c.business_id || c.business_id === businessId);
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getCurrentCashBalance(businessId: string, branchId?: string): number {
    const txs = this.getCashTransactions(businessId, branchId);
    if (txs.length === 0) return 0;
    // Calculate sum of IN - OUT
    let balance = 0;
    for (const tx of txs) {
      if (tx.type === 'IN') balance += tx.amount;
      else if (tx.type === 'OUT') balance -= tx.amount;
    }
    return balance;
  }

  public addCashManual(
    businessId: string,
    branchId: string,
    type: 'IN' | 'OUT',
    amount: number,
    description: string,
    userName: string
  ): void {
    const current = this.getCurrentCashBalance(businessId, branchId);
    const newBal = type === 'IN' ? current + amount : current - amount;
    const cashTx: CashTransaction = {
      id: 'cash-' + Date.now(),
      business_id: businessId,
      branch_id: branchId,
      type,
      category: type === 'IN' ? 'MANUAL_IN' : 'MANUAL_OUT',
      amount,
      balance_after: newBal,
      description,
      user_name: userName,
      created_at: new Date().toISOString(),
    };
    const list = this.get<CashTransaction>('cash_transactions');
    list.unshift(cashTx);
    this.set('cash_transactions', list);

    this.addAuditLog(
      businessId,
      userName,
      type === 'IN' ? 'إيداع نقدي في الصندوق' : 'سحب نقدي من الصندوق',
      `${type === 'IN' ? 'إيداع' : 'سحب'} مبلغ ${amount} DH: ${description}`
    );
  }

  // --- Notifications ---
  public getNotifications(businessId: string): NotificationItem[] {
    return this.get<NotificationItem>('notifications')
      .filter(n => n.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addNotification(item: NotificationItem): void {
    const list = this.get<NotificationItem>('notifications');
    list.unshift(item);
    this.set('notifications', list.slice(0, 50));
  }

  public markNotificationAsRead(id: string): void {
    const list = this.get<NotificationItem>('notifications');
    const idx = list.findIndex(n => n.id === id);
    if (idx !== -1) {
      list[idx].read = true;
      this.set('notifications', list);
    }
  }

  public markAllNotificationsAsRead(businessId: string): void {
    const list = this.get<NotificationItem>('notifications');
    for (const n of list) {
      if (n.business_id === businessId) n.read = true;
    }
    this.set('notifications', list);
  }

  // --- Audit Logs ---
  public getAuditLogs(businessId: string): AuditLog[] {
    return this.get<AuditLog>('audit_logs')
      .filter(a => a.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addAuditLog(businessId: string, userName: string, action: string, details: string): void {
    const list = this.get<AuditLog>('audit_logs');
    list.unshift({
      id: 'log-' + Date.now() + Math.random().toString(36).substring(2, 5),
      business_id: businessId,
      user_name: userName,
      action,
      details,
      created_at: new Date().toISOString(),
    });
    this.set('audit_logs', list.slice(0, 200));
  }

  // --- Next Sequential Invoice Number ---
  public generateNextInvoiceNumber(businessId: string): string {
    const sales = this.getSales(businessId);
    const count = sales.length + 1;
    const year = new Date().getFullYear();
    return `FAC-${year}-${count.toString().padStart(5, '0')}`;
  }

  public generateNextPurchaseNumber(businessId: string): string {
    const purchases = this.getPurchases(businessId);
    const count = purchases.length + 1;
    const year = new Date().getFullYear();
    return `ACH-${year}-${count.toString().padStart(4, '0')}`;
  }

  // --- Database Export / Import (Backup & Restore) ---
  public exportCompleteBackup(): string {
    const collections = [
      'businesses',
      'branches',
      'users',
      'categories',
      'products',
      'customers',
      'suppliers',
      'sales',
      'sale_returns',
      'purchases',
      'purchase_returns',
      'stock_movements',
      'stock_adjustments',
      'expenses',
      'cash_transactions',
      'payments',
      'audit_logs',
      'notifications'
    ];
    const dump: Record<string, unknown> = {
      version: '1.0.0',
      export_date: new Date().toISOString(),
      data: {}
    };

    const dataObj: Record<string, unknown> = {};
    for (const col of collections) {
      dataObj[col] = this.get(col);
    }
    dump.data = dataObj;
    return JSON.stringify(dump, null, 2);
  }

  public restoreBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) return false;
      for (const [key, value] of Object.entries(parsed.data)) {
        if (Array.isArray(value)) {
          this.set(key, value);
        }
      }
      return true;
    } catch (e) {
      console.error('Failed to parse backup', e);
      return false;
    }
  }

  public exportAllData(): string {
    return this.exportCompleteBackup();
  }

  public importAllData(jsonString: string): boolean {
    return this.restoreBackup(jsonString);
  }

  public resetToEmptyStore(businessId: string, branchId: string): void {
    this.set('products', []);
    this.set('customers', []);
    this.set('suppliers', []);
    this.set('sales', []);
    this.set('sale_returns', []);
    this.set('purchases', []);
    this.set('purchase_returns', []);
    this.set('stock_movements', []);
    this.set('stock_adjustments', []);
    this.set('expenses', []);
    this.set('cash_transactions', [
      {
        id: 'cash-' + Date.now(),
        business_id: businessId,
        branch_id: branchId,
        type: 'IN',
        category: 'MANUAL_IN',
        amount: 0,
        balance_after: 0,
        description: 'بداية متجر جديد فارغ',
        user_name: 'المدير',
        created_at: new Date().toISOString(),
      }
    ]);
    this.set('payments', []);
    this.set('audit_logs', [
      {
        id: 'log-' + Date.now(),
        business_id: businessId,
        user_name: 'المدير',
        action: 'تصفير المتجر',
        details: 'تم بدء متجر جديد وفارغ بنجاح',
        created_at: new Date().toISOString(),
      }
    ]);
    this.set('notifications', []);
  }
}

export const db = new LocalDatabase();
