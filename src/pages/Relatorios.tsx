import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, Calendar as CalendarIcon, BarChart3, CreditCard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Relatorios() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [orders, setOrders] = useState<any[]>([]);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "day":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Carregar pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders' as any)
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Carregar movimentações de caixa
      const { data: cashData, error: cashError } = await supabase
        .from('cash_movements' as any)
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (cashError) throw cashError;
      setCashMovements(cashData || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Análise por forma de pagamento
  const paymentAnalysis = {
    cash: orders.filter(o => o.payment_method === 'cash').reduce((acc, o) => acc + o.total, 0),
    credit_card: orders.filter(o => o.payment_method === 'credit_card').reduce((acc, o) => acc + o.total, 0),
    debit_card: orders.filter(o => o.payment_method === 'debit_card').reduce((acc, o) => acc + o.total, 0),
    pix: orders.filter(o => o.payment_method === 'pix').reduce((acc, o) => acc + o.total, 0),
  };

  // Análise por tipo de pedido
  const ordersByType = {
    delivery: orders.filter(o => o.delivery_type === 'delivery'),
    pickup: orders.filter(o => o.delivery_type === 'pickup'),
    dine_in: orders.filter(o => o.delivery_type === 'dine_in'),
  };

  // Movimentações de caixa
  const cashEntries = cashMovements.filter(m => m.type === 'entry').reduce((acc, m) => acc + m.amount, 0);
  const cashExits = cashMovements.filter(m => m.type === 'exit').reduce((acc, m) => acc + m.amount, 0);
  const cashBalance = cashEntries - cashExits;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Relatórios de Fechamento</h1>
          </div>
          <p className="text-muted-foreground">Análise completa de vendas e caixa</p>
        </div>
      </div>

      <Tabs defaultValue="day" className="mb-6" onValueChange={(v: any) => setPeriod(v)}>
        <TabsList>
          <TabsTrigger value="day" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Diário (Hoje)
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Semanal
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Mensal
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-6">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <p className="text-3xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {period === 'day' && 'Hoje'}
                {period === 'week' && 'Esta semana'}
                {period === 'month' && 'Este mês'}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-3xl font-bold">{totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-2">Pedidos fechados</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <p className="text-3xl font-bold">R$ {avgTicket.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">Por pedido</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Saldo Caixa</p>
                <div className={`h-10 w-10 rounded-full ${cashBalance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                  <DollarSign className={`h-5 w-5 ${cashBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${cashBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {cashBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Entradas - Saídas</p>
            </Card>
          </div>

          {/* Análise por Forma de Pagamento */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Vendas por Forma de Pagamento
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">💵 Dinheiro</p>
                <p className="text-2xl font-bold">R$ {paymentAnalysis.cash.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.filter(o => o.payment_method === 'cash').length} pedidos
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">💳 Cartão Crédito</p>
                <p className="text-2xl font-bold">R$ {paymentAnalysis.credit_card.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.filter(o => o.payment_method === 'credit_card').length} pedidos
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">💳 Cartão Débito</p>
                <p className="text-2xl font-bold">R$ {paymentAnalysis.debit_card.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.filter(o => o.payment_method === 'debit_card').length} pedidos
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">📱 PIX</p>
                <p className="text-2xl font-bold">R$ {paymentAnalysis.pix.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {orders.filter(o => o.payment_method === 'pix').length} pedidos
                </p>
              </div>
            </div>
          </Card>

          {/* Análise por Tipo de Pedido */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Vendas por Tipo de Pedido
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">🏪 Consumo no Local</p>
                <p className="text-2xl font-bold">{ordersByType.dine_in.length}</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  R$ {ordersByType.dine_in.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">🚚 Entrega</p>
                <p className="text-2xl font-bold">{ordersByType.delivery.length}</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  R$ {ordersByType.delivery.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">📦 Retirada</p>
                <p className="text-2xl font-bold">{ordersByType.pickup.length}</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  R$ {ordersByType.pickup.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {/* Movimentações de Caixa */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Movimentações de Caixa
            </h3>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-sm text-muted-foreground mb-1">💰 Entradas</p>
                <p className="text-2xl font-bold text-green-600">R$ {cashEntries.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cashMovements.filter(m => m.type === 'entry').length} movimentações
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-sm text-muted-foreground mb-1">📤 Saídas</p>
                <p className="text-2xl font-bold text-red-600">R$ {cashExits.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cashMovements.filter(m => m.type === 'exit').length} movimentações
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <p className="text-sm text-muted-foreground mb-1">💼 Saldo Final</p>
                <p className={`text-2xl font-bold ${cashBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {cashBalance.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
              </div>
            </div>

            {cashMovements.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Últimas Movimentações</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cashMovements.slice(0, 10).map((movement) => (
                    <div key={movement.id} className="flex justify-between items-center p-2 border rounded text-sm">
                      <div>
                        <p className="font-medium">{movement.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <p className={`font-bold ${movement.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.type === 'entry' ? '+' : '-'} R$ {movement.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
