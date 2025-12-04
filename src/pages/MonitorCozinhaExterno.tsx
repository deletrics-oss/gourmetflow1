import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ChefHat, Clock, AlertTriangle, CheckCircle, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PrintReceipt } from "@/components/PrintReceipt";

export default function MonitorCozinhaExterno() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideSpeed = 8000;
  const [restaurantName, setRestaurantName] = useState("Restaurante");
  const [autoPrint, setAutoPrint] = useState(false);
  const previousOrderCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play audio notification for new orders
  useEffect(() => {
    const newOrdersCount = orders.filter(o => o.status === 'new').length;
    
    if (newOrdersCount > previousOrderCountRef.current && previousOrderCountRef.current > 0) {
      // New order arrived - play audio
      if (!audioRef.current) {
        audioRef.current = new Audio('/audios/novopedido.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
    
    previousOrderCountRef.current = newOrdersCount;
  }, [orders]);

  useEffect(() => {
    loadOrders();
    loadRestaurantSettings();
    
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

  const loadRestaurantSettings = async () => {
    try {
      const { data } = await supabase
        .from('restaurant_settings')
        .select('name')
        .maybeSingle();

      if (data?.name) {
        setRestaurantName(data.name);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, menu_items(preparation_time)),
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

  const getOrderPrepTime = (order: any) => {
    const maxPrepTime = Math.max(
      ...order.order_items.map((item: any) => item.menu_items?.preparation_time || 20)
    );
    return maxPrepTime;
  };

  const getOrderDelayStatus = (order: any) => {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const elapsed = (now.getTime() - createdAt.getTime()) / 60000;
    const prepTime = getOrderPrepTime(order);
    
    if (elapsed > prepTime * 1.5) return 'critical';
    if (elapsed > prepTime) return 'warning';
    return 'normal';
  };

  const getDelayColor = (status: string) => {
    if (status === 'critical') return 'bg-red-500 animate-pulse';
    if (status === 'warning') return 'bg-orange-500';
    return 'bg-green-500';
  };

  const handlePrintOrder = (order: any) => {
    const receiptContent = PrintReceipt({ order, restaurantName });
    const printWindow = window.open('', '', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;
      
      if (newStatus === 'preparing' && autoPrint) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          handlePrintOrder(order);
        }
      }
      
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                id="auto-print-monitor" 
                checked={autoPrint}
                onCheckedChange={setAutoPrint}
              />
              <Label htmlFor="auto-print-monitor" className="text-white text-sm cursor-pointer">
                Impressão Automática
              </Label>
            </div>
            <div className="text-right">
              <p className="text-lg opacity-90">Total</p>
              <p className="text-6xl font-bold">{currentSlideData.data.length}</p>
            </div>
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
          currentSlideData.data.map((order) => {
            const delayStatus = getOrderDelayStatus(order);
            const prepTime = getOrderPrepTime(order);
            const createdAt = new Date(order.created_at);
            const estimatedReady = new Date(createdAt.getTime() + prepTime * 60000);
            
            return (
            <Card key={order.id} className="p-6 bg-card relative">
              <div className={`absolute top-0 right-0 w-4 h-4 rounded-bl-lg ${getDelayColor(delayStatus)}`} />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl font-bold">#{order.order_number}</h3>
                    {order.order_number.startsWith('TOTEM') && (
                      <Badge className="bg-purple-600 text-white">🖥️ TOTEM</Badge>
                    )}
                    {order.order_number.startsWith('MESA') && (
                      <Badge className="bg-blue-600 text-white">🏠 MESA</Badge>
                    )}
                    {order.order_number.startsWith('PED') && (
                      <Badge className="bg-green-600 text-white">📱 ONLINE</Badge>
                    )}
                    {!order.order_number.startsWith('TOTEM') && !order.order_number.startsWith('MESA') && !order.order_number.startsWith('PED') && (
                      <Badge className="bg-gray-600 text-white">🏪 BALCÃO</Badge>
                    )}
                  </div>
                  {order.tables && (
                    <Badge variant="outline" className="mt-2">
                      Mesa {order.tables.number}
                    </Badge>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <Badge className={`bg-${currentSlideData.color}`}>
                    {formatTime(order.created_at)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Preparo: {prepTime}min
                  </div>
                  <div className="text-xs font-medium">
                    Pronto: {estimatedReady.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
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
                          📝 {item.notes}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {order.notes && (
                  <div className="mt-2 p-3 bg-blue-100 dark:bg-blue-900/20 rounded border-l-4 border-l-blue-500">
                    <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                      💬 Observação do Pedido: {order.notes}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t pt-3 mb-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {order.delivery_type === 'delivery' ? 'Entrega' : 
                   order.delivery_type === 'pickup' ? 'Retirada' : 'Mesa'}
                </span>
                <span className="text-xl font-bold">R$ {order.total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="icon"
                  variant="outline"
                  onClick={() => handlePrintOrder(order)}
                  title="Imprimir"
                >
                  <Printer className="h-4 w-4" />
                </Button>
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
          );
        })
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
