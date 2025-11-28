import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, CheckCircle, Truck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  status: string;
  created_at: string;
  total: number;
}

export default function MonitorSenhasExterno() {
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [filterTotem, setFilterTotem] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const previousReadyCount = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadOrders();
    loadRestaurantSettings();
    
    // Realtime subscription
    const channel = supabase
      .channel('orders-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterTotem]);

  const loadRestaurantSettings = async () => {
    const { data } = await supabase.from('restaurant_settings').select('name').maybeSingle();
    if (data?.name) setRestaurantName(data.name);
  };

  const loadOrders = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (filterTotem) {
        query = query.like('order_number', 'TOTEM%');
      }

      const { data, error } = await query;

      if (error) throw error;

      const preparing = data?.filter(o => ['new', 'confirmed', 'preparing'].includes(o.status)) || [];
      const ready = data?.filter(o => o.status === 'ready') || [];
      const delivered = data?.filter(o => ['out_for_delivery', 'completed'].includes(o.status)) || [];

      // Detectar novo pedido pronto
      if (ready.length > previousReadyCount.current) {
        const newReadyOrders = ready.slice(0, ready.length - previousReadyCount.current);
        newReadyOrders.forEach(order => speakOrderReady(order.order_number));
      }
      previousReadyCount.current = ready.length;

      setPreparingOrders(preparing);
      setReadyOrders(ready);
      setDeliveredOrders(delivered);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const speakOrderReady = (orderNumber: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Pedido ${orderNumber.replace('TOTEM-', '')} está pronto!`
      );
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const OrderCard = ({ order, icon: Icon, color }: { order: Order; icon: any; color: string }) => (
    <Card className={`p-6 ${color} border-2 animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="h-10 w-10" />
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {formatTime(order.created_at)}
        </Badge>
      </div>
      <h3 className="text-4xl font-bold mb-2">
        {order.order_number.replace('TOTEM-', '')}
      </h3>
      {order.customer_name && order.customer_name !== 'Cliente Totem' && (
        <p className="text-2xl font-medium opacity-80 mb-2">
          {order.customer_name}
        </p>
      )}
      <p className="text-xl opacity-70">
        R$ {order.total.toFixed(2)}
      </p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mb-8 text-center">
        <h1 className="text-6xl font-bold mb-2">
          {restaurantName || 'Monitor de Pedidos'}
        </h1>
        <p className="text-2xl text-muted-foreground mb-4">Acompanhe seus pedidos em tempo real</p>
        <div className="flex justify-center gap-2">
          <Button
            variant={filterTotem ? 'default' : 'outline'}
            onClick={() => setFilterTotem(true)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Apenas TOTEM
          </Button>
          <Button
            variant={!filterTotem ? 'default' : 'outline'}
            onClick={() => setFilterTotem(false)}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Todos os Pedidos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Coluna Preparando */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Package className="h-10 w-10 text-orange-500" />
            <h2 className="text-3xl font-bold">Preparando</h2>
            <Badge variant="secondary" className="text-xl px-3 py-1">
              {preparingOrders.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-xl text-muted-foreground">Nenhum pedido em preparo</p>
              </Card>
            ) : (
              preparingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  icon={Clock}
                  color="bg-orange-50 border-orange-300"
                />
              ))
            )}
          </div>
        </div>

        {/* Coluna Pronto */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <h2 className="text-3xl font-bold">Pronto</h2>
            <Badge variant="secondary" className="text-xl px-3 py-1">
              {readyOrders.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-xl text-muted-foreground">Nenhum pedido pronto</p>
              </Card>
            ) : (
              readyOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  icon={CheckCircle}
                  color="bg-green-50 border-green-300 animate-pulse"
                />
              ))
            )}
          </div>
        </div>

        {/* Coluna Entregue */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Truck className="h-10 w-10 text-blue-500" />
            <h2 className="text-3xl font-bold">Entregue</h2>
            <Badge variant="secondary" className="text-xl px-3 py-1">
              {deliveredOrders.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {deliveredOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-xl text-muted-foreground">Nenhum pedido entregue hoje</p>
              </Card>
            ) : (
              deliveredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  icon={CheckCircle}
                  color="bg-blue-50 border-blue-300 opacity-60"
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 text-sm text-muted-foreground">
        Última atualização: {new Date().toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
}
