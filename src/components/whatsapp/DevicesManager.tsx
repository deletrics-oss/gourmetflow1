import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Smartphone, Trash2, RefreshCw, Loader2, Wifi, WifiOff, RotateCcw } from "lucide-react";

interface Device {
  id: string;
  name: string;
  phone_number: string | null;
  connection_status: string;
  qr_code: string | null;
  active_logic_id: string | null;
  should_transcribe: boolean;
  last_connected_at: string | null;
  created_at: string;
}

interface LogicConfig {
  id: string;
  name: string;
  logic_type: string;
}

interface Props {
  restaurantId: string;
  onRefresh: () => void;
}

export function DevicesManager({ restaurantId, onRefresh }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logics, setLogics] = useState<LogicConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  // Load devices and logics
  useEffect(() => {
    loadData();

    // Subscribe to device updates
    const channel = supabase
      .channel('whatsapp-devices-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_devices',
        filter: `restaurant_id=eq.${restaurantId}`
      }, () => {
        loadData();
      })
      .subscribe();

    // Poll for updates every 5 seconds
    const pollInterval = setInterval(loadData, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [devicesRes, logicsRes] = await Promise.all([
        supabase.from('whatsapp_devices').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('whatsapp_logic_configs').select('id, name, logic_type').eq('restaurant_id', restaurantId).eq('is_active', true),
      ]);

      if (devicesRes.data) setDevices(devicesRes.data);
      if (logicsRes.data) setLogics(logicsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) {
      toast.error("Digite um nome para o dispositivo");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('whatsapp_devices').insert({
        restaurant_id: restaurantId,
        name: newDeviceName.trim(),
        connection_status: 'disconnected',
      }).select().single();

      if (error) throw error;

      toast.success("Dispositivo adicionado!", { description: "Iniciando conexão..." });
      setNewDeviceName("");
      setIsAddDialogOpen(false);

      // Auto-start connection to generate QR Code
      if (data) {
        // Add to local state immediately to avoid flickers
        setDevices(prev => [data, ...prev]);
        // Trigger reconnect (init session)
        await handleReconnect(data, false);
      }

      onRefresh();
    } catch (error) {
      console.error('Erro ao adicionar dispositivo:', error);
      toast.error("Erro ao adicionar dispositivo");
      loadData(); // Reload to be safe
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Tem certeza que deseja remover este dispositivo?")) return;

    try {
      // Disconnect first via Edge Function
      await supabase.functions.invoke('whatsapp-server-proxy', {
        body: { action: 'disconnect', deviceId, restaurantId }
      });

      const { error } = await supabase.from('whatsapp_devices').delete().eq('id', deviceId);
      if (error) throw error;

      toast.success("Dispositivo removido!");
      loadData();
      onRefresh();
    } catch (error) {
      console.error('Erro ao remover dispositivo:', error);
      toast.error("Erro ao remover dispositivo");
    }
  };

  const handleReconnect = async (device: Device, forceReset: boolean = false) => {
    setReconnectingId(device.id);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-server-proxy', {
        body: {
          action: forceReset ? 'reconnect' : 'connect',
          deviceId: device.id,
          restaurantId,
          forceReset
        }
      });

      if (error) throw error;

      if (data?.qrCode) {
        // Update device with QR code locally
        setDevices(prev => prev.map(d =>
          d.id === device.id
            ? { ...d, qr_code: data.qrCode, connection_status: 'qr_ready' }
            : d
        ));
        toast.success(forceReset ? "Sessão limpa!" : "Reconectando...", {
          description: "Escaneie o QR Code"
        });
      } else if (data?.status === 'connected') {
        toast.success("Dispositivo conectado!");
        loadData();
      } else {
        toast.info("Tentando reconectar...", { description: "Aguarde..." });
      }
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      toast.error("Erro ao reconectar", {
        description: "Verifique se o servidor WhatsApp está rodando"
      });
    } finally {
      setReconnectingId(null);
    }
  };

  const handleUpdateLogic = async (deviceId: string, logicId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_devices')
        .update({ active_logic_id: logicId === 'none' ? null : logicId })
        .eq('id', deviceId);

      if (error) throw error;

      toast.success("Lógica atualizada!", { description: "Bot configurado com sucesso" });
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar lógica:', error);
      toast.error("Erro ao atualizar lógica");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      connected: { label: "Conectado", color: "bg-green-500" },
      connecting: { label: "Conectando", color: "bg-yellow-500" },
      qr_ready: { label: "QR Pronto", color: "bg-yellow-500" },
      disconnected: { label: "Desconectado", color: "bg-gray-500" },
    };
    return statusMap[status] || statusMap.disconnected;
  };

  // Render QR Code - supports both data:image and raw text
  const renderQrCode = (qrCode: string | null) => {
    if (!qrCode) return null;

    // If it's already a data URL, use directly
    if (qrCode.startsWith('data:image')) {
      return <img src={qrCode} alt="QR Code" className="w-48 h-48" />;
    }

    // Otherwise, use external API to generate QR image from text
    return (
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
        alt="QR Code"
        className="w-48 h-48"
      />
    );
  };

  const getLogicEmoji = (logicType: string) => {
    switch (logicType) {
      case 'ai': return '🤖';
      case 'hybrid': return '⚡';
      default: return '📋';
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dispositivos WhatsApp</h2>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
        </div>

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
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddDevice} disabled={!newDeviceName || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  "Adicionar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Devices Grid */}
      {devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const statusInfo = getStatusBadge(device.connection_status);
            const isReconnecting = reconnectingId === device.id;

            return (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <CardDescription>
                          {device.phone_number || "Aguardando conexão"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      <div className={`w-2 h-2 rounded-full ${statusInfo.color} mr-1`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Status Display */}
                  {device.connection_status === 'connected' ? (
                    <div className="flex items-center justify-center p-6 bg-green-500/10 rounded-lg">
                      <div className="text-center space-y-2">
                        <Wifi className="w-10 h-10 text-green-500 mx-auto" />
                        <p className="text-sm font-medium">Dispositivo Conectado</p>
                        {device.phone_number && (
                          <p className="text-lg font-bold text-primary">📱 {device.phone_number}</p>
                        )}
                      </div>
                    </div>
                  ) : device.qr_code ? (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                        {renderQrCode(device.qr_code)}
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Escaneie com o WhatsApp
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                      <div className="text-center space-y-2">
                        <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">Desconectado</p>
                        <p className="text-xs text-muted-foreground">
                          Clique em Reconectar para gerar QR Code
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Logic Selector - only show when connected */}
                  {device.connection_status === 'connected' && logics.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium">🤖 Lógica Ativa</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={device.active_logic_id || 'none'}
                        onChange={(e) => handleUpdateLogic(device.id, e.target.value)}
                      >
                        <option value="none">🖐️ MANUAL (sem bot)</option>
                        {logics.map((logic) => (
                          <option key={logic.id} value={logic.id}>
                            {getLogicEmoji(logic.logic_type)} {logic.name}
                          </option>
                        ))}
                      </select>
                      {device.active_logic_id ? (
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

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleReconnect(device, false)}
                      disabled={isReconnecting}
                      title="Tentar reconectar sessão existente"
                    >
                      {isReconnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Reconectar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReconnect(device, true)}
                      disabled={isReconnecting}
                      title="Limpar sessão e conectar outro celular"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDevice(device.id)}
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
      )}
    </div>
  );
}
