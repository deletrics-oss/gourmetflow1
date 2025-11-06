import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle } from "lucide-react";
import { generatePrintReceipt } from "@/components/PrintReceipt";

interface OrderDetailsDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantName?: string;
}

export function OrderDetailsDialog({ order, open, onOpenChange, restaurantName }: OrderDetailsDialogProps) {
  if (!order) return null;

  const handlePrint = () => {
    const tableNum = order.tables ? order.tables.number : undefined;
    generatePrintReceipt(order, restaurantName || "Restaurante", tableNum, 'customer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Pedido #{order.order_number}</span>
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Pedido */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Data/Hora</p>
              <p className="font-medium">
                {new Date(order.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concluído em</p>
              <p className="font-medium">
                {new Date(order.completed_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Pedido</p>
              <p className="font-medium">
                {order.delivery_type === 'online' && '🌐 Online'}
                {order.delivery_type === 'delivery' && '🚚 Entrega'}
                {order.delivery_type === 'pickup' && '🏪 Retirada'}
                {order.delivery_type === 'dine_in' && '🍽️ Consumo Local'}
                {order.delivery_type === 'counter' && '🏪 Balcão'}
              </p>
            </div>
            {order.tables && (
              <div>
                <p className="text-sm text-muted-foreground">Mesa</p>
                <p className="font-medium">Mesa {order.tables.number}</p>
              </div>
            )}
          </div>

          {/* Informações do Cliente */}
          {(order.customer_name || order.customer_phone) && (
            <div className="space-y-3">
              <h4 className="font-semibold">Informações do Cliente</h4>
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                {order.customer_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{order.customer_name}</p>
                  </div>
                )}
                {order.customer_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                )}
                {order.customer_cpf && (
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{order.customer_cpf}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Itens do Pedido */}
          <div className="space-y-3">
            <h4 className="font-semibold">Itens do Pedido</h4>
            <div className="border rounded-lg divide-y">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item: any) => (
                  <div key={item.id} className="p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.quantity}x {item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.unit_price.toFixed(2)} cada
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                    <p className="font-bold">R$ {item.total_price.toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-muted-foreground">Sem itens</p>
              )}
            </div>
          </div>

          {/* Observações */}
          {order.notes && (
            <div className="space-y-2">
              <h4 className="font-semibold">Observações</h4>
              <p className="p-4 bg-muted/30 rounded-lg text-sm">{order.notes}</p>
            </div>
          )}

          {/* Resumo de Valores */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.service_fee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de serviço:</span>
                <span>R$ {order.service_fee.toFixed(2)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de entrega:</span>
                <span>R$ {order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto:</span>
                <span>- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.coupon_discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Cupom ({order.coupon_code}):</span>
                <span>- R$ {order.coupon_discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {order.total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Forma de Pagamento:</span>
              <span className="font-medium">
                {order.payment_method === 'cash' && '💵 Dinheiro'}
                {order.payment_method === 'credit_card' && '💳 Cartão de Crédito'}
                {order.payment_method === 'debit_card' && '💳 Cartão de Débito'}
                {order.payment_method === 'pix' && '📱 PIX'}
                {order.payment_method === 'pending' && '⏳ Pendente'}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Reimprimir Recibo
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
