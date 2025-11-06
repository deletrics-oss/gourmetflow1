import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Generate order number
      const orderNumber = `CMD${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_type: 'dine_in',
        status: 'new',
        table_id: tableId || null,
        subtotal: 0,
        delivery_fee: 0,
        service_fee: 0,
        discount: 0,
        total: 0,
        payment_method: 'pending',
        created_by: user.user.id,
      });

      if (error) throw error;

      // Update table status if table was selected
      if (tableId) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
      }

      toast.success('Comanda criada com sucesso!');
      setCustomerName('');
      setCustomerPhone('');
      setTableId('');
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
