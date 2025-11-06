import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CashMovement {
  id: string;
  type: 'entry' | 'exit';
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  created_at: string;
  created_by: string;
}

export default function Caixa() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'entry' as 'entry' | 'exit',
    amount: 0,
    category: '',
    description: '',
    payment_method: 'money'
  });

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements((data as CashMovement[]) || []);
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
      toast.error('Erro ao carregar movimentos do caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovement = async () => {
    if (!formData.amount || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_movements')
        .insert([formData]);

      if (error) throw error;

      toast.success('Movimento registrado com sucesso!');
      setDialogOpen(false);
      setFormData({
        type: 'entry',
        amount: 0,
        category: '',
        description: '',
        payment_method: 'money'
      });
      loadMovements();
    } catch (error) {
      console.error('Erro ao adicionar movimento:', error);
      toast.error('Erro ao registrar movimento');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMovements = movements.filter(
    m => new Date(m.created_at) >= today
  );

  const totalEntries = todayMovements
    .filter(m => m.type === 'entry')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExits = todayMovements
    .filter(m => m.type === 'exit')
    .reduce((sum, m) => sum + m.amount, 0);

  const balance = totalEntries - totalExits;

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
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gestão de Caixa</h1>
        </div>
        <p className="text-muted-foreground">Controle de entradas e saídas financeiras</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo do Dia</p>
              <p className="text-3xl font-bold">R$ {balance.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Entradas</p>
              <p className="text-3xl font-bold text-green-600">R$ {totalEntries.toFixed(2)}</p>
            </div>
            <ArrowUpCircle className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saídas</p>
              <p className="text-3xl font-bold text-red-600">R$ {totalExits.toFixed(2)}</p>
            </div>
            <ArrowDownCircle className="h-12 w-12 text-red-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Botão Adicionar */}
      <div className="mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Movimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Movimento *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: 'entry' | 'exit') => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entrada</SelectItem>
                    <SelectItem value="exit">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="salario">Salário</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="conta">Conta (água, luz, etc)</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="money">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <Button onClick={handleAddMovement} className="w-full">
                Registrar Movimento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Movimentos */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todayMovements.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-xl text-muted-foreground">Nenhum movimento registrado hoje</p>
            </Card>
          ) : (
            todayMovements.map((movement) => (
              <Card key={movement.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {movement.type === 'entry' ? (
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{movement.category}</p>
                      {movement.description && (
                        <p className="text-sm text-muted-foreground">{movement.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${movement.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                      {movement.type === 'entry' ? '+' : '-'} R$ {movement.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{movement.payment_method}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {movements.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-xl text-muted-foreground">Nenhum movimento registrado</p>
            </Card>
          ) : (
            movements.map((movement) => (
              <Card key={movement.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {movement.type === 'entry' ? (
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{movement.category}</p>
                      {movement.description && (
                        <p className="text-sm text-muted-foreground">{movement.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${movement.type === 'entry' ? 'text-green-600' : 'text-red-600'}`}>
                      {movement.type === 'entry' ? '+' : '-'} R$ {movement.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{movement.payment_method}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
