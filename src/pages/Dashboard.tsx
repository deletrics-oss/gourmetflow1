import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ChefHat, TrendingUp, Package, Clock, MessageSquare, Settings as SettingsIcon, BarChart3, Image, Utensils, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    newOrders: 0,
    preparing: 0,
    totalToday: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadStats();
    
    // Realtime subscription
    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', today.toISOString());

    if (orders) {
      const newOrders = orders.filter(o => o.status === 'new').length;
      const preparing = orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length;
      const revenue = orders
        .filter(o => o.status === 'ready')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        newOrders,
        preparing,
        totalToday: orders.length,
        revenue,
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-primary px-8 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Bem-vindo ao GourmetFlow! 👋</h1>
            <p className="text-white/90 mt-1">Seu Restaurante - Painel Administrativo</p>
          </div>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 px-6 py-4">
            <p className="text-sm text-white/80">Faturamento Hoje</p>
            <p className="text-2xl font-bold text-white">R$ {stats.revenue.toFixed(2)}</p>
            <p className="text-xs text-white/70">{stats.totalToday} {stats.totalToday === 1 ? 'pedido' : 'pedidos'}</p>
          </Card>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-status-new p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-status-new-foreground/80 text-sm mb-1">Novos Pedidos</p>
                <p className="text-4xl font-bold text-status-new-foreground">{stats.newOrders}</p>
                <p className="text-status-new-foreground/70 text-xs mt-1">Aguardando confirmação</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-status-new-foreground" />
              </div>
            </div>
          </Card>

          <Card className="bg-status-preparing p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-status-preparing-foreground/80 text-sm mb-1">Em Produção</p>
                <p className="text-4xl font-bold text-status-preparing-foreground">{stats.preparing}</p>
                <p className="text-status-preparing-foreground/70 text-xs mt-1">Sendo preparados</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <ChefHat className="h-7 w-7 text-status-preparing-foreground" />
              </div>
            </div>
          </Card>

          <Card className="bg-status-completed p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-status-completed-foreground/80 text-sm mb-1">Total Hoje</p>
                <p className="text-4xl font-bold text-status-completed-foreground">{stats.totalToday}</p>
                <p className="text-status-completed-foreground/70 text-xs mt-1">Pedidos concluídos e em andamento</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-status-completed-foreground" />
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Módulos Principais</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/pedidos')}>
              <ShoppingBag className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Pedidos Online</h3>
              <p className="text-sm text-muted-foreground mb-3">Gerencie pedidos de delivery e retirada</p>
              <p className="text-xs text-muted-foreground">{stats.newOrders} novos</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-start p-0 h-auto text-primary hover:text-primary">
                Acessar →
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/pdv')}>
              <Package className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-2">Pedidos Balcão</h3>
              <p className="text-sm text-muted-foreground mb-3">PDV para atendimento presencial</p>
              <p className="text-xs text-muted-foreground">PDV rápido</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-start p-0 h-auto text-primary hover:text-primary">
                Acessar →
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/salao')}>
              <Utensils className="h-8 w-8 text-green-500 mb-3" />
              <h3 className="font-semibold mb-2">Pedidos Salão</h3>
              <p className="text-sm text-muted-foreground mb-3">Gestão de mesas e comandas</p>
              <p className="text-xs text-muted-foreground">Mesas e comandas</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-start p-0 h-auto text-primary hover:text-primary">
                Acessar →
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cardapio')}>
              <Image className="h-8 w-8 text-orange-500 mb-3" />
              <h3 className="font-semibold mb-2">Gestão de Cardápio</h3>
              <p className="text-sm text-muted-foreground mb-3">Configure categorias e produtos</p>
              <p className="text-xs text-muted-foreground">Com IA</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-start p-0 h-auto text-primary hover:text-primary">
                Acessar →
              </Button>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold">Monitores</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cozinha')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Monitor Cozinha (KDS)</h3>
                  <p className="text-xs text-muted-foreground">Display para produção</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/monitor-gestor')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Monitor Gestor</h3>
                  <p className="text-xs text-muted-foreground">Visualização gerencial</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold">Ações Rápidas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cardapio')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Edição em Massa</h3>
                  <p className="text-xs text-muted-foreground">Edite múltiplos itens rapidamente</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/pedidos')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Pedidos Agendados</h3>
                  <p className="text-xs text-muted-foreground">Visualize agendamentos futuros</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/relatorios')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Relatórios</h3>
                  <p className="text-xs text-muted-foreground">Análise de desempenho</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/configuracoes')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <SettingsIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Configurações</h3>
                  <p className="text-xs text-muted-foreground">Horários, entrega e pagamentos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cardapio')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Image className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Imagens do Cardápio</h3>
                  <p className="text-xs text-muted-foreground">Gerencie fotos dos produtos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/estoque')}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Estoque</h3>
                  <p className="text-xs text-muted-foreground">Controle de ingredientes</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className="h-12 w-12" />
              <div>
                <h3 className="text-xl font-bold mb-1">Precisa de Ajuda?</h3>
                <p className="text-white/90">Nossa equipe está pronta para te atender</p>
              </div>
            </div>
            <Button size="lg" variant="secondary">
              Falar com Suporte
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
