import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle, Bot, Pause, Search, Mic, Square, RefreshCw, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_profile_pic?: string | null;
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
  media_url?: string | null;
  media_type?: string | null;
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

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [autoTranscribe, setAutoTranscribe] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    // Scroll to bottom with a small delay for DOM updates
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages.length]);

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
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation({ ...conversation, is_paused: !conversation.is_paused });
      }
    } catch (error) {
      console.error('Erro ao pausar conversa:', error);
      toast.error("Erro ao alterar status do bot");
    }
  };

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Gravando áudio...");
    } catch (error) {
      toast.error("Erro ao acessar microfone");
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Áudio gravado!");

      // Auto-transcribe if enabled
      if (autoTranscribe && audioChunksRef.current.length > 0) {
        await transcribeAudio();
      }
    }
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsTranscribing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: {
              audioData: base64Audio,
              mimeType: 'audio/webm'
            }
          });

          if (error) throw error;

          if (data?.text) {
            setNewMessage(data.text);
            toast.success("Áudio transcrito!", { description: "Texto inserido no campo de mensagem" });
          }
        } catch (err) {
          console.error('Transcription error:', err);
          toast.error("Erro ao transcrever áudio");
        }
        setIsTranscribing(false);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      toast.error("Erro ao processar áudio");
      setIsTranscribing(false);
    }
  };

  const syncAvatar = async (conversationId: string) => {
    try {
      await supabase.functions.invoke('whatsapp-sync-avatar', {
        body: { conversationId }
      });
      toast.success("Avatar sincronizado!");
      loadConversations();
    } catch (error) {
      toast.error("Erro ao sincronizar avatar");
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_phone.includes(searchTerm)
  );

  // Render media content
  const renderMedia = (message: Message) => {
    if (!message.media_url) return null;

    const isImage = message.media_type?.startsWith('image/') || message.media_url.match(/\.(jpeg|jpg|gif|png)$/i);
    const isAudio = message.media_type?.startsWith('audio/') || message.media_url.match(/\.(mp3|wav|ogg|m4a)$/i);
    const isVideo = message.media_type?.startsWith('video/') || message.media_url.match(/\.(mp4|webm)$/i);

    if (isImage) {
      return (
        <div className="mb-2 overflow-hidden rounded-lg">
          <img
            src={message.media_url}
            alt="Mídia"
            className="w-full h-auto object-contain cursor-pointer max-h-[250px]"
            onClick={() => window.open(message.media_url!, '_blank')}
          />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="mb-2">
          <audio controls className="w-full h-8">
            <source src={message.media_url} type={message.media_type || 'audio/mpeg'} />
          </audio>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mb-2 overflow-hidden rounded-lg">
          <video controls className="w-full max-h-[200px]">
            <source src={message.media_url} type={message.media_type || 'video/mp4'} />
          </video>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-20rem)] min-h-[500px]">
      {/* Conversations List */}
      <Card className="w-full md:w-96 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Conversas</h2>
            <Button variant="ghost" size="icon" onClick={loadConversations} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
              <p className="text-xs text-muted-foreground mt-1">Conecte um dispositivo WhatsApp para começar</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.contact_profile_pic || undefined} />
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
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.contact_phone}
                        </p>
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    {conversation.is_paused && (
                      <Pause className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedConversation.contact_profile_pic || undefined} />
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-transcribe"
                    checked={autoTranscribe}
                    onCheckedChange={setAutoTranscribe}
                    disabled={isTranscribing}
                  />
                  <Label htmlFor="auto-transcribe" className="text-xs text-muted-foreground">
                    {isTranscribing ? "Transcrevendo..." : "Transcrever"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Bot</span>
                  <Switch
                    checked={!selectedConversation.is_paused}
                    onCheckedChange={() => handleTogglePause(selectedConversation)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => syncAvatar(selectedConversation.id)}
                  title="Sincronizar Avatar"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
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
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.direction === 'outgoing'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      }`}>
                      {message.is_from_bot && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="h-3 w-3" />
                          <span className="text-xs opacity-70">Bot</span>
                        </div>
                      )}
                      {renderMedia(message)}
                      <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                      <p className={`text-xs mt-1 ${message.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newMessage.trim()) handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={isRecording ? "animate-pulse" : ""}
                  disabled={isTranscribing}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending || isTranscribing}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm text-muted-foreground">Escolha uma conversa à esquerda para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}