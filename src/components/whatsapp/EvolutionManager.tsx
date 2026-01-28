import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Smartphone, Wifi, WifiOff, Trash2, RefreshCw, RotateCcw, Bot, HelpCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Device {
    id: string;
    name: string;
    connectionStatus: 'connected' | 'connecting' | 'qr_ready' | 'disconnected';
    phoneNumber?: string;
    qrCode?: string;
    lastConnectedAt?: string;
    activeLogicId?: string;
}

export function EvolutionManager({ restaurantId }: { restaurantId: string }) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newDeviceName, setNewDeviceName] = useState("");
    const [integrationType, setIntegrationType] = useState<'BAILEYS' | 'EVOLUTION' | 'CLOUD'>("BAILEYS");
    const [evolutionApiKey, setEvolutionApiKey] = useState("");
    const [cloudToken, setCloudToken] = useState("");
    const [cloudPhoneId, setCloudPhoneId] = useState("");
    const { toast } = useToast();
    const [userId, setUserId] = useState<string | null>(null);

    // Evolution API Settings (whatsapi.deletrics.site)
    const EVOLUTION_API_URL = "https://whatsapi.deletrics.site";

    // Fetch current user first, then fetch devices
    const { data: authData } = useQuery({
        queryKey: ['/api/auth/me'],
        queryFn: async () => {
            // NOTE: In this system, we use Supabase directly, but if Evolution requires this specific endpoint
            // we will need to create an Edge Function for it. 
            // For now, mocking or using existing Supabase User
            return { user: { id: 'mock-user-id' } }; // Fallback
        },
        staleTime: 60000,
    });

    // Extract userId from auth response
    const currentUserId = authData?.user?.id || null;

    const { data: devices = [], isLoading, refetch, isError, error } = useQuery<Device[]>({
        queryKey: ['/api/devices', currentUserId],
        queryFn: async () => {
            // Note: This endpoint (/api/devices) likely needs to be created or proxied to Evolution API
            // For now, implementing exactly as requested, assuming backend exists or will be created.
            let url = '/api/devices';
            if (currentUserId) {
                url += `?userId=${currentUserId}`;
            }

            const res = await fetch(url);

            if (!res.ok) {
                // Fallback to empty array if endpoint doesn't exist yet to prevent crash
                if (res.status === 404) return [];
                const err = await res.json();
                throw new Error(err.error || 'Falha ao buscar dispositivos');
            }
            const data = await res.json();
            console.log("Devices API Response:", JSON.stringify(data, null, 2));
            return data;
        },
        enabled: true,
        refetchInterval: 5000,
    });

    const { data: logics = [] } = useQuery<any[]>({
        queryKey: ['/api/logics'],
        queryFn: async () => {
            // Mock or real fetch
            const res = await fetch('/api/logics');
            if (!res.ok) return [];
            return res.json();
        },
    });

    const addDeviceMutation = useMutation({
        mutationFn: async ({ name, integration }: { name: string; integration: string }) => {
            const res = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, userId, integration })
            });
            return res.json();
        },
        onSuccess: () => {
            refetch();
            setIsAddDialogOpen(false);
            setNewDeviceName("");
            toast({ title: "Dispositivo adicionado! 📱", description: "Aguardando QR Code..." });
        },
        onError: (error: Error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
    });

    const deleteDeviceMutation = useMutation({
        mutationFn: async (deviceId: string) => {
            const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
            return res.json();
        },
        onSuccess: () => {
            refetch();
            toast({ title: "Dispositivo removido" });
        },
        onError: () => {
            toast({ title: "Erro ao remover", variant: "destructive" });
        },
    });

    const reconnectMutation = useMutation({
        mutationFn: async (deviceId: string) => {
            const res = await fetch(`/api/devices/${deviceId}`, { method: 'POST' });
            return res.json();
        },
        onSuccess: (data) => {
            refetch();
            if (data.qrCode) {
                toast({ title: "QR Code gerado! 📱", description: data.message || "Escaneie agora" });
            } else {
                toast({ title: "Reconectando...", description: data.message || "Tentando restaurar sessão" });
            }
        },
    });

    const clearSessionMutation = useMutation({
        mutationFn: async (deviceId: string) => {
            const res = await fetch(`/api/devices/${deviceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forceReset: true })
            });
            return res.json();
        },
        onSuccess: (data) => {
            refetch();
            toast({ title: "Sessão limpa!", description: data.message || "Escaneie o novo QR Code" });
        },
    });

    const updateLogicMutation = useMutation({
        mutationFn: async ({ deviceId, logicId }: { deviceId: string; logicId: string }) => {
            const res = await fetch(`/api/devices/${deviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logicId: logicId === 'none' ? null : logicId })
            });
            return res.json();
        },
        onSuccess: () => {
            refetch();
            toast({ title: "Lógica atualizada! 🤖" });
        },
    });

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
            connected: { label: "Conectado", variant: "default", color: "bg-green-500" },
            connecting: { label: "Conectando", variant: "secondary", color: "bg-yellow-500" },
            qr_ready: { label: "QR Pronto", variant: "secondary", color: "bg-yellow-500" },
            disconnected: { label: "Desconectado", variant: "outline", color: "bg-gray-500" },
        };
        return statusMap[status] || statusMap.disconnected;
    };

    return (
        <div className="p-6 md:p-8 space-y-8 bg-background rounded-lg border">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Evolution API</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus dispositivos via Evolution API</p>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Dispositivo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Dispositivo WhatsApp</DialogTitle>
                            <DialogDescription>
                                Escolha o tipo de conexão e dê um nome ao dispositivo
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="device-name">Nome do Dispositivo</Label>
                                <Input
                                    id="device-name"
                                    placeholder="Ex: Atendimento, Vendas, Suporte..."
                                    value={newDeviceName}
                                    onChange={(e) => setNewDeviceName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="integration-type">Tipo de Integração</Label>
                                <select
                                    id="integration-type"
                                    className="w-full p-2 border rounded-md bg-background text-sm"
                                    value={integrationType}
                                    onChange={(e) => setIntegrationType(e.target.value as any)}
                                >
                                    <option value="BAILEYS">QR Code (Grátis - Baileys)</option>
                                    <option value="EVOLUTION">Evolution API (whatsapi.deletrics.site)</option>
                                    <option value="CLOUD">Cloud API (Oficial Meta)</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground">
                                    Nota: A API Oficial requer configuração prévia no painel da Meta/Evolution.
                                </p>
                            </div>

                            {/* Evolution API Key Field */}
                            {integrationType === 'EVOLUTION' && (
                                <div className="space-y-2">
                                    <Label htmlFor="evolution-api-key">API Key (Evolution)</Label>
                                    <Input
                                        id="evolution-api-key"
                                        type="password"
                                        placeholder="Cole sua API Key do Evolution"
                                        value={evolutionApiKey}
                                        onChange={(e) => setEvolutionApiKey(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Obtenha sua API Key em: <a href="https://whatsapi.deletrics.site/manager" target="_blank" className="text-primary underline">whatsapi.deletrics.site/manager</a>
                                    </p>
                                </div>
                            )}

                            {/* Cloud API Fields */}
                            {integrationType === 'CLOUD' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cloud-token">Access Token (Meta)</Label>
                                        <Input
                                            id="cloud-token"
                                            type="password"
                                            placeholder="Token de acesso da Cloud API"
                                            value={cloudToken}
                                            onChange={(e) => setCloudToken(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cloud-phone-id">Phone Number ID</Label>
                                        <Input
                                            id="cloud-phone-id"
                                            placeholder="ID do número no Meta Business"
                                            value={cloudPhoneId}
                                            onChange={(e) => setCloudPhoneId(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Configure em: <a href="https://developers.facebook.com/apps" target="_blank" className="text-primary underline">Meta for Developers</a>
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => addDeviceMutation.mutate({ name: newDeviceName, integration: integrationType })}
                                disabled={!newDeviceName || addDeviceMutation.isPending}
                            >
                                {addDeviceMutation.isPending ? "Adicionando..." : "Adicionar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Help Card - Troubleshooting Instructions */}
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-base text-blue-700 dark:text-blue-400">
                            Procedimento de Conexão e Reparo
                        </CardTitle>

                        <div className="ml-auto" title="Sobre a Reconexão Automática">
                            <span className="text-xs text-blue-600 cursor-help border-b border-dashed border-blue-400">
                                Por que às vezes reconecta sozinho?
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Passo a passo para conectar/corrigir:</strong>
                                <ol className="list-decimal ml-4 mt-1 space-y-1">
                                    <li>Tente adicionar um <strong>Novo Dispositivo</strong> (se ainda não existir).</li>
                                    <li>Se o dispositivo já existe e não conecta, clique em <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs"><RotateCcw className="w-3 h-3" /> Limpar Sessão</span>.</li>
                                    <li>Aguarde gerar o novo QR Code e tente escanear.</li>
                                    <li>Se não funcionar, clique em <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs"><RefreshCw className="w-3 h-3" /> Reconectar</span> e tente novamente.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Message */}
            {
                isError && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
                        <p className="font-bold">Erro ao carregar dispositivos:</p>
                        <p>{error?.message || "Erro desconhecido. Verifique se o servidor Evolution API está configurado."}</p>
                    </div>
                )
            }

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Smartphone className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{devices.length}</p>
                                <p className="text-sm text-muted-foreground">Dispositivos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <Wifi className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {devices.filter(d => d.connectionStatus === 'connected').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Conectados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-lg">
                                <Bot className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {devices.filter(d => d.activeLogicId).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Com Bot Ativo</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Devices Grid */}
            {
                isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2].map((i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-48 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : devices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {devices.map((device) => {
                            const statusInfo = getStatusBadge(device.connectionStatus);

                            return (
                                <Card key={device.id} className="overflow-hidden">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <Smartphone className="w-5 h-5 text-primary" />
                                                <div>
                                                    <CardTitle className="text-lg">{device.name}</CardTitle>
                                                    <CardDescription>
                                                        {device.phoneNumber || "Aguardando conexão"}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                                                {statusInfo.label}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* QR Code ou Status */}
                                        {device.connectionStatus === 'connected' ? (
                                            <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                                                <div className="text-center space-y-2">
                                                    <Wifi className="w-12 h-12 text-green-500 mx-auto" />
                                                    <p className="font-medium text-green-700 dark:text-green-400">
                                                        Conectado!
                                                    </p>
                                                    {device.phoneNumber && (
                                                        <p className="text-lg font-bold">📱 {device.phoneNumber}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : device.qrCode ? (
                                            <div className="space-y-3">
                                                <div className="bg-white p-4 rounded-lg flex items-center justify-center border">
                                                    <img
                                                        src={device.qrCode}
                                                        alt="QR Code"
                                                        className="w-48 h-48 object-contain"
                                                    />
                                                </div>
                                                <p className="text-xs text-center text-muted-foreground">
                                                    Abra o WhatsApp → Configurações → Dispositivos Conectados → Escanear
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                                                <div className="text-center space-y-2">
                                                    <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
                                                    <p className="font-medium">Desconectado</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Clique em Reconectar para gerar QR Code
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bot Logic Selector */}
                                        {device.connectionStatus === 'connected' && (
                                            <div className="space-y-2 pt-4 border-t">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <Bot className="w-4 h-4" />
                                                    Lógica do Bot
                                                </label>
                                                <select
                                                    className="w-full p-2 border rounded-md bg-background text-sm"
                                                    value={device.activeLogicId || 'none'}
                                                    onChange={(e) => updateLogicMutation.mutate({
                                                        deviceId: device.id,
                                                        logicId: e.target.value
                                                    })}
                                                >
                                                    <option value="none">⌨️ MANUAL (sem bot)</option>
                                                    {logics.map((logic: any) => (
                                                        <option key={logic.id} value={logic.id}>
                                                            {logic.logicType === 'ai' ? '🤖' :
                                                                logic.logicType === 'ai_scheduling' ? '📅' :
                                                                    logic.logicType === 'hybrid' ? '⚡' : '📋'} {logic.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {device.activeLogicId ? (
                                                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                        <Bot className="w-3 h-3" />
                                                        Bot ativo - Respostas automáticas
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                                        <Bot className="w-3 h-3" />
                                                        Modo Manual - Sem respostas automáticas
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-4 flex-wrap">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => reconnectMutation.mutate(device.id)}
                                                disabled={reconnectMutation.isPending}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Reconectar
                                            </Button>

                                            {device.connectionStatus === 'connected' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`/api/devices/${device.id}`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ action: 'configure_webhook' })
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                toast({ title: "Sucesso!", description: "Webhook do Robô configurado." });
                                                            } else {
                                                                toast({ title: "Erro", description: "Falha ao configurar webhook", variant: "destructive" });
                                                            }
                                                        } catch (err) {
                                                            toast({ title: "Erro", description: "Falha na requisição", variant: "destructive" });
                                                        }
                                                    }}
                                                >
                                                    <Bot className="w-4 h-4 mr-1" />
                                                    Ligar Cérebro
                                                </Button>
                                            )}

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => clearSessionMutation.mutate(device.id)}
                                                disabled={clearSessionMutation.isPending}
                                                title="Limpar sessão"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm('Remover este dispositivo?')) {
                                                        deleteDeviceMutation.mutate(device.id);
                                                    }
                                                }}
                                                disabled={deleteDeviceMutation.isPending}
                                            >
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
                            <Smartphone className="w-16 h-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Configure o Evolution API</h3>
                            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                                Para usar esta aba, você precisa instalar o servidor Evolution API.
                                Caso já tenho instalado, certifique-se que o endpoint /api/devices está acessível.
                            </p>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Dispositivo
                            </Button>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
}
