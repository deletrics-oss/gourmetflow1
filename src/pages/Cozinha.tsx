import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle, Volume2, Monitor } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AudioManager } from "@/components/AudioManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  table_id?: string;
  delivery_type: string;
  items: OrderItem[];
  created_at: string;
  status: string;
  notes?: string;
}

export default function Cozinha() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    
    // Realtime subscription
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['confirmed', 'preparing'])
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          return {
            id: order.id,
            order_number: order.order_number,
            table_id: order.table_id,
            delivery_type: order.delivery_type,
            items: items || [],
            created_at: order.created_at,
            status: order.status,
            notes: order.notes
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPreparing = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Pedido em preparação");
      loadOrders();
    } catch (error) {
      toast.error("Erro ao atualizar pedido");
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Pedido pronto!");
      loadOrders();
    } catch (error) {
      toast.error("Erro ao completar pedido");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-status-new';
      case 'preparing':
        return 'bg-status-preparing';
      default:
        return 'bg-muted';
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case 'dine-in':
        return 'Mesa';
      case 'delivery':
        return 'Delivery';
      case 'pickup':
        return 'Retirada';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const openKDSPopup = () => {
    window.open('/cozinha-externo', 'KDS Monitor', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      
      <div className="bg-status-new px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ChefHat className="h-8 w-8 text-status-new-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-status-new-foreground">Cozinha (KDS)</h1>
            <p className="text-status-new-foreground/80 text-sm">Pedidos em Produção</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={openKDSPopup}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Abrir em Monitor Externo
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Volume2 className="h-4 w-4 mr-2" />
                Áudio e Teste de Som
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Áudio</DialogTitle>
              </DialogHeader>
              <AudioManager />
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => {
                    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                    audio.play();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Testar Som
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="text-right">
            <p className="text-sm text-status-new-foreground/80">Pedidos na fila</p>
            <p className="text-4xl font-bold text-status-new-foreground">{orders.length}</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {orders.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-16 text-center">
            <div className="flex flex-col items-center justify-center">
              <ChefHat className="h-24 w-24 text-slate-600 mb-6" />
              <p className="text-2xl font-medium text-slate-300 mb-2">Nenhum pedido na fila</p>
              <p className="text-slate-400">Os pedidos confirmados aparecerão aqui</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                <div className={`${getStatusColor(order.status)} px-4 py-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-white font-bold text-lg">#{order.order_number}</p>
                    <p className="text-white/80 text-sm">{getDeliveryTypeLabel(order.delivery_type)}</p>
                  </div>
                  <Badge variant="secondary">
                    {order.status === 'confirmed' ? 'Novo' : 'Preparando'}
                  </Badge>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4 text-slate-300">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.quantity}x {item.name}</p>
                          {item.notes && (
                            <p className="text-sm text-yellow-400 mt-1">Obs Item: {item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded">
                        <p className="text-sm font-semibold text-yellow-300">Observações do Pedido:</p>
                        <p className="text-sm text-yellow-200 mt-1">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                    {order.status === 'confirmed' ? (
                      <Button 
                        className="flex-1 bg-status-preparing hover:bg-status-preparing/90"
                        onClick={() => handleStartPreparing(order.id)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Iniciar Preparo
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 bg-status-completed hover:bg-status-completed/90"
                        onClick={() => handleComplete(order.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
