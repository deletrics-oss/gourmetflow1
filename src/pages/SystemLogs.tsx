import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export default function SystemLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadLogs();
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("system_logs")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data || []) as SystemLog[]);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction && !log.action.toLowerCase().includes(filterAction.toLowerCase())) {
      return false;
    }
    if (filterEntity && !log.entity_type?.toLowerCase().includes(filterEntity.toLowerCase())) {
      return false;
    }
    if (filterStartDate) {
      const logDate = new Date(log.created_at);
      const startDate = new Date(filterStartDate);
      if (logDate < startDate) return false;
    }
    if (filterEndDate) {
      const logDate = new Date(log.created_at);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return "default";
    if (action.includes("update") || action.includes("edit")) return "secondary";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    return "outline";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Logs do Sistema</h1>
            <p className="text-muted-foreground">
              Histórico completo de ações realizadas no sistema
            </p>
          </div>
        </div>
        <Button onClick={loadLogs} variant="outline">
          Atualizar
        </Button>
      </div>

      <Separator />

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label>Filtrar por Ação</Label>
            <Input
              placeholder="Ex: create, update, delete..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            />
          </div>
          <div>
            <Label>Filtrar por Entidade</Label>
            <Input
              placeholder="Ex: order, menu_item, customer..."
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="text-center py-8">Carregando logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum log encontrado
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow 
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        {log.profiles?.full_name || log.user_id || "Sistema"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.entity_type || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {log.details ? JSON.stringify(log.details).substring(0, 50) + "..." : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * logsPerPage + 1} a{" "}
                  {Math.min(currentPage * logsPerPage, filteredLogs.length)} de{" "}
                  {filteredLogs.length} logs
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
            <DialogTitle>Detalhes do Log</DialogTitle>
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
                  <Label className="text-muted-foreground">Usuário</Label>
                  <p className="font-medium">
                    {selectedLog.profiles?.full_name || selectedLog.user_id || "Sistema"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ação</Label>
                  <div>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entidade</Label>
                  <p className="font-medium">{selectedLog.entity_type || "-"}</p>
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
              </div>

              {selectedLog.details && (
                <div>
                  <Label className="text-muted-foreground">Detalhes (JSON)</Label>
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
