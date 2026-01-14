"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { Send, Users, Sparkles, CheckCircle, XCircle, Clock, Play, Pause, Trash2, Copy, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTableActions } from "@/components/ui/data-table-actions";

interface Contact {
    id: string;
    name: string;
    number: string;
    isGroup: boolean;
}

export default function BroadcastPage() {
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
    const [delay, setDelay] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");
    const [includeGroups, setIncludeGroups] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(50);
    const [onlyRegisteredClients, setOnlyRegisteredClients] = useState(false);
    const [scheduledFor, setScheduledFor] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Mass Actions State
    const [selectedBroadcasts, setSelectedBroadcasts] = useState<string[]>([]);

    const { data: devices } = useQuery<any[]>({
        queryKey: ['/api/devices'],
        queryFn: () => fetch('/api/devices').then(r => r.json()),
    });

    // Auto-select first device available
    useEffect(() => {
        if (devices && devices.length > 0 && !selectedDevice) {
            // Prefer connected devices
            const connected = devices.find((d: any) => d.connectionStatus === 'connected');
            setSelectedDevice(connected ? connected.id : devices[0].id);
        }
    }, [devices, selectedDevice]);

    const { data: broadcasts, isLoading: loadingBroadcasts } = useQuery<any[]>({
        queryKey: ['/api/broadcasts'],
        queryFn: () => fetch('/api/broadcasts').then(r => r.json()),
        refetchInterval: 5000,
    });

    const { data: contacts, isLoading: loadingContacts } = useQuery<Contact[]>({
        queryKey: ['/api/contacts', includeGroups, onlyRegisteredClients],
        queryFn: async () => {
            if (onlyRegisteredClients) {
                const res = await fetch(`/api/clients?limit=1000`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    number: c.phone,
                    isGroup: false
                }));
            }
            // Use /api/contacts like Clientes page - works without deviceId
            const res = await fetch(`/api/contacts?limit=500`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.contacts || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                number: c.phone,
                isGroup: false
            }));
        },
        enabled: true,
    });

    const { data: templates } = useQuery<any[]>({
        queryKey: ['/api/templates'],
        queryFn: () => fetch('/api/templates').then(r => r.json()),
    });

    const createTemplateMutation = useMutation({
        mutationFn: async () => {
            return await apiRequest("POST", "/api/templates", {
                name: broadcastName || `Modelo ${new Date().toLocaleString()}`,
                content: message,
                category: "broadcast",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
            toast({ title: "Modelo salvo com sucesso!" });
        },
    });

    const generateAIMutation = useMutation({
        mutationFn: async (prompt: string) => {
            // apiRequest already returns parsed JSON, no need for .json()
            const data = await apiRequest("POST", "/api/ai/generate-broadcast", {
                prompt,
                context: aiContext
            });
            return data;
        },
        onSuccess: (data: any) => {
            setMessage(data.message);
            setIsAIDialogOpen(false);
            toast({ title: "Mensagem gerada!", description: "A IA criou sua mensagem com sucesso" });
        },
    });

    const createBroadcastMutation = useMutation({
        mutationFn: async (data: any) => {
            console.log("Sending broadcast data:", data);
            const response = await apiRequest("POST", "/api/broadcasts", data);
            console.log("Broadcast response:", response);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            setIsCreateDialogOpen(false);
            resetForm();
            toast({ title: "Disparo criado!", description: "Pronto para iniciar o envio" });
        },
        onError: (error: any) => {
            console.error('Broadcast creation error:', error);
            toast({
                title: "Erro ao criar disparo",
                description: error?.message || "Verifique o console para mais detalhes",
                variant: "destructive"
            });
        },
    });

    const startBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("POST", `/api/broadcasts/${id}/start`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            toast({ title: "Disparo iniciado!", description: "Mensagens sendo enviadas..." });
        },
    });

    const pauseBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("POST", `/api/broadcasts/${id}/pause`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
        },
    });

    const deleteBroadcastMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/broadcasts/${id}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            toast({ title: "Disparo excluído" });
        },
    });

    const massDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            await Promise.all(ids.map(id => apiRequest("DELETE", `/api/broadcasts/${id}`, {})));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/broadcasts'] });
            setSelectedBroadcasts([]);
            toast({ title: "Disparos excluídos com sucesso" });
        },
    });

    const resetForm = () => {
        setBroadcastName("");
        setMessage("");
        setSelectedDevice("");
        setSelectedContacts([]);
        setSelectAll(false);
        setMediaType("none");
        setMediaUrls([]);
        setCurrentInputUrl("");
        setScheduledFor("");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setMediaUrls(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
        if (e.target) e.target.value = '';
    };

    const handleAddUrl = () => {
        if (currentInputUrl) {
            setMediaUrls(prev => [...prev, currentInputUrl]);
            setCurrentInputUrl("");
        }
    };

    const handleRemoveMedia = (index: number) => {
        setMediaUrls(prev => prev.filter((_, i) => i !== index));
    };

    const filteredContacts = contacts?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.number.includes(searchTerm)
    );

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked && filteredContacts) {
            const newIds = filteredContacts.map(c => c.number);
            setSelectedContacts(prev => {
                const unique = new Set([...prev, ...newIds]);
                return Array.from(unique);
            });
        } else {
            if (searchTerm && filteredContacts) {
                const visibleIds = filteredContacts.map(c => c.number);
                setSelectedContacts(prev => prev.filter(id => !visibleIds.includes(id)));
            } else {
                setSelectedContacts([]);
            }
        }
    };

    const handleContactToggle = (phone: string, checked: boolean) => {
        if (checked) {
            setSelectedContacts(prev => {
                if (prev.includes(phone)) return prev;
                return [...prev, phone];
            });
        } else {
            setSelectedContacts(prev => prev.filter(p => p !== phone));
            setSelectAll(false);
        }
    };

    const handleCreateBroadcast = () => {
        if (!broadcastName || !selectedDevice || !message || selectedContacts.length === 0) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha todos os campos e selecione pelo menos um contato",
                variant: "destructive",
            });
            return;
        }

        // Transform selected contacts to proper format
        const contactsPayload = selectedContacts.map(phone => {
            const contact = contacts?.find(c => c.number === phone);
            return {
                number: phone,
                phone: phone,
                name: contact?.name || phone
            };
        });

        createBroadcastMutation.mutate({
            name: broadcastName,
            deviceId: selectedDevice,
            message,
            contacts: contactsPayload,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            delay,
            scheduledFor: scheduledFor || undefined
        });
    };

    const handleToggleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedBroadcasts(prev => [...prev, id]);
        } else {
            setSelectedBroadcasts(prev => prev.filter(i => i !== id));
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: any = {
            pending: { label: "Aguardando", variant: "secondary", icon: Clock },
            scheduled: { label: "Agendado", variant: "outline", icon: Clock },
            running: { label: "Enviando", variant: "default", icon: Send },
            paused: { label: "Pausado", variant: "secondary", icon: Pause },
            completed: { label: "Concluído", variant: "default", icon: CheckCircle },
            failed: { label: "Falhou", variant: "destructive", icon: XCircle },
        };
        return statusMap[status] || statusMap.pending;
    };

    const connectedDevices = devices?.filter(d => d.connectionStatus === 'connected') || [];

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Disparo em Massa</h1>
                    <p className="text-muted-foreground mt-1">Envie mensagens para múltiplos contatos</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Send className="w-4 h-4 mr-2" />
                            Novo Disparo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Criar Disparo em Massa</DialogTitle>
                            <DialogDescription>
                                Envie mensagens para múltiplos contatos do WhatsApp
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="broadcast-name">Nome do Disparo</Label>
                                <Input
                                    id="broadcast-name"
                                    placeholder="Ex: Promoção Black Friday"
                                    value={broadcastName}
                                    onChange={(e) => setBroadcastName(e.target.value)}
                                />
                            </div>

                            {/* Templates Section */}
                            <div className="flex gap-2 items-end p-3 bg-muted/30 rounded-md border">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs text-muted-foreground">Carregar Modelo (Template)</Label>
                                    <Select onValueChange={(val) => {
                                        const t = templates?.find((t: any) => t.id === val);
                                        if (t) {
                                            setMessage(t.content);
                                        }
                                    }}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Selecione um modelo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates?.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => createTemplateMutation.mutate()}
                                    disabled={!message || createTemplateMutation.isPending}
                                >
                                    Salvar Modelo
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="device-select">Dispositivo WhatsApp</Label>
                                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                                    <SelectTrigger id="device-select">
                                        <SelectValue placeholder="Selecione um dispositivo conectado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {connectedDevices.length === 0 ? (
                                            <SelectItem value="none" disabled>Nenhum dispositivo conectado</SelectItem>
                                        ) : (
                                            connectedDevices.map((device) => (
                                                <SelectItem key={device.id} value={device.id}>
                                                    {device.name} - {device.phoneNumber}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="message">Mensagem</Label>
                                    <Button variant="outline" size="sm" onClick={() => setIsAIDialogOpen(true)}>
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        IA
                                    </Button>
                                </div>
                                <Textarea
                                    id="message"
                                    placeholder="Digite a mensagem..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Agendar Para (Opcional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledFor}
                                    min={new Date().toISOString().slice(0, 16)}
                                    onChange={(e) => setScheduledFor(e.target.value)}
                                    className="block w-full"
                                />
                                <p className="text-xs text-muted-foreground">Deixe em branco para enviar agora.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Mídia (Opcional)</Label>
                                <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de mídia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhuma</SelectItem>
                                        <SelectItem value="image">Imagem</SelectItem>
                                        <SelectItem value="video">Vídeo</SelectItem>
                                    </SelectContent>
                                </Select>

                                {mediaType !== 'none' && (
                                    <div className="space-y-4 mt-2 p-4 border rounded-md bg-muted/20">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://..."
                                                value={currentInputUrl}
                                                onChange={(e) => setCurrentInputUrl(e.target.value)}
                                            />
                                            <Button variant="secondary" onClick={handleAddUrl} disabled={!currentInputUrl}>
                                                Add URL
                                            </Button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept={mediaType === 'image' ? "image/*" : "video/*"}
                                                multiple
                                                onChange={handleFileUpload}
                                            />
                                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                                Upload
                                            </Button>
                                        </div>

                                        {mediaUrls.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {mediaUrls.map((url, index) => (
                                                    <div key={index} className="relative group">
                                                        {mediaType === 'image' ? (
                                                            <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                                                        ) : (
                                                            <video src={url} className="w-full h-20 object-cover rounded" />
                                                        )}
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-1 right-1 w-5 h-5 opacity-0 group-hover:opacity-100"
                                                            onClick={() => handleRemoveMedia(index)}
                                                        >
                                                            <XCircle className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedDevice && (
                                <>
                                    <div className="space-y-4 p-4 border rounded-md bg-muted/10">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="only-clients"
                                                    checked={onlyRegisteredClients}
                                                    onCheckedChange={(checked) => setOnlyRegisteredClients(checked as boolean)}
                                                />
                                                <Label htmlFor="only-clients" className="cursor-pointer">
                                                    Somente Clientes Cadastrados
                                                </Label>
                                            </div>
                                            <Label>Intervalo entre mensagens</Label>
                                            <span className="text-sm font-medium">{delay}s</span>
                                        </div>
                                        <Slider
                                            value={[delay]}
                                            onValueChange={(vals) => setDelay(vals[0])}
                                            min={10}
                                            max={120}
                                            step={5}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Contatos ({selectedContacts.length} selecionados)</Label>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="include-groups"
                                                    checked={includeGroups}
                                                    onCheckedChange={(checked) => setIncludeGroups(checked as boolean)}
                                                />
                                                <Label htmlFor="include-groups" className="text-sm">Incluir Grupos</Label>
                                                <div className="relative w-48">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Buscar..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="pl-8 h-9"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border rounded-md p-2 h-60 overflow-y-auto space-y-2">
                                            <div className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                                                <Checkbox
                                                    id="select-all"
                                                    checked={selectAll}
                                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                />
                                                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                                                    Selecionar Todos
                                                </Label>
                                            </div>

                                            {loadingContacts ? (
                                                [1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)
                                            ) : filteredContacts && filteredContacts.length > 0 ? (
                                                <>
                                                    {filteredContacts.slice(0, displayLimit).map((contact) => (
                                                        <div key={contact.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                                                            <Checkbox
                                                                id={contact.id}
                                                                checked={selectedContacts.includes(contact.number)}
                                                                onCheckedChange={(checked) => handleContactToggle(contact.number, checked as boolean)}
                                                            />
                                                            <Label htmlFor={contact.id} className="flex-1 cursor-pointer text-sm">
                                                                {contact.name}
                                                                <span className="block text-xs text-muted-foreground">{contact.number}</span>
                                                            </Label>
                                                            {contact.isGroup && <Badge variant="secondary">Grupo</Badge>}
                                                        </div>
                                                    ))}
                                                    {filteredContacts.length > displayLimit && (
                                                        <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 50)} className="w-full">
                                                            Carregar mais ({filteredContacts.length - displayLimit} restantes)
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    {selectedDevice ? "Nenhum contato encontrado" : "Selecione um dispositivo"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateBroadcast}
                                disabled={createBroadcastMutation.isPending || !broadcastName || !selectedDevice || !message || selectedContacts.length === 0}
                            >
                                {createBroadcastMutation.isPending ? "Criando..." : "Criar Disparo"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* AI Dialog */}
            <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Gerar Mensagem com IA
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Contexto (Opcional)</Label>
                            <Textarea
                                placeholder="Ex: Lista de produtos..."
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Instrução</Label>
                            <Textarea
                                placeholder="Ex: Crie uma mensagem de oferta"
                                value={aiPrompt}
                                onChange={(e) => setAIPrompt(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => generateAIMutation.mutate(aiPrompt)}
                            disabled={generateAIMutation.isPending || !aiPrompt}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {generateAIMutation.isPending ? "Gerando..." : "Gerar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Broadcasts List */}
            {loadingBroadcasts ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <Card key={i}><Skeleton className="h-40 w-full" /></Card>)}
                </div>
            ) : broadcasts && broadcasts.length > 0 ? (
                <div className="space-y-4">
                    <DataTableActions
                        selectedCount={selectedBroadcasts.length}
                        onDelete={() => massDeleteMutation.mutate(selectedBroadcasts)}
                        noun="disparos"
                        loading={massDeleteMutation.isPending}
                    />

                    {broadcasts.map((broadcast) => {
                        const statusInfo = getStatusBadge(broadcast.status);
                        const progress = broadcast.totalContacts > 0 ? Math.round((broadcast.sentCount / broadcast.totalContacts) * 100) : 0;
                        const isSelected = selectedBroadcasts.includes(broadcast.id);

                        return (
                            <Card key={broadcast.id} className={isSelected ? "border-primary" : ""}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => handleToggleSelect(broadcast.id, checked as boolean)}
                                            />
                                            <CardTitle className="text-xl">{broadcast.name}</CardTitle>
                                            <Badge variant={statusInfo.variant as any}>
                                                {statusInfo.icon && <statusInfo.icon className="w-3 h-3 mr-1" />}
                                                {statusInfo.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-sm whitespace-pre-wrap">{broadcast.message}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progresso</span>
                                            <span className="font-medium">{broadcast.sentCount} / {broadcast.totalContacts}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-primary">{broadcast.totalContacts}</p>
                                            <p className="text-xs text-muted-foreground">Total</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-500">{broadcast.sentCount}</p>
                                            <p className="text-xs text-muted-foreground">Enviadas</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-destructive">{broadcast.failedCount}</p>
                                            <p className="text-xs text-muted-foreground">Falhas</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {broadcast.status === 'pending' && (
                                            <Button size="sm" onClick={() => startBroadcastMutation.mutate(broadcast.id)}>
                                                <Play className="w-4 h-4 mr-2" />Iniciar
                                            </Button>
                                        )}
                                        {((broadcast.status === 'scheduled' || broadcast.status === 'pending') && broadcast.scheduledFor) && (
                                            <div className="text-sm text-muted-foreground flex items-center">
                                                <Clock className="w-4 h-4 mr-1" />
                                                Agendado para: {new Date(broadcast.scheduledFor).toLocaleString()}
                                            </div>
                                        )}
                                        {broadcast.status === 'running' && (
                                            <Button variant="outline" size="sm" onClick={() => pauseBroadcastMutation.mutate(broadcast.id)}>
                                                <Pause className="w-4 h-4 mr-2" />Pausar
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => {
                                            resetForm();
                                            setBroadcastName(`${broadcast.name} (Reenvio)`);
                                            setMessage(broadcast.message);
                                            setSelectedDevice(broadcast.deviceId);
                                            // Load media URLs from original broadcast
                                            if (broadcast.mediaUrls) {
                                                try {
                                                    const urls = Array.isArray(broadcast.mediaUrls)
                                                        ? broadcast.mediaUrls
                                                        : JSON.parse(broadcast.mediaUrls);
                                                    setMediaUrls(urls.filter((u: string) => u));
                                                    if (urls.length > 0) {
                                                        setMediaType(urls[0]?.includes('video') ? 'video' : 'image');
                                                    }
                                                } catch {
                                                    if (typeof broadcast.mediaUrls === 'string' && broadcast.mediaUrls) {
                                                        setMediaUrls([broadcast.mediaUrls]);
                                                        setMediaType('image');
                                                    }
                                                }
                                            }
                                            setIsCreateDialogOpen(true);
                                        }}>
                                            <Copy className="w-4 h-4 mr-2" />Reenviar
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => deleteBroadcastMutation.mutate(broadcast.id)} disabled={broadcast.status === 'running'}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Send className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum disparo criado</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6">Crie seu primeiro disparo para enviar mensagens</p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Send className="w-4 h-4 mr-2" />Criar Disparo
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
