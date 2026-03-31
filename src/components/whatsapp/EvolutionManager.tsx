import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw, Smartphone, QrCode, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

interface Device {
    id: string;
    name: string;
    connectionStatus: string;
    phoneNumber: string | null;
    qrCode: string | null;
    activeLogicId: string | null;
    integration: string;
}

interface Logic {
    id: string;
    name: string;
    logic_type: string;
    is_active: boolean;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    connected: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Conectado' },
    qr_ready: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Aguardando QR' },
    disconnected: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Desconectado' },
    connecting: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Conectando' },
};

export function EvolutionManager({ restaurantId }: { restaurantId: string }) {
    const { toast } = useToast();
    const [devices, setDevices] = useState<Device[]>([]);
    const [logics, setLogics] = useState<Logic[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [qrModal, setQrModal] = useState<{ id: string; name: string; qrCode: string } | null>(null);
    const [qrLoading, setQrLoading] = useState<string | null>(null);

    // Fetch devices from the WhatsApp server API (which syncs with Supabase)
    const fetchDevices = useCallback(async () => {
        try {
            const data = await apiRequest('GET', `/api/devices?restaurantId=${restaurantId}`);
            setDevices(Array.isArray(data) ? data : []);
        } catch { setDevices([]); }
        setLoading(false);
    }, [restaurantId]);

    // Fetch logics DIRECTLY from Supabase (same source as LogicEditor)
    const fetchLogics = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_logic_configs')
                .select('id, name, logic_type, is_active')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });
            if (!error) setLogics(data || []);
        } catch { }
    }, [restaurantId]);

    useEffect(() => { fetchDevices(); fetchLogics(); }, [fetchDevices, fetchLogics]);

    // Poll every 8s if any device is not connected
    useEffect(() => {
        const hasPending = devices.some(d => d.connectionStatus !== 'connected');
        if (!hasPending && devices.length > 0) return;
        const interval = setInterval(fetchDevices, 8000);
        return () => clearInterval(interval);
    }, [devices, fetchDevices]);

    const createDevice = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const instanceName = newName.trim().toLowerCase().replace(/\s+/g, '-');
            const data = await apiRequest('POST', '/api/devices', {
                name: instanceName,
                restaurantId,
            });
            setNewName("");
            toast({ title: "Dispositivo criado! 📱", description: "Aguardando QR Code..." });
            if (data.qrCode) {
                setQrModal({ id: data.id, name: instanceName, qrCode: data.qrCode });
            }
            setTimeout(fetchDevices, 2000);
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
        setCreating(false);
    };

    const getQRCode = async (device: Device) => {
        setQrLoading(device.id);
        try {
            const data = await apiRequest('POST', `/api/devices/${device.id}`, {});
            const qr = data.qrCode || data.qrcode || data.base64;
            if (qr) {
                setQrModal({ id: device.id, name: device.name, qrCode: qr });
            } else {
                toast({ title: data.message || "Sem QR Code disponível" });
            }
            fetchDevices();
        } catch { toast({ title: "Erro ao gerar QR", variant: "destructive" }); }
        setQrLoading(null);
    };

    const deleteDevice = async (id: string) => {
        if (!confirm("Deseja realmente excluir este dispositivo?")) return;
        try {
            await apiRequest('DELETE', `/api/devices/${id}`);
            setDevices(prev => prev.filter(d => d.id !== id));
            if (qrModal?.id === id) setQrModal(null);
            toast({ title: "Dispositivo removido" });
        } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
    };

    const changeLogic = async (deviceId: string, logicId: string) => {
        try {
            // Update directly in Supabase (same table as rest of the app)
            await supabase.from('whatsapp_devices').update({
                active_logic_id: logicId === 'none' ? null : logicId,
            }).eq('id', deviceId);

            // Also notify the server
            await apiRequest('PATCH', `/api/devices/${deviceId}`, {
                logicId: logicId === 'none' ? null : logicId,
            });

            fetchDevices();
            toast({ title: "Lógica atualizada! 🤖" });
        } catch { toast({ title: "Erro ao atualizar lógica", variant: "destructive" }); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Evolution API</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Dispositivos conectados via Evolution API — integrado ao banco de dados
                    </p>
                </div>
                <Button variant="outline" onClick={() => { fetchDevices(); fetchLogics(); }} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </div>

            {/* Add Device */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Adicionar Dispositivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <Input
                                placeholder="Nome do dispositivo (ex: atendimento)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createDevice()}
                            />
                        </div>
                        <Button onClick={createDevice} disabled={creating || !newName.trim()}>
                            {creating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Adicionar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Modal */}
            {qrModal && (
                <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-6 text-center">
                        <h3 className="font-semibold text-lg mb-1">Escaneie o QR Code</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Abra o WhatsApp → Aparelhos Conectados → Conectar dispositivo
                        </p>
                        <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                            <img
                                src={qrModal.qrCode.startsWith('data:') ? qrModal.qrCode : `data:image/png;base64,${qrModal.qrCode}`}
                                alt="QR Code"
                                className="w-64 h-64 object-contain"
                            />
                        </div>
                        <p className="text-muted-foreground text-xs mt-3">Dispositivo: {qrModal.name}</p>
                        <div className="mt-4 flex justify-center gap-2">
                            <Button variant="outline" onClick={() => {
                                const d = devices.find(x => x.id === qrModal.id);
                                if (d) getQRCode(d);
                            }}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Novo QR
                            </Button>
                            <Button variant="outline" onClick={() => setQrModal(null)}>Fechar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                <p className="text-2xl font-bold">{devices.filter(d => d.connectionStatus === 'connected').length}</p>
                                <p className="text-sm text-muted-foreground">Conectados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-lg">
                                <QrCode className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{logics.filter(l => l.is_active).length}</p>
                                <p className="text-sm text-muted-foreground">Lógicas Ativas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Devices List */}
            {loading && devices.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Carregando dispositivos...</div>
            ) : devices.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Smartphone className="w-16 h-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                            Adicione um dispositivo acima para conectar ao WhatsApp.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {devices.map(device => {
                        const s = statusConfig[device.connectionStatus] || statusConfig.disconnected;
                        const activeLogic = logics.find(l => l.id === device.activeLogicId);
                        return (
                            <Card key={device.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${s.bg}`}>
                                                <Smartphone className={`w-5 h-5 ${s.color}`} />
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{device.name}</h3>
                                                <p className="text-muted-foreground text-xs">{device.phoneNumber || 'Sem número'}</p>
                                            </div>
                                        </div>
                                        <Badge variant={device.connectionStatus === 'connected' ? 'default' : 'secondary'}
                                            className={`text-[10px] ${device.connectionStatus === 'connected' ? 'bg-green-500' : ''}`}>
                                            {s.label}
                                        </Badge>
                                    </div>

                                    {/* Logic Selector — reads from Supabase logics */}
                                    <div className="mb-4">
                                        <label className="text-muted-foreground text-xs block mb-1">Lógica SDR Ativa</label>
                                        <select
                                            value={device.activeLogicId || 'none'}
                                            onChange={(e) => changeLogic(device.id, e.target.value)}
                                            className="w-full bg-background border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="none">Sem lógica (Desligado)</option>
                                            {logics.filter(l => l.is_active).map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.name} ({l.logic_type === 'ai' ? 'IA' : l.logic_type === 'hybrid' ? 'Híbrido' : 'Regras'})
                                                </option>
                                            ))}
                                        </select>
                                        {activeLogic && (
                                            <p className="text-xs text-green-600 mt-1">✓ {activeLogic.name} ativa</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {device.connectionStatus !== 'connected' ? (
                                            <Button size="sm" className="flex-1" onClick={() => getQRCode(device)} disabled={qrLoading === device.id}>
                                                {qrLoading === device.id ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <QrCode className="w-4 h-4 mr-1" />}
                                                QR Code
                                            </Button>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center gap-2 text-green-500 text-sm">
                                                <CheckCircle className="w-4 h-4" /> Funcionando
                                            </div>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => deleteDevice(device.id)}
                                            className="border-red-200 text-red-500 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
