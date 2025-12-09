import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logActionWithContext } from '@/lib/logging';

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = [
  { value: 'customer_request', label: 'Solicitação do cliente' },
  { value: 'out_of_stock', label: 'Produto indisponível' },
  { value: 'kitchen_delay', label: 'Atraso na cozinha' },
  { value: 'wrong_order', label: 'Pedido errado' },
  { value: 'payment_issue', label: 'Problema no pagamento' },
  { value: 'other', label: 'Outro motivo' }
];

export function CancelOrderDialog({ open, onOpenChange, order, onSuccess }: CancelOrderDialogProps) {
  const [reason, setReason] = useState('customer_request');
  const [details, setDetails] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCancel = async () => {
    if (!order?.id) return;

    setProcessing(true);
    try {
      // 1. Update order status to cancelled
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: `${order.notes || ''}\n\n[CANCELADO] ${CANCELLATION_REASONS.find(r => r.value === reason)?.label}: ${details}`.trim()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. Free the table if it was dine-in
      if (order.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'free' })
          .eq('id', order.table_id);
      }

      // 3. Log the cancellation
      await logActionWithContext(
        'order_cancelled',
        'orders',
        order.id,
        {
          order_number: order.order_number,
          reason: reason,
          details: details,
          total: order.total
        }
      );

      // 4. If order was already paid, register a refund movement
      if (order.status === 'completed' || order.payment_method !== 'pending') {
        await supabase
          .from('cash_movements')
          .insert({
            type: 'expense',
            category: 'refund',
            description: `Estorno: Pedido ${order.order_number} cancelado - ${CANCELLATION_REASONS.find(r => r.value === reason)?.label}`,
            amount: order.total,
            payment_method: order.payment_method || 'cash',
            movement_date: new Date().toISOString().split('T')[0],
            restaurant_id: order.restaurant_id
          });
      }

      toast.success(`Pedido ${order.order_number} cancelado com sucesso`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            Pedido: <strong>{order?.order_number}</strong> - Total: <strong>R$ {order?.total?.toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Atenção</p>
                <p className="text-muted-foreground">
                  Esta ação não pode ser desfeita. O pedido será marcado como cancelado e a mesa será liberada.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Motivo do Cancelamento</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-3 space-y-2">
              {CANCELLATION_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="cursor-pointer font-normal">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">Detalhes (opcional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Descreva detalhes adicionais sobre o cancelamento..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel} 
            disabled={processing}
            className="gap-2"
          >
            {processing ? (
              <>Cancelando...</>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Confirmar Cancelamento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
