import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logActionWithContext } from '@/lib/logging';
import { Users, Clock, DollarSign, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TableDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: any;
  onSuccess: () => void;
}

export function TableDetailsDialog({ open, onOpenChange, table, onSuccess }: TableDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (open && table) {
      loadTableOrders();
    }
  }, [open, table]);

  const loadTableOrders = async () => {
    if (!table?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            name,
            quantity,
            unit_price,
            total_price,
            notes
          )
        `)
        .eq('table_id', table.id)
        .in('status', ['new', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      // ✅ FASE 5: Log de visualização detalhada da mesa
      await logActionWithContext(
        'view_table_full_details',
        'tables',
        table.id,
        {
          table_number: table.number,
          active_orders: data?.length || 0,
          total_amount: data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
          number_of_guests: data?.reduce((sum, o) => sum + (o.number_of_guests || 0), 0) || 0
        }
      );
    } catch (error) {
      console.error('Erro ao carregar pedidos da mesa:', error);
      toast.error('Erro ao carregar pedidos da mesa');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTable = async () => {
    if (!table?.id || orders.length === 0) return;

    try {
      // Mudar status para 'ready_for_payment' (aguardando pagamento no PDV)
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ 
          status: 'ready_for_payment',
          updated_at: new Date().toISOString()
        })
        .eq('table_id', table.id)
        .in('status', ['new', 'confirmed', 'preparing', 'ready']);

      if (ordersError) throw ordersError;

      // Liberar mesa (o trigger fará isso automaticamente, mas fazemos manualmente também)
      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'free' })
        .eq('id', table.id);

      if (tableError) throw tableError;

      // Log de fechamento da mesa
      await logActionWithContext(
        'close_table',
        'tables',
        table.id,
        {
          table_number: table.number,
          orders_closed: orders.length,
          total_amount: orders.reduce((sum, o) => sum + (o.total || 0), 0),
          total_guests: orders.reduce((sum, o) => sum + (o.number_of_guests || 0), 0),
          new_status: 'ready_for_payment',
          action_description: 'Mesa fechada, comandas aguardando pagamento no PDV'
        }
      );

      toast.success(`Mesa ${table.number} fechada com sucesso!`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao fechar mesa:', error);
      toast.error('Erro ao fechar mesa');
    }
  };

  if (!table) return null;

  const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalGuests = orders.reduce((sum, order) => sum + (order.number_of_guests || 0), 0);
  const oldestOrder = orders.length > 0 ? orders[orders.length - 1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">Mesa {table.number}</span>
              <Badge variant="outline" className={
                table.status === 'occupied' 
                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                  : table.status === 'reserved'
                  ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  : 'bg-green-500/10 text-green-500 border-green-500/20'
              }>
                {table.status === 'occupied' ? 'Ocupada' : table.status === 'reserved' ? 'Reservada' : 'Livre'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da Mesa */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pessoas</span>
              </div>
              <p className="text-2xl font-bold">{totalGuests || table.capacity}</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">R$ {totalAmount.toFixed(2)}</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tempo</span>
              </div>
              <p className="text-2xl font-bold">
                {oldestOrder ? formatDistanceToNow(new Date(oldestOrder.created_at), { locale: ptBR }) : '0 min'}
              </p>
            </Card>
          </div>

          {/* Comandas Ativas */}
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma comanda ativa nesta mesa</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">Comandas Ativas ({orders.length})</h3>
              {orders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">#{order.order_number}</p>
                      {order.customer_name && (
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      )}
                      {order.number_of_guests && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Users className="h-3 w-3 inline mr-1" />
                          {order.number_of_guests} {order.number_of_guests === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">R$ {order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.name}
                            {item.notes && <span className="text-xs ml-1">({item.notes})</span>}
                          </span>
                          <span className="font-medium">R$ {item.total_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                window.location.href = `/table/${table.id}`;
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Itens
            </Button>
            {orders.length > 0 && (
              <Button
                className="flex-1"
                onClick={handleCloseTable}
              >
                <X className="h-4 w-4 mr-2" />
                Fechar Mesa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
