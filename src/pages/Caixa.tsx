import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, TrendingDown, Plus, Printer, Calendar } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Caixa() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Buscar movimentações de caixa (já integrado com PDV)
  const { data: cashMovements = [] } = useQuery({
    queryKey: ['cash-movements', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calcular totais
  const totalEntradas = cashMovements
    .filter((m: any) => m.type === 'entrada' || m.type === 'entry')
    .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
  
  const totalSaidas = cashMovements
    .filter((m: any) => m.type === 'saida' || m.type === 'exit')
    .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
  
  const saldo = totalEntradas - totalSaidas;

  // Mutation para criar movimentação
  const createMovement = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cash_movements').insert([{
        type: data.type,
        description: data.description,
        amount: Math.abs(parseFloat(data.value)),
        movement_date: new Date().toISOString().split('T')[0],
        payment_method: data.payment_method,
        category: data.category
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      toast.success("Movimentação registrada!");
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') || 'entrada';
    
    createMovement.mutate({
      type,
      description: formData.get('description'),
      value: formData.get('value'),
      payment_method: formData.get('payment_method'),
      category: formData.get('category')
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-primary" />
              Gestão de Caixa
            </h1>
            <p className="text-muted-foreground">Controle completo de entradas e saídas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Movimentação
            </Button>
          </div>
        </div>

        {/* Filtro de Período */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <Button 
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['cash-movements'] })}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{cashMovements.filter((m: any) => m.type === 'entrada' || m.type === 'entry').length} transações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{cashMovements.filter((m: any) => m.type === 'saida' || m.type === 'exit').length} transações</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo em Caixa</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {saldo.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {saldo >= 0 ? 'Positivo' : 'Negativo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registrar Movimentação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} id="cash-form" className="space-y-4">
              <input type="hidden" name="type" id="movement-type" value="entrada" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Valor *</Label>
                  <Input id="value" name="value" type="number" step="0.01" placeholder="0,00" required />
                </div>
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <select name="category" id="category" className="w-full p-2 border rounded bg-background text-foreground" required>
                    <option value="Venda">Venda</option>
                    <option value="Retirada">Retirada</option>
                    <option value="Deposito">Depósito</option>
                    <option value="Pagamento">Pagamento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" name="description" placeholder="Detalhes da movimentação..." />
              </div>
              
              <div>
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <select name="payment_method" id="payment_method" className="w-full p-2 border rounded bg-background text-foreground">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('movement-type')?.setAttribute('value', 'entrada');
                    const form = document.getElementById('cash-form') as HTMLFormElement;
                    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Entrada
                </Button>
                <Button 
                  type="submit" 
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('movement-type')?.setAttribute('value', 'saida');
                    const form = document.getElementById('cash-form') as HTMLFormElement;
                    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                  }}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Saída
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Movimentações do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashMovements.map((movement: any) => {
                const isEntrada = movement.type === 'entrada' || movement.type === 'entry';
                return (
                  <TableRow key={movement.id}>
                    <TableCell>{format(new Date(movement.movement_date || movement.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={isEntrada ? 'default' : 'destructive'}>
                        {isEntrada ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {isEntrada ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell>{movement.description || '-'}</TableCell>
                    <TableCell className="bg-background text-foreground">
                      <Badge variant="outline" className="bg-background text-foreground">
                        {movement.category}
                      </Badge>
                    </TableCell>
                    <TableCell className={isEntrada ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {isEntrada ? '+' : '-'} R$ {movement.amount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="bg-background text-foreground">
                      {movement.payment_method === 'pix' ? 'PIX' : 
                       movement.payment_method === 'cash' ? 'Dinheiro' :
                       movement.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                       movement.payment_method === 'debit_card' ? 'Cartão de Débito' :
                       movement.payment_method || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
