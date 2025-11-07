import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChefHat, Clock, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function MonitorCozinhaExterno() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideSpeed = 8000;

  useEffect(() => {
    loadOrders();
    
    const channel = supabase
      .channel('kitchen-orders-external')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          tables(number)
        `)
        .in('status', ['new', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  
  const delayedOrders = orders.filter((o) => {
    const minutes = (new Date().getTime() - new Date(o.created_at).getTime()) / 60000;
    return o.status !== "completed" && minutes > 30;
  });

  const slides = [
    { title: "Pedidos em Análise", icon: Package, data: newOrders, color: "status-new" },
    { title: "Pedidos em Produção", icon: ChefHat, data: preparingOrders, color: "status-preparing" },
    { title: "Prontos para Entrega", icon: CheckCircle, data: readyOrders, color: "status-ready" },
    { title: "Pedidos Atrasados", icon: AlertTriangle, data: delayedOrders, color: "destructive" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, slideSpeed);

    return () => clearInterval(interval);
  }, [slideSpeed]);

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
    return `${diff} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className={`bg-${currentSlideData.color} px-8 py-6 mb-8 rounded-lg`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <Icon className="h-12 w-12" />
            <div>
              <h1 className="text-4xl font-bold">{currentSlideData.title}</h1>
              <p className="text-lg opacity-90">Monitor de Cozinha - Slide {currentSlide + 1}/{slides.length}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg opacity-90">Total</p>
            <p className="text-6xl font-bold">{currentSlideData.data.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentSlideData.data.length === 0 ? (
          <Card className="col-span-full p-16 text-center bg-card">
            <Icon className="h-24 w-24 mx-auto mb-6 text-muted-foreground/20" />
            <p className="text-2xl font-medium text-muted-foreground">
              Nenhum pedido nesta categoria
            </p>
          </Card>
        ) : (
          currentSlideData.data.map((order) => (
            <Card key={order.id} className="p-6 bg-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-3xl font-bold">#{order.order_number}</h3>
                  {order.tables && (
                    <Badge variant="outline" className="mt-2">
                      Mesa {order.tables.number}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <Badge className={`bg-${currentSlideData.color}`}>
                    {formatTime(order.created_at)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="border-b pb-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">
                        {item.quantity}x {item.name}
                      </span>
                    </div>
                    {item.notes && (
                      <div className="mt-1 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-sm">
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                          Obs: {item.notes}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mb-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {order.delivery_type === 'delivery' ? 'Entrega' : 
                   order.delivery_type === 'pickup' ? 'Retirada' : 'Mesa'}
                </span>
                <span className="text-xl font-bold">R$ {order.total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                {order.status === 'new' && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                  >
                    Iniciar Preparo
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    Marcar Pronto
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    Concluir
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide ? "w-12 bg-primary" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
