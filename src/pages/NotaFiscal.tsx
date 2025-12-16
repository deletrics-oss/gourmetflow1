import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Settings, History, Send, CheckCircle, AlertCircle, 
  Loader, Download, XCircle, Eye, Shield, Upload, Key
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/hooks/useRestaurant";

interface NFCeSettings {
  id?: string;
  cnpj: string;
  ie: string;
  im: string;
  regime_tributario: string;
  certificate_type: string;
  certificate_password: string;
  certificate_data: string;
  certificate_expiry: string | null;
  environment: string;
  serie_number: string;
  last_nf_number: number;
  is_active: boolean;
}

interface NFCeIssued {
  id: string;
  nf_number: string;
  serie: string;
  chave_acesso: string;
  protocol: string;
  status: string;
  total_value: number;
  authorization_date: string;
  created_at: string;
  order_id: string;
}

export default function NotaFiscal() {
  const { restaurant } = useRestaurant();
  const [activeTab, setActiveTab] = useState("config");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nfceHistory, setNfceHistory] = useState<NFCeIssued[]>([]);
  const [stats, setStats] = useState({ today: 0, month: 0, total: 0 });
  
  const [settings, setSettings] = useState<NFCeSettings>({
    cnpj: "",
    ie: "",
    im: "",
    regime_tributario: "SN",
    certificate_type: "A1",
    certificate_password: "",
    certificate_data: "",
    certificate_expiry: null,
    environment: "homologacao",
    serie_number: "1",
    last_nf_number: 0,
    is_active: false
  });

  useEffect(() => {
    if (restaurant?.id) {
      loadSettings();
      loadHistory();
      loadStats();
    }
  }, [restaurant?.id]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('nfce_settings')
        .select('*')
        .eq('restaurant_id', restaurant?.id)
        .single();

      if (data) {
        setSettings({
          id: data.id,
          cnpj: data.cnpj || "",
          ie: data.ie || "",
          im: data.im || "",
          regime_tributario: data.regime_tributario || "SN",
          certificate_type: data.certificate_type || "A1",
          certificate_password: data.certificate_password || "",
          certificate_data: data.certificate_data || "",
          certificate_expiry: data.certificate_expiry,
          environment: data.environment || "homologacao",
          serie_number: data.serie_number || "1",
          last_nf_number: data.last_nf_number || 0,
          is_active: data.is_active || false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('nfce_issued')
        .select('*')
        .eq('restaurant_id', restaurant?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        setNfceHistory(data);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const { data: todayData } = await supabase
        .from('nfce_issued')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurant?.id)
        .eq('status', 'autorizada')
        .gte('created_at', today);

      const { data: monthData } = await supabase
        .from('nfce_issued')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurant?.id)
        .eq('status', 'autorizada')
        .gte('created_at', monthStart);

      const { data: totalData } = await supabase
        .from('nfce_issued')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurant?.id)
        .eq('status', 'autorizada');

      setStats({
        today: todayData?.length || 0,
        month: monthData?.length || 0,
        total: totalData?.length || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!restaurant?.id) {
      toast.error("Restaurante não identificado");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restaurant_id: restaurant.id,
        cnpj: settings.cnpj,
        ie: settings.ie,
        im: settings.im,
        regime_tributario: settings.regime_tributario,
        certificate_type: settings.certificate_type,
        certificate_password: settings.certificate_password,
        certificate_data: settings.certificate_data,
        certificate_expiry: settings.certificate_expiry,
        environment: settings.environment,
        serie_number: settings.serie_number,
        is_active: settings.is_active
      };

      if (settings.id) {
        const { error } = await supabase
          .from('nfce_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('nfce_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setSettings({ ...settings, id: data.id });
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      toast.error("Selecione um arquivo .pfx ou .p12");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSettings({ ...settings, certificate_data: base64 });
      toast.success("Certificado carregado!");
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'autorizada':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Autorizada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      case 'rejeitada':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="secondary"><Loader className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Nota Fiscal (NFC-e)
            </h1>
            <p className="text-muted-foreground">
              Configure a emissão automática de NFC-e nas vendas
            </p>
          </div>
          <Badge 
            variant={settings.is_active ? "default" : "secondary"}
            className={settings.is_active ? "bg-green-600" : ""}
          >
            {settings.is_active ? (
              <><CheckCircle className="h-4 w-4 mr-1" /> NFC-e Ativa</>
            ) : (
              <><AlertCircle className="h-4 w-4 mr-1" /> NFC-e Inativa</>
            )}
          </Badge>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notas Hoje</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notas Este Mês</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.month}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emitidas</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="cert" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Certificado</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Configurações */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Fiscais</CardTitle>
                <CardDescription>
                  Configure os dados da empresa para emissão de NFC-e
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle ativo */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-base font-semibold">Emitir NFC-e automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, emite nota fiscal automaticamente ao finalizar vendas
                    </p>
                  </div>
                  <Switch
                    checked={settings.is_active}
                    onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={settings.cnpj}
                      onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inscrição Estadual (IE)</Label>
                    <Input
                      value={settings.ie}
                      onChange={(e) => setSettings({ ...settings, ie: e.target.value })}
                      placeholder="000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inscrição Municipal (IM)</Label>
                    <Input
                      value={settings.im}
                      onChange={(e) => setSettings({ ...settings, im: e.target.value })}
                      placeholder="000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Regime Tributário</Label>
                    <Select 
                      value={settings.regime_tributario} 
                      onValueChange={(v) => setSettings({ ...settings, regime_tributario: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SN">Simples Nacional</SelectItem>
                        <SelectItem value="SN_EXC">Simples Nacional - Excesso</SelectItem>
                        <SelectItem value="LP">Lucro Presumido</SelectItem>
                        <SelectItem value="LR">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Série da Nota</Label>
                    <Input
                      value={settings.serie_number}
                      onChange={(e) => setSettings({ ...settings, serie_number: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select 
                      value={settings.environment} 
                      onValueChange={(v) => setSettings({ ...settings, environment: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Info Focus NFe */}
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-100">Integração Focus NFe</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Para emitir notas fiscais reais, você precisa:
                        </p>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                          <li>• Criar conta em <a href="https://focusnfe.com.br" target="_blank" rel="noopener" className="underline">focusnfe.com.br</a> (30 dias grátis)</li>
                          <li>• Obter o Token de API e configurar nas secrets do sistema</li>
                          <li>• Ter certificado digital A1 válido</li>
                          <li>• Cadastrar o CSC no portal da SEFAZ do seu estado</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                  {saving ? (
                    <><Loader className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" />Salvar Configurações</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Certificado */}
          <TabsContent value="cert" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificado Digital</CardTitle>
                <CardDescription>
                  Upload do certificado A1 (.pfx) para assinatura das notas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <Label htmlFor="cert-upload" className="cursor-pointer">
                    <span className="text-primary font-semibold">Clique para selecionar</span>
                    <span className="text-muted-foreground"> ou arraste o arquivo .pfx</span>
                  </Label>
                  <Input
                    id="cert-upload"
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={handleCertificateUpload}
                  />
                </div>

                {settings.certificate_data && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      Certificado carregado
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input
                    type="password"
                    value={settings.certificate_password}
                    onChange={(e) => setSettings({ ...settings, certificate_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                  {saving ? "Salvando..." : "Salvar Certificado"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Notas Emitidas</CardTitle>
                <CardDescription>
                  Últimas 100 notas fiscais emitidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nfceHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma nota fiscal emitida ainda</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nfceHistory.map((nfce) => (
                          <TableRow key={nfce.id}>
                            <TableCell className="font-mono">
                              {nfce.nf_number}/{nfce.serie}
                            </TableCell>
                            <TableCell>
                              {new Date(nfce.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              R$ {nfce.total_value?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(nfce.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {nfce.chave_acesso && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard.writeText(nfce.chave_acesso);
                                      toast.success("Chave copiada!");
                                    }}
                                    title="Copiar chave de acesso"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
