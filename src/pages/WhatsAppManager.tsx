import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Loader2, LayoutDashboard, Smartphone, MessageCircle, Workflow, Send } from "lucide-react";
import { DevicesManager } from "@/components/whatsapp/DevicesManager";
import { ChatInterface } from "@/components/whatsapp/ChatInterface";
import { LogicEditor } from "@/components/whatsapp/LogicEditor";
import { BroadcastPanel } from "@/components/whatsapp/BroadcastPanel";

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
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

        <TabsContent value="devices">
          <DevicesManager restaurantId={restaurantId!} onRefresh={loadStats} />
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
      </Tabs>
    </div>
  );
}