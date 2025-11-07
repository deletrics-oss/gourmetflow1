import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChefHat, Clock, AlertTriangle, CheckCircle, Package, Volume2, Gauge, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AudioManager } from "@/components/AudioManager";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { generatePrintReceipt } from "@/components/PrintReceipt";

export default function MonitorCozinha() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideSpeed, setSlideSpeed] = useState(8000);
  const [inventory, setInventory] = useState<any[]>([]);
  const [autoPrint, setAutoPrint] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurante");

  useEffect(() => {
    loadOrders();
    loadInventory();
    loadRestaurantSettings();
    
    // Realtime subscription
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        loadOrders();
        // Auto-imprimir quando novo pedido entra em "preparing"
        if (autoPrint && payload.eventType === 'UPDATE' && payload.new.status === 'preparing') {
          handleAutoPrint(payload.new);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        loadInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoPrint]);

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

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .lt('current_quantity', 'min_quantity')
        .order('current_quantity', { ascending: true })
        .limit(5);

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
    }
  };

  const handleAutoPrint = async (order: any) => {
    try {
      const { data: fullOrder } = await supabase
        .from('orders')
        .select(`*, order_items(*), tables(number)`)
        .eq('id', order.id)
        .single();

      if (fullOrder) {
        const tableNum = fullOrder.table_id && fullOrder.tables ? fullOrder.tables.number : undefined;
        generatePrintReceipt(fullOrder, restaurantName, tableNum, 'kitchen');
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  };

  const handlePrintOrder = async (order: any) => {
    const tableNum = order.table_id && order.tables ? order.tables.number : undefined;
    generatePrintReceipt(order, restaurantName, tableNum, 'kitchen');
    toast.success('Imprimindo pedido...');
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
  
  // Pedidos atrasados (mais de 30 minutos)
  const delayedOrders = orders.filter((o) => {
    const minutes = (new Date().getTime() - new Date(o.created_at).getTime()) / 60000;
    return o.status !== "completed" && minutes > 30;
  });

  const slides = [
    { title: "Pedidos em Análise", icon: Package, data: newOrders, color: "status-new", type: "orders" },
    { title: "Pedidos em Produção", icon: ChefHat, data: preparingOrders, color: "status-preparing", type: "orders" },
    { title: "Prontos para Entrega", icon: CheckCircle, data: readyOrders, color: "status-ready", type: "orders" },
    { title: "Pedidos Atrasados", icon: AlertTriangle, data: delayedOrders, color: "destructive", type: "orders" },
    { title: "Status Geral", icon: Clock, data: [], color: "primary", type: "summary" },
    { title: "Estoque Baixo", icon: AlertTriangle, data: inventory, color: "destructive", type: "inventory" },
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
    
    if (elapsed > prepTime * 1.5) return 'critical'; // Muito atrasado (>150% do tempo)
    if (elapsed > prepTime) return 'warning'; // Atrasado (>100% do tempo)
    return 'normal';
  };

  const getDelayColor = (status: string) => {
    if (status === 'critical') return 'bg-red-500 animate-pulse';
    if (status === 'warning') return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          onClick={() => window.open('/monitor-cozinha-externo', '_blank', 'width=1920,height=1080')}
        >
          <ChefHat className="h-4 w-4 mr-2" />
          Monitor Externo
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Volume2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações de Áudio e Impressão</DialogTitle>
            </DialogHeader>
            <AudioManager />
            <div className="flex items-center justify-between py-4 border-t">
              <Label htmlFor="auto-print">Impressão Automática ao Iniciar Preparo</Label>
              <Switch
                id="auto-print"
                checked={autoPrint}
                onCheckedChange={setAutoPrint}
              />
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Gauge className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Velocidade dos Slides</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Duração: {slideSpeed / 1000}s por slide
              </p>
              <Slider
                value={[slideSpeed]}
                onValueChange={([value]) => setSlideSpeed(value)}
                min={3000}
                max={20000}
                step={1000}
                className="w-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

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

      {currentSlideData.type === 'summary' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-8 text-center bg-card">
            <Package className="h-16 w-16 mx-auto mb-4 text-status-new" />
            <p className="text-4xl font-bold mb-2">{newOrders.length}</p>
            <p className="text-lg text-muted-foreground">Em Análise</p>
          </Card>
          <Card className="p-8 text-center bg-card">
            <ChefHat className="h-16 w-16 mx-auto mb-4 text-status-preparing" />
            <p className="text-4xl font-bold mb-2">{preparingOrders.length}</p>
            <p className="text-lg text-muted-foreground">Em Produção</p>
          </Card>
          <Card className="p-8 text-center bg-card">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-status-ready" />
            <p className="text-4xl font-bold mb-2">{readyOrders.length}</p>
            <p className="text-lg text-muted-foreground">Prontos</p>
          </Card>
          <Card className="p-8 text-center bg-card">
            <Clock className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-4xl font-bold mb-2">
              {orders.length > 0
                ? Math.round(
                    orders.reduce((sum, o) => {
                      const diff = (new Date().getTime() - new Date(o.created_at).getTime()) / 60000;
                      return sum + diff;
                    }, 0) / orders.length
                  )
                : 0}
            </p>
            <p className="text-lg text-muted-foreground">Tempo Médio (min)</p>
          </Card>
        </div>
      ) : currentSlideData.type === 'inventory' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {inventory.length === 0 ? (
            <Card className="col-span-full p-16 text-center bg-card">
              <AlertTriangle className="h-24 w-24 mx-auto mb-6 text-muted-foreground/20" />
              <p className="text-2xl font-medium text-muted-foreground">
                Estoque em níveis adequados
              </p>
            </Card>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className="p-6 bg-card border-l-4 border-l-destructive">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{item.name}</h3>
                    <Badge variant="destructive" className="mt-2">
                      Estoque Baixo
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Atual:</span>
                    <span className="font-bold text-destructive">
                      {item.current_quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Mínimo:</span>
                    <span className="font-medium">
                      {item.min_quantity} {item.unit}
                    </span>
                  </div>
                  {item.category && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span>{item.category}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
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
                    <h3 className="text-3xl font-bold">#{order.order_number}</h3>
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

                {/* Botões de ação */}
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
      )}

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
