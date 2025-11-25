import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logActionWithContext } from '@/lib/logging';

interface AddComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Array<{ id: string; number: number; status: string }>;
  onSuccess: () => void;
}

export function AddComandaDialog({ open, onOpenChange, tables, onSuccess }: AddComandaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableId, setTableId] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Generate order number
      const orderNumber = `CMD${Date.now().toString().slice(-6)}`;
      
      const selectedTable = tables.find(t => t.id === tableId);

      const { data, error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_type: 'dine_in',
        status: 'new',
        table_id: tableId || null,
        number_of_guests: numberOfGuests,
        subtotal: 0,
        delivery_fee: 0,
        service_fee: 0,
        discount: 0,
        total: 0,
        payment_method: 'pending',
        created_by: user.user.id,
      }).select().single();

      if (error) throw error;

      // ✅ FASE 2: Log de criação de comanda
      await logActionWithContext(
        'create_comanda',
        'orders',
        data.id,
        {
          order_number: orderNumber,
          table_id: tableId,
          table_number: selectedTable?.number,
          customer_name: customerName || 'Sem nome',
          customer_phone: customerPhone || 'Sem telefone',
          number_of_guests: numberOfGuests
        }
      );

      // Update table status if table was selected
      if (tableId) {
        const selectedTable = tables.find(t => t.id === tableId);
        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .update({ 
            status: 'occupied',
            updated_at: new Date().toISOString()
          })
          .eq('id', tableId)
          .select()
          .single();
        
        if (tableError) {
          console.error('❌ ERRO ao ocupar mesa:', tableError);
          await logActionWithContext(
            'table_status_update_failed',
            'tables',
            tableId,
            {
              error: tableError.message,
              error_code: tableError.code,
              table_number: selectedTable?.number,
              attempted_status: 'occupied'
            }
          );
          toast.error(`Comanda criada, mas erro ao ocupar mesa ${selectedTable?.number}`);
        } else {
          console.log('✅ Mesa ocupada com sucesso:', tableData);
          await logActionWithContext(
            'table_status_changed',
            'tables',
            tableId,
            {
              table_number: selectedTable?.number,
              old_status: 'free',
              new_status: 'occupied',
              reason: 'comanda_created',
              order_id: data.id,
              order_number: orderNumber,
              number_of_guests: numberOfGuests
            }
          );
        }
      }

      toast.success(`Comanda ${orderNumber} criada com sucesso!`);
      setCustomerName('');
      setCustomerPhone('');
      setTableId('');
      setNumberOfGuests(2);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      toast.error('Erro ao criar comanda');
    } finally {
      setLoading(false);
    }
  };

  const availableTables = tables.filter(t => t.status === 'free');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Comanda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nome do Cliente (opcional)</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Digite o nome do cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Telefone (opcional)</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="table">Mesa (opcional)</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma mesa" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Mesa {table.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfGuests">Número de Pessoas</Label>
            <Input
              id="numberOfGuests"
              type="number"
              min="1"
              max="20"
              value={numberOfGuests}
              onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 2)}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Comanda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
