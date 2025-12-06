import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings as SettingsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ManageTablesDialog } from "@/components/dialogs/ManageTablesDialog";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { TableDetailsDialog } from "@/components/dialogs/TableDetailsDialog";
import { logActionWithContext } from "@/lib/logging";
import { useRestaurant } from "@/hooks/useRestaurant";

interface TableWithStats {
  id: string;
  number: number;
  status: string;
  capacity: number;
  total_guests?: number;
  total_amount?: number;
  oldest_order_time?: string;
  active_orders_count?: number;
}

export default function Salao() {
  const { restaurantId } = useRestaurant();
  const [tables, setTables] = useState<TableWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  useEffect(() => {
    if (restaurantId) {
      loadTables();
    }
    
    // Realtime subscription for table changes
    const channel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables'
        },
        () => {
          if (restaurantId) loadTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadTables = async () => {
    if (!restaurantId) return;
    
    try {
      // Get tables with aggregated order data
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('number');

      if (tablesError) throw tablesError;

      // Get active orders stats for each table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('table_id, number_of_guests, total, created_at')
        .eq('restaurant_id', restaurantId)
        .in('status', ['new', 'confirmed', 'preparing', 'ready', 'ready_for_payment'])
        .not('table_id', 'is', null);

      if (ordersError) throw ordersError;

      // Aggregate stats by table
      const tableStats = new Map();
      ordersData?.forEach(order => {
        if (!order.table_id) return;
        
        const existing = tableStats.get(order.table_id) || {
          total_guests: 0,
          total_amount: 0,
          oldest_order_time: order.created_at,
          active_orders_count: 0
        };

        tableStats.set(order.table_id, {
          total_guests: existing.total_guests + (order.number_of_guests || 0),
          total_amount: existing.total_amount + (order.total || 0),
          oldest_order_time: order.created_at < existing.oldest_order_time ? order.created_at : existing.oldest_order_time,
          active_orders_count: existing.active_orders_count + 1
        });
      });

      // Merge tables with stats
      const enrichedTables = tablesData?.map(table => ({
        ...table,
        ...(tableStats.get(table.id) || {})
      })) || [];

      setTables(enrichedTables);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      toast.error('Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  };

  const formatElapsedTime = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
      case 'occupied':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
      case 'reserved':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'free':
        return 'Livre';
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      default:
        return status;
    }
  };

  const handleTableClick = async (table: any) => {
    // ✅ FASE 4: Log de visualização da mesa
    await logActionWithContext(
      'view_table_details',
      'tables',
      table.id,
      {
        table_number: table.number,
        status: table.status,
        capacity: table.capacity
      }
    );

    // Abrir diálogo de detalhes
    setSelectedTable(table);
    setDetailsDialogOpen(true);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </svg>
            <h1 className="text-3xl font-bold">Pedidos Salão</h1>
          </div>
          <p className="text-muted-foreground">Gestão de mesas e comandas</p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setManageDialogOpen(true)}>
          <SettingsIcon className="h-4 w-4" />
          Gerenciar Mesas
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card className="p-12 text-center">
          <SettingsIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-xl text-muted-foreground mb-2">Nenhuma mesa cadastrada</p>
          <p className="text-sm text-muted-foreground mb-4">Clique em "Gerenciar Mesas" para adicionar mesas</p>
          <Button onClick={() => setManageDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Mesas
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {tables.map((table) => (
            <Card
              key={table.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleTableClick(table)}
            >
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">{table.number}</div>
                <div className="text-sm font-medium mb-3">Mesa {table.number}</div>
                <Badge variant="outline" className={getStatusColor(table.status)}>
                  {getStatusLabel(table.status)}
                </Badge>
                <div className="text-xs text-muted-foreground mt-2">
                  Capacidade: {table.capacity} pessoas
                </div>
                
                {/* Mini-preview de informações da mesa */}
                {table.status === 'occupied' && table.active_orders_count > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <span>👥</span>
                      <span>{table.total_guests || 0} {table.total_guests === 1 ? 'pessoa' : 'pessoas'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs font-semibold text-primary">
                      <span>💰</span>
                      <span>R$ {(table.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {table.oldest_order_time && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <span>⏱️</span>
                        <span>{formatElapsedTime(table.oldest_order_time)}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {table.active_orders_count} {table.active_orders_count === 1 ? 'comanda' : 'comandas'}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 mt-3">
                  {table.status === 'occupied' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/table/${table.id}`;
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar Itens
                    </Button>
                  )}
                  <QRCodeGenerator tableNumber={table.number} tableId={table.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ManageTablesDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        onSuccess={loadTables}
      />

      <TableDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        table={selectedTable}
        onSuccess={loadTables}
      />
    </div>
  );
}

