"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Smartphone, Wifi, WifiOff, Trash2, RefreshCw, RotateCcw, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Device {
  id: string;
  name: string;
  connectionStatus: 'connected' | 'connecting' | 'qr_ready' | 'disconnected';
  phoneNumber?: string;
  qrCode?: string;
  lastConnectedAt?: string;
}

function DevicesPageComponent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const { toast } = useToast();

  const { data: devices = [], isLoading, isRefetching, refetch } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    queryFn: () => apiRequest('GET', '/api/devices'),
    refetchInterval: 15000,
  });


  const addDeviceMutation = useMutation({
    mutationFn: (name: string) => apiRequest('POST', '/api/devices', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      setIsAddDialogOpen(false);
      setNewDeviceName("");
      toast({ title: "Dispositivo adicionado", description: "Aguardando conexão..." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest('DELETE', `/api/devices/${deviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({ title: "Dispositivo removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest('POST', `/api/whatsapp/reconnect/${deviceId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({ title: "Reconectando...", description: "Tentando restaurar sessão" });
    },
  });

  const clearSessionMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest('POST', `/api/whatsapp/reconnect/${deviceId}`, { forceReset: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({ title: "Sessão limpa!", description: "Escaneie o novo QR Code" });
    },
    onError: () => {
      toast({ title: "Erro ao limpar sessão", variant: "destructive" });
    },
  });

  const { data: logics } = useQuery<any[]>({
    queryKey: ['/api/logics'],
    queryFn: () => apiRequest('GET', '/api/logics'),
  });

  const updateLogicMutation = useMutation({
    mutationFn: ({ deviceId, logicId }: { deviceId: string; logicId: string }) =>
      apiRequest('PATCH', `/api/devices/${deviceId}/logic`, { logicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({ title: "Lógica atualizada!", description: "Bot configurado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      connected: { label: "Conectado", variant: "default" as const, color: "bg-green-500" },
      connecting: { label: "Conectando", variant: "secondary" as const, color: "bg-yellow-500" },
      qr_ready: { label: "QR Pronto", variant: "secondary" as const, color: "bg-yellow-500" },
      disconnected: { label: "Desconectado", variant: "secondary" as const, color: "bg-gray-500" },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.disconnected;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dispositivos WhatsApp</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            💡 Após adicionar ou conectar um dispositivo, clique em <strong>Atualizar</strong> para ver as mudanças.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
            {isLoading || isRefetching ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Dispositivo</DialogTitle>
                <DialogDescription>Dê um nome ao dispositivo para identificá-lo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Nome do Dispositivo</Label>
                  <Input
                    id="device-name"
                    placeholder="Ex: Atendimento, Vendas, Suporte"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => addDeviceMutation.mutate(newDeviceName)}
                  disabled={!newDeviceName || addDeviceMutation.isPending}
                >
                  {addDeviceMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Help Card - Troubleshooting Instructions */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base text-blue-700 dark:text-blue-400">
              Procedimento de Conexão e Reparo
            </CardTitle>

            {/* Information about automatic reconnection */}
            <div className="ml-auto" title="Sobre a Reconexão Automática">
              <span className="text-xs text-blue-600 cursor-help border-b border-dashed border-blue-400">
                Por que às vezes reconecta sozinho?
              </span>
              <span className="sr-only">O sistema mantém os dados da sessão salvos. Se o arquivo estiver intacto, ele reconecta sozinho. Se corromper, precisa refazer o processo.</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Passo a passo para conectar/corrigir:</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Tente adicionar um <strong>Novo Dispositivo</strong> (se ainda não existir).</li>
                  <li>Se o dispositivo já existe e não conecta, clique em <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs"><RotateCcw className="w-3 h-3" /> Limpar Sessão</span>.</li>
                  <li>Aguarde gerar o novo QR Code e tente escanear.</li>
                  <li>Se não funcionar, clique em <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs"><RefreshCw className="w-3 h-3" /> Reconectar</span> e tente novamente.</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const statusInfo = getStatusBadge(device.connectionStatus);

            return (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <CardDescription>{device.phoneNumber || "Aguardando conexão"}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>
                      <div className={`w-2 h-2 rounded-full ${statusInfo.color} mr-1`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {device.connectionStatus === 'connected' ? (
                    <div className="flex items-center justify-center p-6 bg-green-500/10 rounded-lg">
                      <div className="text-center space-y-2">
                        <Wifi className="w-10 h-10 text-green-500 mx-auto" />
                        <p className="text-sm font-medium">Dispositivo Conectado</p>
                        {device.phoneNumber && (
                          <p className="text-lg font-bold text-primary">📱 {device.phoneNumber}</p>
                        )}
                      </div>
                    </div>
                  ) : device.qrCode ? (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                        <img src={device.qrCode} alt="QR Code" className="w-48 h-48" />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">Escaneie com o WhatsApp</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                      <div className="text-center space-y-2">
                        <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">Desconectado</p>
                        <p className="text-xs text-muted-foreground">Clique em Reconectar para gerar QR Code</p>
                      </div>
                    </div>
                  )}

                  {/* Logic Selector */}
                  {device.connectionStatus === 'connected' && logics && (
                    <div className="space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium">🤖 Lógica Ativa</label>
                      <Select
                        value={(device as any).activeLogicId || 'none'}
                        onValueChange={(value) => updateLogicMutation.mutate({ deviceId: device.id, logicId: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma lógica" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">🖐️ MANUAL (sem bot)</SelectItem>
                          {logics.map((logic: any) => (
                            <SelectItem key={logic.id} value={logic.id}>
                              {logic.logicType === 'ai' ? '🤖' : logic.logicType === 'hybrid' ? '⚡' : '📋'} {logic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(device as any).activeLogicId ? (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          ✅ Bot ativo - Respostas automáticas
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          🖐️ Modo Manual - Sem respostas automáticas
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => reconnectMutation.mutate(device.id)}
                      disabled={reconnectMutation.isPending}
                      title="Tentar reconectar sessão existente"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconectar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => clearSessionMutation.mutate(device.id)}
                      disabled={clearSessionMutation.isPending}
                      title="Limpar sessão e conectar outro celular"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDeviceMutation.mutate(device.id)}
                      disabled={deleteDeviceMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Smartphone className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo configurado</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Adicione seu primeiro dispositivo WhatsApp para começar
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Dispositivo
            </Button>
          </CardContent>
        </Card>
      )
      }
    </div >
  );
}

// Named export for use in other components
export const DevicesManager = DevicesPageComponent;

// Default export
export default DevicesPageComponent;
