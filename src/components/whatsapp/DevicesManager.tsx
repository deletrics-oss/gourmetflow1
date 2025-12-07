import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Smartphone, QrCode, Trash2, RefreshCw, Loader2, Wifi, WifiOff, Settings } from "lucide-react";

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
}

interface Props {
  restaurantId: string;
  onRefresh: () => void;
}

export function DevicesManager({ restaurantId, onRefresh }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logics, setLogics] = useState<LogicConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [saving, setSaving] = useState(false);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [devicesRes, logicsRes] = await Promise.all([
        supabase.from('whatsapp_devices').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('whatsapp_logic_configs').select('id, name').eq('restaurant_id', restaurantId).eq('is_active', true),
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
      const { error } = await supabase.from('whatsapp_devices').insert({
        restaurant_id: restaurantId,
        name: newDeviceName.trim(),
        connection_status: 'disconnected',
      });

      if (error) throw error;

      toast.success("Dispositivo adicionado!");
      setNewDeviceName("");
      setAddDialogOpen(false);
      loadData();
      onRefresh();
    } catch (error) {
      console.error('Erro ao adicionar dispositivo:', error);
      toast.error("Erro ao adicionar dispositivo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Tem certeza que deseja remover este dispositivo?")) return;

    try {
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

  const handleUpdateDevice = async (deviceId: string, updates: Partial<Device>) => {
    try {
      const { error } = await supabase.from('whatsapp_devices').update(updates).eq('id', deviceId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar dispositivo:', error);
      toast.error("Erro ao atualizar dispositivo");
    }
  };

  const handleConnectDevice = async (device: Device) => {
    setSelectedDevice(device);
    setQrDialogOpen(true);

    // Simular geração de QR Code (em produção, isso viria do servidor WhatsApp)
    try {
      await supabase.from('whatsapp_devices').update({
        connection_status: 'qr_ready',
        qr_code: `QR_${device.id}_${Date.now()}`, // Placeholder - em produção viria do servidor
      }).eq('id', device.id);

      toast.info("Escaneie o QR Code no seu WhatsApp");
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error("Erro ao gerar QR Code");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">Conectado</Badge>;
      case 'qr_ready':
        return <Badge className="bg-yellow-500">Aguardando QR</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-500">Conectando...</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dispositivos WhatsApp</h2>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Dispositivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Dispositivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="device-name">Nome do Dispositivo</Label>
                <Input
                  id="device-name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Ex: WhatsApp Principal"
                />
              </div>
              <Button onClick={handleAddDevice} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card className="p-12 text-center">
          <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo</h3>
          <p className="text-muted-foreground mb-4">
            Adicione um dispositivo para começar a usar o WhatsApp Bot
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Dispositivo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${device.connection_status === 'connected' ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                    {device.connection_status === 'connected' ? (
                      <Wifi className="h-5 w-5 text-green-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{device.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {device.phone_number || 'Não conectado'}
                    </p>
                  </div>
                </div>
                {getStatusBadge(device.connection_status)}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Lógica Ativa</Label>
                  <Select
                    value={device.active_logic_id || 'none'}
                    onValueChange={(value) => handleUpdateDevice(device.id, { 
                      active_logic_id: value === 'none' ? null : value 
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione uma lógica" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {logics.map((logic) => (
                        <SelectItem key={logic.id} value={logic.id}>
                          {logic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Transcrever Áudios</Label>
                  <Switch
                    checked={device.should_transcribe}
                    onCheckedChange={(checked) => handleUpdateDevice(device.id, { should_transcribe: checked })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {device.connection_status !== 'connected' ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleConnectDevice(device)}>
                    <QrCode className="h-4 w-4 mr-1" />
                    Conectar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => loadData()}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Atualizar
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleDeleteDevice(device.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar {selectedDevice?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
              {selectedDevice?.qr_code ? (
                <div className="text-center">
                  <QrCode className="h-32 w-32 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Escaneie com o WhatsApp
                  </p>
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Instruções:</p>
              <ol className="text-xs text-muted-foreground text-left mt-2 space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em Configurações → Dispositivos conectados</li>
                <li>3. Toque em "Conectar um dispositivo"</li>
                <li>4. Escaneie este QR Code</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}