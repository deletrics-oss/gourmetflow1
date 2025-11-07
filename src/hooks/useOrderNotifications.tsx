import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useOrderNotifications(customerPhone: string) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!customerPhone) return;

    // Subscribe to order status changes
    const channel = supabase
      .channel(`order-notifications-${customerPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
        },
        async (payload) => {
          console.log('📢 Nova atualização de pedido:', payload);

          // Get order details
          const { data: order } = await supabase
            .from('orders')
            .select('order_number, customer_phone')
            .eq('id', payload.new.order_id)
            .single();

          if (order && order.customer_phone === customerPhone) {
            const statusMessages: Record<string, { title: string; message: string; icon: string }> = {
              confirmed: {
                title: '✅ Pedido Confirmado!',
                message: `Seu pedido ${order.order_number} foi confirmado`,
                icon: '✅',
              },
              preparing: {
                title: '👨‍🍳 Pedido na Cozinha!',
                message: `Seu pedido ${order.order_number} está sendo preparado`,
                icon: '👨‍🍳',
              },
              ready: {
                title: '✨ Pedido Pronto!',
                message: `Seu pedido ${order.order_number} está pronto`,
                icon: '✨',
              },
              out_for_delivery: {
                title: '🚗 Saiu para Entrega!',
                message: `Seu pedido ${order.order_number} saiu para entrega`,
                icon: '🚗',
              },
              completed: {
                title: '🎉 Pedido Concluído!',
                message: `Seu pedido ${order.order_number} foi concluído`,
                icon: '🎉',
              },
            };

            const statusInfo = statusMessages[payload.new.new_status];
            if (statusInfo) {
              toast.success(statusInfo.title, {
                description: statusInfo.message,
              });

              setNotifications((prev) => [
                ...prev,
                {
                  ...payload.new,
                  order_number: order.order_number,
                  timestamp: new Date(),
                },
              ]);

              // Play notification sound
              const audio = new Audio('/audios/novopedidoonline.mp3');
              audio.play().catch(() => console.log('Could not play notification sound'));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerPhone]);

  return { notifications };
}
