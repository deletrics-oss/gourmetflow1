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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Send, Loader2, Users, CheckCircle, XCircle, Clock, FileText, Image, Play, Pause, RotateCcw, Calendar, Plus, Sparkles, Upload, Link } from "lucide-react";

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

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface Broadcast {
  id: string;
  name: string;
  message: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface Props {
  restaurantId: string;
}

export function BroadcastPanel({ restaurantId }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [broadcastName, setBroadcastName] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video" | "url">("none");
  const [delaySeconds, setDelaySeconds] = useState(20);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [includeGroups, setIncludeGroups] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [activeTab, setActiveTab] = useState("compose");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    loadData();
    
    // Subscribe to broadcast updates
    const channel = supabase
      .channel('broadcasts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_broadcasts',
        filter: `restaurant_id=eq.${restaurantId}`
      }, () => {
        loadBroadcasts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [customersRes, devicesRes, templatesRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('whatsapp_devices').select('id, name, connection_status').eq('restaurant_id', restaurantId),
        supabase.from('whatsapp_templates').select('*').eq('restaurant_id', restaurantId).eq('category', 'broadcast'),
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
      if (templatesRes.data) {
        setTemplates(templatesRes.data);
      }

      await loadBroadcasts();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBroadcasts = async () => {
    const { data } = await supabase
      .from('whatsapp_broadcasts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setBroadcasts(data);
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

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !message.trim()) {
      toast.error("Preencha o nome e a mensagem");
      return;
    }

    try {
      await supabase.from('whatsapp_templates').insert({
        restaurant_id: restaurantId,
        name: newTemplateName,
        content: message,
        category: 'broadcast',
      });

      toast.success("Template salvo!");
      setNewTemplateName("");
      setTemplateDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar template");
    }
  };

  const handleLoadTemplate = (template: Template) => {
    setMessage(template.content);
    toast.success(`Template "${template.name}" carregado`);
  };

  const handleCreateBroadcast = async () => {
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
    if (!broadcastName.trim()) {
      toast.error("Digite um nome para o disparo");
      return;
    }

    const device = devices.find(d => d.id === selectedDeviceId);
    if (device?.connection_status !== 'connected') {
      toast.error("O dispositivo selecionado não está conectado");
      return;
    }

    setSending(true);

    try {
      // Create broadcast record
      const { data: broadcast, error: broadcastError } = await supabase
        .from('whatsapp_broadcasts')
        .insert({
          restaurant_id: restaurantId,
          device_id: selectedDeviceId,
          name: broadcastName,
          message: message.trim(),
          media_urls: mediaUrl ? [{ url: mediaUrl, type: mediaType }] : [],
          status: scheduledFor ? 'scheduled' : 'running',
          total_contacts: selectedCustomers.length,
          delay_seconds: delaySeconds,
          scheduled_for: scheduledFor || null,
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      // Create contact records
      const contactsToInsert = selectedCustomers.map(c => ({
        broadcast_id: broadcast.id,
        phone: c.phone,
        name: c.name,
        status: 'pending',
      }));

      await supabase.from('whatsapp_broadcast_contacts').insert(contactsToInsert);

      // If not scheduled, start the broadcast queue
      if (!scheduledFor) {
        await supabase.functions.invoke('whatsapp-broadcast-queue', {
          body: { broadcastId: broadcast.id, action: 'start' }
        });
      }

      toast.success(scheduledFor 
        ? "Disparo agendado com sucesso!" 
        : "Disparo iniciado! Acompanhe o progresso na aba Histórico."
      );

      // Reset form
      setMessage("");
      setBroadcastName("");
      setMediaUrl("");
      setMediaType("none");
      setScheduledFor("");
      setCustomers(customers.map(c => ({ ...c, selected: false })));
      setSelectAll(false);
      setActiveTab("history");
    } catch (error) {
      console.error('Erro ao criar disparo:', error);
      toast.error("Erro ao criar disparo");
    } finally {
      setSending(false);
    }
  };

  const handlePauseBroadcast = async (broadcastId: string) => {
    try {
      await supabase.from('whatsapp_broadcasts').update({ status: 'paused' }).eq('id', broadcastId);
      toast.success("Disparo pausado");
    } catch (error) {
      toast.error("Erro ao pausar");
    }
  };

  const handleResumeBroadcast = async (broadcastId: string) => {
    try {
      await supabase.from('whatsapp_broadcasts').update({ status: 'running' }).eq('id', broadcastId);
      await supabase.functions.invoke('whatsapp-broadcast-queue', {
        body: { broadcastId, action: 'start' }
      });
      toast.success("Disparo retomado");
    } catch (error) {
      toast.error("Erro ao retomar");
    }
  };

  const handleGenerateAI = async () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem base para melhorar");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-order', {
        body: { 
          action: 'generate_broadcast',
          baseMessage: message,
          restaurantId 
        }
      });

      if (error) throw error;
      if (data?.message) {
        setMessage(data.message);
        toast.success("Mensagem aprimorada com IA!");
      }
    } catch (error) {
      toast.error("Erro ao gerar com IA");
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const selectedCount = customers.filter(c => c.selected).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500">Enviando</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Pausado</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-500">Agendado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="compose">📝 Compor</TabsTrigger>
        <TabsTrigger value="templates">📋 Templates</TabsTrigger>
        <TabsTrigger value="history">📊 Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="compose">
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

            <div className="flex items-center gap-4 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Selecionar todos ({filteredCustomers.length})
                </Label>
              </div>
            </div>

            <ScrollArea className="h-[350px]">
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
              <Label>Nome do Disparo</Label>
              <Input
                value={broadcastName}
                onChange={(e) => setBroadcastName(e.target.value)}
                placeholder="Ex: Promoção de Natal"
              />
            </div>

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
              <div className="flex items-center justify-between mb-2">
                <Label>Mensagem</Label>
                <Button variant="ghost" size="sm" onClick={handleGenerateAI}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Melhorar com IA
                </Button>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length} caracteres
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {['{nome}', '{telefone}', '{cashback}', '{pontos}', '{restaurante}'].map(v => (
                  <Badge 
                    key={v}
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10" 
                    onClick={() => setMessage(m => m + v)}
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Mídia (opcional)</Label>
              <div className="flex gap-2 mt-1">
                <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
                {mediaType !== 'none' && (
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="Cole a URL da mídia..."
                    className="flex-1"
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Delay entre mensagens: {delaySeconds}s</Label>
              <Slider
                value={[delaySeconds]}
                onValueChange={(v) => setDelaySeconds(v[0])}
                min={10}
                max={120}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Intervalo entre cada envio para evitar bloqueio
              </p>
            </div>

            <div>
              <Label>Agendar (opcional)</Label>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!message.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Salvar Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salvar como Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Template</Label>
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Ex: Boas-vindas"
                      />
                    </div>
                    <Button onClick={handleSaveTemplate} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleCreateBroadcast}
                disabled={sending || selectedCount === 0 || !message.trim() || !broadcastName.trim()}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : scheduledFor ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendar
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para {selectedCount}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="templates">
        <Card className="p-4">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum template</h3>
              <p className="text-muted-foreground text-sm">
                Crie uma mensagem na aba Compor e salve como template
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <h4 className="font-semibold mb-2">{template.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {template.content}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleLoadTemplate(template)}>
                    Usar Template
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card className="p-4">
          {broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum disparo</h3>
              <p className="text-muted-foreground text-sm">
                Seus disparos aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <Card key={broadcast.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{broadcast.name}</h4>
                      {getStatusBadge(broadcast.status)}
                    </div>
                    <div className="flex gap-2">
                      {broadcast.status === 'running' && (
                        <Button variant="outline" size="sm" onClick={() => handlePauseBroadcast(broadcast.id)}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {broadcast.status === 'paused' && (
                        <Button variant="outline" size="sm" onClick={() => handleResumeBroadcast(broadcast.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {broadcast.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {broadcast.total_contacts} contatos
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {broadcast.sent_count} enviadas
                    </span>
                    {broadcast.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {broadcast.failed_count} falharam
                      </span>
                    )}
                  </div>

                  {broadcast.status === 'running' && (
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${((broadcast.sent_count + broadcast.failed_count) / broadcast.total_contacts) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
