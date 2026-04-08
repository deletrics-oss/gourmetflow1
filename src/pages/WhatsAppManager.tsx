import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Loader2, Smartphone, MessageCircle, Workflow, Send, Server, QrCode, Clock, Bell, ExternalLink } from "lucide-react";
import { ChatInterface } from "@/components/whatsapp/ChatInterface";
import { LogicEditor } from "@/components/whatsapp/LogicEditor";
import { BroadcastPanel } from "@/components/whatsapp/BroadcastPanel";
import { RemindersManager } from "@/components/whatsapp/RemindersManager";
import { OwnerAlertsConfig } from "@/components/whatsapp/OwnerAlertsConfig";
import { EvolutionManager } from "@/components/whatsapp/EvolutionManager";
import { Button } from "@/components/ui/button";

export default function WhatsAppManager() {
  const { restaurantId, loading: restaurantLoading } = useRestaurant();
  const [stats, setStats] = useState({
    totalDevices: 0,
    connectedDevices: 0,
    totalConversations: 0,
    unreadMessages: 0,
    totalMessagesToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurantId) {
      loadStats();
    }
  }, [restaurantId]);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [devicesRes, conversationsRes, messagesRes] = await Promise.all([
        supabase.from('whatsapp_devices').select('connection_status').eq('restaurant_id', restaurantId),
        supabase.from('whatsapp_conversations').select('unread_count').eq('restaurant_id', restaurantId),
        supabase.from('whatsapp_messages').select('id').eq('restaurant_id', restaurantId).gte('created_at', today),
      ]);

      const devices = devicesRes.data || [];
      const conversations = conversationsRes.data || [];
      const messages = messagesRes.data || [];

      setStats({
        totalDevices: devices.length,
        connectedDevices: devices.filter(d => d.connection_status === 'connected').length,
        totalConversations: conversations.length,
        unreadMessages: conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
        totalMessagesToday: messages.length,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (restaurantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-green-500" />
            WhatsApp Manager
          </h1>
          <p className="text-muted-foreground">
            Gerencie dispositivos, conversas e automações do WhatsApp
          </p>
        </div>
      </div>

      {/* Banner Explicativo foi removido conforme solicitado para focar na Evolution API */}

      {/* QR Code Placeholder Visual */}
      {stats.totalDevices === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">QR Code aparecerá aqui</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Nenhum dispositivo conectado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure o servidor externo e adicione um dispositivo para ver o QR Code
              </p>
            </div>
            <Button onClick={() => { }} className="gap-2 bg-green-600 hover:bg-green-700">
              <Smartphone className="h-4 w-4" />
              Adicionar Dispositivo
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Smartphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalDevices}</p>
              <p className="text-xs text-muted-foreground">Dispositivos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Badge variant="default" className="bg-green-500">{stats.connectedDevices}</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.connectedDevices}</p>
              <p className="text-xs text-muted-foreground">Conectados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Badge variant="destructive">{stats.unreadMessages}</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.unreadMessages}</p>
              <p className="text-xs text-muted-foreground">Não lidas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
              <Send className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMessagesToday}</p>
              <p className="text-xs text-muted-foreground">Msgs Hoje</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Dispositivos</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="logic" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Lógicas</span>
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Broadcast</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Lembretes</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <EvolutionManager restaurantId={restaurantId!} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatInterface restaurantId={restaurantId!} />
        </TabsContent>

        <TabsContent value="logic">
          <LogicEditor restaurantId={restaurantId!} />
        </TabsContent>

        <TabsContent value="broadcast">
          <BroadcastPanel restaurantId={restaurantId!} />
        </TabsContent>

        <TabsContent value="reminders">
          <RemindersManager restaurantId={restaurantId!} />
        </TabsContent>

        <TabsContent value="alerts">
          <OwnerAlertsConfig restaurantId={restaurantId!} />
        </TabsContent>


      </Tabs>
    </div>
  );
}
