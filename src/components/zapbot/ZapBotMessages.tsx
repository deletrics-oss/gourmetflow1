import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Bot, Loader2, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ZapBotMessages() {
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Mensagens WhatsApp
          <Badge variant="secondary" className="ml-auto">
            {messages?.length || 0} mensagens
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  msg.remetente === "usuário"
                    ? "bg-muted/30"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    msg.remetente === "usuário"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {msg.remetente === "usuário" ? (
                    <Phone className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {msg.remetente === "usuário" ? msg.phone_number : "Assistente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.received_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message_content}</p>
                  {msg.processado && (
                    <Badge variant="outline" className="text-xs">
                      Processado
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {messages?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma mensagem ainda</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
