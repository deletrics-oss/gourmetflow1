import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Clock, DollarSign, Eye, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AddComandaDialog } from "@/components/dialogs/AddComandaDialog";
import { AddItemsToComandaDialog } from "@/components/dialogs/AddItemsToComandaDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { generatePrintReceipt } from "@/components/PrintReceipt";

export default function Comandas() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load orders (comandas) with items
      const { data: orders, error: ordersError } = await supabase
        .from('orders' as any)
        .select(`
          *,
          tables(number),
          order_items(
            id,
            name,
            quantity,
            unit_price,
            total_price,
            notes
          )
        `)
        .eq('delivery_type', 'dine_in')
        .in('status', ['new', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: tablesData, error: tablesError } = await supabase
        .from('tables' as any)
        .select('*')
        .order('number');

      if (tablesError) throw tablesError;

      setComandas(orders || []);
      setTables(tablesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.floor((now.getTime() - created.getTime()) / 60000);
    return `${diff} min`;
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
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Comandas</h1>
        </div>
        <p className="text-muted-foreground">Gerencie comandas e mesas abertas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Comandas Abertas</p>
              <p className="text-3xl font-bold">{comandas.length}</p>
            </div>
            <Users className="h-12 w-12 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total em Aberto</p>
              <p className="text-3xl font-bold">R$ {comandas.reduce((acc, c) => acc + c.total, 0).toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
              <p className="text-3xl font-bold">18 min</p>
            </div>
            <Clock className="h-12 w-12 text-orange-500 opacity-20" />
          </div>
        </Card>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar comanda ou mesa..." className="pl-10" />
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Comanda
        </Button>
      </div>

      {comandas.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-xl text-muted-foreground mb-2">Nenhuma comanda aberta</p>
          <p className="text-sm text-muted-foreground">Clique em "Nova Comanda" para começar</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comandas.map((comanda) => (
            <Card key={comanda.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold">#{comanda.order_number}</h3>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Aberta
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comanda.tables ? `Mesa ${comanda.tables.number}` : 'Balcão'}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-lg">R$ {comanda.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tempo:</span>
                  <span className="font-medium">{formatTime(comanda.created_at)}</span>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mb-3">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Itens ({comanda.order_items?.length || 0})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mb-3">
                  {comanda.order_items?.map((item: any) => (
                    <div key={item.id} className="p-2 bg-muted/50 rounded text-sm">
                      <div className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">R$ {item.total_price.toFixed(2)}</span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">Obs: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedOrderId(comanda.id);
                      setAddItemsDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      generatePrintReceipt(
                        comanda,
                        "GourmetFlow", // Pode vir das configurações
                        comanda.tables?.number,
                        'kitchen'
                      );
                    }}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Imprimir
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      const { error: orderError } = await supabase
                        .from('orders' as any)
                        .update({ 
                          status: 'completed',
                          completed_at: new Date().toISOString()
                        })
                        .eq('id', comanda.id);

                      if (orderError) throw orderError;
                      
                      // Liberar mesa
                      if (comanda.table_id) {
                        const { error: tableError } = await supabase
                          .from('tables' as any)
                          .update({ status: 'free' })
                          .eq('id', comanda.table_id);
                        
                        if (tableError) throw tableError;
                      }
                      
                      toast.success('Comanda fechada!');
                      loadData();
                    } catch (error: any) {
                      console.error('Erro ao fechar comanda:', error);
                      toast.error(error?.message || 'Erro ao fechar comanda');
                    }
                  }}
                >
                  Fechar Comanda
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddComandaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tables={tables}
        onSuccess={loadData}
      />

      <AddItemsToComandaDialog
        open={addItemsDialogOpen}
        onOpenChange={setAddItemsDialogOpen}
        orderId={selectedOrderId}
        onSuccess={loadData}
      />

      <div className="mt-8 bg-blue-50 dark:bg-blue-950 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 text-blue-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Configurações operacionais de comandas</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Configure as opções de personalização do módulo de comandas para o seu negócio
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="link-command" className="h-4 w-4" defaultChecked readOnly />
                <label htmlFor="link-command" className="text-sm">
                  Permitir vinculação de comandas a uma mesa
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="ask-cpf" className="h-4 w-4" readOnly />
                <label htmlFor="ask-cpf" className="text-sm">
                  Solicitar CPF do cliente ao ativar esta opção
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="open-without-order" className="h-4 w-4" defaultChecked readOnly />
                <label htmlFor="open-without-order" className="text-sm">
                  Abertura de comandas sem pedidos
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
