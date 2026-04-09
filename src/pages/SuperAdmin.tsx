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
  Crown,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  ArrowUpCircle,
  Store,
  Zap,
  Package,
  UserPlus,
  ShieldAlert,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface RestaurantData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  plan_type: string | null;
  subscription_status: string | null;
  trial_end: string | null;
  manually_blocked: boolean | null;
  blocked_reason: string | null;
  orders_30d: number;
  revenue_30d: number;
  last_activity: string | null;
  total_orders: number;
}

interface GlobalStats {
  total_restaurants: number;
  online_count: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  blocked_count: number;
  estimated_revenue: number;
  orders_24h: number;
  total_revenue_platform: number;
}

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({
    email: "",
    password: "",
    full_name: "",
    restaurant_name: "",
    phone: ""
  });
  
  // Novos estados para poderes de promoção
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  
  const [stats, setStats] = useState<GlobalStats>({
    total_restaurants: 0,
    online_count: 0,
    active_subscriptions: 0,
    trial_subscriptions: 0,
    blocked_count: 0,
    estimated_revenue: 0,
    orders_24h: 0,
    total_revenue_platform: 0,
  });

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    filterRestaurants();
  }, [searchTerm, planFilter, statusFilter, onlineFilter, restaurants]);

  // Proteger página - apenas Super Admin pode acessar
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Esta página é exclusiva para Super Administradores.</p>
        <Button onClick={() => window.history.back()}>Voltar</Button>
      </div>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRestaurants(), loadStats()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      // Usar o RPC v2 para buscar tudo de uma vez com segurança (contorna erro 406 e RLS)
      const { data, error } = await supabase.rpc("get_admin_users_v2");

      if (error) throw error;

      // Buscar estatísticas de pedidos para cada restaurante
      const restaurantsWithDetails = await Promise.all(
        (data || []).map(async (userData: any) => {
          // Buscar estatísticas de pedidos
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: orderStats } = await supabase
            .from("orders")
            .select("total, created_at")
            .eq("restaurant_id", userData.id) // O ID aqui já é o do restaurante no RPC v2
            .gte("created_at", thirtyDaysAgo.toISOString());

          const { data: lastOrder } = await supabase
            .from("orders")
            .select("created_at")
            .eq("restaurant_id", userData.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const orders30d = orderStats?.length || 0;
          const revenue30d = orderStats?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
          const lastActivity = lastOrder?.[0]?.created_at || null;

          return {
            id: userData.id,
            name: userData.restaurant_name || "Sem nome",
            phone: userData.phone,
            email: userData.email,
            created_at: userData.created_at,
            plan_type: userData.plan_type,
            subscription_status: userData.status,
            trial_end: userData.trial_end,
            manually_blocked: userData.manually_blocked,
            blocked_reason: null,
            orders_30d: orders30d,
            revenue_30d: revenue30d,
            last_activity: lastActivity,
            total_orders: orders30d,
          };
        })
      );

      setRestaurants(restaurantsWithDetails);
    } catch (error) {
      console.error("Error loading restaurants:", error);
      toast.error("Erro ao carregar estabelecimentos");
    }
  };

  const loadStats = async () => {
    try {
      // Total de restaurantes
      const { count: totalCount } = await supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true });

      // Estatísticas de assinaturas
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("status, plan_type, manually_blocked");

      const activeCount = subscriptions?.filter((s) => s.status === "active").length || 0;
      const trialCount = subscriptions?.filter((s) => s.status === "trial").length || 0;
      const blockedCount = subscriptions?.filter((s) => s.manually_blocked).length || 0;

      // Receita estimada (assinaturas ativas)
      const planPrices: Record<string, number> = {
        essencial: 149,
        essencial_mesas: 249,
        customizado: 399,
      };

      const estimatedRevenue =
        subscriptions
          ?.filter((s) => s.status === "active")
          .reduce((sum, s) => sum + (planPrices[s.plan_type] || 0), 0) || 0;

      // Pedidos nas últimas 24h
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: orders24h } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      // Faturamento total da plataforma (30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orderTotals } = await supabase
        .from("orders")
        .select("total")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .eq("status", "completed");

      const totalRevenue = orderTotals?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Estabelecimentos online (atividade nos últimos 15 min)
      const fifteenMinAgo = new Date();
      fifteenMinAgo.setMinutes(fifteenMinAgo.getMinutes() - 15);

      const { data: recentOrders } = await supabase
        .from("orders")
        .select("restaurant_id")
        .gte("created_at", fifteenMinAgo.toISOString());

      const onlineCount = new Set(recentOrders?.map((o) => o.restaurant_id)).size;

      setStats({
        total_restaurants: totalCount || 0,
        online_count: onlineCount,
        active_subscriptions: activeCount,
        trial_subscriptions: trialCount,
        blocked_count: blockedCount,
        estimated_revenue: estimatedRevenue,
        orders_24h: orders24h || 0,
        total_revenue_platform: totalRevenue,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const filterRestaurants = () => {
    let filtered = [...restaurants];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.email?.toLowerCase().includes(term) ||
          r.phone?.includes(term)
      );
    }

    // Filtro por plano
    if (planFilter !== "all") {
      filtered = filtered.filter((r) => r.plan_type === planFilter);
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (statusFilter === "active") return r.subscription_status === "active";
        if (statusFilter === "trial") return r.subscription_status === "trial";
        if (statusFilter === "blocked") return r.manually_blocked;
        return true;
      });
    }

    // Filtro online/offline
    if (onlineFilter !== "all") {
      filtered = filtered.filter((r) => {
        const status = getOnlineStatus(r.last_activity);
        if (onlineFilter === "online") return status === "online";
        if (onlineFilter === "offline") return status === "offline";
        return true;
      });
    }

    // Ordenar por faturamento (maior primeiro)
    filtered.sort((a, b) => b.revenue_30d - a.revenue_30d);

    setFilteredRestaurants(filtered);
  };

  const getOnlineStatus = (lastActivity: string | null) => {
    if (!lastActivity) return "offline";

    const now = new Date();
    const lastDate = new Date(lastActivity);
    const diffMinutes = (now.getTime() - lastDate.getTime()) / (1000 * 60);

    if (diffMinutes < 15) return "online"; // 🟢
    if (diffMinutes < 180) return "recent"; // 🟡 (3 horas)
    if (diffMinutes < 1440) return "today"; // 🔵 (24 horas)
    return "offline"; // ⚪
  };

  const getOnlineBadge = (lastActivity: string | null) => {
    const status = getOnlineStatus(lastActivity);

    switch (status) {
      case "online":
        return (
          <Badge className="bg-green-500 text-white">
            <span className="mr-1">🟢</span> Online
          </Badge>
        );
      case "recent":
        return (
          <Badge className="bg-yellow-500 text-white">
            <span className="mr-1">🟡</span> Recente
          </Badge>
        );
      case "today":
        return (
          <Badge className="bg-blue-500 text-white">
            <span className="mr-1">🔵</span> Hoje
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <span className="mr-1">⚪</span> Offline
          </Badge>
        );
    }
  };

  const getUpgradeSuggestion = (restaurant: RestaurantData) => {
    const revenue = restaurant.revenue_30d;
    const plan = restaurant.plan_type;

    if (revenue > 25000) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <ArrowUpCircle className="w-3 h-3 mr-1" />
          Customizado
        </Badge>
      );
    }

    if (revenue > 10000 && plan === "essencial") {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <ArrowUpCircle className="w-3 h-3 mr-1" />
          +Mesas
        </Badge>
      );
    }

    if (restaurant.orders_30d > 500) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-500">
          <Package className="w-3 h-3 mr-1" />
          Alto Volume
        </Badge>
      );
    }

    return null;
  };

  const getPlanName = (type: string | null) => {
    if (!type) return "Sem plano";
    const names: Record<string, string> = {
      essencial: "Essencial",
      essencial_mesas: "Essencial + Mesas",
      customizado: "Customizado",
      free: "Grátis",
    };
    return names[type] || type;
  };

  const getStatusBadge = (restaurant: RestaurantData) => {
    if (restaurant.manually_blocked) {
      return <Badge variant="destructive">🔴 Bloqueado</Badge>;
    }

    if (restaurant.subscription_status === "active") {
      return <Badge className="bg-green-500">✅ Ativo</Badge>;
    }

    if (restaurant.subscription_status === "trial") {
      const daysLeft = restaurant.trial_end
        ? Math.ceil((new Date(restaurant.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      return <Badge className="bg-blue-500">🟡 Trial ({daysLeft}d)</Badge>;
    }

    return <Badge variant="outline">Inativo</Badge>;
  };

  const handleViewDetails = (restaurant: RestaurantData) => {
    setSelectedRestaurant(restaurant);
    setShowDetails(true);
  };

  const handleToggleBlock = async (block: boolean) => {
    if (!selectedRestaurant) return;

    try {
      // Buscar user_id do restaurante
      const { data: userRestaurant } = await supabase
        .from("user_restaurants")
        .select("user_id")
        .eq("restaurant_id", selectedRestaurant.id)
        .eq("is_active", true)
        .single();

      if (!userRestaurant) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Buscar subscription_id
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userRestaurant.user_id)
        .single();

      if (!subscription) {
        toast.error("Assinatura não encontrada");
        return;
      }

      const { error } = await supabase.rpc("toggle_subscription_block", {
        p_subscription_id: subscription.id,
        p_blocked: block,
        p_reason: block ? blockReason : null,
      });

      if (error) throw error;

      toast.success(block ? "Estabelecimento bloqueado" : "Estabelecimento desbloqueado");
      setShowBlockDialog(false);
      setBlockReason("");
      setShowDetails(false);
      await loadData();
    } catch (error) {
      console.error("Error toggling block:", error);
      toast.error("Erro ao atualizar bloqueio");
    }
  };

  // Promover a Super Admin
  const handlePromoteToSuperAdmin = async () => {
    if (!selectedRestaurant) return;

    try {
      // Buscar user_id do restaurante
      const { data: userRestaurant } = await supabase
        .from("user_restaurants")
        .select("user_id")
        .eq("restaurant_id", selectedRestaurant.id)
        .eq("is_active", true)
        .single();

      if (!userRestaurant) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Inserir role admin (Super Admin)
      const { error } = await supabase
        .from("user_roles")
        .upsert({
          user_id: userRestaurant.user_id,
          role: "admin"
        }, { onConflict: "user_id,role" });

      if (error) throw error;

      toast.success("Usuário promovido a Super Admin!");
      setShowPromoteDialog(false);
      setShowDetails(false);
      await loadData();
    } catch (error) {
      console.error("Error promoting to super admin:", error);
      toast.error("Erro ao promover usuário");
    }
  };

  // Alterar plano de assinatura
  const handleChangePlan = async () => {
    if (!selectedRestaurant || !selectedPlan) return;

    try {
      // Buscar user_id do restaurante
      const { data: userRestaurant } = await supabase
        .from("user_restaurants")
        .select("user_id")
        .eq("restaurant_id", selectedRestaurant.id)
        .eq("is_active", true)
        .single();

      if (!userRestaurant) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Atualizar plano na subscription
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          plan_type: selectedPlan,
          status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userRestaurant.user_id);

      if (error) throw error;

      toast.success(`Plano alterado para ${getPlanName(selectedPlan)}!`);
      setShowChangePlanDialog(false);
      setSelectedPlan("");
      setShowDetails(false);
      await loadData();
    } catch (error) {
      console.error("Error changing plan:", error);
      toast.error("Erro ao alterar plano");
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Criar novo usuário/inquilino - NÃO passa invited_by_restaurant, então trigger cria restaurante
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newTenant.email,
        password: newTenant.password,
        options: {
          data: {
            full_name: newTenant.full_name || newTenant.restaurant_name
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Atualizar nome do restaurante se diferente
      if (newTenant.restaurant_name) {
        // Esperar um pouco para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: userRest } = await supabase
          .from("user_restaurants")
          .select("restaurant_id")
          .eq("user_id", authData.user.id)
          .single();

        if (userRest?.restaurant_id) {
          await supabase
            .from("restaurants")
            .update({ 
              name: newTenant.restaurant_name,
              phone: newTenant.phone 
            })
            .eq("id", userRest.restaurant_id);
        }
      }

      // Definir role como admin
      await supabase
        .from("user_roles")
        .upsert({
          user_id: authData.user.id,
          role: "admin"
        });

      toast.success("Novo estabelecimento criado com sucesso!");
      setShowCreateDialog(false);
      setNewTenant({
        email: "",
        password: "",
        full_name: "",
        restaurant_name: "",
        phone: ""
      });
      await loadData();
    } catch (error: any) {
      console.error("Erro ao criar estabelecimento:", error);
      toast.error(error.message || "Erro ao criar estabelecimento");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Gerencie estabelecimentos, monitore faturamento e identifique oportunidades
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Estabelecimento
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estabelecimentos</CardTitle>
            <Store className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_restaurants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.online_count} online agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active_subscriptions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.trial_subscriptions} em trial • {stats.blocked_count} bloqueados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.estimated_revenue.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">de assinaturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders_24h}</div>
            <p className="text-xs text-muted-foreground mt-1">pedidos nas últimas 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Faturamento da Plataforma */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900 dark:text-green-100">
                💰 Faturamento Total da Plataforma (30 dias)
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Soma de todos os pedidos completados no último mês
              </CardDescription>
            </div>
            <div className="text-3xl font-bold text-green-600">
              R$ {stats.total_revenue_platform.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Restaurants Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Gerenciamento de Estabelecimentos</CardTitle>
              <CardDescription>
                Monitore faturamento, atividade e identifique oportunidades de upgrade
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="essencial_mesas">Essencial + Mesas</SelectItem>
                <SelectItem value="customizado">Customizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={onlineFilter} onValueChange={setOnlineFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Online/Offline</SelectItem>
                <SelectItem value="online">Apenas Online</SelectItem>
                <SelectItem value="offline">Apenas Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Faturamento 30d</TableHead>
                  <TableHead>Pedidos 30d</TableHead>
                  <TableHead>Sugestão</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredRestaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Nenhum estabelecimento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-2">
                            🏪 {restaurant.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {restaurant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanName(restaurant.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(restaurant)}</TableCell>
                      <TableCell>{getOnlineBadge(restaurant.last_activity)}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          R$ {restaurant.revenue_30d.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {restaurant.orders_30d}
                        </Badge>
                      </TableCell>
                      <TableCell>{getUpgradeSuggestion(restaurant)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(restaurant.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(restaurant)}
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
            <DialogTitle>Detalhes do Estabelecimento</DialogTitle>
            <DialogDescription>
              Informações completas, faturamento e histórico de atividade
            </DialogDescription>
          </DialogHeader>

          {selectedRestaurant && (
            <div className="space-y-6">
              {/* Info Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Nome:</strong> {selectedRestaurant.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedRestaurant.email || "N/A"}
                    </p>
                    <p>
                      <strong>Telefone:</strong> {selectedRestaurant.phone || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Assinatura</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Plano:</strong> {getPlanName(selectedRestaurant.plan_type)}
                    </p>
                    <p>
                      <strong>Status:</strong> {getStatusBadge(selectedRestaurant)}
                    </p>
                    {selectedRestaurant.trial_end && (
                      <p>
                        <strong>Trial termina:</strong>{" "}
                        {format(new Date(selectedRestaurant.trial_end), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Performance (30 dias)</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      R${" "}
                      {selectedRestaurant.revenue_30d.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">Faturamento</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedRestaurant.orders_30d}
                    </div>
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {selectedRestaurant.orders_30d > 0
                        ? `R$ ${(selectedRestaurant.revenue_30d / selectedRestaurant.orders_30d).toFixed(2)}`
                        : "R$ 0"}
                    </div>
                    <div className="text-xs text-muted-foreground">Ticket Médio</div>
                  </div>
                </div>
              </div>

              {/* Sugestão de Upgrade */}
              {getUpgradeSuggestion(selectedRestaurant) && (
                <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Oportunidade de Upgrade
                    </h4>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {selectedRestaurant.revenue_30d > 25000 &&
                      "Alto faturamento! Considere oferecer o plano Customizado com recursos premium."}
                    {selectedRestaurant.revenue_30d > 10000 &&
                      selectedRestaurant.revenue_30d <= 25000 &&
                      selectedRestaurant.plan_type === "essencial" &&
                      "Estabelecimento crescendo! Plano Essencial + Mesas pode ser uma boa opção."}
                    {selectedRestaurant.orders_30d > 500 &&
                      "Alto volume de pedidos! Considere planos com maior capacidade."}
                  </p>
                </div>
              )}

              {/* Bloqueio */}
              {selectedRestaurant.manually_blocked && (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Estabelecimento Bloqueado
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {selectedRestaurant.blocked_reason || "Sem motivo especificado"}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlan(selectedRestaurant.plan_type || "essencial");
                    setShowChangePlanDialog(true);
                  }}
                  className="flex-1"
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Alterar Plano
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPromoteDialog(true)}
                  className="flex-1"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Promover
                </Button>
                {selectedRestaurant.manually_blocked ? (
                  <Button
                    variant="outline"
                    onClick={() => handleToggleBlock(false)}
                    className="flex-1"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Desbloquear
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowBlockDialog(true)}
                    className="flex-1"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Bloquear
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote to Super Admin Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover a Super Admin</DialogTitle>
            <DialogDescription>
              Esta ação dará poderes de Super Admin ao dono deste estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Atenção:</strong> Super Admins têm acesso total ao painel de gestão de todos os estabelecimentos.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPromoteDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handlePromoteToSuperAdmin} className="flex-1">
                <Crown className="w-4 h-4 mr-2" />
                Confirmar Promoção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano de Assinatura</DialogTitle>
            <DialogDescription>
              Selecione o novo plano para este estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plano Atual</Label>
              <p className="text-sm text-muted-foreground">
                {getPlanName(selectedRestaurant?.plan_type || null)}
              </p>
            </div>
            <div>
              <Label>Novo Plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essencial">Essencial - R$149/mês</SelectItem>
                  <SelectItem value="essencial_mesas">Essencial + Mesas - R$249/mês</SelectItem>
                  <SelectItem value="customizado">Customizado - R$399/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowChangePlanDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleChangePlan} className="flex-1" disabled={!selectedPlan}>
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Estabelecimento</DialogTitle>
            <DialogDescription>
              Esta ação bloqueará o acesso do estabelecimento ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo do bloqueio</label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBlockDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleToggleBlock(true)}
                className="flex-1"
              >
                Confirmar Bloqueio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Estabelecimento</DialogTitle>
            <DialogDescription>
              Crie um novo inquilino com restaurante e trial de 30 dias
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant_name">Nome do Restaurante *</Label>
              <Input
                id="restaurant_name"
                value={newTenant.restaurant_name}
                onChange={(e) => setNewTenant({ ...newTenant, restaurant_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant_email">Email do Dono *</Label>
                <Input
                  id="tenant_email"
                  type="email"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant_password">Senha Inicial *</Label>
                <Input
                  id="tenant_password"
                  type="password"
                  value={newTenant.password}
                  onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={newTenant.full_name}
                  onChange={(e) => setNewTenant({ ...newTenant, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant_phone">Telefone</Label>
                <Input
                  id="tenant_phone"
                  type="tel"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <p>✅ O novo dono terá 30 dias de trial gratuito</p>
              <p>✅ Será criado um restaurante automaticamente</p>
              <p>✅ Um email de boas-vindas será enviado</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Estabelecimento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
