import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { 
  Search, 
  Lock, 
  Unlock, 
  Eye, 
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Subscription {
  id: string;
  user_id: string;
  restaurant_name: string | null;
  restaurant_phone: string | null;
  restaurant_email: string | null;
  plan_type: string;
  status: string;
  detailed_status: string;
  trial_days_left: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  manually_blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentHistory {
  id: string;
  stripe_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
}

export default function AdminAssinaturas() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    expired: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [searchTerm, subscriptions]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_subscriptions');

      if (error) {
        console.error('Error loading subscriptions:', error);
        toast.error('Erro ao carregar assinaturas');
        setLoading(false);
        return;
      }

      setSubscriptions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (subs: Subscription[]) => {
    const total = subs.length;
    const active = subs.filter(s => s.status === 'active').length;
    const trial = subs.filter(s => s.status === 'trial').length;
    const expired = subs.filter(s => 
      s.detailed_status === 'expired_trial' || s.status === 'canceled'
    ).length;

    const planPrices: Record<string, number> = {
      free: 0,
      basic: 149,
      premium: 249,
      enterprise: 399,
    };

    const revenue = subs
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (planPrices[s.plan_type] || 0), 0);

    setStats({ total, active, trial, expired, revenue });
  };

  const filterSubscriptions = () => {
    if (!searchTerm) {
      setFilteredSubs(subscriptions);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = subscriptions.filter(
      (sub) =>
        sub.restaurant_name?.toLowerCase().includes(term) ||
        sub.restaurant_email?.toLowerCase().includes(term) ||
        sub.restaurant_phone?.includes(term) ||
        sub.plan_type.toLowerCase().includes(term)
    );
    setFilteredSubs(filtered);
  };

  const loadPaymentHistory = async (subscriptionId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_payments', {
        p_subscription_id: subscriptionId
      });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Erro ao carregar histórico de pagamentos');
    }
  };

  const handleViewDetails = async (sub: Subscription) => {
    setSelectedSub(sub);
    setShowDetails(true);
    await loadPaymentHistory(sub.id);
  };

  const handleToggleBlock = async (block: boolean) => {
    if (!selectedSub) return;

    try {
      const { error } = await supabase.rpc('toggle_subscription_block', {
        p_subscription_id: selectedSub.id,
        p_blocked: block,
        p_reason: block ? blockReason : null,
      });

      if (error) throw error;

      toast.success(block ? 'Assinatura bloqueada com sucesso' : 'Assinatura desbloqueada com sucesso');
      setShowBlockDialog(false);
      setBlockReason("");
      await loadSubscriptions();
      setShowDetails(false);
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Erro ao atualizar status de bloqueio');
    }
  };

  const getStatusBadge = (sub: Subscription) => {
    switch (sub.detailed_status) {
      case 'active_paid':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'active_trial':
        return <Badge className="bg-blue-500">Trial ({sub.trial_days_left}d)</Badge>;
      case 'expired_trial':
        return <Badge variant="destructive">Trial Expirado</Badge>;
      case 'payment_overdue':
        return <Badge className="bg-orange-500">Pagamento Atrasado</Badge>;
      case 'blocked_manual':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{sub.status}</Badge>;
    }
  };

  const getPlanName = (type: string) => {
    const names: Record<string, string> = {
      essencial: "Essencial",
      essencial_mesas: "Essencial + Mesas",
      customizado: "Customizado",
    };
    return names[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Assinaturas</h1>
        <p className="text-muted-foreground">
          Controle completo de todos os restaurantes e suas assinaturas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.revenue.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Assinaturas</CardTitle>
          <CardDescription>
            Busque e gerencie todas as assinaturas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={loadSubscriptions} variant="outline">
              Atualizar
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredSubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubs.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.restaurant_name || "Sem nome"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{sub.restaurant_email}</div>
                          <div className="text-muted-foreground">{sub.restaurant_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanName(sub.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(sub)}</TableCell>
                      <TableCell>
                        {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sub)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas e histórico de pagamentos
            </DialogDescription>
          </DialogHeader>

          {selectedSub && (
            <div className="space-y-6">
              {/* Info Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações do Restaurante</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {selectedSub.restaurant_name || "N/A"}</p>
                    <p><strong>Email:</strong> {selectedSub.restaurant_email}</p>
                    <p><strong>Telefone:</strong> {selectedSub.restaurant_phone || "N/A"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Informações da Assinatura</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Plano:</strong> {getPlanName(selectedSub.plan_type)}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedSub)}</p>
                    {selectedSub.current_period_end && (
                      <p>
                        <strong>Renova em:</strong>{" "}
                        {format(new Date(selectedSub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                    {selectedSub.trial_end && selectedSub.status === 'trial' && (
                      <p>
                        <strong>Trial termina em:</strong>{" "}
                        {format(new Date(selectedSub.trial_end), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloqueio Manual */}
              {selectedSub.manually_blocked && (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Assinatura Bloqueada Manualmente
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {selectedSub.blocked_reason || "Sem motivo especificado"}
                  </p>
                </div>
              )}

              {/* Histórico de Pagamentos */}
              <div>
                <h4 className="font-semibold mb-3">Histórico de Pagamentos</h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>ID Stripe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {payment.currency.toUpperCase()} {(payment.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {payment.stripe_payment_id || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                {selectedSub.manually_blocked ? (
                  <Button
                    onClick={() => handleToggleBlock(false)}
                    variant="default"
                    className="flex-1"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Desbloquear Assinatura
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowBlockDialog(true)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Bloquear Assinatura
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Assinatura</DialogTitle>
            <DialogDescription>
              Informe o motivo do bloqueio desta assinatura
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo do Bloqueio</label>
              <Textarea
                placeholder="Ex: Pagamento em atraso, violação de termos, etc."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleToggleBlock(true)}
              disabled={!blockReason.trim()}
            >
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
