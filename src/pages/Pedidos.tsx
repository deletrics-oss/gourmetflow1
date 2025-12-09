import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, ShoppingBag, TrendingUp, Clock, Package, ChefHat, Truck, CheckCircle2, Phone, User, MapPin, FileText, XCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { logActionWithContext } from "@/lib/logging";
import { OrderDetailsDialog } from "@/components/dialogs/OrderDetailsDialog";
import { CancelOrderDialog } from "@/components/dialogs/CancelOrderDialog";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function Pedidos() {
  const { restaurantId } = useRestaurant();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [selectedMotoboy, setSelectedMotoboy] = useState<Record<string, string>>({});
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);

  useEffect(() => {
    if (restaurantId) {
      loadOrders();
      loadMotoboys();
    }
    
    // Realtime subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (restaurantId) loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadMotoboys = async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('motoboys')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMotoboys(data || []);
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
    }
  };

  const handleAssignMotoboy = async (orderId: string, motoboyId: string, orderNumber: string) => {
    try {
      console.log("🚗 Atribuindo motoboy:", { orderId, motoboyId });

      // Atualizar pedido com motoboy e status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          motoboy_id: motoboyId,
          status: "out_for_delivery" 
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Buscar dados do motoboy
      const { data: motoboy } = await supabase
        .from("motoboys")
        .select("*")
        .eq("id", motoboyId)
        .single();

      // Log da ação
      await logActionWithContext(
        'assign_motoboy',
        'orders',
        orderId,
        {
          motoboy_id: motoboyId,
          motoboy_name: motoboy?.name,
          order_number: orderNumber
        }
      );

      toast.success(`Motoboy ${motoboy?.name} atribuído!`);
      loadOrders();
    } catch (error) {
      console.error("Erro ao atribuir motoboy:", error);
      toast.error("Erro ao atribuir motoboy");
    }
  };

  const loadOrders = async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          tables(number)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, motoboyId?: string) => {
    console.log("🔧 Iniciando atualização de status:", { orderId, newStatus, motoboyId });
    
    try {
      // Buscar o pedido completo
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error("❌ Erro ao buscar pedido:", fetchError);
        throw fetchError;
      }

      if (!order) {
        console.error("❌ Pedido não encontrado");
        throw new Error('Pedido não encontrado');
      }

      console.log("📊 Pedido ANTES:", order);

      // Se está tentando concluir, verificar se o pagamento foi feito
      if (newStatus === 'completed') {
        // Apenas permite concluir se o payment_method não for 'pending'
        if (order.payment_method === 'pending') {
          toast.error('Pedido não pode ser concluído sem pagamento confirmado. Use o PDV ou aguarde pagamento online.');
          return;
        }

        // Atualizar status do pedido
        const { data: updated, error } = await supabase
          .from('orders')
          .update({ 
            status: newStatus,
            completed_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select()
          .single();

        if (error) {
          console.error("❌ Erro ao atualizar:", error);
          toast.error(`Erro: ${error.message}`);
          throw error;
        }
        
        console.log("✅ Pedido DEPOIS:", updated);

        // Log da ação
        await logActionWithContext(
          'complete_order',
          'orders',
          orderId,
          {
            old_status: order.status,
            new_status: 'completed',
            order_number: order.order_number,
            total: order.total
          }
        );

        // Liberar mesa se for pedido no local
        if (order.table_id) {
          await supabase
            .from('tables')
            .update({ status: 'free' })
            .eq('id', order.table_id);
        }

        // Se tem pontos de fidelidade, creditar os pontos
        if (order.loyalty_points_earned > 0 && order.customer_phone) {
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', order.customer_phone)
            .maybeSingle();

          if (customer) {
            const { data: existingTransaction } = await supabase
              .from('loyalty_transactions')
              .select('*')
              .eq('order_id', orderId)
              .eq('type', 'earned')
              .maybeSingle();

            if (!existingTransaction) {
              const newPoints = (customer.loyalty_points || 0) + order.loyalty_points_earned;
              await supabase
                .from('customers')
                .update({ loyalty_points: newPoints })
                .eq('id', customer.id);

              await supabase
                .from('loyalty_transactions')
                .insert({
                  customer_id: customer.id,
                  order_id: orderId,
                  points: order.loyalty_points_earned,
                  type: 'earned',
                  description: `Pontos ganhos no pedido ${order.order_number}`
                });

              toast.success(`Pedido concluído! Cliente ganhou ${order.loyalty_points_earned} pontos!`);
            } else {
              toast.success('Pedido concluído!');
            }
          }
        } else {
          toast.success('Pedido concluído!');
        }
      } else {
        // Para outros status, apenas atualizar
        const updates: any = { status: newStatus };
        
        if (newStatus === 'preparing') {
          console.log("⏱️ Atualizando para status 'preparing'");
          updates.updated_at = new Date().toISOString();
        }
        
        if (motoboyId) {
          console.log("🚗 Atribuindo motoboy:", motoboyId);
          updates.motoboy_id = motoboyId;
        }
        
        console.log("📝 Atualizando pedido com:", updates);
        
        const { data: updated, error: updateError } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', orderId)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Erro ao atualizar pedido:", updateError);
          toast.error(`Erro: ${updateError.message}`);
          throw updateError;
        }
        
        console.log("✅ Pedido atualizado com sucesso:", updated);
        
        // Log da ação
        await logActionWithContext(
          'update_order_status',
          'orders',
          orderId,
          {
            old_status: order.status,
            new_status: newStatus,
            motoboy_id: motoboyId || null
          }
        );
        
        toast.success('Status atualizado!');
      }
      
      // Forçar reload completo
      setTimeout(() => {
        loadOrders();
      }, 500);
    } catch (error: any) {
      console.error("💥 Erro completo:", error);
      console.error("💥 Código do erro:", error?.code);
      console.error("💥 Detalhes:", error?.details);
      console.error("💥 Hint:", error?.hint);
      console.error("💥 Message:", error?.message);
      
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || 'N/A';
      
      toast.error(`Erro ${errorCode}: ${errorMessage}`, {
        description: 'Verifique o console (F12) para mais detalhes',
        duration: 5000
      });
    }
  };

  const getFilteredCompletedOrders = () => {
    let filtered = orders.filter((o) => o.status === "completed");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      filtered = filtered.filter((o) => new Date(o.created_at) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((o) => new Date(o.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((o) => new Date(o.created_at) >= monthAgo);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((o) =>
        o.order_number.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query) ||
        o.customer_cpf?.includes(query)
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
  const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const averageTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const completedOrders = getFilteredCompletedOrders();

  const getDeliveryTypeLabel = (type: string) => {
    const labels: any = {
      'delivery': 'Entrega',
      'pickup': 'Retirada',
      'dine_in': 'Consumo Local'
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: any = {
      'cash': 'Dinheiro',
      'credit_card': 'Cartão Crédito',
      'debit_card': 'Cartão Débito',
      'pix': 'PIX',
      'pending': 'Pendente'
    };
    return labels[method] || method;
  };

  // Badge de origem do pedido
  const getOrderOriginBadge = (order: any) => {
    const orderNum = order.order_number || '';
    
    if (orderNum.startsWith('TOTEM-')) {
      return <Badge className="bg-purple-500 text-white">🖥️ TOTEM</Badge>;
    }
    if (orderNum.startsWith('MESA-') || orderNum.startsWith('M-') || order.table_id) {
      return <Badge className="bg-blue-500 text-white">🏠 MESA</Badge>;
    }
    if (orderNum.startsWith('PED-') || orderNum.startsWith('ONL-')) {
      return <Badge className="bg-green-500 text-white">📱 ONLINE</Badge>;
    }
    if (orderNum.startsWith('BAL-')) {
      return <Badge className="bg-gray-500 text-white">🏪 BALCÃO</Badge>;
    }
    if (orderNum.startsWith('PDV')) {
      return <Badge className="bg-orange-500 text-white">💳 PDV</Badge>;
    }
    return <Badge variant="outline">📦 PEDIDO</Badge>;
  };

  const handleCancelOrder = (order: any) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Painel de Pedidos</h1>
        <p className="text-muted-foreground">Gerencie seus pedidos em tempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faturamento Hoje</p>
              <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pedidos Hoje</p>
              <p className="text-2xl font-bold">{todayOrders.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold">R$ {averageTicket.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Aguardando</p>
              <p className="text-2xl font-bold">{newOrders.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="novos" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="novos" className="data-[state=active]:bg-status-new data-[state=active]:text-status-new-foreground">
            <Package className="h-4 w-4 mr-2" />
            Novos
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{newOrders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="preparo" className="data-[state=active]:bg-status-preparing data-[state=active]:text-status-preparing-foreground">
            <ChefHat className="h-4 w-4 mr-2" />
            Em Preparo
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{preparingOrders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pronto" className="data-[state=active]:bg-status-ready data-[state=active]:text-status-ready-foreground">
            <Truck className="h-4 w-4 mr-2" />
            Saiu / Pronto
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{readyOrders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="concluidos" className="data-[state=active]:bg-status-completed data-[state=active]:text-status-completed-foreground">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluídos
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{completedOrders.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novos" className="mt-6">
          {newOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground/20 mb-4 mx-auto" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Nenhum pedido novo</p>
              <p className="text-sm text-muted-foreground">Os pedidos confirmados aparecerão aqui</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {newOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">#{order.order_number}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {order.tables && <Badge variant="outline">Mesa {order.tables.number}</Badge>}
                        {getOrderOriginBadge(order)}
                      </div>
                    </div>
                    <Badge className="bg-status-new text-status-new-foreground">
                      {getDeliveryTypeLabel(order.delivery_type)}
                    </Badge>
                  </div>

                  {/* Informações do Cliente */}
                  {(order.customer_name || order.customer_phone) && (
                    <div className="bg-muted/50 p-3 rounded-lg mb-4 space-y-1">
                      {order.customer_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3" />
                          <span>{order.customer_name}</span>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          <span>{order.customer_phone}</span>
                        </div>
                      )}
                      {order.delivery_address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs">{order.delivery_address.street}, {order.delivery_address.number}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any) => (
                        <div key={item.id} className="border-b pb-2">
                          <div className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>R$ {item.total_price.toFixed(2)}</span>
                          </div>
                          {item.notes && (
                            <div className="mt-1 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs">
                              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                                Obs: {item.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic text-center py-2">
                        Sem itens cadastrados
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Observações:</p>
                          <p>{order.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R$ {order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Entrega:</span>
                        <span>R$ {order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto:</span>
                        <span>-R$ {order.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Pagamento:</span>
                      <span>{getPaymentMethodLabel(order.payment_method)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => updateOrderStatus(order.id, "preparing")}>
                      Iniciar Preparo
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleCancelOrder(order)}
                      title="Cancelar pedido"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preparo" className="mt-6">
          {preparingOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <ChefHat className="h-16 w-16 text-muted-foreground/20 mb-4 mx-auto" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Nenhum pedido em preparo</p>
              <p className="text-sm text-muted-foreground">Os pedidos em produção aparecerão aqui</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preparingOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">#{order.order_number}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {order.tables && <Badge variant="outline">Mesa {order.tables.number}</Badge>}
                        {getOrderOriginBadge(order)}
                      </div>
                    </div>
                    <Badge className="bg-status-preparing text-status-preparing-foreground">
                      {getDeliveryTypeLabel(order.delivery_type)}
                    </Badge>
                  </div>
                  <div className="space-y-2 mb-4">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic text-center py-2">
                        Sem itens cadastrados
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mb-4 text-lg font-bold">
                    <span>Total:</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                  </div>
                   {order.payment_method === 'pending' ? (
                     <Button className="w-full" variant="outline" disabled>
                       Aguardando Pagamento no PDV
                     </Button>
                   ) : (
                     <Button className="w-full" onClick={() => updateOrderStatus(order.id, "ready")}>
                       Marcar como Pronto
                     </Button>
                   )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pronto" className="mt-6">
          {readyOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <Truck className="h-16 w-16 text-muted-foreground/20 mb-4 mx-auto" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Nenhum pedido pronto</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readyOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">#{order.order_number}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {order.tables && <Badge variant="outline">Mesa {order.tables.number}</Badge>}
                        {getOrderOriginBadge(order)}
                      </div>
                    </div>
                    <Badge className="bg-status-ready text-status-ready-foreground">
                      {getDeliveryTypeLabel(order.delivery_type)}
                    </Badge>
                  </div>
                   <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold">R$ {order.total.toFixed(2)}</span>
                  </div>
                  
                  {/* Seleção de Motoboy para Entregas */}
                  {order.delivery_type === 'delivery' && (
                    <div className="mb-4 space-y-2">
                      <Label className="text-sm font-medium">Motoboy (Opcional)</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={selectedMotoboy[order.id] || ''}
                        onChange={(e) => setSelectedMotoboy({
                          ...selectedMotoboy,
                          [order.id]: e.target.value
                        })}
                      >
                        <option value="">Nenhum motoboy</option>
                        {motoboys.map((motoboy) => (
                          <option key={motoboy.id} value={motoboy.id}>
                            {motoboy.name} - {motoboy.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {order.delivery_type === 'delivery' && selectedMotoboy[order.id] && (
                      <Button 
                        className="w-full" 
                        onClick={() => handleAssignMotoboy(order.id, selectedMotoboy[order.id], order.order_number)}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Atribuir Motoboy e Enviar
                      </Button>
                    )}
                    <Button 
                      className="w-full" 
                      variant={selectedMotoboy[order.id] ? "outline" : "default"}
                      onClick={() => updateOrderStatus(order.id, "completed")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Concluir {order.delivery_type === 'delivery' ? 'sem Motoboy' : ''}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluidos" className="mt-6">
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Buscar por número, cliente ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todos os pedidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              <p className="text-2xl font-bold">{completedOrders.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <p className="text-2xl font-bold">
                R$ {completedOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold">
                R$ {(completedOrders.reduce((sum, o) => sum + o.total, 0) / 
                    Math.max(1, completedOrders.length)).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Formas de Pagamento</p>
              <div className="text-xs text-muted-foreground">
                💵 {completedOrders.filter(o => o.payment_method === 'cash').length} | 
                💳 {completedOrders.filter(o => o.payment_method === 'credit_card' || o.payment_method === 'debit_card').length} | 
                📱 {completedOrders.filter(o => o.payment_method === 'pix').length}
              </div>
            </Card>
          </div>

          {completedOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-muted-foreground/20 mb-4 mx-auto" />
              <p className="text-xl font-medium text-muted-foreground mb-2">Nenhum pedido concluído no período selecionado</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {completedOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="p-4 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => {
                    setSelectedOrder(order);
                    setDetailsDialogOpen(true);
                  }}
                >
                  <h3 className="text-lg font-bold mb-2">#{order.order_number}</h3>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Total:</span> R$ {order.total.toFixed(2)}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tipo:</span> {getDeliveryTypeLabel(order.delivery_type)}
                    </p>
                    {order.customer_name && (
                      <p className="text-xs text-muted-foreground">
                        👤 {order.customer_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        restaurantName="Napoli"
      />

      <CancelOrderDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        order={orderToCancel}
        onSuccess={loadOrders}
      />
    </div>
  );
}
