import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageCircle, Calendar, Settings } from "lucide-react";
import { ZapBotMessages } from "@/components/zapbot/ZapBotMessages";
import { ZapBotAppointments } from "@/components/zapbot/ZapBotAppointments";
import { ZapBotSettings } from "@/components/zapbot/ZapBotSettings";

export default function ZapBot() {
  const [activeTab, setActiveTab] = useState("messages");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Zap Bot</h1>
            <p className="text-muted-foreground">Assistente WhatsApp inteligente com IA</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Compromissos</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <ZapBotMessages />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <ZapBotAppointments />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <ZapBotSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
