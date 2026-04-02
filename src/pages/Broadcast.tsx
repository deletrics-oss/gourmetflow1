"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Send, Users, Sparkles, CheckCircle, XCircle, Clock, Play, Pause, Trash2, Copy, Search, Edit, LayoutTemplate, MessageSquarePlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useRestaurant } from "@/hooks/useRestaurant";

interface Contact {
    id: string;
    name: string;
    number: string;
    isGroup: boolean;
}

export default function BroadcastPage() {
    const [searchParams] = useSearchParams();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<string>("");
    const [broadcastName, setBroadcastName] = useState("");
    const [message, setMessage] = useState("");
    const [aiPrompt, setAIPrompt] = useState("");
    const [aiContext, setAiContext] = useState("");
    const [mediaType, setMediaType] = useState<"none" | "image" | "video">("none");
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [currentInputUrl, setCurrentInputUrl] = useState("");
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [delay, setDelay] = useState(30);
    const [searchTerm, setSearchTerm] = useState("");
    const [includeGroups, setIncludeGroups] = useState(false);
    const [onlyRegisteredClients, setOnlyRegisteredClients] = useState(false);
    const [scheduledFor, setScheduledFor] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { restaurantId } = useRestaurant();

    // Mass Actions State
    const [selectedBroadcasts, setSelectedBroadcasts] = useState<string[]>([]);

    const { data: devices } = useQuery<any[]>({
        queryKey: ['/api/devices', restaurantId],
        queryFn: () => apiRequest('GET', '/api/devices', undefined, { headers: { 'x-restaurant-id': restaurantId || '' } }),
        enabled: !!restaurantId,
    });

    useEffect(() => {
        if (devices && devices.length > 0 && !selectedDevice) {
            const connected = devices.find((d: any) => d.connectionStatus === 'connected');
            setSelectedDevice(connected ? connected.id : devices[0].id);
        }
    }, [devices, selectedDevice]);

    const { data: broadcasts, isLoading: loadingBroadcasts } = useQuery<any[]>({
        queryKey: ['/api/broadcasts', restaurantId],
        queryFn: () => apiRequest('GET', '/api/broadcasts', undefined, { headers: { 'x-restaurant-id': restaurantId || '' } }),
        refetchInterval: 5000,
        enabled: !!restaurantId,
    });

    const { data: contacts, isLoading: loadingContacts } = useQuery<Contact[]>({
        queryKey: ['/api/contacts', includeGroups, onlyRegisteredClients, selectedDevice, restaurantId],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/contacts?limit=1000&includeGroups=${includeGroups}`, undefined, { headers: { 'x-restaurant-id': restaurantId || '' } });
            return (res.contacts || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                number: c.phone,
                isGroup: c.isGroup
            }));
        },
        enabled: !!selectedDevice && !!restaurantId,
    });

    const generateAIMutation = useMutation({
        mutationFn: async (prompt: string) => {
            return await apiRequest("POST", "/api/ai/generate-broadcast", { prompt, context: aiContext, restaurantId }, { headers: { 'x-restaurant-id': restaurantId || '' } });
        },
        onSuccess: (data: any) => {
            setMessage(data.message);
            setIsAIDialogOpen(false);
            toast({ title: "Mensagem gerada com sucesso! ✨" });
        },
    });

    const createBroadcastMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest("POST", "/api/broadcasts", { ...data, restaurantId }, { headers: { 'x-restaurant-id': restaurantId || '' } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            setIsCreateDialogOpen(false);
            resetForm();
            toast({ title: "Disparo criado!", description: "Pronto para iniciar o envio" });
        },
    });

    const startBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("POST", `/api/broadcasts/${id}/start`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            toast({ title: "Disparo iniciado!" });
        },
    });

    const pauseBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("POST", `/api/broadcasts/${id}/pause`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            toast({ title: "Disparo pausado" });
        },
    });

    const deleteBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/broadcasts/${id}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            toast({ title: "Disparo removido" });
        },
    });

    const resetForm = () => {
        setBroadcastName("");
        setMessage("");
        setSelectedContacts([]);
        setSelectAll(false);
        setMediaType("none");
        setMediaUrls([]);
        setScheduledFor("");
    };

    const handleCreateBroadcast = () => {
        if (!broadcastName || !selectedDevice || !message || selectedContacts.length === 0) {
            toast({ title: "Dados incompletos", description: "Preencha todos os campos", variant: "destructive" });
            return;
        }

        const contactsPayload = selectedContacts.map(number => {
            const c = contacts?.find(ct => ct.number === number);
            return { phone: number, name: c?.name || number };
        });

        createBroadcastMutation.mutate({
            name: broadcastName,
            deviceId: selectedDevice,
            message,
            contacts: contactsPayload,
            delay,
            scheduledFor,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
        });
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'running': return { icon: <Play className="w-4 h-4" />, label: "Enviando", color: "text-blue-500", bg: "bg-blue-500/10" };
            case 'completed': return { icon: <CheckCircle className="w-4 h-4" />, label: "Concluído", color: "text-green-500", bg: "bg-green-500/10" };
            case 'paused': return { icon: <Pause className="w-4 h-4" />, label: "Pausado", color: "text-yellow-500", bg: "bg-yellow-500/10" };
            case 'failed': return { icon: <XCircle className="w-4 h-4" />, label: "Erro", color: "text-red-500", bg: "bg-red-500/10" };
            default: return { icon: <Clock className="w-4 h-4" />, label: "Aguardando", color: "text-gray-500", bg: "bg-gray-500/10" };
        }
    };

    const filteredContacts = contacts?.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.number.includes(searchTerm)
    );

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Disparo Premium
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Campanhas de marketing e avisos em massa com inteligência artificial.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg">
                                <MessageSquarePlus className="w-5 h-5 mr-2" />
                                Novo Disparo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto premium-scrollbar">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Criar Nova Campanha</DialogTitle>
                                <DialogDescription>Configure os detalhes do seu disparo em massa.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Nome da Campanha</Label>
                                    <Input 
                                        placeholder="Ex: Promoção de Natal 2026" 
                                        value={broadcastName}
                                        onChange={e => setBroadcastName(e.target.value)}
                                        className="h-11"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Instância de Envio</Label>
                                        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Selecione o dispositivo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {devices?.map(d => (
                                                    <SelectItem key={d.id} value={d.id}>
                                                        {d.name} ({d.phoneNumber})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Intervalo (Segundos)</Label>
                                        <div className="pt-2">
                                            <Slider 
                                                value={[delay]} 
                                                onValueChange={v => setDelay(v[0])} 
                                                min={10} max={120} step={5} 
                                            />
                                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                                                <span>Rápido (10s)</span>
                                                <span className="font-bold text-primary">{delay}s</span>
                                                <span>Seguro (120s)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">Mensagem</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                            onClick={() => setIsAIDialogOpen(true)}
                                        >
                                            <Sparkles className="w-4 h-4 mr-1" />
                                            Gerar com IA
                                        </Button>
                                    </div>
                                    <Textarea 
                                        placeholder="Olá {nome}, temos uma novidade..." 
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        className="min-h-[120px] resize-none focus:ring-purple-500"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Use {"{nome}"} para personalizar com o nome do contato.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">Destinatários ({selectedContacts.length})</Label>
                                        <div className="relative w-48">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="Buscar..." 
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="pl-8 h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-xl p-0 overflow-hidden bg-muted/5">
                                        <div className="flex items-center gap-2 p-3 bg-muted/20 border-b">
                                            <Checkbox 
                                                checked={selectAll} 
                                                onCheckedChange={(v) => {
                                                    setSelectAll(!!v);
                                                    if (v && filteredContacts) {
                                                        setSelectedContacts(filteredContacts.map(c => c.number));
                                                    } else {
                                                        setSelectedContacts([]);
                                                    }
                                                }}
                                            />
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Todos</span>
                                        </div>
                                        <div className="h-48 overflow-y-auto px-1 py-1 premium-scrollbar">
                                            {loadingContacts ? (
                                                <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
                                            ) : filteredContacts?.map(c => (
                                                <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-lg transition-colors group">
                                                    <Checkbox 
                                                        checked={selectedContacts.includes(c.number)}
                                                        onCheckedChange={(v) => {
                                                            if (v) setSelectedContacts(prev => [...prev, c.number]);
                                                            else setSelectedContacts(prev => prev.filter(n => n !== c.number));
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{c.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{c.number}</p>
                                                    </div>
                                                    {c.isGroup && <Badge variant="outline" className="text-[9px]">Grupo</Badge>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="bg-muted/10 -mx-6 -mb-6 p-6 border-t">
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                                <Button 
                                    onClick={handleCreateBroadcast}
                                    disabled={createBroadcastMutation.isPending}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {createBroadcastMutation.isPending ? "Criando..." : "Finalizar e Criar"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingBroadcasts ? (
                    [1, 2, 3].map(i => <Card key={i}><CardContent className="h-48"><Skeleton className="h-full w-full" /></CardContent></Card>)
                ) : broadcasts?.map(b => {
                    const info = getStatusInfo(b.status);
                    const progress = b.totalContacts > 0 ? (b.sentCount / b.totalContacts) * 100 : 0;
                    
                    return (
                        <Card key={b.id} className="group hover:shadow-xl transition-all duration-300 border-muted/40 overflow-hidden">
                            <div className={cn("h-1.5 w-full", b.status === 'running' ? "bg-blue-500 animate-pulse" : info.color.replace('text', 'bg'))} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className={cn("flex items-center gap-1.5", info.color, info.bg, "border-transparent px-2 py-0.5")}>
                                        {info.icon} {info.label}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                                </div>
                                <CardTitle className="text-xl font-bold mt-3 group-hover:text-primary transition-colors">{b.name}</CardTitle>
                                <p className="text-xs text-muted-foreground line-clamp-1">{b.message}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-medium">
                                        <span>Progresso de Envio</span>
                                        <span>{b.sentCount} / {b.totalContacts}</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center py-2 bg-muted/20 rounded-xl">
                                    <div>
                                        <p className="text-lg font-black text-green-500">{b.sentCount}</p>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Sucesso</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-red-500">{b.failedCount}</p>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Falhas</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {b.status === 'pending' || b.status === 'paused' ? (
                                        <Button variant="default" size="sm" className="flex-1" onClick={() => startBroadcastMutation.mutate(b.id)}>
                                            <Play className="w-4 h-4 mr-2" /> Iniciar
                                        </Button>
                                    ) : b.status === 'running' ? (
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => pauseBroadcastMutation.mutate(b.id)}>
                                            <Pause className="w-4 h-4 mr-2" /> Pausar
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-red-50" onClick={() => deleteBroadcastMutation.mutate(b.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* AI Generator Dialog */}
            <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            Redator Inteligente
                        </DialogTitle>
                        <DialogDescription>Use a inteligência artificial para criar mensagens persuasivas.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase">Objetivo da Campanha</Label>
                            <Textarea 
                                placeholder="Ex: Aviso de feriado e promoção de pizza brotinho..."
                                value={aiPrompt}
                                onChange={e => setAIPrompt(e.target.value)}
                                className="h-24"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase">Contexto Extra (Preços, Datas)</Label>
                            <Textarea 
                                placeholder="Opcional. Ex: Válido apenas para hoje, 5 de Abril."
                                value={aiContext}
                                onChange={e => setAiContext(e.target.value)}
                                className="h-20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>Cancelar</Button>
                        <Button 
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => generateAIMutation.mutate(aiPrompt)}
                            disabled={generateAIMutation.isPending || !aiPrompt}
                        >
                            {generateAIMutation.isPending ? "Processando..." : "Gerar Mensagem ✨"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
