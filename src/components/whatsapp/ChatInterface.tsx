import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle, User, Bot, Pause, Play, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  is_paused: boolean;
  unread_count: number;
  last_message_at: string | null;
}

interface Message {
  id: string;
  message_content: string;
  remetente: string;
  direction: string;
  is_from_bot: boolean;
  created_at: string;
}

interface Props {
  restaurantId: string;
}

export function ChatInterface({ restaurantId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('whatsapp-messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
      }, (payload) => {
        if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      loadConversations();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      // Save message to database
      const { error } = await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConversation.id,
        restaurant_id: restaurantId,
        phone_number: selectedConversation.contact_phone,
        message_content: newMessage.trim(),
        remetente: 'sistema',
        direction: 'outgoing',
        is_from_bot: false,
      });

      if (error) throw error;

      // Call edge function to send via WhatsApp
      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          phone: selectedConversation.contact_phone,
          message: newMessage.trim(),
        },
      });

      if (sendError) {
        console.warn('Erro ao enviar via WhatsApp:', sendError);
        toast.warning("Mensagem salva, mas não enviada via WhatsApp");
      } else {
        toast.success("Mensagem enviada!");
      }

      setNewMessage("");
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleTogglePause = async (conversation: Conversation) => {
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ is_paused: !conversation.is_paused })
        .eq('id', conversation.id);

      if (error) throw error;
      
      toast.success(conversation.is_paused ? "Bot reativado" : "Bot pausado para esta conversa");
      loadConversations();
    } catch (error) {
      console.error('Erro ao pausar conversa:', error);
      toast.error("Erro ao alterar status do bot");
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="md:col-span-1 flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {conversation.contact_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {conversation.contact_name || conversation.contact_phone}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.contact_phone}
                      </p>
                    </div>
                    {conversation.is_paused && (
                      <Pause className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedConversation.contact_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedConversation.contact_name || selectedConversation.contact_phone}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedConversation.contact_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Bot</span>
                <Switch
                  checked={!selectedConversation.is_paused}
                  onCheckedChange={() => handleTogglePause(selectedConversation)}
                />
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      message.direction === 'outgoing'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {message.is_from_bot && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="h-3 w-3" />
                          <span className="text-xs opacity-70">Bot</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                      <p className={`text-xs mt-1 ${
                        message.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending}
                />
                <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}