import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Loader2, Smartphone, MessageCircle, Workflow, Send, AlertCircle, ExternalLink, Server, QrCode } from "lucide-react";
import { DevicesManager } from "@/components/whatsapp/DevicesManager";
import { ChatInterface } from "@/components/whatsapp/ChatInterface";
import { LogicEditor } from "@/components/whatsapp/LogicEditor";
import { BroadcastPanel } from "@/components/whatsapp/BroadcastPanel";
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

      {/* Banner Explicativo - Servidor Externo */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Server className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          🤖 Configuração do WhatsApp Bot
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 space-y-4">
          <p>
            O WhatsApp Bot requer um <strong>servidor externo</strong> para funcionar. 
            Escolha uma das opções abaixo:
          </p>
          
          {/* Option 1: Evolution API */}
          <div className="bg-white dark:bg-amber-900/50 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">RECOMENDADO</span>
              Evolution API (Mais Fácil)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm mb-3">
              <li>Acesse <a href="https://evolution-api.com" target="_blank" className="underline">evolution-api.com</a></li>
              <li>Crie uma conta e obtenha sua instância</li>
              <li>Configure a URL do webhook: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">{`${window.location.origin}/functions/v1/whatsapp-webhook`}</code></li>
              <li>Adicione a API Key nas configurações do restaurante</li>
            </ol>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="https://doc.evolution-api.com/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Documentação Evolution API
              </a>
            </Button>
          </div>
          
          {/* Option 2: Self-hosted */}
          <div className="bg-white dark:bg-amber-900/50 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-semibold mb-2">🖥️ Servidor Próprio (Avançado)</p>
            <ol className="list-decimal list-inside space-y-1 text-sm mb-3">
              <li>Clone o servidor: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">git clone github.com/seu-repo/whatsapp-server</code></li>
              <li>Instale dependências: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">npm install</code></li>
              <li>Configure variáveis de ambiente (SUPABASE_URL, SUPABASE_KEY)</li>
              <li>Deploy em VPS (DigitalOcean, Railway, Render)</li>
              <li>Aponte o webhook para sua URL do servidor</li>
            </ol>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="https://wwebjs.dev/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  whatsapp-web.js
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="/WHATSAPP_SERVER_GUIDE.md" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Guia Completo
                </a>
              </Button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1 text-sm">🔗 URL do Webhook (copie para seu servidor):</p>
            <code className="text-xs break-all bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded block">
              {`${window.location.origin.replace('localhost:8080', 'yzvcpfcmfutczrlporjp.supabase.co')}/functions/v1/whatsapp-webhook`}
            </code>
          </div>
        </AlertDescription>
      </Alert>

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
            <Button onClick={() => {}} className="gap-2 bg-green-600 hover:bg-green-700">
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
