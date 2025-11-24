import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, UserCircle2, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EditComandaCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: () => void;
}

export function EditComandaCustomerDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess
}: EditComandaCustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  // Buscar dados atuais da comanda
  useEffect(() => {
    if (open && orderId) {
      loadOrderData();
    }
  }, [open, orderId]);

  const loadOrderData = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_cpf, customer_id')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setCustomerName(data.customer_name || '');
      setCustomerPhone(data.customer_phone || '');
      setCustomerCpf(data.customer_cpf || '');
      setCustomerId(data.customer_id);

      if (data.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('loyalty_points')
          .eq('id', data.customer_id)
          .single();

        if (customer) {
          setLoyaltyPoints(customer.loyalty_points || 0);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  // Buscar cliente por telefone
  useEffect(() => {
    const searchCustomer = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setCustomerId(null);
        setLoyaltyPoints(0);
        return;
      }

      setSearchingCustomer(true);
      
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customerPhone)
          .single();

        if (customer) {
          setCustomerId(customer.id);
          setCustomerName(customer.name || '');
          setCustomerCpf(customer.cpf || '');
          setLoyaltyPoints(customer.loyalty_points || 0);

          toast.success(`Cliente encontrado: ${customer.name}`, {
            description: customer.loyalty_points > 0 
              ? `${customer.loyalty_points} pontos de fidelidade`
              : 'Sem pontos de fidelidade'
          });
        } else {
          setCustomerId(null);
          setLoyaltyPoints(0);
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
      } finally {
        setSearchingCustomer(false);
      }
    };

    const debounce = setTimeout(searchCustomer, 1000);
    return () => clearTimeout(debounce);
  }, [customerPhone]);

  const handleSubmit = async () => {
    if (!customerPhone) {
      toast.error('Telefone é obrigatório');
      return;
    }

    setLoading(true);

    try {
      let finalCustomerId = customerId;

      // Criar ou atualizar cliente
      if (customerPhone) {
        if (customerId) {
          // Atualizar cliente existente
          await supabase
            .from('customers')
            .update({
              name: customerName,
              cpf: customerCpf || null,
            })
            .eq('id', customerId);
        } else {
          // Criar novo cliente
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: customerName,
              phone: customerPhone,
              cpf: customerCpf || null,
              loyalty_points: 0,
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          finalCustomerId = newCustomer.id;
          toast.success('Novo cliente cadastrado!');
        }
      }

      // Atualizar pedido
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_cpf: customerCpf || null,
          customer_id: finalCustomerId
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Dados do cliente atualizados!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5" />
            Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              {searchingCustomer && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o telefone para buscar cliente existente
            </p>
          </div>

          {customerId && loyaltyPoints > 0 && (
            <Badge variant="outline" className="w-full justify-center gap-2 py-2">
              <Gift className="h-4 w-4 text-yellow-600" />
              <span>{loyaltyPoints} pontos de fidelidade</span>
            </Badge>
          )}

          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF (opcional - para cashback)</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={customerCpf}
              onChange={(e) => setCustomerCpf(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              CPF necessário para acumular pontos de fidelidade
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
