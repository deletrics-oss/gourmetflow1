import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
  Calendar,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface BalanceByMethod {
  cash: number;
  debit_card: number;
  credit_card: number;
  pix: number;
}

export default function GestaoFinanceira() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
  const [balances, setBalances] = useState<BalanceByMethod>({
    cash: 0,
    debit_card: 0,
    credit_card: 0,
    pix: 0,
  });
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [profit, setProfit] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [methodsData, setMethodsData] = useState<any[]>([]);

  useEffect(() => {
    loadFinancialData();
    
    // Realtime subscription para atualizar quando houver mudanças
    const channel = supabase
      .channel('financial-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadFinancialData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadFinancialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Calcular período
      const now = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      // Buscar pedidos completados (receitas)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString());

      if (ordersError) throw ordersError;

      // Calcular saldo por método de pagamento
      const balanceByMethod: BalanceByMethod = {
        cash: 0,
        debit_card: 0,
        credit_card: 0,
        pix: 0,
      };

      let totalRevenue = 0;

      orders?.forEach((order) => {
        const total = order.total || 0;
        totalRevenue += total;

        if (order.payment_method === 'cash') {
          balanceByMethod.cash += total;
        } else if (order.payment_method === 'debit_card') {
          balanceByMethod.debit_card += total;
        } else if (order.payment_method === 'credit_card') {
          balanceByMethod.credit_card += total;
        } else if (order.payment_method === 'pix') {
          balanceByMethod.pix += total;
        }
      });

      setBalances(balanceByMethod);
      setRevenue(totalRevenue);

      // Buscar despesas
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString());

      if (expensesError) throw expensesError;

      const totalExpenses = expensesData?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      setExpenses(totalExpenses);
      setProfit(totalRevenue - totalExpenses);

      // Preparar dados para gráficos
      prepareChartData(orders || [], expensesData || []);

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (orders: any[], expenses: any[]) => {
    // Agrupar por dia
    const dailyData: Record<string, { revenue: number; expenses: number }> = {};

    orders.forEach((order) => {
      const day = format(new Date(order.completed_at), 'dd/MM');
      if (!dailyData[day]) {
        dailyData[day] = { revenue: 0, expenses: 0 };
      }
      dailyData[day].revenue += order.total || 0;
    });

    expenses.forEach((expense) => {
      const day = format(new Date(expense.expense_date), 'dd/MM');
      if (!dailyData[day]) {
        dailyData[day] = { revenue: 0, expenses: 0 };
      }
      dailyData[day].expenses += expense.amount;
    });

    const chartArray = Object.entries(dailyData).map(([day, data]) => ({
      day,
      receitas: data.revenue,
      despesas: data.expenses,
      lucro: data.revenue - data.expenses,
    }));

    setChartData(chartArray);

    // Dados de métodos de pagamento para gráfico de pizza
    const methods = [
      { name: 'Dinheiro', value: balances.cash, color: '#22c55e' },
      { name: 'Débito', value: balances.debit_card, color: '#3b82f6' },
      { name: 'Crédito', value: balances.credit_card, color: '#f59e0b' },
      { name: 'PIX', value: balances.pix, color: '#8b5cf6' },
    ].filter(m => m.value > 0);

    setMethodsData(methods);
  };

  const totalBalance = balances.cash + balances.debit_card + balances.credit_card + balances.pix;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Controle completo do fluxo de caixa e finanças
          </p>
        </div>

        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">7 Dias</TabsTrigger>
            <TabsTrigger value="month">30 Dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de vendas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {expenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de gastos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              R$ {profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              R$ {totalBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma de todos os métodos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saldo por Método de Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💵 Dinheiro</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {balances.cash.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💳 Débito</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {balances.debit_card.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💳 Crédito</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {balances.credit_card.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📱 PIX</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {balances.pix.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Evolução */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Financeira</CardTitle>
            <CardDescription>Receitas, despesas e lucro por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Métodos de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Método</CardTitle>
            <CardDescription>Proporção de cada forma de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={methodsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {methodsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
