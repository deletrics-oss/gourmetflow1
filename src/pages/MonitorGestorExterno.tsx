import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Package,
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MonitorGestorExterno() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(); // Refresh data
      setCurrentSlide(prev => (prev + 1) % 3); // 3 slides
    }, 5000); // Muda a cada 5 segundos

    const channel = supabase
      .channel('monitor-gestor-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, loadData)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersRes, itemsRes, cashRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('menu_items').select('*'),
        supabase
          .from('cash_movements')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (cashRes.data) setCashMovements(cashRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const averageTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = todayOrders.filter(o => o.status === 'completed');

  const delayedOrders = orders.filter(o => {
    const minutes = (new Date().getTime() - new Date(o.created_at).getTime()) / 60000;
    return o.status !== 'completed' && minutes > 30;
  });

  const todayCashMovements = cashMovements.filter(m => new Date(m.created_at) >= today);
  const totalEntries = todayCashMovements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalExits = todayCashMovements
    .filter(m => m.type === 'expense' || m.type === 'exit')
    .reduce((sum, m) => sum + (m.amount || 0), 0);
  const cashBalance = totalEntries - totalExits;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Slide 1: Visão Geral de Pedidos */}
      {currentSlide === 0 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Pedidos</h1>
                <p className="text-lg opacity-90">
                  {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Faturamento Hoje</p>
                <p className="text-5xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pedidos Hoje</p>
                  <p className="text-4xl font-bold">{todayOrders.length}</p>
                </div>
                <ShoppingBag className="h-16 w-16 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                  <p className="text-4xl font-bold">R$ {averageTicket.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-16 w-16 text-purple-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Na Fila</p>
                  <p className="text-4xl font-bold">{newOrders.length + preparingOrders.length}</p>
                </div>
                <Clock className="h-16 w-16 text-orange-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Concluídos</p>
                  <p className="text-4xl font-bold">{completedOrders.length}</p>
                </div>
                <CheckCircle2 className="h-16 w-16 text-green-500 opacity-20" />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 bg-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ChefHat className="h-6 w-6" />
                Status dos Pedidos
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-status-new/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-status-new" />
                    <span className="font-medium text-lg">Novos</span>
                  </div>
                  <Badge className="bg-status-new text-status-new-foreground text-lg px-4 py-1">
                    {newOrders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-status-preparing/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ChefHat className="h-6 w-6 text-status-preparing" />
                    <span className="font-medium text-lg">Em Preparo</span>
                  </div>
                  <Badge className="bg-status-preparing text-status-preparing-foreground text-lg px-4 py-1">
                    {preparingOrders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-status-ready/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-6 w-6 text-status-ready" />
                    <span className="font-medium text-lg">Prontos</span>
                  </div>
                  <Badge className="bg-status-ready text-status-ready-foreground text-lg px-4 py-1">
                    {readyOrders.length}
                  </Badge>
                </div>
              </div>
            </Card>

            {delayedOrders.length > 0 && (
              <Card className="p-6 bg-destructive/10 border-destructive">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                  Pedidos Atrasados ({delayedOrders.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {delayedOrders.map((order) => (
                    <div key={order.id} className="p-4 bg-card rounded-lg">
                      <div className="flex justify-between items-start">
                        <span className="text-xl font-bold">#{order.order_number}</span>
                        <Badge variant="destructive" className="text-base">
                          {Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000)} min
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Slide 2: Financeiro */}
      {currentSlide === 1 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Financeiro</h1>
            <p className="text-lg opacity-90">
              {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo do Dia</p>
                  <p className="text-4xl font-bold">R$ {cashBalance.toFixed(2)}</p>
                </div>
                <DollarSign className="h-16 w-16 text-primary opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Entradas</p>
                  <p className="text-4xl font-bold text-green-600">R$ {totalEntries.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-16 w-16 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saídas</p>
                  <p className="text-4xl font-bold text-red-600">R$ {totalExits.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-16 w-16 text-red-500 opacity-20" />
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-card">
            <h2 className="text-2xl font-bold mb-4">Movimentações Recentes</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {todayCashMovements.slice(0, 10).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-semibold text-lg">{movement.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${movement.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.type === 'income' ? '+' : '-'} R$ {movement.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Slide 3: Estatísticas */}
      {currentSlide === 2 && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
            <h1 className="text-4xl font-bold mb-2">Painel do Gestor - Estatísticas</h1>
            <p className="text-lg opacity-90">
              {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 bg-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Performance Hoje
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Total de Pedidos</span>
                  <span className="text-2xl font-bold">{todayOrders.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Faturamento</span>
                  <span className="text-2xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Ticket Médio</span>
                  <span className="text-2xl font-bold">R$ {averageTicket.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Taxa de Conclusão</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {todayOrders.length > 0 ? ((completedOrders.length / todayOrders.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="h-6 w-6" />
                Informações Gerais
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Itens no Cardápio</span>
                  <span className="text-2xl font-bold">{menuItems.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Pedidos na Fila</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {newOrders.length + preparingOrders.length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Pedidos Atrasados</span>
                  <span className="text-2xl font-bold text-red-600">{delayedOrders.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-lg">Saldo do Caixa</span>
                  <span className="text-2xl font-bold text-green-600">R$ {cashBalance.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Indicadores de Slide */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-3 w-3 rounded-full transition-all ${
              currentSlide === index ? 'bg-primary w-8' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
