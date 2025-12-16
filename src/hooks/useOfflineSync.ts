import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getOfflineStats,
  cacheMenu,
  getCachedMenu,
  clearSyncedData,
  getDB,
  type OfflineOrder,
  type OfflineCustomer,
} from '@/services/offlineDB';

interface SyncStats {
  pendingOrders: number;
  pendingCustomers: number;
  syncQueueSize: number;
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  syncStats: SyncStats;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  cacheMenuData: (restaurantId: string) => Promise<void>;
  getMenuFromCache: (restaurantId: string) => Promise<any>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingOrders: 0,
    pendingCustomers: 0,
    syncQueueSize: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restabelecida! Sincronizando dados...');
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão. Modo offline ativado.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateStats = useCallback(async () => {
    try {
      const stats = await getOfflineStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Error updating offline stats:', error);
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    updateStats();

    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        syncNow();
      }
      updateStats();
    }, 30000);

    clearSyncedData(7);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [updateStats]);

  const syncCustomers = async (): Promise<Map<string, string>> => {
    const customerIdMap = new Map<string, string>();
    const db = await getDB();
    const allCustomers: OfflineCustomer[] = await db.getAll('offline_customers');
    const unsyncedCustomers = allCustomers.filter(c => !c.synced);

    for (const customer of unsyncedCustomers) {
      try {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customer.phone)
          .eq('restaurant_id', customer.restaurant_id)
          .maybeSingle();

        if (existing) {
          customerIdMap.set(customer.id, existing.id);
          customer.synced = true;
          await db.put('offline_customers', customer);
          continue;
        }

        const customerData = {
          name: customer.name,
          phone: customer.phone,
          cpf: customer.cpf || null,
          address: customer.address || null,
          restaurant_id: customer.restaurant_id,
        };
        
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            name: customer.name,
            phone: customer.phone,
            cpf: customer.cpf || null,
            address: customer.address as any,
            restaurant_id: customer.restaurant_id,
          }])
          .select('id')
          .single();

        if (error) throw error;

        customerIdMap.set(customer.id, data.id);
        customer.synced = true;
        await db.put('offline_customers', customer);
      } catch (error) {
        console.error('Error syncing customer:', customer.id, error);
      }
    }

    return customerIdMap;
  };

  const syncOrders = async (_customerIdMap: Map<string, string>): Promise<number> => {
    const db = await getDB();
    const allOrders: OfflineOrder[] = await db.getAll('offline_orders');
    const unsyncedOrders = allOrders.filter(o => !o.synced && o.sync_attempts < 5);
    let syncedCount = 0;

    for (const order of unsyncedOrders) {
      try {
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert([{
            order_number: order.order_number,
            customer_name: order.customer_name || null,
            customer_phone: order.customer_phone || null,
            customer_cpf: order.customer_cpf || null,
            subtotal: order.subtotal,
            total: order.total,
            delivery_fee: order.delivery_fee || null,
            discount: order.discount || null,
            delivery_type: order.delivery_type,
            payment_method: (order.payment_method || 'pending') as any,
            delivery_address: order.delivery_address as any,
            notes: order.notes || null,
            status: (order.status || 'new') as any,
            restaurant_id: order.restaurant_id,
          }])
          .select('id')
          .single();

        if (orderError) throw orderError;

        if (order.items && order.items.length > 0) {
          await supabase.from('order_items').insert(
            order.items.map((item) => ({
              order_id: newOrder.id,
              menu_item_id: item.menu_item_id.startsWith('offline_') ? null : item.menu_item_id,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              notes: item.notes,
            }))
          );
        }

        order.synced = true;
        await db.put('offline_orders', order);
        syncedCount++;
      } catch (error) {
        console.error('Error syncing order:', order.id, error);
        order.sync_attempts += 1;
        await db.put('offline_orders', order);
      }
    }

    return syncedCount;
  };

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const customerIdMap = await syncCustomers();
      const syncedOrders = await syncOrders(customerIdMap);
      await updateStats();

      if (syncedOrders > 0) {
        toast.success(`${syncedOrders} pedido(s) sincronizado(s) com sucesso!`);
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateStats]);

  const cacheMenuData = useCallback(async (restaurantId: string) => {
    if (!navigator.onLine) return;

    try {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, image_url, sort_order')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order');

      const { data: items } = await supabase
        .from('menu_items')
        .select('id, name, description, price, promotional_price, image_url, category_id, is_available')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);

      if (categories && items) {
        await cacheMenu(restaurantId, categories, items);
      }
    } catch (error) {
      console.error('Error caching menu:', error);
    }
  }, []);

  const getMenuFromCache = useCallback(async (restaurantId: string) => {
    return getCachedMenu(restaurantId);
  }, []);

  return {
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    syncNow,
    cacheMenuData,
    getMenuFromCache,
  };
}
