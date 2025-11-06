import { Card } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
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
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AudioManager } from "@/components/AudioManager";

export default function MonitorGestor() {
  const { orders, menuItems } = useApp();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt) >= today
  );

  const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const completedOrders = todayOrders.filter((o) => o.status === "completed");

  const delayedOrders = orders.filter((o) => {
    const minutes = (new Date().getTime() - new Date(o.createdAt).getTime()) / 60000;
    return o.status !== "completed" && minutes > 30;
  });

  const averageTime =
    orders.length > 0
      ? Math.round(
          orders.reduce((sum, o) => {
            const diff = (new Date().getTime() - new Date(o.createdAt).getTime()) / 60000;
            return sum + diff;
          }, 0) / orders.length
        )
      : 0;

  const itemsSold = todayOrders.reduce((acc, order) => {
    order.items.forEach((item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const topItems = Object.entries(itemsSold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="fixed top-4 right-4 z-50">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Volume2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações de Áudio</DialogTitle>
            </DialogHeader>
            <AudioManager />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-primary px-8 py-6 mb-8 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Painel do Gestor</h1>
            <p className="text-lg opacity-90">
              Visão geral do restaurante - {new Date().toLocaleDateString()}
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
              <p className="text-3xl font-bold">{todayOrders.length}</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
              <p className="text-3xl font-bold">R$ {averageTicket.toFixed(2)}</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tempo Médio</p>
              <p className="text-3xl font-bold">{averageTime} min</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-7 w-7 text-orange-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Itens Cadastrados</p>
              <p className="text-3xl font-bold">{menuItems.length}</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Package className="h-7 w-7 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="p-6 bg-card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Status dos Pedidos
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-status-new/10 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-status-new" />
                <span className="font-medium">Novos</span>
              </div>
              <Badge className="bg-status-new text-status-new-foreground">
                {newOrders.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-preparing/10 rounded-lg">
              <div className="flex items-center gap-3">
                <ChefHat className="h-5 w-5 text-status-preparing" />
                <span className="font-medium">Em Preparo</span>
              </div>
              <Badge className="bg-status-preparing text-status-preparing-foreground">
                {preparingOrders.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-ready/10 rounded-lg">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-status-ready" />
                <span className="font-medium">Prontos</span>
              </div>
              <Badge className="bg-status-ready text-status-ready-foreground">
                {readyOrders.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-completed/10 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-status-completed" />
                <span className="font-medium">Concluídos Hoje</span>
              </div>
              <Badge className="bg-status-completed text-status-completed-foreground">
                {completedOrders.length}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Itens Mais Vendidos Hoje
          </h2>
          {topItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma venda hoje</p>
          ) : (
            <div className="space-y-3">
              {topItems.map(([name, count], index) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <Badge variant="outline">{count} vendidos</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {delayedOrders.length > 0 && (
        <Card className="p-6 bg-destructive/10 border-destructive">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Pedidos Atrasados ({delayedOrders.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {delayedOrders.map((order) => (
              <div key={order.id} className="p-4 bg-card rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold">#{order.number}</span>
                  <Badge variant="destructive">
                    {Math.floor(
                      (new Date().getTime() - new Date(order.createdAt).getTime()) / 60000
                    )}{" "}
                    min
                  </Badge>
                </div>
                {order.table && (
                  <Badge variant="outline" className="mb-2">
                    Mesa {order.table}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">
                  {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
