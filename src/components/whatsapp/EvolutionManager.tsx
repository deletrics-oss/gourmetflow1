import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw, Smartphone, QrCode, Wifi, WifiOff, CheckCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Device {
    id: string;
    name: string;
    connectionStatus: string;
    phoneNumber: string | null;
    qrCode: string | null;
    isGlobalSdr: boolean;
    integration: string;
    activeLogicId: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    connected: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Conectado', icon: Wifi },
    qr_ready: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Aguardando QR', icon: QrCode },
    disconnected: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Desconectado', icon: WifiOff },
    connecting: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Conectando', icon: RefreshCw },
};

export function EvolutionManager({ restaurantId }: { restaurantId: string }) {
    const { toast } = useToast();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [qrModal, setQrModal] = useState<{ id: string; name: string; qrCode: string } | null>(null);
    const [qrLoading, setQrLoading] = useState<string | null>(null);
    const [logics, setLogics] = useState<any[]>([]);

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/devices");
            if (!res.ok) { setDevices([]); setLoading(false); return; }
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setDevices(list);

            // Auto-show QR for devices that have one
            const withQr = list.find((d: Device) => d.qrCode && d.connectionStatus !== 'connected');
            if (withQr && !qrModal) {
                setQrModal({ id: withQr.id, name: withQr.name, qrCode: withQr.qrCode });
            }
        } catch { setDevices([]); }
        setLoading(false);
    }, []);

    const fetchLogics = useCallback(async () => {
        try {
            const res = await fetch("/api/logics");
            if (!res.ok) return;
            const data = await res.json();
            setLogics(Array.isArray(data) ? data : []);
        } catch { }
    }, []);

    useEffect(() => { fetchDevices(); fetchLogics(); }, [fetchDevices, fetchLogics]);

    // Poll every 8s if any device is pending
    useEffect(() => {
        const hasPending = devices.some(d => d.connectionStatus !== 'connected');
        if (!hasPending) return;
        const interval = setInterval(fetchDevices, 8000);
        return () => clearInterval(interval);
    }, [devices, fetchDevices]);

    const createDevice = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const instanceName = newName.trim().toLowerCase().replace(/\s+/g, '-');
            const res = await fetch("/api/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: instanceName }),
            });
            const data = await res.json();
            if (res.ok) {
                setNewName("");
                toast({ title: "Dispositivo criado! 📱", description: "Aguardando QR Code..." });
                if (data.qrCode) {
                    setQrModal({ id: data.id, name: instanceName, qrCode: data.qrCode });
                }
                await new Promise(r => setTimeout(r, 1500));
                await fetchDevices();
            } else {
                toast({ title: "Erro", description: data.error || "Falha ao criar", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
        setCreating(false);
    };

    const getQRCode = async (device: Device) => {
        setQrLoading(device.id);
        try {
            const res = await fetch(`/api/devices/${device.id}`, { method: "POST" });
            const data = await res.json();
            const qr = data.qrCode || data.qrcode || data.base64 || data.code;
            if (qr) {
                setQrModal({ id: device.id, name: device.name, qrCode: qr });
            } else {
                toast({ title: "Sem QR Code", description: data.message || "Tente novamente" });
            }
            await fetchDevices();
        } catch { toast({ title: "Erro ao gerar QR", variant: "destructive" }); }
        setQrLoading(null);
    };

    const deleteDevice = async (id: string) => {
        if (!confirm("Deseja realmente excluir este dispositivo?")) return;
        try {
            await fetch(`/api/devices/${id}`, { method: "DELETE" });
            setDevices(prev => prev.filter(d => d.id !== id));
            if (qrModal?.id === id) setQrModal(null);
            toast({ title: "Dispositivo removido" });
        } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
    };

    const changeLogic = async (device: Device, logicId: string) => {
        await fetch(`/api/devices/${device.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logicId: logicId === 'none' ? null : logicId })
        });
        await fetchDevices();
        toast({ title: "Lógica atualizada! 🤖" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Evolution API</h2>
                    <p className="text-muted-foreground text-sm mt-1">Gerencie dispositivos via Evolution API</p>
                </div>
                <Button variant="outline" onClick={fetchDevices} disabled={loading}>
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
                            <div className="p-3 bg-red-500/10 rounded-lg">
                                <WifiOff className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{devices.filter(d => d.connectionStatus !== 'connected').length}</p>
                                <p className="text-sm text-muted-foreground">Desconectados</p>
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
                            Adicione um dispositivo acima para conectar ao WhatsApp via Evolution API.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {devices.map(device => {
                        const s = statusConfig[device.connectionStatus] || statusConfig.disconnected;
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

                                    {/* Logic Selector */}
                                    <div className="mb-4">
                                        <label className="text-muted-foreground text-xs block mb-1">Lógica SDR Ativa</label>
                                        <select
                                            value={device.activeLogicId || 'none'}
                                            onChange={(e) => changeLogic(device, e.target.value)}
                                            className="w-full bg-background border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="none">Sem lógica (Desligado)</option>
                                            {logics.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
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
