import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Users, MessageSquare, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

export default function DisparoMassa() {
  const [message, setMessage] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'has_orders' | 'has_loyalty'>('all');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-dispatch', filterType],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name');

      if (filterType === 'has_loyalty') {
        query = query.gt('loyalty_points', 0);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAll = () => {
    setSelectedCustomers(customers.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem para enviar');
      return;
    }

    if (selectedCustomers.length === 0) {
      toast.error('Selecione ao menos um cliente');
      return;
    }

    const customersToSend = customers.filter(c => selectedCustomers.includes(c.id));

    try {
      toast.loading('Enviando mensagens...');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-send-mass', {
        body: {
          customers: customersToSend,
          message: message.trim()
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`✅ Mensagens enviadas! ${data.totalSent} enviadas, ${data.totalFailed} falharam`);
        setMessage('');
        setSelectedCustomers([]);
      } else {
        throw new Error('Falha no envio em massa');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      toast.error('Erro ao enviar mensagens. Verifique as configurações do WhatsApp.');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              Disparo em Massa
            </h1>
            <p className="text-muted-foreground">Envie mensagens para múltiplos clientes</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message">Texto da Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length} caracteres
                </p>
              </div>

              <Button onClick={handleSend} className="w-full" size="lg">
                <Send className="mr-2 h-4 w-4" />
                Enviar para {selectedCustomers.length} cliente(s)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Estatísticas</span>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Total de Clientes</span>
                <span className="font-bold text-lg">{customers.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Selecionados</span>
                <span className="font-bold text-lg text-primary">{selectedCustomers.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded">
                <span className="text-sm">Com Fidelidade</span>
                <span className="font-bold text-lg">{customers.filter(c => c.loyalty_points > 0).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Selecionar Clientes</CardTitle>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="has_loyalty">Com Pontos</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={selectAll} variant="outline" size="sm">
                  Selecionar Todos
                </Button>
                <Button onClick={clearSelection} variant="outline" size="sm">
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomer(customer.id)}
                      />
                    </TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.loyalty_points} pts</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}