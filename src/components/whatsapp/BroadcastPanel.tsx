import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Send, Loader2, Users, CheckCircle, XCircle, Clock, FileText } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  selected: boolean;
}

interface Device {
  id: string;
  name: string;
  connection_status: string;
}

interface BroadcastHistory {
  id: string;
  message: string;
  total_sent: number;
  total_failed: number;
  created_at: string;
}

interface Props {
  restaurantId: string;
}

export function BroadcastPanel({ restaurantId }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [customersRes, devicesRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('whatsapp_devices').select('id, name, connection_status').eq('restaurant_id', restaurantId),
      ]);

      if (customersRes.data) {
        setCustomers(customersRes.data.map(c => ({ ...c, selected: false })));
      }
      if (devicesRes.data) {
        setDevices(devicesRes.data);
        const connectedDevice = devicesRes.data.find(d => d.connection_status === 'connected');
        if (connectedDevice) {
          setSelectedDeviceId(connectedDevice.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setCustomers(customers.map(c => ({ ...c, selected: checked })));
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    setCustomers(customers.map(c => 
      c.id === customerId ? { ...c, selected: checked } : c
    ));
    setSelectAll(false);
  };

  const handleSendBroadcast = async () => {
    const selectedCustomers = customers.filter(c => c.selected);
    
    if (selectedCustomers.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }
    if (!selectedDeviceId) {
      toast.error("Selecione um dispositivo");
      return;
    }

    const device = devices.find(d => d.id === selectedDeviceId);
    if (device?.connection_status !== 'connected') {
      toast.error("O dispositivo selecionado não está conectado");
      return;
    }

    setSending(true);
    setSendProgress({ sent: 0, failed: 0, total: selectedCustomers.length });

    let sent = 0;
    let failed = 0;

    for (const customer of selectedCustomers) {
      try {
        const { error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            phone: customer.phone,
            message: message.trim(),
            deviceId: selectedDeviceId,
          },
        });

        if (error) throw error;
        sent++;
      } catch (error) {
        console.error(`Erro ao enviar para ${customer.phone}:`, error);
        failed++;
      }

      setSendProgress({ sent, failed, total: selectedCustomers.length });
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSending(false);

    if (failed === 0) {
      toast.success(`${sent} mensagens enviadas com sucesso!`);
    } else {
      toast.warning(`${sent} enviadas, ${failed} falharam`);
    }

    // Reset selection
    setMessage("");
    setCustomers(customers.map(c => ({ ...c, selected: false })));
    setSelectAll(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const selectedCount = customers.filter(c => c.selected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Customer Selection */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Clientes
          </h3>
          <Badge variant="outline">{selectedCount} selecionados</Badge>
        </div>

        <Input
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            Selecionar todos ({filteredCustomers.length})
          </Label>
        </div>

        <ScrollArea className="h-[400px]">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    customer.selected ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <Checkbox
                    checked={customer.selected}
                    onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Message Composer */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Compor Mensagem
        </h3>

        <div>
          <Label>Dispositivo</Label>
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um dispositivo" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id} disabled={device.connection_status !== 'connected'}>
                  <div className="flex items-center gap-2">
                    {device.name}
                    {device.connection_status === 'connected' ? (
                      <Badge className="bg-green-500 text-xs">Online</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Offline</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length} caracteres
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer" onClick={() => setMessage(m => m + '{nome}')}>
              {'{nome}'}
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setMessage(m => m + '{telefone}')}>
              {'{telefone}'}
            </Badge>
          </div>
        </div>

        {sending && (
          <Card className="p-4 bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Enviando...</span>
              <span className="text-sm text-muted-foreground">
                {sendProgress.sent + sendProgress.failed} / {sendProgress.total}
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {sendProgress.sent} enviadas
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                {sendProgress.failed} falharam
              </span>
            </div>
          </Card>
        )}

        <Button
          onClick={handleSendBroadcast}
          disabled={sending || selectedCount === 0 || !message.trim()}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar para {selectedCount} cliente{selectedCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}