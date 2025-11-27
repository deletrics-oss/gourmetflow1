import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Activity, 
  LogIn, 
  LogOut, 
  ShoppingCart, 
  Utensils, 
  Users, 
  Settings,
  User,
  DollarSign,
  Wrench,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SystemLog {
  id: string;
  action: string;
  entity_type: string;
  details: any;
  created_at: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  restaurant_id: string | null;
  profiles?: {
    full_name: string;
  };
}

const translateAction = (log: SystemLog): { text: string; icon: any; color: string } => {
  const userName = log.profiles?.full_name || 'Usuário';
  const details = log.details || {};
  
  const actionMap: Record<string, { text: string; icon: any; color: string }> = {
    'login': { text: `${userName} entrou no sistema`, icon: LogIn, color: 'text-green-600' },
    'logout': { text: `${userName} saiu do sistema`, icon: LogOut, color: 'text-gray-600' },
    'create_order': { 
      text: `${userName} criou pedido${details.table_number ? ` na Mesa ${details.table_number}` : ''}`, 
      icon: ShoppingCart, 
      color: 'text-blue-600' 
    },
    'update_order': { 
      text: `${userName} atualizou pedido${details.order_number ? ` #${details.order_number}` : ''}`, 
      icon: ShoppingCart, 
      color: 'text-blue-600' 
    },
    'complete_order': { 
      text: `${userName} finalizou venda de R$ ${details.total?.toFixed(2) || '0,00'}`, 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    'table_opened': { 
      text: `${userName} abriu Mesa ${details.table_number || '?'} com ${details.guests || '?'} pessoas`, 
      icon: Utensils, 
      color: 'text-purple-600' 
    },
    'table_closed': { 
      text: `${userName} fechou Mesa ${details.table_number || '?'}`, 
      icon: Utensils, 
      color: 'text-orange-600' 
    },
    'comanda_created': { 
      text: `${userName} criou comanda${details.table_number ? ` na Mesa ${details.table_number}` : ''}`, 
      icon: Utensils, 
      color: 'text-purple-600' 
    },
    'payment_received': { 
      text: `Cliente pagou R$ ${details.amount?.toFixed(2) || '0,00'} via ${details.method || 'cartão'}`, 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    'menu_item_created': { 
      text: `${userName} adicionou item "${details.item_name || 'no cardápio'}"`, 
      icon: Settings, 
      color: 'text-blue-600' 
    },
    'menu_item_updated': { 
      text: `${userName} alterou item "${details.item_name || 'do cardápio'}"`, 
      icon: Settings, 
      color: 'text-yellow-600' 
    },
    'customer_registered': { 
      text: `${userName} cadastrou cliente ${details.customer_name || ''}`, 
      icon: User, 
      color: 'text-blue-600' 
    },
  };
  
  return actionMap[log.action] || { 
    text: `${userName} realizou: ${log.action}`, 
    icon: Activity, 
    color: 'text-gray-600' 
  };
};

export default function SystemLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("today");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [technicalMode, setTechnicalMode] = useState(false);
  const logsPerPage = 50;

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    
    loadLogs();
    
    const channel = supabase
      .channel('system-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_logs'
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      const { data: logsData, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) as string[])];
      let profilesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        if (profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.user_id, p.full_name || "Desconhecido"]));
        }
      }

      const logsWithProfiles = logsData?.map(log => ({
        ...log,
        profiles: log.user_id ? { full_name: profilesMap.get(log.user_id) || "Desconhecido" } : null
      })) || [];

      setLogs(logsWithProfiles as SystemLog[]);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = [...logs];

    // Filtro por período
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (filterPeriod === "today") {
      filtered = filtered.filter(log => new Date(log.created_at) >= startOfToday);
    } else if (filterPeriod === "week") {
      filtered = filtered.filter(log => new Date(log.created_at) >= startOfWeek);
    } else if (filterPeriod === "month") {
      filtered = filtered.filter(log => new Date(log.created_at) >= startOfMonth);
    }

    // Filtro por tipo
    if (filterType === "sales") {
      filtered = filtered.filter(log => 
        log.action.includes("order") || log.action.includes("payment") || log.action.includes("complete")
      );
    } else if (filterType === "tables") {
      filtered = filtered.filter(log => 
        log.action.includes("table") || log.action.includes("comanda")
      );
    } else if (filterType === "access") {
      filtered = filtered.filter(log => 
        log.action.includes("login") || log.action.includes("logout")
      );
    } else if (filterType === "changes") {
      filtered = filtered.filter(log => 
        log.action.includes("update") || log.action.includes("create") || log.action.includes("delete")
      );
    }

    // Filtro por usuário
    if (filterUser !== "all") {
      filtered = filtered.filter(log => log.user_id === filterUser);
    }

    return filtered;
  };

  const filteredLogs = getFilteredLogs();

  // Cálculo de estatísticas
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const stats = {
    accesses: todayLogs.filter(log => log.action.includes("login")).length,
    sales: todayLogs.filter(log => log.action.includes("complete_order")).length,
    tables: todayLogs.filter(log => log.action.includes("table_opened")).length,
    changes: todayLogs.filter(log => 
      log.action.includes("update") || log.action.includes("create") || log.action.includes("menu")
    ).length,
  };

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const uniqueUsers = Array.from(new Set(logs.map(log => ({
    id: log.user_id,
    name: log.profiles?.full_name || "Desconhecido"
  })).filter(u => u.id)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Atividades do Sistema</h1>
            <p className="text-muted-foreground">
              Resumo simplificado das atividades do restaurante
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setTechnicalMode(!technicalMode)} 
            variant="outline"
            size="sm"
          >
            <Wrench className="h-4 w-4 mr-2" />
            {technicalMode ? "Modo Simples" : "Modo Técnico"}
          </Button>
          <Button onClick={loadLogs} variant="outline">
            Atualizar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acessos Hoje</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accesses}</div>
            <p className="text-xs text-muted-foreground">Entradas no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sales}</div>
            <p className="text-xs text-muted-foreground">Pedidos finalizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mesas Hoje</CardTitle>
            <Utensils className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tables}</div>
            <p className="text-xs text-muted-foreground">Mesas abertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alterações Hoje</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.changes}</div>
            <p className="text-xs text-muted-foreground">Mudanças no sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Simplificados */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Tipo de Atividade</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="sales">Vendas</SelectItem>
                <SelectItem value="tables">Mesas</SelectItem>
                <SelectItem value="access">Acessos</SelectItem>
                <SelectItem value="changes">Alterações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Funcionário</Label>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Período</Label>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Timeline de Atividades */}
      <Card className="p-4">
        {loading ? (
          <div className="text-center py-8">Carregando atividades...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma atividade encontrada
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedLogs.map((log) => {
                const translation = translateAction(log);
                const Icon = translation.icon;
                
                return (
                  <div 
                    key={log.id}
                    className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "HH:mm")}
                      </span>
                      <Icon className={`h-5 w-5 ${translation.color}`} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm">{translation.text}</p>
                      {technicalMode && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="mr-2">{log.action}</Badge>
                          {log.entity_type && <span>• {log.entity_type}</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * logsPerPage + 1} a{" "}
                  {Math.min(currentPage * logsPerPage, filteredLogs.length)} de{" "}
                  {filteredLogs.length} atividades
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Dialog com Detalhes */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Atividade</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Funcionário</Label>
                  <p className="font-medium">
                    {selectedLog.profiles?.full_name || "Sistema"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Atividade</Label>
                  <p className="font-medium">{translateAction(selectedLog).text}</p>
                </div>
                {technicalMode && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Ação Técnica</Label>
                      <Badge>{selectedLog.action}</Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Endereço IP</Label>
                      <p className="font-medium text-xs">{selectedLog.ip_address || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">User Agent</Label>
                      <p className="font-medium text-xs truncate" title={selectedLog.user_agent || "-"}>
                        {selectedLog.user_agent || "-"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {technicalMode && selectedLog.details && (
                <div>
                  <Label className="text-muted-foreground">Detalhes Técnicos (JSON)</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
