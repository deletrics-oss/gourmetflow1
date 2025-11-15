import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Gift, TrendingUp, Users, Wallet, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Cashback() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [pointsToApply, setPointsToApply] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [autoApply, setAutoApply] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('loyalty_points', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleApplyCredits = async () => {
    if (!selectedCustomer || !pointsToApply) {
      toast.error("Preencha os pontos a aplicar");
      return;
    }

    const points = parseInt(pointsToApply);
    if (points <= 0 || points > selectedCustomer.loyalty_points) {
      toast.error("Pontos inválidos");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ loyalty_points: selectedCustomer.loyalty_points - points })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id: selectedCustomer.id,
          points: -points,
          type: 'redeemed',
          description: manualKey ? `Resgate manual - Chave: ${manualKey}` : 'Resgate de pontos'
        });

      if (transactionError) throw transactionError;

      toast.success(`${points} pontos aplicados com sucesso!`);
      setApplyDialogOpen(false);
      setPointsToApply("");
      setManualKey("");
      loadCustomers();
    } catch (error) {
      console.error('Erro ao aplicar créditos:', error);
      toast.error("Erro ao aplicar créditos");
    }
  };

  const openApplyDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setApplyDialogOpen(true);
  };

  const totalDistributed = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  const activeCustomers = customers.filter(c => (c.loyalty_points || 0) > 0).length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="h-8 w-8 text-green-500" />
          <h1 className="text-3xl font-bold">Cashback & Fidelidade</h1>
        </div>
        <p className="text-muted-foreground">Gerencie pontos e créditos dos clientes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total de Pontos</p>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold">{totalDistributed.toLocaleString()}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold">{activeCustomers}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
            <Wallet className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold">{customers.length}</p>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Clientes com Pontos</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-apply">Aplicação Automática</Label>
            <Switch 
              id="auto-apply"
              checked={autoApply}
              onCheckedChange={setAutoApply}
            />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Pontos Disponíveis</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.filter(c => c.loyalty_points > 0).map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {customer.loyalty_points} pontos
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    onClick={() => openApplyDialog(customer)}
                    className="gap-1"
                  >
                    <CreditCard className="h-4 w-4" />
                    Aplicar Créditos
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {customers.filter(c => c.loyalty_points > 0).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum cliente com pontos disponíveis
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200">
        <div className="flex items-start gap-3">
          <Gift className="h-6 w-6 text-green-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Como Funciona o Sistema de Fidelidade?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li><strong>1.</strong> O cliente acumula pontos a cada compra realizada</li>
              <li><strong>2.</strong> Os pontos ficam disponíveis na conta do cliente</li>
              <li><strong>3.</strong> Você pode aplicar os créditos manualmente ou automaticamente</li>
              <li><strong>4.</strong> Com aplicação automática, os pontos são aplicados no próximo pedido</li>
              <li><strong>5.</strong> Com aplicação manual, você pode usar uma chave específica para controle</li>
            </ol>
          </div>
        </div>
      </Card>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Créditos de Fidelidade</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name} possui {selectedCustomer?.loyalty_points} pontos disponíveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points">Quantidade de Pontos</Label>
              <Input
                id="points"
                type="number"
                placeholder="Digite a quantidade"
                value={pointsToApply}
                onChange={(e) => setPointsToApply(e.target.value)}
                max={selectedCustomer?.loyalty_points}
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {selectedCustomer?.loyalty_points} pontos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-key">Chave Manual (Opcional)</Label>
              <Input
                id="manual-key"
                placeholder="Ex: PROMO2024"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use uma chave para identificar o resgate
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyCredits}>
              Aplicar Créditos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
