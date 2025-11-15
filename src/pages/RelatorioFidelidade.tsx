import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingDown, TrendingUp, Tag, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function RelatorioFidelidade() {
  // Query para buscar dados de cashback
  const { data: cashbackData } = useQuery({
    queryKey: ['cashback-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query para buscar cupons utilizados
  const { data: couponsData } = useQuery({
    queryKey: ['coupons-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .gt('current_uses', 0);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query para clientes com cashback
  const { data: customersWithCashback } = useQuery({
    queryKey: ['customers-cashback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .gt('loyalty_points', 0)
        .order('loyalty_points', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calcular totais
  const totalEarned = cashbackData
    ?.filter(t => t.type === 'earned')
    ?.reduce((sum, t) => sum + t.points, 0) || 0;

  const totalUsed = cashbackData
    ?.filter(t => t.type === 'redeemed')
    ?.reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;

  const totalCouponsValue = couponsData
    ?.reduce((sum, c) => sum + (c.discount_value * c.current_uses), 0) || 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Visão geral de Fidelidade</h1>
          <p className="text-muted-foreground">Mostrando resultados nos últimos 30 dias</p>
        </div>

        {/* Cashback Overview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Cashback</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo de cashback da base</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {(totalEarned * 0.01).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cashback utilizado</CardTitle>
                <TrendingDown className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">
                  R$ {(totalUsed * 0.01).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos com cashback</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {cashbackData?.filter(t => t.type === 'redeemed').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">pedidos com cashback</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Clientes com maior saldo */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes com maior saldo acumulado nos últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {customersWithCashback && customersWithCashback.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do cliente</TableHead>
                    <TableHead>Cliente desde</TableHead>
                    <TableHead>Saldo disponível</TableHead>
                    <TableHead>Saldo utilizado</TableHead>
                    <TableHead>Expira em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersWithCashback.slice(0, 10).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{new Date(customer.created_at || '').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>R$ {(customer.loyalty_points * 0.01).toFixed(2)}</TableCell>
                      <TableCell>R$ 0,00</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
            )}
          </CardContent>
        </Card>

        {/* Histórico de entradas e saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de entradas e saídas de cashback nos últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {cashbackData && cashbackData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashbackData.slice(0, 20).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant={transaction.type === 'earned' ? 'default' : 'destructive'}>
                          {transaction.type === 'earned' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" /> Ganho</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" /> Resgate</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(transaction.created_at || '').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className={transaction.type === 'earned' ? 'text-green-600' : 'text-pink-600'}>
                        R$ {(Math.abs(transaction.points) * 0.01).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
            )}
          </CardContent>
        </Card>

        {/* Cupom de desconto */}
        <Card>
          <CardHeader>
            <CardTitle>Cupom de desconto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="bg-pink-100 p-3 rounded-lg">
                  <Tag className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-600">
                    R$ {totalCouponsValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">descontos provenientes de cupons</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {couponsData?.reduce((sum, c) => sum + c.current_uses, 0) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">pedidos com cupons</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
