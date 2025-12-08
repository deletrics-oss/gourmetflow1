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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Calendar,
  CheckCircle,
  UserX
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithSubscription {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  subscription: {
    id: string;
    plan_type: string;
    status: string;
    trial_end: string | null;
    current_period_end: string | null;
    manually_blocked: boolean;
    blocked_reason: string | null;
  } | null;
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
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showExtendTrialDialog, setShowExtendTrialDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [newPlanType, setNewPlanType] = useState("essencial");
  const [extendDays, setExtendDays] = useState(30);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    withSubscription: 0,
    active: 0,
    trial: 0,
    noSubscription: 0,
    blocked: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os perfis (que representam todos os usuários)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, created_at');

      if (profilesError) throw profilesError;

      // Buscar todas as assinaturas
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // Buscar emails dos usuários via RPC (se existir) ou usar profiles
      const { data: rpcData } = await supabase.rpc('get_admin_subscriptions');

      // Mapear usuários com suas assinaturas
      const usersMap = new Map<string, UserWithSubscription>();

      // Primeiro, adicionar usuários do RPC que já tem assinatura
      if (rpcData) {
        rpcData.forEach((sub: any) => {
          usersMap.set(sub.user_id, {
            id: sub.user_id,
            email: sub.restaurant_email || 'Sem email',
            created_at: sub.created_at,
            full_name: sub.restaurant_name,
            phone: sub.restaurant_phone,
            subscription: {
              id: sub.id,
              plan_type: sub.plan_type,
              status: sub.status,
              trial_end: sub.trial_end,
              current_period_end: sub.current_period_end,
              manually_blocked: sub.manually_blocked,
              blocked_reason: sub.blocked_reason,
            },
          });
        });
      }

      // Adicionar perfis que não estão no RPC (usuários sem assinatura)
      if (profiles) {
        profiles.forEach((profile: any) => {
          if (!usersMap.has(profile.user_id)) {
            usersMap.set(profile.user_id, {
              id: profile.user_id,
              email: 'Sem email cadastrado',
              created_at: profile.created_at,
              full_name: profile.full_name,
              phone: profile.phone,
              subscription: null,
            });
          }
        });
      }

      const usersList = Array.from(usersMap.values());
      setUsers(usersList);
      calculateStats(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersList: UserWithSubscription[]) => {
    const total = usersList.length;
    const withSubscription = usersList.filter(u => u.subscription).length;
    const active = usersList.filter(u => u.subscription?.status === 'active').length;
    const trial = usersList.filter(u => u.subscription?.status === 'trial').length;
    const noSubscription = usersList.filter(u => !u.subscription).length;
    const blocked = usersList.filter(u => u.subscription?.manually_blocked).length;

    const planPrices: Record<string, number> = {
      essencial: 149,
      essencial_mesas: 249,
      customizado: 399,
    };

    const revenue = usersList
      .filter(u => u.subscription?.status === 'active')
      .reduce((sum, u) => sum + (planPrices[u.subscription?.plan_type || ''] || 0), 0);

    setStats({ total, withSubscription, active, trial, noSubscription, blocked, revenue });
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term) ||
        user.subscription?.plan_type.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
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
    }
  };

  const handleViewDetails = async (user: UserWithSubscription) => {
    setSelectedUser(user);
    setShowDetails(true);
    if (user.subscription) {
      await loadPaymentHistory(user.subscription.id);
    } else {
      setPayments([]);
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: selectedUser.id,
        plan_type: newPlanType,
        status: 'trial',
        trial_end: addDays(new Date(), 30).toISOString(),
      });

      if (error) throw error;

      toast.success('Assinatura criada com sucesso!');
      setShowCreateDialog(false);
      await loadAllUsers();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Erro ao criar assinatura');
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedUser?.subscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', selectedUser.subscription.id);

      if (error) throw error;

      toast.success('Assinatura excluída com sucesso!');
      setShowDetails(false);
      await loadAllUsers();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Erro ao excluir assinatura');
    }
  };

  const handleChangePlan = async () => {
    if (!selectedUser?.subscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan_type: newPlanType, updated_at: new Date().toISOString() })
        .eq('id', selectedUser.subscription.id);

      if (error) throw error;

      toast.success('Plano alterado com sucesso!');
      setShowChangePlanDialog(false);
      await loadAllUsers();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Erro ao alterar plano');
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedUser?.subscription) return;

    try {
      const currentEnd = selectedUser.subscription.trial_end 
        ? new Date(selectedUser.subscription.trial_end) 
        : new Date();
      
      const newTrialEnd = addDays(currentEnd, extendDays).toISOString();

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          trial_end: newTrialEnd, 
          status: 'trial',
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedUser.subscription.id);

      if (error) throw error;

      toast.success(`Trial estendido por ${extendDays} dias!`);
      setShowExtendTrialDialog(false);
      await loadAllUsers();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Erro ao estender trial');
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedUser?.subscription) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: addDays(new Date(), 30).toISOString(),
          manually_blocked: false,
          blocked_reason: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedUser.subscription.id);

      if (error) throw error;

      toast.success('Assinatura ativada manualmente!');
      await loadAllUsers();
      setShowDetails(false);
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Erro ao ativar assinatura');
    }
  };

  const handleToggleBlock = async (block: boolean) => {
    if (!selectedUser?.subscription) return;

    try {
      const { error } = await supabase.rpc('toggle_subscription_block', {
        p_subscription_id: selectedUser.subscription.id,
        p_blocked: block,
        p_reason: block ? blockReason : null,
      });

      if (error) throw error;

      toast.success(block ? 'Assinatura bloqueada' : 'Assinatura desbloqueada');
      setShowBlockDialog(false);
      setBlockReason("");
      await loadAllUsers();
      setShowDetails(false);
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Erro ao atualizar bloqueio');
    }
  };

  const getStatusBadge = (user: UserWithSubscription) => {
    if (!user.subscription) {
      return <Badge variant="outline" className="bg-gray-100">Sem Assinatura</Badge>;
    }
    if (user.subscription.manually_blocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }
    switch (user.subscription.status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'trial':
        const daysLeft = user.subscription.trial_end 
          ? Math.max(0, Math.ceil((new Date(user.subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;
        return <Badge className="bg-blue-500">Trial ({daysLeft}d)</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500">Pagamento Atrasado</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{user.subscription.status}</Badge>;
    }
  };

  const getPlanName = (type?: string) => {
    if (!type) return "—";
    const names: Record<string, string> = {
      essencial: "Essencial",
      essencial_mesas: "Essencial + Mesas",
      customizado: "Customizado",
    };
    return names[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Assinaturas</h1>
        <p className="text-muted-foreground">
          Controle completo de TODOS os usuários e suas assinaturas
        </p>
      </div>

      {/* Banner Explicativo */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                Sistema de Assinaturas
              </h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                <li><strong>Trial Automático:</strong> 30 dias grátis ao cadastrar</li>
                <li><strong>Ações Disponíveis:</strong> Criar, excluir, alterar plano, estender trial, ativar manualmente, bloquear</li>
                <li><strong>Planos:</strong> Essencial (R$149), Essencial+Mesas (R$249), Customizado (R$399)</li>
              </ul>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Com Assinatura</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withSubscription}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Em Trial</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Sem Assinatura</CardTitle>
            <UserX className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.noSubscription}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Bloqueados</CardTitle>
            <Lock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              R$ {stats.revenue.toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários ({users.length})</CardTitle>
          <CardDescription>
            Todos os usuários cadastrados no sistema
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
            <Button onClick={loadAllUsers} variant="outline">
              Atualizar
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "Sem nome"}
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell>{getPlanName(user.subscription?.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!user.subscription && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowCreateDialog(true);
                              }}
                              className="text-green-600"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações e ações disponíveis
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações do Usuário</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nome:</strong> {selectedUser.full_name || "N/A"}</p>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    <p><strong>Telefone:</strong> {selectedUser.phone || "N/A"}</p>
                    <p><strong>Cadastrado:</strong> {format(new Date(selectedUser.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Assinatura</h4>
                  {selectedUser.subscription ? (
                    <div className="space-y-1 text-sm">
                      <p><strong>Plano:</strong> {getPlanName(selectedUser.subscription.plan_type)}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedUser)}</p>
                      {selectedUser.subscription.trial_end && (
                        <p><strong>Trial até:</strong> {format(new Date(selectedUser.subscription.trial_end), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      )}
                      {selectedUser.subscription.current_period_end && (
                        <p><strong>Renova em:</strong> {format(new Date(selectedUser.subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem assinatura</p>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div>
                <h4 className="font-semibold mb-3">Ações</h4>
                <div className="flex flex-wrap gap-2">
                  {!selectedUser.subscription ? (
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Assinatura
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => {
                        setNewPlanType(selectedUser.subscription?.plan_type || 'essencial');
                        setShowChangePlanDialog(true);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Alterar Plano
                      </Button>
                      <Button variant="outline" onClick={() => setShowExtendTrialDialog(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Estender Trial
                      </Button>
                      <Button variant="outline" onClick={handleActivateSubscription} className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Ativar Manualmente
                      </Button>
                      {selectedUser.subscription.manually_blocked ? (
                        <Button variant="outline" onClick={() => handleToggleBlock(false)}>
                          <Unlock className="h-4 w-4 mr-2" />
                          Desbloquear
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => setShowBlockDialog(true)} className="text-red-600">
                          <Lock className="h-4 w-4 mr-2" />
                          Bloquear
                        </Button>
                      )}
                      <Button variant="destructive" onClick={handleDeleteSubscription}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Assinatura
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Histórico de Pagamentos */}
              {selectedUser.subscription && (
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                R$ {(payment.amount / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={payment.status === 'succeeded' ? 'default' : 'outline'}>
                                  {payment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Assinatura</DialogTitle>
            <DialogDescription>
              Criar nova assinatura para {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Plano</label>
              <Select value={newPlanType} onValueChange={setNewPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essencial">Essencial - R$149/mês</SelectItem>
                  <SelectItem value="essencial_mesas">Essencial + Mesas - R$249/mês</SelectItem>
                  <SelectItem value="customizado">Customizado - R$399/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              A assinatura será criada com 30 dias de trial.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateSubscription}>Criar Assinatura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newPlanType} onValueChange={setNewPlanType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Essencial - R$149/mês</SelectItem>
                <SelectItem value="essencial_mesas">Essencial + Mesas - R$249/mês</SelectItem>
                <SelectItem value="customizado">Customizado - R$399/mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>Cancelar</Button>
            <Button onClick={handleChangePlan}>Alterar Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={showExtendTrialDialog} onOpenChange={setShowExtendTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estender Trial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Dias adicionais</label>
              <Input 
                type="number" 
                value={extendDays} 
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)}
                min={1}
                max={365}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendTrialDialog(false)}>Cancelar</Button>
            <Button onClick={handleExtendTrial}>Estender {extendDays} dias</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Motivo do bloqueio..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleToggleBlock(true)}>Bloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
