import { openDB, IDBPDatabase } from 'idb';

// Define types for offline data
export interface OfflineOrder {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  items: Array<{
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>;
  subtotal: number;
  total: number;
  delivery_fee?: number;
  discount?: number;
  delivery_type: 'delivery' | 'pickup' | 'dine_in';
  payment_method?: string;
  delivery_address?: object;
  notes?: string;
  status: string;
  restaurant_id: string;
  synced: boolean;
  created_at: string;
  sync_attempts: number;
}

export interface OfflineCustomer {
  id: string;
  name: string;
  phone: string;
  cpf?: string;
  address?: object;
  restaurant_id: string;
  synced: boolean;
  created_at: string;
}

export interface MenuCache {
  id: string;
  restaurant_id: string;
  categories: Array<{
    id: string;
    name: string;
    image_url?: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    promotional_price?: number;
    image_url?: string;
    category_id: string;
    is_available: boolean;
  }>;
  cached_at: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create_order' | 'create_customer' | 'update_order';
  entity_type: string;
  entity_id: string;
  data: object;
  created_at: string;
  attempts: number;
  last_error?: string;
}

const DB_NAME = 'gourmetflow-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline orders store
      if (!db.objectStoreNames.contains('offline_orders')) {
        const orderStore = db.createObjectStore('offline_orders', { keyPath: 'id' });
        orderStore.createIndex('by-synced', 'synced');
        orderStore.createIndex('by-restaurant', 'restaurant_id');
      }

      // Offline customers store
      if (!db.objectStoreNames.contains('offline_customers')) {
        const customerStore = db.createObjectStore('offline_customers', { keyPath: 'id' });
        customerStore.createIndex('by-synced', 'synced');
        customerStore.createIndex('by-phone', 'phone');
      }

      // Menu cache store
      if (!db.objectStoreNames.contains('menu_cache')) {
        const menuStore = db.createObjectStore('menu_cache', { keyPath: 'id' });
        menuStore.createIndex('by-restaurant', 'restaurant_id');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('by-action', 'action');
      }
    },
  });

  return dbInstance;
}

// Generate unique ID for offline records
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate offline order number
export function generateOfflineOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `OFF-${timestamp}`;
}

// ================== ORDERS ==================

export async function saveOfflineOrder(order: Omit<OfflineOrder, 'id' | 'synced' | 'created_at' | 'sync_attempts'>): Promise<string> {
  const db = await getDB();
  const id = generateOfflineId();
  const orderData: OfflineOrder = {
    ...order,
    id,
    synced: false,
    created_at: new Date().toISOString(),
    sync_attempts: 0,
  };
  await db.put('offline_orders', orderData);
  
  // Add to sync queue
  await addToSyncQueue('create_order', 'orders', id, orderData);
  
  return id;
}

export async function getUnsyncedOrders(): Promise<OfflineOrder[]> {
  const db = await getDB();
  return db.getAllFromIndex('offline_orders', 'by-synced', false);
}

export async function markOrderSynced(id: string, supabaseId?: string): Promise<void> {
  const db = await getDB();
  const order = await db.get('offline_orders', id);
  if (order) {
    order.synced = true;
    if (supabaseId) {
      order.id = supabaseId; // Update with real ID
    }
    await db.put('offline_orders', order);
  }
}

export async function getOfflineOrders(restaurantId: string): Promise<OfflineOrder[]> {
  const db = await getDB();
  const allOrders: OfflineOrder[] = await db.getAllFromIndex('offline_orders', 'by-restaurant', restaurantId);
  return allOrders.filter(o => !o.synced);
}

export async function incrementSyncAttempt(id: string): Promise<void> {
  const db = await getDB();
  const order = await db.get('offline_orders', id);
  if (order) {
    order.sync_attempts += 1;
    await db.put('offline_orders', order);
  }
}

// ================== CUSTOMERS ==================

export async function saveOfflineCustomer(customer: Omit<OfflineCustomer, 'id' | 'synced' | 'created_at'>): Promise<string> {
  const db = await getDB();
  
  // Check if customer with same phone already exists
  const existing: OfflineCustomer | undefined = await db.getFromIndex('offline_customers', 'by-phone', customer.phone);
  if (existing) {
    return existing.id;
  }
  
  const id = generateOfflineId();
  const customerData: OfflineCustomer = {
    ...customer,
    id,
    synced: false,
    created_at: new Date().toISOString(),
  };
  await db.put('offline_customers', customerData);
  
  // Add to sync queue
  await addToSyncQueue('create_customer', 'customers', id, customerData);
  
  return id;
}

export async function getUnsyncedCustomers(): Promise<OfflineCustomer[]> {
  const db = await getDB();
  return db.getAllFromIndex('offline_customers', 'by-synced', false);
}

export async function markCustomerSynced(id: string): Promise<void> {
  const db = await getDB();
  const customer = await db.get('offline_customers', id);
  if (customer) {
    customer.synced = true;
    await db.put('offline_customers', customer);
  }
}

export async function searchOfflineCustomers(phone: string): Promise<OfflineCustomer | undefined> {
  const db = await getDB();
  return db.getFromIndex('offline_customers', 'by-phone', phone);
}

// ================== MENU CACHE ==================

export async function cacheMenu(restaurantId: string, categories: any[], items: any[]): Promise<void> {
  const db = await getDB();
  await db.put('menu_cache', {
    id: restaurantId,
    restaurant_id: restaurantId,
    categories,
    items,
    cached_at: new Date().toISOString(),
  });
}

export async function getCachedMenu(restaurantId: string): Promise<MenuCache | undefined> {
  const db = await getDB();
  return db.get('menu_cache', restaurantId);
}

export async function isMenuCacheValid(restaurantId: string, maxAgeMinutes: number = 60): Promise<boolean> {
  const cached = await getCachedMenu(restaurantId);
  if (!cached) return false;
  
  const cachedAt = new Date(cached.cached_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - cachedAt.getTime()) / (1000 * 60);
  
  return diffMinutes < maxAgeMinutes;
}

// ================== SYNC QUEUE ==================

export async function addToSyncQueue(action: string, entityType: string, entityId: string, data: object): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', {
    id: generateOfflineId(),
    action: action as any,
    entity_type: entityType,
    entity_id: entityId,
    data,
    created_at: new Date().toISOString(),
    attempts: 0,
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('sync_queue');
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await getDB();
  const item: SyncQueueItem | undefined = await db.get('sync_queue', id);
  if (item) {
    await db.put('sync_queue', { ...item, ...updates });
  }
}

// ================== STATISTICS ==================

export async function getOfflineStats(): Promise<{
  pendingOrders: number;
  pendingCustomers: number;
  syncQueueSize: number;
}> {
  const db = await getDB();
  const pendingOrders = await db.countFromIndex('offline_orders', 'by-synced', false);
  const pendingCustomers = await db.countFromIndex('offline_customers', 'by-synced', false);
  const syncQueueSize = await db.count('sync_queue');
  
  return {
    pendingOrders,
    pendingCustomers,
    syncQueueSize,
  };
}

// ================== CLEANUP ==================

export async function clearSyncedData(olderThanDays: number = 7): Promise<void> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // Clear old synced orders
  const orders: OfflineOrder[] = await db.getAllFromIndex('offline_orders', 'by-synced', true);
  for (const order of orders) {
    if (new Date(order.created_at) < cutoffDate) {
      await db.delete('offline_orders', order.id);
    }
  }
  
  // Clear old synced customers
  const customers: OfflineCustomer[] = await db.getAllFromIndex('offline_customers', 'by-synced', true);
  for (const customer of customers) {
    if (new Date(customer.created_at) < cutoffDate) {
      await db.delete('offline_customers', customer.id);
    }
  }
}
